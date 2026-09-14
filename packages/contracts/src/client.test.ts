import { describe, expect, it } from 'vitest';

import { BackendError, createBackendClient, type BackendClient } from './index';

const UUID = '00000000-0000-4000-8000-000000000001';

interface Captured {
  url: string;
  method: string;
  headers: Headers;
  body: string | undefined;
}

/** Builds a client whose fetch records the request and returns a canned response. */
function harness(status: number, body: unknown) {
  const calls: Captured[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({
      url: String(input),
      method: init?.method ?? 'GET',
      headers: new Headers(init?.headers),
      body: typeof init?.body === 'string' ? init.body : undefined,
    });
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  };
  const client = createBackendClient({
    baseUrl: 'https://api.example.test',
    credential: 'cplsk_test',
    fetch: fetchImpl,
  });
  return { client, calls };
}

describe('createBackendClient transport', () => {
  it('sends a bearer credential, JSON accept and a request id, and validates the response', async () => {
    const { client, calls } = harness(200, { ok: true, requestId: UUID });
    const result = await client.health();
    expect(result).toEqual({ ok: true, requestId: UUID });

    const call = calls[0];
    expect(call?.url).toBe('https://api.example.test/api/v1/health');
    expect(call?.headers.get('authorization')).toBe('Bearer cplsk_test');
    expect(call?.headers.get('accept')).toBe('application/json');
    expect(call?.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('serialises a JSON body with content-type on writes', async () => {
    const { client, calls } = harness(201, {
      lead: { id: UUID, workspaceId: UUID, status: 'draft', updatedAt: '2026-09-14T00:00:00.000Z' },
      draftGrant: { token: 't', expiresAt: '2026-09-14T00:00:00.000Z' },
      requestId: UUID,
    });
    await client.leads.create({ contact: { email: 'a@b.co' } });
    const call = calls[0];
    expect(call?.method).toBe('POST');
    expect(call?.headers.get('content-type')).toBe('application/json');
    expect(JSON.parse(call?.body ?? '{}')).toEqual({ contact: { email: 'a@b.co' } });
  });

  it('attaches the draft grant and idempotency key as headers on order submission', async () => {
    const order = {
      id: UUID,
      workspaceId: UUID,
      reference: 'CP-1',
      fulfilmentStatus: 'received',
      paymentState: 'not_required',
      deliveryState: 'pending',
      archiveState: 'active',
      total: { amountMinor: 0, currency: 'CAD' },
      amountPayableToday: { amountMinor: 0, currency: 'CAD' },
      recordVersion: 0,
      createdAt: '2026-09-14T00:00:00.000Z',
      updatedAt: '2026-09-14T00:00:00.000Z',
    };
    const { client, calls } = harness(201, { order, requestId: UUID });
    await client.orders.submit(
      {
        quoteId: UUID,
        termsVersion: 'terms-2026-09',
        form: { schemaVersion: 1, payload: {} },
        consent: { termsVersion: 'terms-2026-09', marketingOptIn: false },
      },
      { draftGrant: 'grant-token', idempotencyKey: 'idem-1' },
    );
    const call = calls[0];
    expect(call?.headers.get('x-draft-grant')).toBe('grant-token');
    expect(call?.headers.get('idempotency-key')).toBe('idem-1');
  });

  it('throws a BackendError carrying the code and request id from the error envelope', async () => {
    const { client } = harness(409, {
      error: { code: 'idempotency_conflict', message: 'changed payload', requestId: UUID },
    });
    await expect(
      client.orders.submit(
        {
          quoteId: UUID,
          termsVersion: 'terms-2026-09',
          form: { schemaVersion: 1, payload: {} },
          consent: { termsVersion: 'terms-2026-09', marketingOptIn: false },
        },
        { draftGrant: 'g', idempotencyKey: 'k' },
      ),
    ).rejects.toMatchObject({
      name: 'BackendError',
      code: 'idempotency_conflict',
      status: 409,
      requestId: UUID,
    });
  });

  it('rejects a 200 response that does not match the contract', async () => {
    const { client } = harness(200, { ok: 'yes' });
    await expect(client.health()).rejects.toThrow();
  });

  it('falls back to internal_error when the error body is unparseable', async () => {
    const { client } = harness(500, { unexpected: true });
    await expect(client.health()).rejects.toBeInstanceOf(BackendError);
  });
});

/**
 * Compile-time proof that method types are derived from the schemas: a schema
 * change breaks these call sites at build time (REQ 50). Never executed; each
 * call is a single line so the `@ts-expect-error` covers the offending token.
 */
function _typeContracts(c: BackendClient): void {
  // @ts-expect-error productId must be a string, not a number
  void c.leads.create({ productId: 1 });
  // @ts-expect-error `teleport` is not a valid transition action
  void c.staff.patchOrder('w', 'o', { action: 'teleport', expectedVersion: 0 });
}
