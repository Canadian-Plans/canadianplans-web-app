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
  it('reads a personal draft using the grant header without a proof or body', async () => {
    const draft = { leadId: UUID, productId: null, contact: { fullName: 'Saved' }, form: null };
    const { client, calls } = harness(200, { draft, requestId: UUID });
    expect(await client.leads.read(UUID, { draftGrant: 'private-grant' })).toEqual({
      draft,
      requestId: UUID,
    });
    expect(calls[0]?.headers.get('x-draft-grant')).toBe('private-grant');
    expect(calls[0]?.headers.has('x-turnstile-token')).toBe(false);
    expect(calls[0]?.body).toBeUndefined();
    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.url).toBe(`https://api.example.test/api/v1/website/leads/${UUID}`);
  });
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

  it('reads offers with and without a province filter, and refuses an invalid province', async () => {
    const { client, calls } = harness(200, { offers: [], requestId: UUID });
    await client.offers.list();
    await client.offers.list({ province: 'SK' });
    expect(calls[0]?.url).toBe('https://api.example.test/api/v1/website/offers');
    expect(calls[1]?.url).toBe('https://api.example.test/api/v1/website/offers?province=SK');
    // @ts-expect-error a province must be a province code, never the national marker
    expect(() => client.offers.list({ province: 'CA' })).toThrow();
    expect(calls).toHaveLength(2);
  });

  it('joins the region wish list and refuses the national marker as a province', async () => {
    const { client, calls } = harness(201, { requestId: UUID });
    await client.regionWaitlist.join({
      province: 'ON',
      email: 'a@b.co',
      consentVersion: 'terms-2026-09',
    });
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.url).toBe('https://api.example.test/api/v1/website/region-waitlist');
    expect(() =>
      client.regionWaitlist.join({
        // @ts-expect-error a wish list belongs to a province, never the national marker
        province: 'CA',
        email: 'a@b.co',
        consentVersion: 'v',
      }),
    ).toThrow();
    expect(calls).toHaveLength(1);
  });

  it('serialises a JSON body with content-type on writes', async () => {
    const { client, calls } = harness(201, {
      lead: {
        id: UUID,
        workspaceId: UUID,
        status: 'incomplete',
        updatedAt: '2026-09-14T00:00:00.000Z',
      },
      draftGrant: { token: 't', expiresAt: '2026-09-14T00:00:00.000Z' },
      requestId: UUID,
    });
    await client.leads.create({ contact: { email: 'a@b.co' }, consentVersion: 'terms-2026-09' });
    const call = calls[0];
    expect(call?.method).toBe('POST');
    expect(call?.headers.get('content-type')).toBe('application/json');
    expect(JSON.parse(call?.body ?? '{}')).toEqual({
      contact: { email: 'a@b.co' },
      consentVersion: 'terms-2026-09',
    });
  });

  it('attaches the draft grant and idempotency key as headers on order submission', async () => {
    const order = {
      id: UUID,
      workspaceId: UUID,
      reference: 'CP-1',
      fulfilmentStatus: 'submitted',
      paymentState: 'not_required',
      deliveryState: 'none',
      archiveState: 'active',
      total: { amountMinor: 0, currency: 'CAD' },
      amountPayableToday: { amountMinor: 0, currency: 'CAD' },
      recordVersion: 1,
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
    expect(call?.url).toBe('https://api.example.test/api/v1/orders');
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

describe('website proof transport', () => {
  it('forwards a fresh proof per call in a fixed header, without putting it in the body', async () => {
    const { client, calls } = harness(200, { status: 'challenge_sent', requestId: UUID });
    for (const turnstileToken of ['proof-first', 'proof-second']) {
      await client.tracking.otp(
        { email: 'test@example.test', orderReference: 'CP-TEST' },
        { turnstileToken },
      );
    }
    expect(calls.map((entry) => entry.headers.get('x-turnstile-token'))).toEqual([
      'proof-first',
      'proof-second',
    ]);
    expect(calls.every((entry) => !entry.body?.includes('proof-'))).toBe(true);
    expect(() =>
      client.tracking.otp(
        { email: 'test@example.test', orderReference: 'CP-TEST' },
        { turnstileToken: 'x'.repeat(2049) },
      ),
    ).toThrow();
    expect(calls).toHaveLength(2);
  });
  it('adds only a validated server-owned visitor assertion', async () => {
    const requests: Headers[] = [];
    let assertion = 'a'.repeat(64);
    const client = createBackendClient({
      baseUrl: 'https://api.example.test',
      credential: 'synthetic',
      websiteVisitorId: async () => assertion,
      fetch: async (_url, options) => {
        requests.push(new Headers(options?.headers));
        return Response.json({ ok: true, requestId: UUID });
      },
    });
    await client.health();
    expect(requests[0]?.get('x-website-visitor-id')).toBe(assertion);
    assertion = 'untrusted-header';
    await expect(client.health()).rejects.toThrow('Invalid website visitor assertion');
    expect(requests).toHaveLength(1);
  });
});
