import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendError } from '@canadian-plans/contracts';

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

const otp = vi.fn();
const verify = vi.fn();
const listOrders = vi.fn();
const getOrder = vi.fn();
const requestChange = vi.fn();
const answerInfoRequest = vi.fn();
const createUploadIntent = vi.fn();
const finalizeUpload = vi.fn();
vi.mock('@/lib/backendClient', () => ({
  getBackendClient: () => ({
    tracking: {
      otp,
      verify,
      listOrders,
      getOrder,
      requestChange,
      answerInfoRequest,
      createUploadIntent,
      finalizeUpload,
    },
  }),
}));

const actions = await import('./actions');

const GRANT = { token: 'grant-token', expiresAt: new Date(Date.now() + 60_000).toISOString() };
const PROOF = 'turnstile-proof';
const INFO = '44444444-4444-4444-8444-444444444444';
const UPLOAD = '55555555-5555-4555-8555-555555555555';

function signIn() {
  jar.set('cp_tracking_grant', JSON.stringify(GRANT));
}

beforeEach(() => {
  jar.clear();
  cookieOptions.length = 0;
  for (const mock of [
    otp,
    verify,
    listOrders,
    getOrder,
    requestChange,
    answerInfoRequest,
    createUploadIntent,
    finalizeUpload,
  ])
    mock.mockReset();
});

describe('requestTrackingCode', () => {
  it('sends only the email and stays neutral when the backend fails', async () => {
    otp.mockRejectedValueOnce(new BackendError('internal_error', 500, 'r'));
    const result = await actions.requestTrackingCode({
      email: ' Jane@Example.test ',
      turnstileToken: PROOF,
    });
    expect(result).toEqual({ ok: true, data: { sent: true } });
    expect(otp).toHaveBeenCalledWith({ email: 'Jane@Example.test' }, { turnstileToken: PROOF });
  });

  it('rejects an invalid email or a missing proof before calling the backend', async () => {
    expect((await actions.requestTrackingCode({ email: 'nope', turnstileToken: PROOF })).ok).toBe(
      false,
    );
    expect((await actions.requestTrackingCode({ email: 'jane@example.test' })).ok).toBe(false);
    expect(otp).not.toHaveBeenCalled();
  });

  it('reports a refused bot check', async () => {
    otp.mockRejectedValueOnce(new BackendError('caller_forbidden', 403, 'r'));
    expect(
      await actions.requestTrackingCode({ email: 'jane@example.test', turnstileToken: PROOF }),
    ).toMatchObject({ ok: false, code: 'verification_failed' });
  });
});

