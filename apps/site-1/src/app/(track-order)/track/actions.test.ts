import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendError, type TrackingOrder } from '@canadian-plans/crm-contracts';

vi.mock('server-only', () => ({}));

/** Minimal in-memory stand-in for the httpOnly tracking cookie. */
const jar = new Map<string, string>();
const cookieOptions: unknown[] = [];
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = jar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string, options?: { maxAge?: number }) => {
      cookieOptions.push(options);
      if (options?.maxAge === 0) jar.delete(name);
      else jar.set(name, value);
    },
    delete: (name: string) => void jar.delete(name),
  }),
}));

const requestCode = vi.fn();
const verify = vi.fn();
const orders = vi.fn();
const requestChange = vi.fn();
const createUpload = vi.fn();
const finalizeUpload = vi.fn();
vi.mock('@/lib/backendClient', () => ({
  getBackendClient: () => ({
    tracking: { requestCode, verify, orders, requestChange, createUpload, finalizeUpload },
  }),
}));

const actions = await import('./actions');

const GRANT = { token: 'grant-token', expiresAt: new Date(Date.now() + 60_000).toISOString() };
const PROOF = 'turnstile-proof';
const UPLOAD = '55555555-5555-4555-8555-555555555555';

function signIn() {
  jar.set('cp_tracking_grant', JSON.stringify(GRANT));
}

beforeEach(() => {
  jar.clear();
  cookieOptions.length = 0;
  for (const mock of [requestCode, verify, orders, requestChange, createUpload, finalizeUpload])
    mock.mockReset();
});

describe('requestTrackingCode', () => {
  it('sends only the email and stays neutral when the backend fails', async () => {
    requestCode.mockRejectedValueOnce(new BackendError('internal_error', 500, 'r'));
    const result = await actions.requestTrackingCode({
      email: ' Jane@Example.test ',
      turnstileToken: PROOF,
    });
    expect(result).toEqual({ ok: true, data: { sent: true } });
    expect(requestCode).toHaveBeenCalledWith(
      { email: 'Jane@Example.test' },
      { turnstileToken: PROOF },
    );
  });

  it('rejects an invalid email or a missing proof before calling the backend', async () => {
    expect((await actions.requestTrackingCode({ email: 'nope', turnstileToken: PROOF })).ok).toBe(
      false,
    );
    expect((await actions.requestTrackingCode({ email: 'jane@example.test' })).ok).toBe(false);
    expect(requestCode).not.toHaveBeenCalled();
  });

  it('reports a refused bot check', async () => {
    requestCode.mockRejectedValueOnce(new BackendError('caller_forbidden', 403, 'r'));
    expect(
      await actions.requestTrackingCode({ email: 'jane@example.test', turnstileToken: PROOF }),
    ).toMatchObject({ ok: false, code: 'verification_failed' });
  });
});

describe('verifyTrackingCode', () => {
  it('stores the grant in an httpOnly cookie scoped to /track', async () => {
    verify.mockResolvedValueOnce({ grant: GRANT, requestId: 'r' });
    const result = await actions.verifyTrackingCode({
      email: 'jane@example.test',
      code: '123456',
      turnstileToken: PROOF,
    });
    expect(result).toEqual({ ok: true, data: { verified: true } });
    expect(JSON.stringify(result)).not.toContain(GRANT.token);
    expect(verify).toHaveBeenCalledWith(
      { email: 'jane@example.test', code: '123456' },
      { turnstileToken: PROOF },
    );
    expect(jar.get('cp_tracking_grant')).toBe(JSON.stringify(GRANT));
    expect(cookieOptions[0]).toMatchObject({ httpOnly: true, path: '/track', sameSite: 'lax' });
  });

  it('turns a wrong code into one generic message and keeps no grant', async () => {
    verify.mockRejectedValueOnce(new BackendError('tracking_challenge_invalid', 400, 'r'));
    const result = await actions.verifyTrackingCode({
      email: 'jane@example.test',
      code: '000000',
      turnstileToken: PROOF,
    });
    expect(result).toMatchObject({ ok: false, code: 'validation_error' });
    expect(jar.size).toBe(0);
    expect(
      (
        await actions.verifyTrackingCode({
          email: 'jane@example.test',
          code: '12',
          turnstileToken: PROOF,
        })
      ).ok,
    ).toBe(false);
    expect(verify).toHaveBeenCalledOnce();
  });

  it('reports rate limiting', async () => {
    verify.mockRejectedValueOnce(new BackendError('rate_limited', 429, 'r'));
    expect(
      await actions.verifyTrackingCode({
        email: 'jane@example.test',
        code: '123456',
        turnstileToken: PROOF,
      }),
    ).toMatchObject({ ok: false, code: 'rate_limited' });
  });
});

