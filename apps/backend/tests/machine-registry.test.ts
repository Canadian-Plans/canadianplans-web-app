import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  MachineRegistry,
  loadMachineRegistry,
  type MachineRegistryConfig,
} from '../src/machines/registry.js';

const WORKSPACE_A = '10000000-0000-4000-8000-000000000101';
const WORKSPACE_B = '10000000-0000-4000-8000-000000000102';
const WEBHOOK_SECRET = 'webhook-verification-secret-0001';
const SCHEDULER_SECRET = 'scheduler-shared-secret-000000001';

const config: MachineRegistryConfig = {
  webhooks: [
    {
      selector: 'sanity-site-1',
      provider: 'sanity',
      providerAccount: 'acct_site1',
      workspaceId: WORKSPACE_A,
      verificationSecret: WEBHOOK_SECRET,
      revoked: false,
    },
    {
      selector: 'sanity-retired',
      provider: 'sanity',
      providerAccount: 'acct_old',
      workspaceId: WORKSPACE_A,
      verificationSecret: WEBHOOK_SECRET,
      revoked: true,
    },
  ],
  schedulers: [
    {
      selector: 'outbox-runner',
      secret: SCHEDULER_SECRET,
      workspaceIds: [WORKSPACE_A],
      scopes: ['outbox:run'],
      revoked: false,
    },
  ],
};

const registry = new MachineRegistry(config);
const rawBody = JSON.stringify({ event: 'offer.published', id: 'offer_1' });
const validSignature = createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

describe('machine webhook resolution', () => {
  it('resolves a registered webhook with a valid signature and matching account', () => {
    const result = registry.resolveWebhook({
      selector: 'sanity-site-1',
      providerAccount: 'acct_site1',
      signature: validSignature,
      rawBody,
    });
    expect(result).toEqual({ ok: true, workspaceId: WORKSPACE_A, providerAccount: 'acct_site1' });
  });

  it('fails closed on an unknown selector', () => {
    expect(
      registry.resolveWebhook({
        selector: 'does-not-exist',
        providerAccount: 'acct_site1',
        signature: validSignature,
        rawBody,
      }),
    ).toEqual({ ok: false, reason: 'machine_unknown' });
  });

  it('treats a revoked selector as unknown', () => {
    expect(
      registry.resolveWebhook({
        selector: 'sanity-retired',
        providerAccount: 'acct_old',
        signature: createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex'),
        rawBody,
      }),
    ).toEqual({ ok: false, reason: 'machine_unknown' });
  });

  it('rejects an invalid signature', () => {
    expect(
      registry.resolveWebhook({
        selector: 'sanity-site-1',
        providerAccount: 'acct_site1',
        signature: createHmac('sha256', 'wrong-secret').update(rawBody).digest('hex'),
        rawBody,
      }),
    ).toEqual({ ok: false, reason: 'machine_signature_invalid' });
  });

  it('rejects a signature over a tampered body', () => {
    expect(
      registry.resolveWebhook({
        selector: 'sanity-site-1',
        providerAccount: 'acct_site1',
        signature: validSignature,
        rawBody: `${rawBody} `,
      }).ok,
    ).toBe(false);
  });

  it('rejects the wrong provider account', () => {
    expect(
      registry.resolveWebhook({
        selector: 'sanity-site-1',
        providerAccount: 'acct_other',
        signature: validSignature,
        rawBody,
      }),
    ).toEqual({ ok: false, reason: 'machine_account_mismatch' });
  });

  it('fails closed on cross-workspace confusion', () => {
    expect(
      registry.resolveWebhook({
        selector: 'sanity-site-1',
        providerAccount: 'acct_site1',
        signature: validSignature,
        rawBody,
        expectedWorkspaceId: WORKSPACE_B,
      }),
    ).toEqual({ ok: false, reason: 'machine_workspace_mismatch' });
  });
});

describe('machine scheduler resolution', () => {
  it('resolves a scheduler identity with the correct secret', () => {
    const result = registry.resolveScheduler({
      selector: 'outbox-runner',
      secret: SCHEDULER_SECRET,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.workspaceIds).toEqual([WORKSPACE_A]);
    expect(result.hasScope('outbox:run')).toBe(true);
    expect(result.hasScope('reconcile:run')).toBe(false);
    expect(result.authorizeWorkspace(WORKSPACE_A)).toBe(true);
    expect(result.authorizeWorkspace(WORKSPACE_B)).toBe(false);
  });

  it('rejects an invalid scheduler secret', () => {
    expect(
      registry.resolveScheduler({ selector: 'outbox-runner', secret: 'nope-nope-nope-000000001' }),
    ).toEqual({
      ok: false,
      reason: 'machine_signature_invalid',
    });
  });

  it('fails closed on an unknown scheduler selector', () => {
    expect(registry.resolveScheduler({ selector: 'ghost', secret: SCHEDULER_SECRET })).toEqual({
      ok: false,
      reason: 'machine_unknown',
    });
  });
});

describe('registry loading', () => {
  it('produces a deny-all registry when no configuration is provided', () => {
    const empty = loadMachineRegistry('');
    expect(
      empty.resolveWebhook({
        selector: 'sanity-site-1',
        providerAccount: 'acct_site1',
        signature: validSignature,
        rawBody,
      }),
    ).toEqual({ ok: false, reason: 'machine_unknown' });
  });

  it('parses and validates registry JSON', () => {
    const loaded = loadMachineRegistry(JSON.stringify(config));
    expect(
      loaded.resolveScheduler({ selector: 'outbox-runner', secret: SCHEDULER_SECRET }).ok,
    ).toBe(true);
  });

  it('rejects structurally invalid registry JSON', () => {
    expect(() => loadMachineRegistry(JSON.stringify({ webhooks: [{ selector: 'x' }] }))).toThrow();
  });
});
