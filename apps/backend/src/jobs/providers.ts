import {
  createDeletionLedgerFromEnv,
  FakeAnalyticsSink,
  FakeEmailAdapter,
  InMemoryDeletionLedger,
  ResendEmailAdapter,
  SesEmailAdapter,
  UmamiAnalyticsSink,
  type AnalyticsSink,
  type EmailAdapter,
} from '@canadian-plans/adapters';
import {
  createJobHandlerRegistry,
  JobHandlerError,
  type EmailEligibilityChecker,
  type EmailDeliveryRecorder,
  type JobHandlerRegistry,
} from '@canadian-plans/jobs';
import { z } from 'zod';

import {
  createDeletionLedgerHandler,
  DatabaseDeletionLedgerStore,
  DeletionLedgerService,
} from '../deletion/ledger.js';

import { DatabaseEmailStore } from '../email/store.js';
import { loadMachineRegistry } from '../machines/registry.js';
import { createTrackingOtpHandler } from '../tracking/delivery.js';
import { loadTrackingSecret } from '../tracking/secrets.js';
import { requireContactHashSecret } from '../email/hash.js';

/**
 * The explicit opt-in for the in-memory analytics fake. There is deliberately
 * no implicit fallback: an unset value means no provider is configured, so the
 * outbox fails closed instead of silently delivering through a test double.
 */
export const FAKE_OUTBOX_ADAPTERS_VALUE = 'fake';

/**
 * Deployment configuration for the Umami server-event sink. The workspace →
 * website-id mapping is what keeps each storefront's events on its own Umami
 * site (REQ 35); a workspace with no mapping fails closed in the adapter rather
 * than sending to the wrong site. Parsed strictly so a malformed value yields
 * "no provider" instead of a guess.
 */
const umamiConfigSchema = z
  .object({
    endpoint: z.url(),
    hostname: z.string().min(1).max(253).optional(),
    sites: z
      .array(z.object({ workspaceId: z.uuid(), websiteId: z.string().min(1).max(64) }))
      .min(1),
  })
  .strict();

/** Builds the Umami sink from the environment, or `undefined` when unconfigured/invalid. */
export function loadUmamiAnalyticsSink(
  env: NodeJS.ProcessEnv = process.env,
): AnalyticsSink | undefined {
  const endpoint = env.UMAMI_EVENTS_URL?.trim();
  const rawSites = env.UMAMI_WORKSPACE_WEBSITES?.trim();
  if (!endpoint || !rawSites) return undefined;
  let sites: unknown;
  try {
    sites = JSON.parse(rawSites);
  } catch {
    return undefined;
  }
  const parsed = umamiConfigSchema.safeParse({
    endpoint,
    hostname: env.UMAMI_HOSTNAME?.trim() || undefined,
    sites,
  });
  if (!parsed.success) return undefined;
  const byWorkspace = new Map(parsed.data.sites.map((site) => [site.workspaceId, site.websiteId]));
  return new UmamiAnalyticsSink({
    endpoint: parsed.data.endpoint,
    hostname: parsed.data.hostname,
    websiteIdForWorkspace: (workspaceId) => byWorkspace.get(workspaceId),
  });
}

/** Fails an email job permanently until a real selected adapter is wired (T18). */
function unconfiguredEmailAdapter(): EmailAdapter {
  return {
    send: async () => {
      throw new JobHandlerError('provider_not_configured', false);
    },
  };
}

/**
 * Selects the email provider explicitly. `fake` is the only value CI/preview
 * deployments use (per T18 brief); `resend` is the current production
 * provider (OPEN_INPUTS #23: Resend selected for launch); `ses` remains
 * available but deferred to a later migration. There is no automatic
 * failover between providers.
 */
export type EmailProviderName = 'fake' | 'ses' | 'resend';

function readEmailProvider(env: NodeJS.ProcessEnv): EmailProviderName | undefined {
  return env.EMAIL_PROVIDER === 'fake' ||
    env.EMAIL_PROVIDER === 'ses' ||
    env.EMAIL_PROVIDER === 'resend'
    ? env.EMAIL_PROVIDER
    : undefined;
}

function requireEnv(env: NodeJS.ProcessEnv, name: string, provider: string): string {
  const value = env[name];
  if (!value) throw new Error(`${name} is required when EMAIL_PROVIDER=${provider}.`);
  return value;
}

/**
 * Builds the outbox handler registry for the current deployment.
 *
 * Analytics uses the configured Umami sink, or the in-memory fake only under an
 * explicit `OUTBOX_ADAPTERS=fake` non-production opt-in. Email is chosen by an
 * explicit `EMAIL_PROVIDER` (`fake` or `ses`); a fake provider never sends in
 * production. Email eligibility (suppression + marketing consent) is always
 * re-checked against the real database regardless of which email provider is
 * selected — a fake email provider in a preview still respects real suppression
 * data. The deletion-ledger handler is registered independently so deleting
 * customer data works even when analytics/email are unconfigured, and it fails
 * closed when the ledger itself is not configured.
 */