describe('verifyTrackingCode', () => {
  it('stores the grant in an httpOnly cookie scoped to /track', async () => {
    verify.mockResolvedValueOnce({ status: 'verified', grant: GRANT, requestId: 'r' });
    const result = await actions.verifyTrackingCode({
      email: 'jane@example.test',
      code: '123456',
      turnstileToken: PROOF,
    });
    expect(result.ok).toBe(true);
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

describe('grant-protected reads', () => {
  it('needs a grant cookie and never calls the backend without one', async () => {
    expect(await actions.loadTrackedOrders()).toMatchObject({ ok: false, code: 'session_expired' });
    expect(await actions.loadTrackedOrder('CP-1')).toMatchObject({
      ok: false,
      code: 'session_expired',
    });
    expect(listOrders).not.toHaveBeenCalled();
    expect(getOrder).not.toHaveBeenCalled();
  });

  it('ignores an expired grant cookie', async () => {
    jar.set(
      'cp_tracking_grant',
      JSON.stringify({ token: 't', expiresAt: new Date(Date.now() - 1).toISOString() }),
    );
    expect(await actions.loadTrackedOrders()).toMatchObject({ ok: false, code: 'session_expired' });
  });

  it('forwards the grant and maps a backend 401 to an expired session', async () => {
    signIn();
    listOrders.mockResolvedValueOnce({ orders: [], requestId: 'r' });
    expect(await actions.loadTrackedOrders()).toEqual({ ok: true, data: [] });
    expect(listOrders).toHaveBeenCalledWith({ customerGrant: GRANT.token });
    getOrder.mockRejectedValueOnce(new BackendError('not_found', 401, 'r'));
    expect(await actions.loadTrackedOrder('CP-1')).toMatchObject({
      ok: false,
      code: 'session_expired',
    });
    getOrder.mockRejectedValueOnce(new BackendError('order_not_found', 404, 'r'));
    expect(await actions.loadTrackedOrder('CP-2')).toMatchObject({ ok: false, code: 'not_found' });
  });
});

describe('sendTrackingChange', () => {
  it('sends a change request, or an info answer when an info request id is given', async () => {
    signIn();
    const changeRequest = {
      id: INFO,
      status: 'pending',
      fields: ['contact.phone'],
      createdAt: 'x',
    };
    requestChange.mockResolvedValueOnce({ changeRequest, requestId: 'r' });
    answerInfoRequest.mockResolvedValueOnce({ changeRequest, requestId: 'r' });
    const patch = { contact: { phone: '+15550100' } };
    expect(
      (await actions.sendTrackingChange({ reference: 'CP-1', patch, note: ' moving ' })).ok,
    ).toBe(true);
    expect(requestChange).toHaveBeenCalledWith(
      'CP-1',
      { patch, note: 'moving' },
      { customerGrant: GRANT.token },
    );
    expect(
      (await actions.sendTrackingChange({ reference: 'CP-1', patch, infoRequestId: INFO })).ok,
    ).toBe(true);
    expect(answerInfoRequest).toHaveBeenCalledWith(
      'CP-1',
      INFO,
      { patch },
      { customerGrant: GRANT.token },
    );
  });

  it('refuses a commercial or empty patch before calling the backend', async () => {
    signIn();
    for (const patch of [{}, { snapshot: { total: 0 } }, { contact: {} }])
      expect((await actions.sendTrackingChange({ reference: 'CP-1', patch })).ok).toBe(false);
    expect(requestChange).not.toHaveBeenCalled();
  });

  it('explains a full queue and a mismatched answer', async () => {
    signIn();
    requestChange.mockRejectedValueOnce(new BackendError('too_many_pending_requests', 409, 'r'));
    expect(
      await actions.sendTrackingChange({
        reference: 'CP-1',
        patch: { form: { destination: 'X' } },
      }),
    ).toMatchObject({ ok: false, code: 'too_many_pending' });
    answerInfoRequest.mockRejectedValueOnce(
      new BackendError('info_request_fields_mismatch', 422, 'r'),
    );
    expect(
      await actions.sendTrackingChange({
        reference: 'CP-1',
        patch: { form: { destination: 'X' } },
        infoRequestId: INFO,
      }),
    ).toMatchObject({ ok: false, code: 'fields_mismatch' });
  });
});

describe('tracking uploads', () => {
  it('authorises an upload with the grant and the proof, and validates locally first', async () => {
    signIn();
    createUploadIntent.mockResolvedValueOnce({
      uploadId: UPLOAD,
      url: 'https://storage.example.test/put',
      method: 'PUT',
      headers: { 'content-type': 'application/pdf' },
      expiresAt: 'x',
      requestId: 'r',
    });
    const input = {
      reference: 'CP-1',
      documentType: 'passport',
      fileName: 'passport.pdf',
      contentType: 'application/pdf',
      sizeBytes: 100,
      turnstileToken: PROOF,
    };
    expect(await actions.createTrackingUpload(input)).toMatchObject({
      ok: true,
      data: { uploadId: UPLOAD },
    });
    expect(createUploadIntent).toHaveBeenCalledWith(
      'CP-1',
      {
        documentType: 'passport',
        fileName: 'passport.pdf',
        contentType: 'application/pdf',
        sizeBytes: 100,
      },
      { customerGrant: GRANT.token, turnstileToken: PROOF },
    );
    expect((await actions.createTrackingUpload({ ...input, contentType: 'text/html' })).ok).toBe(
      false,
    );
    expect(
      (await actions.createTrackingUpload({ ...input, sizeBytes: 10 * 1024 * 1024 + 1 })).ok,
    ).toBe(false);
    expect(createUploadIntent).toHaveBeenCalledOnce();
  });

  it('reports a file that failed signature verification', async () => {
    signIn();
    finalizeUpload.mockRejectedValueOnce(
      new BackendError('document_verification_failed', 422, 'r'),
    );
    expect(
      await actions.finalizeTrackingUpload({
        reference: 'CP-1',
        uploadId: UPLOAD,
        checksumSha256: 'a'.repeat(64),
        turnstileToken: PROOF,
      }),
    ).toMatchObject({ ok: false, code: 'upload_rejected' });
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