const NOW = '2026-10-25T12:00:00.000Z';
const order = (reference: string): TrackingOrder => ({
  reference,
  leadType: 'sim_order',
  stage: 'pending',
  stageLabel: 'Received',
  submittedAt: NOW,
  plan: null,
  quantity: 1,
  delivery: 'esim',
  courier: null,
  trackingNumber: null,
  dispatchedAt: null,
  simNumber: null,
  details: {
    fullName: 'Jane Doe',
    phone: null,
    arrivalDate: null,
    permitType: null,
    canadaAddress: null,
    shippingAddress: null,
    flightBooked: null,
  },
  documents: [],
  canRequestChange: true,
  pendingChange: null,
});
const changeRequest = {
  requestNo: 1,
  fields: { phone: '+1 555 010 0000' },
  documents: [],
  createdAt: NOW,
  updatedAt: NOW,
};

describe('grant-protected reads', () => {
  it('needs a grant cookie and never calls the backend without one', async () => {
    expect(await actions.loadTrackedOrders()).toMatchObject({ ok: false, code: 'session_expired' });
    expect(await actions.loadTrackedOrder('MS-1')).toMatchObject({
      ok: false,
      code: 'session_expired',
    });
    expect(orders).not.toHaveBeenCalled();
  });

  it('ignores an expired or malformed grant cookie', async () => {
    jar.set(
      'cp_tracking_grant',
      JSON.stringify({ token: 't', expiresAt: new Date(Date.now() - 1).toISOString() }),
    );
    expect(await actions.loadTrackedOrders()).toMatchObject({ ok: false, code: 'session_expired' });
    jar.set('cp_tracking_grant', 'not json');
    expect(await actions.loadTrackedOrders()).toMatchObject({ ok: false, code: 'session_expired' });
    expect(orders).not.toHaveBeenCalled();
  });

  it('forwards the grant and returns the orders without it', async () => {
    signIn();
    orders.mockResolvedValueOnce({ orders: [order('MS-2'), order('MS-1')], requestId: 'r' });
    const result = await actions.loadTrackedOrders();
    expect(result).toEqual({ ok: true, data: [order('MS-2'), order('MS-1')] });
    expect(JSON.stringify(result)).not.toContain(GRANT.token);
    expect(orders).toHaveBeenCalledWith({ customerGrant: GRANT.token });
  });

  it('maps a backend 401 to an expired session and other failures to a retry', async () => {
    signIn();
    orders.mockRejectedValueOnce(new BackendError('not_found', 401, 'r'));
    expect(await actions.loadTrackedOrders()).toMatchObject({ ok: false, code: 'session_expired' });
    orders.mockRejectedValueOnce(new BackendError('rate_limited', 429, 'r'));
    expect(await actions.loadTrackedOrders()).toMatchObject({ ok: false, code: 'rate_limited' });
    orders.mockRejectedValueOnce(new Error('network'));
    expect(await actions.loadTrackedOrders()).toMatchObject({ ok: false, code: 'failed' });
  });

  it('derives one order from the list by its reference', async () => {
    signIn();
    orders.mockResolvedValue({ orders: [order('MS-2'), order('MS-1')], requestId: 'r' });
    expect(await actions.loadTrackedOrder('MS-1')).toEqual({ ok: true, data: order('MS-1') });
    expect(await actions.loadTrackedOrder('MS-9')).toMatchObject({ ok: false, code: 'not_found' });
    expect(await actions.loadTrackedOrder('')).toMatchObject({ ok: false, code: 'not_found' });
    expect(await actions.loadTrackedOrder('x'.repeat(129))).toMatchObject({
      ok: false,
      code: 'not_found',
    });
    expect(orders).toHaveBeenCalledTimes(2);
    orders.mockReset();
    orders.mockRejectedValueOnce(new BackendError('not_found', 401, 'r'));
    expect(await actions.loadTrackedOrder('MS-1')).toMatchObject({
      ok: false,
      code: 'session_expired',
    });
  });
});