export function createOutboxJobHandlers(
  env: NodeJS.ProcessEnv = process.env,
  eligibility: EmailEligibilityChecker = new DatabaseEmailStore(),
  deliveryOverride?: EmailDeliveryRecorder,
): JobHandlerRegistry {
  const explicitFake = env.OUTBOX_ADAPTERS === FAKE_OUTBOX_ADAPTERS_VALUE;
  const allowFakes = explicitFake && env.NODE_ENV !== 'production';
  const emailProvider = readEmailProvider(env);

  const analytics = allowFakes ? new FakeAnalyticsSink() : loadUmamiAnalyticsSink(env);

  let email: EmailAdapter;
  if (emailProvider === 'fake') {
    // The fake never sends in production, even if explicitly requested there.
    email = env.NODE_ENV === 'production' ? unconfiguredEmailAdapter() : new FakeEmailAdapter();
  } else if (emailProvider === 'ses') {
    email = new SesEmailAdapter({
      region: requireEnv(env, 'AWS_REGION', 'ses'),
      sender: {
        fromAddress: requireEnv(env, 'SES_FROM_EMAIL', 'ses'),
        fromName: requireEnv(env, 'SES_FROM_NAME', 'ses'),
        replyToAddress: env.SES_REPLY_TO_EMAIL,
      },
      configurationSetName: env.SES_CONFIGURATION_SET_NAME,
    });
  } else if (emailProvider === 'resend') {
    email = new ResendEmailAdapter({
      apiKey: requireEnv(env, 'RESEND_API_KEY', 'resend'),
      sender: {
        fromAddress: requireEnv(env, 'RESEND_FROM_EMAIL', 'resend'),
        fromName: requireEnv(env, 'RESEND_FROM_NAME', 'resend'),
        replyToAddress: env.RESEND_REPLY_TO_EMAIL,
      },
    });
  } else {
    // No email provider selected: email jobs fail per-job, but analytics and the
    // deletion ledger still work.
    email = unconfiguredEmailAdapter();
  }

  const registry =
    emailProvider === 'resend' ? loadMachineRegistry(env.MACHINE_REGISTRY_JSON) : undefined;
  const delivery: EmailDeliveryRecorder | undefined =
    deliveryOverride ??
    (eligibility instanceof DatabaseEmailStore
      ? {
          prepare: async (input) => {
            const provider = emailProvider;
            if (!provider) throw new JobHandlerError('provider_not_configured', false);
            const providerAccount =
              provider === 'resend'
                ? registry?.resendForWorkspace(input.workspaceId)?.providerAccount
                : provider;
            if (
              !providerAccount ||
              (provider === 'resend' && providerAccount !== env.RESEND_ACCOUNT_ID)
            ) {
              throw new JobHandlerError('email_account_not_configured', false);
            }
            await eligibility.prepareDelivery({ ...input, provider, providerAccount });
          },
          recordResult: (input) => eligibility.recordDeliveryResult(input),
        }
      : undefined);
  const base = createJobHandlerRegistry({
    email,
    analytics: analytics ?? {
      capture: async () => {
        throw new JobHandlerError('provider_not_configured', false);
      },
    },
    eligibility,
    delivery,
  });

  // The deletion-ledger handler is registered independently of analytics/email:
  // deleting customer data must work even when no other provider is configured,
  // and it fails closed when the ledger itself is not configured.
  const handlers = new Map(base);
  handlers.set(
    'tracking_otp_email',
    createTrackingOtpHandler({
      email,
      eligibility,
      delivery,
      secret: loadTrackingSecret(env),
      contactHashSecret: () => requireContactHashSecret(env),
    }),
  );
  const ledger = allowFakes ? new InMemoryDeletionLedger() : createDeletionLedgerFromEnv(env);
  handlers.set(
    'deletion_ledger_publish',
    createDeletionLedgerHandler(
      new DeletionLedgerService({ ledger, store: new DatabaseDeletionLedgerStore() }),
    ),
  );
  handlers.set('suppression_ledger_publish', async (job) => {
    const parsed = z
      .object({
        contactHash: z.string().regex(/^[a-f0-9]{64}$/),
        reason: z.enum(['hard_bounce', 'complaint', 'manual']),
        occurredAt: z.iso.datetime(),
      })
      .strict()
      .safeParse(job.payload);
    if (job.payloadVersion !== 1 || !parsed.success)
      throw new JobHandlerError('invalid_job_payload', false);
    if (!ledger) throw new JobHandlerError('deletion_ledger_not_configured', true);
    const ack = await ledger.publish({
      eventId: job.messageId,
      workspaceId: job.workspaceId,
      action: 'suppress_contact',
      subjectType: 'contact',
      subjectId: parsed.data.contactHash,
      reason: parsed.data.reason,
      occurredAt: parsed.data.occurredAt,
    });
    return { status: 'completed', providerId: ack.acknowledgementId };
  });
  return handlers;
}
