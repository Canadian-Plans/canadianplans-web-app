import { describe, expect, it } from 'vitest';
import {
  JobHandlerError,
  OutboxRunner,
  type ClaimedJob,
  type JobOutcome,
  type OutboxStore,
} from '@canadian-plans/jobs';

import { createOutboxJobHandlers } from '../src/jobs/providers.js';

const WORKSPACE = '10000000-0000-4000-8000-000000000781';
const ACTOR = '20000000-0000-4000-8000-000000000781';

function job(overrides: Partial<ClaimedJob> = {}): ClaimedJob {
  return {
    id: crypto.randomUUID(),
    workspaceId: WORKSPACE,
    jobType: 'order_acknowledgement_email',
    messageId: crypto.randomUUID(),
    payloadVersion: 1,
    payload: { orderId: '22222222-2222-4222-8222-222222222222', reference: 'CP-ABC123' },
    attempts: 1,
    leaseOwnerId: crypto.randomUUID(),
    ...overrides,
  };
}

describe('outbox provider configuration', () => {
  it('constructs the fakes only for an explicit non-production opt-in', async () => {
    const handlers = createOutboxJobHandlers({ OUTBOX_ADAPTERS: 'fake', NODE_ENV: 'test' });
    const result = await handlers.get('order_acknowledgement_email')?.(job());
    expect(result?.status).toBe('completed');
  });

  it('refuses the fakes on a production deployment even when explicitly requested', async () => {
    const handlers = createOutboxJobHandlers({
      OUTBOX_ADAPTERS: 'fake',
      NODE_ENV: 'production',
    });
    const handler = handlers.get('order_acknowledgement_email');
    expect(handler).toBeDefined();
    await expect(handler?.(job())).rejects.toMatchObject({
      name: 'JobHandlerError',
      code: 'provider_not_configured',
      retryable: false,
    } satisfies Partial<JobHandlerError>);
  });

  it('records a permanent provider_not_configured failure when no provider is configured', async () => {
    const outcomes: JobOutcome[] = [];
    const claimed = job();
    const store: OutboxStore = {
      claim: async () => [claimed],
      recordOutcome: async ({ outcome }) => {
        outcomes.push(outcome);
        return 'recorded';
      },
    };
    const runner = new OutboxRunner({ store, handlers: createOutboxJobHandlers({}) });
    await runner.run({ authorizedWorkspaceIds: [WORKSPACE], actorId: ACTOR });

    expect(outcomes).toEqual([{ status: 'failed', errorCode: 'provider_not_configured' }]);
  });
});