describe('sendTrackingChange', () => {
  it('sends the changed fields with the grant', async () => {
    signIn();
    requestChange.mockResolvedValueOnce({ changeRequest, requestId: 'r' });
    const fields = { phone: ' +1 555 010 0000 ', arrivalDate: '2026-11-20' };
    expect(await actions.sendTrackingChange({ reference: 'MS-1', fields })).toEqual({
      ok: true,
      data: changeRequest,
    });
    expect(requestChange).toHaveBeenCalledWith(
      'MS-1',
      { fields: { phone: '+1 555 010 0000', arrivalDate: '2026-11-20' } },
      { customerGrant: GRANT.token },
    );
  });

  it('refuses an empty, invalid or out-of-scope change before calling the backend', async () => {
    signIn();
    for (const fields of [
      undefined,
      {},
      { fullName: 'J' },
      { phone: '123' },
      { arrivalDate: '20/11/2026' },
      { canadaAddress: '' },
      { email: 'new@example.test' },
      { planId: '11111111-1111-4111-8111-111111111111' },
      { delivery: 'pickup' },
      { phone: '+1 555 010 0000', snapshot: { total: 0 } },
    ])
      expect(await actions.sendTrackingChange({ reference: 'MS-1', fields })).toMatchObject({
        ok: false,
        code: 'validation_error',
      });
    expect(
      await actions.sendTrackingChange({ reference: '', fields: { fullName: 'Jane Doe' } }),
    ).toMatchObject({ ok: false, code: 'validation_error' });
    expect(requestChange).not.toHaveBeenCalled();
  });

  it('needs a session', async () => {
    expect(
      await actions.sendTrackingChange({ reference: 'MS-1', fields: { fullName: 'Jane Doe' } }),
    ).toMatchObject({ ok: false, code: 'session_expired' });
    expect(requestChange).not.toHaveBeenCalled();
  });

  it('maps the backend refusals', async () => {
    signIn();
    const send = () =>
      actions.sendTrackingChange({ reference: 'MS-1', fields: { fullName: 'Jane Doe' } });
    for (const [code, status, expected] of [
      ['change_request_not_allowed', 409, 'change_not_allowed'],
      ['validation_error', 400, 'validation_error'],
      ['order_not_found', 404, 'not_found'],
      ['rate_limited', 429, 'rate_limited'],
      ['not_found', 401, 'session_expired'],
      ['internal_error', 500, 'failed'],
    ] as const) {
      requestChange.mockRejectedValueOnce(new BackendError(code, status, 'r'));
      expect(await send()).toMatchObject({ ok: false, code: expected });
    }
  });
});

