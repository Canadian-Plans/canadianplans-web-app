import { describe, expect, it } from 'vitest';

import {
  createDeletionLedgerFromEnv,
  HttpDeletionLedger,
  InMemoryDeletionLedger,
  type DeletionLedgerEvent,
} from './deletion-ledger.js';

const EVENT: DeletionLedgerEvent = {
  eventId: '11111111-1111-4111-8111-111111111111',
  workspaceId: '22222222-2222-4222-8222-222222222222',
  action: 'delete_customer_data',
  subjectType: 'order',
  subjectId: '33333333-3333-4333-8333-333333333333',
  occurredAt: '2026-09-20T00:00:00.000Z',
};

function recordingFetch(response: Response) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const fn: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return response;
  };
  return { fn, calls };
}

describe('InMemoryDeletionLedger', () => {
  it('is idempotent on a repeated logical event id', async () => {
    const ledger = new InMemoryDeletionLedger();
    const first = await ledger.publish(EVENT);
    const second = await ledger.publish(EVENT);

    expect(first.acknowledgementId).toBe(second.acknowledgementId);
    expect(ledger.published).toHaveLength(1);
    expect(ledger.has(EVENT.eventId)).toBe(true);
  });

  it('fails closed when the ledger is unavailable', async () => {
    const ledger = new InMemoryDeletionLedger(false);
    await expect(ledger.publish(EVENT)).rejects.toThrow('deletion_ledger_unavailable');
    expect(ledger.has(EVENT.eventId)).toBe(false);
  });
});

describe('HttpDeletionLedger', () => {
  it('puts the event at a stable key with the write credential', async () => {
    const { fn, calls } = recordingFetch(new Response('{}', { status: 200 }));
    const ledger = new HttpDeletionLedger({
      endpoint: 'https://ledger.example.test/bucket/',
      token: 'write-only-token',
      fetch: fn,
    });

    const ack = await ledger.publish(EVENT);

    expect(ack.acknowledgementId).toBe(`ledger:${EVENT.eventId}`);
    expect(calls[0]?.url).toBe(`https://ledger.example.test/bucket/events/${EVENT.eventId}.json`);
    const headers = new Headers(calls[0]?.init?.headers);
    expect(headers.get('authorization')).toBe('Bearer write-only-token');
    expect(calls[0]?.init?.method).toBe('PUT');
  });

  it('throws on a non-2xx ledger response so the caller stays pending', async () => {
    const { fn } = recordingFetch(new Response('nope', { status: 503 }));
    const ledger = new HttpDeletionLedger({
      endpoint: 'https://ledger.example.test',
      token: 't',
      fetch: fn,
    });
    await expect(ledger.publish(EVENT)).rejects.toThrow('deletion_ledger_http_503');
  });
});

describe('createDeletionLedgerFromEnv', () => {
  it('is undefined unless both the endpoint and write token are set', () => {
    expect(createDeletionLedgerFromEnv({})).toBeUndefined();
    expect(
      createDeletionLedgerFromEnv({ DELETION_LEDGER_ENDPOINT: 'https://l.test' }),
    ).toBeUndefined();
    expect(
      createDeletionLedgerFromEnv({
        DELETION_LEDGER_ENDPOINT: 'https://l.test',
        DELETION_LEDGER_TOKEN: 't',
      }),
    ).toBeInstanceOf(HttpDeletionLedger);
  });
});
