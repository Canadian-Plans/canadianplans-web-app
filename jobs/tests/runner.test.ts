import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  JobHandlerError,
  OutboxRunner,
  createJobHandlerRegistry,
  retryDelayMs,
  type ClaimedJob,
  type EmailEligibilityChecker,
  type JobOutcome,
  type OutboxStore,
} from '../src/index.js';
import { FakeAnalyticsSink, FakeEmailAdapter } from '@canadian-plans/adapters';

const job = (overrides: Partial<ClaimedJob> = {}): ClaimedJob => ({
  id: crypto.randomUUID(),
  workspaceId: '11111111-1111-4111-8111-111111111111',
  jobType: 'analytics_order_submitted',
  messageId: crypto.randomUUID(),
  payloadVersion: 1,
  payload: { orderId: '22222222-2222-4222-8222-222222222222' },
  attempts: 1,
  leaseOwnerId: crypto.randomUUID(),
  ...overrides,
});

describe('outbox runner', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses scoped claims, calls a provider after claim resolves, then records the outcome', async () => {
    const calls: string[] = [];
    const claimed = job();
    const store: OutboxStore = {
      claim: vi.fn(async ({ workspaceId }) => {
        calls.push(`claim:${workspaceId}`);
        return [{ ...claimed, workspaceId }];
      }),
      recordOutcome: vi.fn(async ({ workspaceId }) => {
        calls.push(`record:${workspaceId}`);
        return 'recorded' as const;
      }),
    };
    const runner = new OutboxRunner({
      store,
      handlers: new Map([
        [
          claimed.jobType,
          async () => {
            calls.push('provider');
            return { status: 'completed' as const, providerId: 'provider-1' };
          },
        ],
      ]),
      leaseId: () => claimed.leaseOwnerId,
    });

    const result = await runner.run({
      authorizedWorkspaceIds: [claimed.workspaceId],
      actorId: '33333333-3333-4333-8333-333333333333',
    });

    expect(calls).toEqual([
      `claim:${claimed.workspaceId}`,
      'provider',
      `record:${claimed.workspaceId}`,
    ]);
    expect(result).toMatchObject({ claimed: 1, completed: 1 });
  });

  it('deduplicates the explicit authorized workspace set', async () => {
    const store: OutboxStore = {
      claim: vi.fn(async () => []),
      recordOutcome: vi.fn(async () => 'recorded' as const),
    };
    const runner = new OutboxRunner({ store, handlers: new Map() });
    await runner.run({
      authorizedWorkspaceIds: [job().workspaceId, job().workspaceId],
      actorId: crypto.randomUUID(),
    });
    expect(store.claim).toHaveBeenCalledOnce();
  });

  it('fails permanently on an unregistered handler and at max attempts', async () => {
    const outcomes: JobOutcome[] = [];
    const jobs = [
      job({ jobType: 'commission_placeholder' }),
      job({ jobType: 'known', attempts: 3 }),
    ];
    const store: OutboxStore = {
      claim: vi.fn(async () => jobs),
      recordOutcome: vi.fn(async ({ outcome }) => {
        outcomes.push(outcome);
        return 'recorded' as const;
      }),
    };
    const runner = new OutboxRunner({
      store,
      handlers: new Map([
        [
          'known',
          async () => {
            throw new JobHandlerError('timeout', true);
          },
        ],
      ]),
      maxAttempts: 3,
    });
    await runner.run({ authorizedWorkspaceIds: [job().workspaceId], actorId: crypto.randomUUID() });
    expect(outcomes).toEqual([
      { status: 'failed', errorCode: 'handler_not_registered' },
      { status: 'failed', errorCode: 'timeout' },
    ]);
  });

  it('aborts a handler past the per-handler timeout and records uncertain', async () => {
    vi.useFakeTimers();
    const outcomes: JobOutcome[] = [];
    let signal: AbortSignal | undefined;
    const claimed = job({ jobType: 'slow_provider' });
    const store: OutboxStore = {
      claim: vi.fn(async () => [claimed]),
      recordOutcome: vi.fn(async ({ outcome }) => {
        outcomes.push(outcome);
        return 'recorded' as const;
      }),
    };
    const runner = new OutboxRunner({
      store,
      handlers: new Map([
        [
          'slow_provider',
          (_claimed, abortSignal) => {
            signal = abortSignal;
            return new Promise<never>(() => undefined);
          },
        ],
      ]),
      handlerTimeoutMs: 1_000,
    });

    const pending = runner.run({
      authorizedWorkspaceIds: [claimed.workspaceId],
      actorId: crypto.randomUUID(),
    });
    await vi.advanceTimersByTimeAsync(1_000);
    await pending;

    // A timeout may have already reached the provider, so it is uncertain
    // rather than an automatic retry.
    expect(outcomes).toEqual([{ status: 'uncertain', errorCode: 'handler_timeout' }]);
    expect(signal?.aborted).toBe(true);
  });

  it('stops claiming new batches after the run deadline', async () => {
    let clockMs = 0;
    const claim = vi.fn(async () => {
      clockMs += 600;
      return [];
    });
    const store: OutboxStore = {
      claim,
      recordOutcome: vi.fn(async () => 'recorded' as const),
    };
    const runner = new OutboxRunner({
      store,
      handlers: new Map(),
      runDeadlineMs: 1_000,
      now: () => new Date(clockMs),
    });

    await runner.run({
      authorizedWorkspaceIds: [
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        '33333333-3333-4333-8333-333333333333',
      ],
      actorId: crypto.randomUUID(),
    });

    // Two claims land before the 1000ms budget (clock reaches 1200); the third
    // workspace is never claimed.
    expect(claim).toHaveBeenCalledTimes(2);
  });

  it('counts a lost lease instead of the outcome, and does not count it as completed', async () => {
    const claimed = job();
    const store: OutboxStore = {
      claim: vi.fn(async () => [claimed]),
      recordOutcome: vi.fn(async () => 'lease_lost' as const),
    };
    const runner = new OutboxRunner({
      store,
      handlers: new Map([
        [claimed.jobType, async () => ({ status: 'completed' as const, providerId: 'provider-1' })],
      ]),
      leaseId: () => claimed.leaseOwnerId,
    });

    const result = await runner.run({
      authorizedWorkspaceIds: [claimed.workspaceId],
      actorId: crypto.randomUUID(),
    });

    expect(result.leaseLost).toBe(1);
    expect(result.claimed).toBe(1);
    // A lost lease is not attributed to the completed/retried/failed counters.
    expect(result.completed).toBe(0);
    expect(result.retried).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.uncertain).toBe(0);
  });

  it('only sends sanitized analytics identifiers and stable email message ids', async () => {
    const email = new FakeEmailAdapter();
    const analytics = new FakeAnalyticsSink();
    const eligibility: EmailEligibilityChecker = {
      checkTransactional: async () => ({ eligible: true }),
      checkMarketing: async () => ({ eligible: true }),
    };
    const registry = createJobHandlerRegistry({ email, analytics, eligibility });
    const analyticsJob = job();
    await registry.get('analytics_order_submitted')?.(analyticsJob);
    const emailJob = job({
      jobType: 'order_acknowledgement_email',
      payload: {
        orderId: '22222222-2222-4222-8222-222222222222',
        reference: 'CP-ABC123',
        toAddress: 'customer@example.com',
        contactHash: 'hash-1',
      },
    });
    await registry.get('order_acknowledgement_email')?.(emailJob);
    await registry.get('order_acknowledgement_email')?.(emailJob);

    expect(analytics.events).toEqual([
      {
        workspaceId: analyticsJob.workspaceId,
        eventId: analyticsJob.messageId,
        name: 'order_submitted',
        subjectId: '22222222-2222-4222-8222-222222222222',
      },
    ]);
    expect(email.deliveries).toHaveLength(1);
    expect(email.deliveries[0]?.messageId).toBe(emailJob.messageId);
    expect(registry.has('commission_placeholder')).toBe(false);
  });

  it('emits exactly one lead_saved event for the lead job', async () => {
    const email = new FakeEmailAdapter();
    const analytics = new FakeAnalyticsSink();
    const eligibility: EmailEligibilityChecker = {
      checkTransactional: async () => ({ eligible: true }),
      checkMarketing: async () => ({ eligible: true }),
    };
    const registry = createJobHandlerRegistry({ email, analytics, eligibility });
    const leadJob = job({
      jobType: 'analytics_lead_saved',
      payload: { leadId: '44444444-4444-4444-8444-444444444444' },
    });

    const result = await registry.get('analytics_lead_saved')?.(leadJob);

    expect(result?.status).toBe('completed');
    expect(analytics.events).toEqual([
      {
        workspaceId: leadJob.workspaceId,
        eventId: leadJob.messageId,
        name: 'lead_saved',
        subjectId: '44444444-4444-4444-8444-444444444444',
      },
    ]);
  });

  it('never sends a transactional email a second time for the same duplicate logical job', async () => {
    const email = new FakeEmailAdapter();
    const eligibility: EmailEligibilityChecker = {
      checkTransactional: async () => ({ eligible: true }),
      checkMarketing: async () => ({ eligible: true }),
    };
    const registry = createJobHandlerRegistry({
      email,
      analytics: new FakeAnalyticsSink(),
      eligibility,
    });
    const duplicateJob = job({
      jobType: 'order_status_email',
      payload: {
        orderId: '22222222-2222-4222-8222-222222222222',
        reference: 'CP-DUP001',
        toAddress: 'customer@example.com',
        contactHash: 'hash-dup',
      },
    });
    const first = await registry.get('order_status_email')?.(duplicateJob);
    const second = await registry.get('order_status_email')?.(duplicateJob);

    expect(email.deliveries).toHaveLength(1);
    expect(first).toMatchObject({ status: 'completed' });
    expect(second).toEqual(first);
  });

  it('blocks a transactional send under a hard-bounce/complaint suppression but never checks marketing opt-out for it', async () => {
    const email = new FakeEmailAdapter();
    let marketingChecked = false;
    const eligibility: EmailEligibilityChecker = {
      checkTransactional: async () => ({ eligible: false, reason: 'hard_bounce' }),
      checkMarketing: async () => {
        marketingChecked = true;
        return { eligible: true };
      },
    };
    const registry = createJobHandlerRegistry({
      email,
      analytics: new FakeAnalyticsSink(),
      eligibility,
    });
    const suppressedJob = job({
      jobType: 'order_dispatch_email',
      payload: {
        orderId: '22222222-2222-4222-8222-222222222222',
        reference: 'CP-SUP001',
        toAddress: 'bounced@example.com',
        contactHash: 'hash-bounced',
      },
    });
    const outcome = await registry.get('order_dispatch_email')?.(suppressedJob);

    expect(email.deliveries).toHaveLength(0);
    expect(outcome).toMatchObject({ status: 'completed' });
    expect(marketingChecked).toBe(false);
  });

  it('allows a transactional send for a contact who only opted out of marketing', async () => {
    const email = new FakeEmailAdapter();
    const eligibility: EmailEligibilityChecker = {
      // checkTransactional never consults marketing consent, so a
      // marketing-only opt-out must never make this ineligible.
      checkTransactional: async () => ({ eligible: true }),
      checkMarketing: async () => ({ eligible: false, reason: 'opted_out' }),
    };
    const registry = createJobHandlerRegistry({
      email,
      analytics: new FakeAnalyticsSink(),
      eligibility,
    });
    const transactionalJob = job({
      jobType: 'order_activation_email',
      payload: {
        orderId: '22222222-2222-4222-8222-222222222222',
        reference: 'CP-OPT001',
        toAddress: 'optedout@example.com',
        contactHash: 'hash-optout',
      },
    });
    const outcome = await registry.get('order_activation_email')?.(transactionalJob);

    expect(email.deliveries).toHaveLength(1);
    expect(outcome).toMatchObject({ status: 'completed' });
  });

  it('honours a marketing opt-out for the abandoned-form marketing template', async () => {
    const email = new FakeEmailAdapter();
    const eligibility: EmailEligibilityChecker = {
      checkTransactional: async () => ({ eligible: true }),
      checkMarketing: async () => ({ eligible: false, reason: 'opted_out' }),
    };
    const registry = createJobHandlerRegistry({
      email,
      analytics: new FakeAnalyticsSink(),
      eligibility,
    });
    const marketingJob = job({
      jobType: 'abandoned_form_marketing_email',
      payload: {
        leadId: '44444444-4444-4444-8444-444444444444',
        toAddress: 'lead@example.com',
        contactHash: 'hash-lead',
        unsubscribeUrl: 'https://example.com/unsubscribe?token=abc',
      },
    });
    const outcome = await registry.get('abandoned_form_marketing_email')?.(marketingJob);

    expect(email.deliveries).toHaveLength(0);
    expect(outcome).toMatchObject({ status: 'completed' });
  });

  it('rejects an unsupported payload version and an invalid provider event error code', async () => {
    const email = new FakeEmailAdapter();
    const eligibility: EmailEligibilityChecker = {
      checkTransactional: async () => ({ eligible: true }),
      checkMarketing: async () => ({ eligible: true }),
    };
    const registry = createJobHandlerRegistry({
      email,
      analytics: new FakeAnalyticsSink(),
      eligibility,
    });
    const badVersion = job({ jobType: 'order_status_email', payloadVersion: 2 });
    await expect(registry.get('order_status_email')?.(badVersion)).rejects.toThrow(JobHandlerError);

    const badPayload = job({ jobType: 'order_status_email', payload: { not: 'valid' } });
    await expect(registry.get('order_status_email')?.(badPayload)).rejects.toThrow(JobHandlerError);
  });
});

describe('retryDelayMs', () => {
  it('applies capped exponential backoff and jitter', () => {
    expect(retryDelayMs(1, () => 0, 1_000, 5_000)).toBe(500);
    expect(retryDelayMs(3, () => 0.5, 1_000, 5_000)).toBe(4_000);
    expect(retryDelayMs(99, () => 1, 1_000, 5_000)).toBe(7_500);
  });
});