describe('tracking uploads', () => {
  const input = {
    reference: 'MS-1',
    documentType: 'passport',
    contentType: 'application/pdf',
    sizeBytes: 100,
    turnstileToken: PROOF,
  };
  const finalize = {
    reference: 'MS-1',
    uploadId: UPLOAD,
    checksumSha256: 'a'.repeat(64),
    turnstileToken: PROOF,
  };

  it('authorises an upload with the grant and the proof', async () => {
    signIn();
    createUpload.mockResolvedValueOnce({
      uploadId: UPLOAD,
      url: 'https://storage.example.test/put',
      method: 'PUT',
      headers: { 'content-type': 'application/pdf' },
      expiresAt: NOW,
      requestId: 'r',
    });
    expect(await actions.createTrackingUpload(input)).toEqual({
      ok: true,
      data: {
        uploadId: UPLOAD,
        url: 'https://storage.example.test/put',
        method: 'PUT',
        headers: { 'content-type': 'application/pdf' },
      },
    });
    expect(createUpload).toHaveBeenCalledWith(
      'MS-1',
      { documentType: 'passport', contentType: 'application/pdf', sizeBytes: 100 },
      { customerGrant: GRANT.token, turnstileToken: PROOF },
    );
  });

  it('validates the upload locally first', async () => {
    signIn();
    for (const bad of [
      { ...input, contentType: 'text/html' },
      { ...input, sizeBytes: 10 * 1024 * 1024 + 1 },
      { ...input, sizeBytes: 0 },
      { ...input, documentType: 'address_proof' },
      { ...input, reference: '' },
    ])
      expect(await actions.createTrackingUpload(bad)).toMatchObject({
        ok: false,
        code: 'validation_error',
      });
    expect(
      await actions.createTrackingUpload({ ...input, turnstileToken: undefined }),
    ).toMatchObject({ ok: false, code: 'verification_failed' });
    for (const bad of [
      { ...finalize, uploadId: 'nope' },
      { ...finalize, checksumSha256: 'A'.repeat(64) },
    ])
      expect(await actions.finalizeTrackingUpload(bad)).toMatchObject({
        ok: false,
        code: 'validation_error',
      });
    expect(createUpload).not.toHaveBeenCalled();
    expect(finalizeUpload).not.toHaveBeenCalled();
  });

  it('needs a session', async () => {
    expect(await actions.createTrackingUpload(input)).toMatchObject({
      ok: false,
      code: 'session_expired',
    });
    expect(await actions.finalizeTrackingUpload(finalize)).toMatchObject({
      ok: false,
      code: 'session_expired',
    });
    expect(createUpload).not.toHaveBeenCalled();
    expect(finalizeUpload).not.toHaveBeenCalled();
  });

  it('finalizes into the pending change request', async () => {
    signIn();
    const withDocument = { ...changeRequest, fields: {}, documents: ['passport'] };
    finalizeUpload.mockResolvedValueOnce({ changeRequest: withDocument, requestId: 'r' });
    expect(await actions.finalizeTrackingUpload(finalize)).toEqual({
      ok: true,
      data: withDocument,
    });
    expect(finalizeUpload).toHaveBeenCalledWith(
      'MS-1',
      UPLOAD,
      { checksumSha256: 'a'.repeat(64) },
      { customerGrant: GRANT.token, turnstileToken: PROOF },
    );
  });

  it('maps the upload refusals', async () => {
    signIn();
    for (const [code, status, expected] of [
      ['change_request_not_allowed', 409, 'change_not_allowed'],
      ['checklist_mismatch', 409, 'change_not_allowed'],
      ['feature_not_ready', 409, 'upload_unavailable'],
      ['document_too_large', 413, 'validation_error'],
      ['order_not_found', 404, 'not_found'],
      ['caller_forbidden', 403, 'verification_failed'],
      ['not_found', 401, 'session_expired'],
    ] as const) {
      createUpload.mockRejectedValueOnce(new BackendError(code, status, 'r'));
      expect(await actions.createTrackingUpload(input)).toMatchObject({
        ok: false,
        code: expected,
      });
    }
    for (const [code, status, expected] of [
      ['document_verification_failed', 422, 'upload_rejected'],
      ['upload_expired', 410, 'failed'],
      ['upload_not_found', 404, 'failed'],
      ['verification_in_progress', 409, 'failed'],
      ['change_request_not_allowed', 409, 'change_not_allowed'],
      ['not_found', 401, 'session_expired'],
    ] as const) {
      finalizeUpload.mockRejectedValueOnce(new BackendError(code, status, 'r'));
      expect(await actions.finalizeTrackingUpload(finalize)).toMatchObject({
        ok: false,
        code: expected,
      });
    }
  });
});

describe('signOutTracking', () => {
  it('expires the grant cookie on the path it was set on', async () => {
    signIn();
    await actions.signOutTracking();
    expect(jar.size).toBe(0);
    expect(cookieOptions.at(-1)).toMatchObject({ maxAge: 0, path: '/track', httpOnly: true });
    expect(await actions.loadTrackedOrders()).toMatchObject({ ok: false, code: 'session_expired' });
  });
});
