import { createHmac, timingSafeEqual } from 'node:crypto';

import type { WebsiteAuthErrorCode } from '@canadian-plans/contracts';
import { machineScopeNames, type MachineScopeName } from '@canadian-plans/types';
import { z } from 'zod';

import { secretsEqual } from '../website/credential.js';

/**
 * Server-only integration registry (PLATFORM_CONTEXT §4b). It is deployment
 * configuration maintained through the owner's release process — never a
 * cross-tenant DB read and no customer data. URL/selector IDs are untrusted;
 * the mapped signature or scheduler secret is verified before any context is
 * derived. Unknown, revoked, account-mismatched or foreign-workspace
 * identities fail closed.
 */

const webhookEntrySchema = z.object({
  selector: z.string().min(1),
  provider: z.string().min(1),
  providerAccount: z.string().min(1),
  workspaceId: z.uuid(),
  verificationSecret: z.string().min(16),
  revoked: z.boolean().default(false),
});

const schedulerEntrySchema = z.object({
  selector: z.string().min(1),
  secret: z.string().min(16),
  workspaceIds: z.array(z.uuid()).min(1),
  scopes: z.array(z.enum(machineScopeNames)).min(1),
  revoked: z.boolean().default(false),
});

export const machineRegistryConfigSchema = z.object({
  webhooks: z.array(webhookEntrySchema).default([]),
  schedulers: z.array(schedulerEntrySchema).default([]),
});

export type MachineRegistryConfig = z.infer<typeof machineRegistryConfigSchema>;
type WebhookEntry = z.infer<typeof webhookEntrySchema>;
type SchedulerEntry = z.infer<typeof schedulerEntrySchema>;

type MachineFailure = { ok: false; reason: WebsiteAuthErrorCode };

export type WebhookResolution =
  { ok: true; workspaceId: string; providerAccount: string } | MachineFailure;

export interface SchedulerIdentity {
  workspaceIds: readonly string[];
  scopes: readonly MachineScopeName[];
  /** Fails closed when a job targets a workspace the identity was not granted. */
  authorizeWorkspace(workspaceId: string): boolean;
  hasScope(scope: MachineScopeName): boolean;
}

export type SchedulerResolution = ({ ok: true } & SchedulerIdentity) | MachineFailure;

export interface ResolveWebhookInput {
  selector: string;
  providerAccount: string;
  signature: string;
  rawBody: string | Buffer;
  /** Optional route expectation; a mismatch is cross-workspace confusion. */
  expectedWorkspaceId?: string;
}

export interface ResolveSchedulerInput {
  selector: string;
  secret: string;
}

function hexEqual(a: string, b: string): boolean {
  if (!/^[0-9a-f]+$/i.test(a) || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

export class MachineRegistry {
  private readonly webhooks: Map<string, WebhookEntry>;
  private readonly schedulers: Map<string, SchedulerEntry>;

  constructor(config: MachineRegistryConfig) {
    this.webhooks = new Map(config.webhooks.map((entry) => [entry.selector, entry]));
    this.schedulers = new Map(config.schedulers.map((entry) => [entry.selector, entry]));
  }

  resolveWebhook(input: ResolveWebhookInput): WebhookResolution {
    const entry = this.webhooks.get(input.selector);
    if (!entry || entry.revoked) return { ok: false, reason: 'machine_unknown' };

    const expected = createHmac('sha256', entry.verificationSecret)
      .update(input.rawBody)
      .digest('hex');
    if (!hexEqual(input.signature, expected)) {
      return { ok: false, reason: 'machine_signature_invalid' };
    }

    if (!secretsEqual(input.providerAccount, entry.providerAccount)) {
      return { ok: false, reason: 'machine_account_mismatch' };
    }

    if (input.expectedWorkspaceId && input.expectedWorkspaceId !== entry.workspaceId) {
      return { ok: false, reason: 'machine_workspace_mismatch' };
    }

    return { ok: true, workspaceId: entry.workspaceId, providerAccount: entry.providerAccount };
  }

  resolveScheduler(input: ResolveSchedulerInput): SchedulerResolution {
    const entry = this.schedulers.get(input.selector);
    if (!entry || entry.revoked) return { ok: false, reason: 'machine_unknown' };

    if (!secretsEqual(input.secret, entry.secret)) {
      return { ok: false, reason: 'machine_signature_invalid' };
    }

    const workspaceIds = entry.workspaceIds;
    const scopes = entry.scopes;
    return {
      ok: true,
      workspaceIds,
      scopes,
      authorizeWorkspace: (workspaceId) => workspaceIds.includes(workspaceId),
      hasScope: (scope) => scopes.includes(scope),
    };
  }
}

/** Builds the registry from `MACHINE_REGISTRY_JSON`. An unset value yields an empty (deny-all) registry. */
export function loadMachineRegistry(rawJson = process.env.MACHINE_REGISTRY_JSON): MachineRegistry {
  if (!rawJson || rawJson.trim() === '') {
    return new MachineRegistry({ webhooks: [], schedulers: [] });
  }
  const parsed: unknown = JSON.parse(rawJson);
  return new MachineRegistry(machineRegistryConfigSchema.parse(parsed));
}
