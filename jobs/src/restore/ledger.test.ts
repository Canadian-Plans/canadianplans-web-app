import { describe, expect, it } from 'vitest';

import {
  reconcileLedger,
  signCheckpoint,
  ledgerEventSchema,
  type LedgerEventRecord,
  type LedgerReader,
} from './ledger.js';

const KEY = 'checkpoint-verification-key';

function baseEvent(overrides: Partial<LedgerEventRecord> = {}): LedgerEventRecord {
  return ledgerEventSchema.parse({
    eventId: 'op-1',
    workspaceId: 'w1',
    subjectType: 'order',
    subjectId: 'order-1',
    action: 'delete_customer_data',
    occurredAt: '2026-09-14T00:00:00.000Z',
    schemaVersion: 1,
    versionId: 'v1',
    ...overrides,
  });
}

function checkpointFor(events: LedgerEventRecord[], now = new Date('2026-09-14T01:00:00.000Z')) {
  return signCheckpoint(
    {
      schemaVersion: 1,
      sequence: 1,
      issuedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 3600_000).toISOString(),
      eventKeys: events.map((event) => `${event.eventId}:${event.versionId}`),
    },
    KEY,
  );
}

describe('reconcileLedger', () => {
  it('reconciles a fresh checkpoint against the exact event set and replays idempotently', async () => {
    const events = [baseEvent()];
    const checkpoint = checkpointFor(events);
    const reader: LedgerReader = {
      listEvents: async () => events,
      getFreshCheckpoint: async () => checkpoint,
    };
    const replayed: string[] = [];
    const result = await reconcileLedger({
      reader,
      verificationKey: KEY,
      now: () => new Date('2026-09-14T01:30:00.000Z'),
      replay: async (event) => {
        replayed.push(event.eventId);
      },
    });
    expect(result).toEqual({ status: 'reconciled', replayedEventIds: ['op-1'] });
    expect(replayed).toEqual(['op-1']);
  });

  it('includes a suppression event in the same authenticated restore checkpoint', async () => {
    const suppression: LedgerEventRecord = {
      eventId: 'suppress-1',
      workspaceId: 'w1',
      subjectType: 'contact',
      subjectId: 'a'.repeat(64),
      action: 'suppress_contact',
      reason: 'hard_bounce',
      occurredAt: '2026-09-14T00:00:00.000Z',
      schemaVersion: 1,
      versionId: 'v1',
    };
    const replayed: LedgerEventRecord[] = [];
    const result = await reconcileLedger({
      reader: {
        listEvents: async () => [suppression],
        getFreshCheckpoint: async () => checkpointFor([suppression]),
      },
      verificationKey: KEY,
      now: () => new Date('2026-09-14T01:30:00.000Z'),
      replay: async (event) => {
        replayed.push(event);
      },
    });
    expect(result.status).toBe('reconciled');
    expect(replayed).toEqual([suppression]);
  });

  it('fails closed when the ledger has no checkpoint at all', async () => {
    const reader: LedgerReader = {
      listEvents: async () => [],
      getFreshCheckpoint: async () => undefined,
    };
    const result = await reconcileLedger({
      reader,
      verificationKey: KEY,
      replay: async () => {},
    });
    expect(result).toEqual({ status: 'restore_fail_closed', reason: 'checkpoint_unavailable' });
  });

  it('fails closed when the ledger itself is unreachable', async () => {
    const events = [baseEvent()];
    const checkpoint = checkpointFor(events);
    const reader: LedgerReader = {
      listEvents: async () => {
        throw new Error('network_error');
      },
      getFreshCheckpoint: async () => checkpoint,
    };
    const result = await reconcileLedger({
      reader,
      verificationKey: KEY,
      now: () => new Date('2026-09-14T01:30:00.000Z'),
      replay: async () => {},
    });
    expect(result).toEqual({
      status: 'restore_fail_closed',
      reason: 'ledger_unavailable_or_malformed',
    });
  });

  it('fails closed on a tampered checkpoint signature', async () => {
    const events = [baseEvent()];
    const checkpoint = { ...checkpointFor(events), signatureHex: 'ff'.repeat(32) };
    const reader: LedgerReader = {
      listEvents: async () => events,
      getFreshCheckpoint: async () => checkpoint,
    };
    const result = await reconcileLedger({
      reader,
      verificationKey: KEY,
      now: () => new Date('2026-09-14T01:30:00.000Z'),
      replay: async () => {},
    });
    expect(result).toEqual({
      status: 'restore_fail_closed',
      reason: 'checkpoint_invalid_signature',
    });
  });

  it('fails closed on a stale/expired checkpoint', async () => {
    const events = [baseEvent()];
    const checkpoint = checkpointFor(events, new Date('2026-09-01T00:00:00.000Z'));
    const reader: LedgerReader = {
      listEvents: async () => events,
      getFreshCheckpoint: async () => checkpoint,
    };
    const result = await reconcileLedger({
      reader,
      verificationKey: KEY,
      now: () => new Date('2026-09-14T00:00:00.000Z'),
      replay: async () => {},
    });
    expect(result).toEqual({ status: 'restore_fail_closed', reason: 'checkpoint_stale' });
  });

  it('fails closed when the checkpoint key set does not exactly match the ledger', async () => {
    const events = [baseEvent(), baseEvent({ eventId: 'op-2' })];
    // Checkpoint only attests to one of the two events.
    const checkpoint = checkpointFor([events[0]!]);
    const reader: LedgerReader = {
      listEvents: async () => events,
      getFreshCheckpoint: async () => checkpoint,
    };
    const result = await reconcileLedger({
      reader,
      verificationKey: KEY,
      now: () => new Date('2026-09-14T01:30:00.000Z'),
      replay: async () => {},
    });
    expect(result).toEqual({ status: 'restore_fail_closed', reason: 'checkpoint_key_mismatch' });
  });

  it('fails closed on an event carrying a forbidden raw PII field', async () => {
    const events = [{ ...baseEvent(), email: 'someone@example.com' }];
    const checkpoint = checkpointFor([baseEvent()]);
    const reader: LedgerReader = {
      listEvents: async () => events,
      getFreshCheckpoint: async () => checkpoint,
    };
    const result = await reconcileLedger({
      reader,
      verificationKey: KEY,
      now: () => new Date('2026-09-14T01:30:00.000Z'),
      replay: async () => {},
    });
    expect(result).toEqual({
      status: 'restore_fail_closed',
      reason: 'ledger_unavailable_or_malformed',
    });
  });

  it('fails closed when replaying an event throws', async () => {
    const events = [baseEvent()];
    const checkpoint = checkpointFor(events);
    const reader: LedgerReader = {
      listEvents: async () => events,
      getFreshCheckpoint: async () => checkpoint,
    };
    const result = await reconcileLedger({
      reader,
      verificationKey: KEY,
      now: () => new Date('2026-09-14T01:30:00.000Z'),
      replay: async () => {
        throw new Error('apply_failed');
      },
    });
    expect(result).toEqual({ status: 'restore_fail_closed', reason: 'replay_failed:op-1' });
  });
});
