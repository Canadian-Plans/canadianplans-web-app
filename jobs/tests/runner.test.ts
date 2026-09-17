import { describe, expect, it, vi } from 'vitest';

import {
  JobHandlerError,
  OutboxRunner,
  createJobHandlerRegistry,
  retryDelayMs,
  type ClaimedJob,
  type JobOutcome,
  type OutboxStore,
} from '../src/index.js';
import { FakeAnalyticsAdapter, FakeEmailAdapter } from '@canadian-plans/adapters';

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

  it('only sends sanitized analytics identifiers and stable email message ids', async () => {
    const email = new FakeEmailAdapter();
    const analytics = new FakeAnalyticsAdapter();
    const registry = createJobHandlerRegistry({ email, analytics });
    const analyticsJob = job();
    await registry.get('analytics_order_submitted')?.(analyticsJob);
    const emailJob = job({
      jobType: 'order_acknowledgement_email',
      payload: { orderId: '22222222-2222-4222-8222-222222222222', reference: 'CP-ABC123' },
    });
    await registry.get('order_acknowledgement_email')?.(emailJob);
    await registry.get('order_acknowledgement_email')?.(emailJob);

    expect(analytics.events).toEqual([
      {
        workspaceId: analyticsJob.workspaceId,
        eventId: analyticsJob.messageId,
        name: 'order_submitted',
        orderId: '22222222-2222-4222-8222-222222222222',
      },
    ]);
    expect(email.deliveries).toHaveLength(1);
    expect(email.deliveries[0]?.messageId).toBe(emailJob.messageId);
    expect(registry.has('commission_placeholder')).toBe(false);
  });
});

describe('retryDelayMs', () => {
  it('applies capped exponential backoff and jitter', () => {
    expect(retryDelayMs(1, () => 0, 1_000, 5_000)).toBe(500);
    expect(retryDelayMs(3, () => 0.5, 1_000, 5_000)).toBe(4_000);
    expect(retryDelayMs(99, () => 1, 1_000, 5_000)).toBe(7_500);
  });
});
