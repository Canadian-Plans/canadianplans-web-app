import { describe, expect, it } from 'vitest';
import { InMemoryDeletionLedger } from '@canadian-plans/adapters';
import { JobHandlerError, type ClaimedJob } from '@canadian-plans/jobs';

import {
  createDeletionLedgerHandler,
  DeletionLedgerService,
  type DeletionIntentRecord,
  type DeletionLedgerStore,
} from './ledger.js';

const WORKSPACE = '11111111-1111-4111-8111-111111111111';
const ACTOR = '22222222-2222-4222-8222-222222222222';
const DELETION = '33333333-3333-4333-8333-333333333333';
const ORDER = '44444444-4444-4444-8444-444444444444';

class MemoryLedgerStore implements DeletionLedgerStore {
  failAckOnce = false;
  readonly failedCodes: string[] = [];

  constructor(readonly rows: Map<string, DeletionIntentRecord>) {}

  private key(workspaceId: string, deletionId: string): string {
    return `${workspaceId}:${deletionId}`;
  }

  async loadIntent(input: {
    workspaceId: string;
    deletionId: string;
  }): Promise<DeletionIntentRecord | undefined> {
    const row = this.rows.get(this.key(input.workspaceId, input.deletionId));
    return row ? { ...row } : undefined;
  }

  async markAcknowledged(input: {
    workspaceId: string;
    deletionId: string;
    acknowledgementId: string;
  }): Promise<void> {
    if (this.failAckOnce) {
      this.failAckOnce = false;
      throw new Error('ack_write_crashed');
    }
    const row = this.rows.get(this.key(input.workspaceId, input.deletionId));
    if (!row) return;
    row.status = 'acknowledged';
    row.ledgerAckId = input.acknowledgementId;
  }

  async markFailed(input: {
    workspaceId: string;
    deletionId: string;
    errorCode: string;
  }): Promise<void> {
    this.failedCodes.push(input.errorCode);
    const row = this.rows.get(this.key(input.workspaceId, input.deletionId));
    if (row) row.status = 'failed';
  }
}

function intent(overrides: Partial<DeletionIntentRecord> = {}): DeletionIntentRecord {
  return {
    deletionId: DELETION,
    workspaceId: WORKSPACE,
    subjectId: ORDER,
    actorId: ACTOR,
    status: 'pending',
    ledgerAckId: null,
    ...overrides,
  };
}

function storeWith(row: DeletionIntentRecord): MemoryLedgerStore {
  return new MemoryLedgerStore(new Map([[`${row.workspaceId}:${row.deletionId}`, row]]));
}

describe('DeletionLedgerService', () => {
  it('reports not_found without publishing when there is no intent', async () => {
    const ledger = new InMemoryDeletionLedger();
    const service = new DeletionLedgerService({ ledger, store: storeWith(intent()) });
    expect(await service.publish({ workspaceId: WORKSPACE, deletionId: ORDER })).toEqual({
      status: 'not_found',
    });
    expect(ledger.published).toHaveLength(0);
  });

  it('publishes the event once and records the durable acknowledgement', async () => {
    const ledger = new InMemoryDeletionLedger();
    const store = storeWith(intent());
    const service = new DeletionLedgerService({ ledger, store });

    const first = await service.publish({ workspaceId: WORKSPACE, deletionId: DELETION });
    const second = await service.publish({ workspaceId: WORKSPACE, deletionId: DELETION });

    expect(first).toEqual({
      status: 'acknowledged',
      acknowledgementId: `in-memory-ledger:${DELETION}`,
    });
    expect(second).toEqual(first);
    // A duplicate job never publishes the event twice.
    expect(ledger.published).toHaveLength(1);
    expect(ledger.published[0]).toMatchObject({
      eventId: DELETION,
      workspaceId: WORKSPACE,
      action: 'delete_customer_data',
      subjectType: 'order',
      subjectId: ORDER,
    });
  });

  it('fails closed and records a failure when the ledger is unavailable', async () => {
    const ledger = new InMemoryDeletionLedger(false);
    const store = storeWith(intent());
    const service = new DeletionLedgerService({ ledger, store });

    await expect(service.publish({ workspaceId: WORKSPACE, deletionId: DELETION })).rejects.toThrow(
      'deletion_ledger_unavailable',
    );
    expect(store.failedCodes).toEqual(['deletion_ledger_unavailable']);
    expect(store.rows.get(`${WORKSPACE}:${DELETION}`)?.status).toBe('failed');
  });

  it('fails closed when no ledger is configured', async () => {
    const store = storeWith(intent());
    const service = new DeletionLedgerService({ ledger: undefined, store });
    await expect(service.publish({ workspaceId: WORKSPACE, deletionId: DELETION })).rejects.toThrow(
      'deletion_ledger_not_configured',
    );
    expect(store.failedCodes).toEqual([]);
  });

  it('retries idempotently after a crash between publish and acknowledgement', async () => {
    const ledger = new InMemoryDeletionLedger();
    const store = storeWith(intent());
    store.failAckOnce = true;
    const service = new DeletionLedgerService({ ledger, store });

    await expect(service.publish({ workspaceId: WORKSPACE, deletionId: DELETION })).rejects.toThrow(
      'ack_write_crashed',
    );
    // The event is already in the ledger; the retry must not duplicate it.
    expect(ledger.published).toHaveLength(1);

    expect(await service.publish({ workspaceId: WORKSPACE, deletionId: DELETION })).toEqual({
      status: 'acknowledged',
      acknowledgementId: `in-memory-ledger:${DELETION}`,
    });
    expect(ledger.published).toHaveLength(1);
    expect(store.rows.get(`${WORKSPACE}:${DELETION}`)?.status).toBe('acknowledged');
  });
});

function job(overrides: Partial<ClaimedJob> = {}): ClaimedJob {
  return {
    id: '55555555-5555-4555-8555-555555555555',
    workspaceId: WORKSPACE,
    jobType: 'deletion_ledger_publish',
    messageId: '66666666-6666-4666-8666-666666666666',
    payloadVersion: 1,
    payload: { deletionId: DELETION, orderId: ORDER },
    attempts: 1,
    leaseOwnerId: '77777777-7777-4777-8777-777777777777',
    ...overrides,
  };
}

describe('createDeletionLedgerHandler', () => {
  it('completes with the acknowledgement id', async () => {
    const service = new DeletionLedgerService({
      ledger: new InMemoryDeletionLedger(),
      store: storeWith(intent()),
    });
    const result = await createDeletionLedgerHandler(service)(job());
    expect(result).toEqual({ status: 'completed', providerId: `in-memory-ledger:${DELETION}` });
  });

  it('fails permanently for a missing intent or an invalid payload', async () => {
    const service = new DeletionLedgerService({
      ledger: new InMemoryDeletionLedger(),
      store: storeWith(intent()),
    });
    const handler = createDeletionLedgerHandler(service);
    await expect(handler(job({ payload: { deletionId: ORDER } }))).rejects.toMatchObject({
      name: 'JobHandlerError',
      retryable: false,
    } satisfies Partial<JobHandlerError>);
    await expect(handler(job({ payload: { nope: true } }))).rejects.toMatchObject({
      name: 'JobHandlerError',
      retryable: false,
    } satisfies Partial<JobHandlerError>);
  });
});
