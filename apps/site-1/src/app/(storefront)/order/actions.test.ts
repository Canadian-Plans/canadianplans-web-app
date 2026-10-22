import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendError } from '@canadian-plans/contracts';

vi.mock('server-only', () => ({}));

/** Minimal in-memory stand-in for the httpOnly draft cookie. */
const jar = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = jar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string, options?: { maxAge?: number }) => {
      if (options?.maxAge === 0) jar.delete(name);
      else jar.set(name, value);
    },
    delete: (name: string) => void jar.delete(name),
  }),
}));

const leadsCreate = vi.fn();
const leadsUpdate = vi.fn();
const offersList = vi.fn();
const quotesCreate = vi.fn();
const ordersSubmit = vi.fn();
const uploadIntent = vi.fn();
const uploadFinalize = vi.fn();
vi.mock('@/lib/backendClient', () => ({
  getBackendClient: () => ({
    leads: { create: leadsCreate, update: leadsUpdate },
    offers: { list: offersList },
    quotes: { create: quotesCreate },
    orders: { submit: ordersSubmit },
    uploads: { createIntent: uploadIntent, finalize: uploadFinalize },
  }),
}));

const { requestQuote, saveDetails, submitOrder, createDocumentIntent, finalizeDocument } =
  await import('./actions');

const LEAD_A = '11111111-1111-4111-8111-111111111111';
const LEAD_B = '22222222-2222-4222-8222-222222222222';
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';

/** A published offer, as the backend returns it, with only the fields the action reads. */
function offerOfType(productType: 'sim' | 'internet' | 'mobile') {
  return { productId: PRODUCT_ID, commercial: { productType, documentChecklist: [] } };
}

const details = {
  category: 'sim' as const,
  fullName: 'Test Customer',
  email: 'customer@example.test',
  phone: '1712345678',
  countryCode: 'BD',
  currentCountry: 'Bangladesh',
  destination: 'Toronto',
  arrivalDate: '2026-10-01',
};

function input() {
  return {
    details,
    documentKeys: ['passport'],
    productId: PRODUCT_ID,
    attribution: {},
    turnstileToken: 'synthetic-first-token',
  };
}

function draftKey(): string {
  const raw = jar.get('cp_order_draft');
  if (!raw) throw new Error('no draft cookie');
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null || !('idempotencyKey' in parsed)) {
    throw new Error('unexpected draft cookie');
  }
  const { idempotencyKey } = parsed;
  if (typeof idempotencyKey !== 'string') throw new Error('unexpected idempotency key');
  return idempotencyKey;
}

beforeEach(() => {
  jar.clear();
  leadsCreate.mockReset();
  leadsUpdate.mockReset();
  offersList.mockReset();
  quotesCreate.mockReset();
  ordersSubmit.mockReset();
  uploadIntent.mockReset();
  uploadFinalize.mockReset();
  offersList.mockResolvedValue({ offers: [offerOfType('sim')] });
});

describe('saveDetails draft lifecycle', () => {
  it("records the server's disclosure version, whatever the browser sends", async () => {
    leadsCreate.mockResolvedValue({ lead: { id: LEAD_A }, draftGrant: { token: 'grant-a' } });
    // A tampered request body still carries a consentVersion field.
    await saveDetails({ ...input(), ...{ consentVersion: 'forged-by-browser' } });
    expect(leadsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ consentVersion: 'privacy-2026-10-v2' }),
      expect.anything(),
    );
  });

  it('reuses the same lead and idempotency key while the draft is still editable', async () => {
    leadsCreate.mockResolvedValue({ lead: { id: LEAD_A }, draftGrant: { token: 'grant-a' } });
    leadsUpdate.mockResolvedValue({ lead: { id: LEAD_A } });

    expect(await saveDetails(input())).toEqual({ ok: true, data: { leadId: LEAD_A } });
    const firstKey = draftKey();

    expect(await saveDetails(input())).toEqual({ ok: true, data: { leadId: LEAD_A } });
    // A resumed draft must never regenerate the key: that is what makes a
    // timeout retry return the existing order (REQ 18).
    expect(draftKey()).toBe(firstKey);
    expect(leadsCreate).toHaveBeenCalledTimes(1);
  });

  it.each(['draft_already_submitted', 'draft_expired', 'draft_not_found'] as const)(
    'starts a fresh draft with a new idempotency key when the old one is finished (%s)',
    async (code) => {
      leadsCreate.mockResolvedValueOnce({ lead: { id: LEAD_A }, draftGrant: { token: 'grant-a' } });
      await saveDetails(input());
      const firstKey = draftKey();

      // The customer comes back to /order carrying the previous draft cookie.
      leadsUpdate.mockRejectedValueOnce(new BackendError(code, 409, 'req-1'));
      leadsCreate.mockResolvedValueOnce({ lead: { id: LEAD_B }, draftGrant: { token: 'grant-b' } });

      expect(await saveDetails(input())).toMatchObject({ ok: false, code: 'retry_fresh_draft' });
      expect(leadsCreate).toHaveBeenCalledTimes(1);
      expect(jar.has('cp_order_draft')).toBe(false);
      const result = await saveDetails({ ...input(), turnstileToken: 'synthetic-fresh-token' });
      expect(result).toEqual({ ok: true, data: { leadId: LEAD_B } });
      expect(leadsCreate.mock.lastCall?.[1]).toEqual({ turnstileToken: 'synthetic-fresh-token' });
      expect(draftKey()).not.toBe(firstKey);
      expect(leadsCreate).toHaveBeenCalledTimes(2);
    },
  );

  it('still reports a genuine backend failure instead of silently creating a second lead', async () => {
    leadsCreate.mockResolvedValueOnce({ lead: { id: LEAD_A }, draftGrant: { token: 'grant-a' } });
    await saveDetails(input());

    leadsUpdate.mockRejectedValueOnce(new BackendError('persistence_unavailable', 503, 'req-2'));

    expect(await saveDetails(input())).toMatchObject({ ok: false, code: 'not_saved' });
    expect(leadsCreate).toHaveBeenCalledTimes(1);
  });
});

const internetDetails = {
  category: 'internet' as const,
  fullName: 'Test Customer',
  email: 'customer@example.test',
  phone: '3065550123',
  province: 'SK' as const,
  dateOfBirth: '1990-05-15',
  streetAddress: '123 Main Street',
  aptUnit: '',
  city: 'Saskatoon',
  postalCode: 'S7K 0A1',
  currentProvider: '',
  preferredInstallationTime: '',
};

const mobileDetails = {
  category: 'mobile' as const,
  fullName: 'Test Customer',
  email: 'customer@example.test',
  phone: '4165550123',
  lines: '1',
  currentProvider: 'Rogers' as const,
  keepNumber: 'yes' as const,
  simType: 'esim' as const,
  streetAddress: '1 Queen Street',
  aptUnit: '',
  city: 'Toronto',
  postalCode: 'M5V 2T6',
  creditCheckConsent: true,
};

describe('saveDetails by category', () => {
  it('checks the plan against the customer’s province and stores the internet form', async () => {
    offersList.mockResolvedValue({ offers: [offerOfType('internet')] });
    leadsCreate.mockResolvedValue({ lead: { id: LEAD_A }, draftGrant: { token: 'grant-a' } });

    const result = await saveDetails({ ...input(), details: internetDetails });

    expect(result).toEqual({ ok: true, data: { leadId: LEAD_A } });
    expect(offersList).toHaveBeenCalledWith({ province: 'SK' });
    expect(leadsCreate.mock.calls[0]?.[0]).toMatchObject({
      contact: { countryCode: 'CA', email: 'customer@example.test' },
      form: { payload: { category: 'internet', province: 'SK' } },
    });
    // The province is kept for the quote, in the httpOnly draft cookie only.
    expect(JSON.parse(jar.get('cp_order_draft') ?? '{}')).toMatchObject({ province: 'SK' });
  });

  it('refuses an internet plan that is not sold in the chosen province', async () => {
    offersList.mockResolvedValue({ offers: [] });
    const result = await saveDetails({ ...input(), details: internetDetails });
    expect(result).toMatchObject({ ok: false, code: 'region_not_served' });
    expect(leadsCreate).not.toHaveBeenCalled();
    expect(jar.has('cp_order_draft')).toBe(false);
  });

  it('refuses details whose category does not match the plan', async () => {
    // The plan is a mobile plan, but the browser sent the internet form.
    offersList.mockResolvedValue({ offers: [offerOfType('mobile')] });
    const result = await saveDetails({ ...input(), details: internetDetails });
    expect(result).toMatchObject({ ok: false, code: 'validation_error' });
    expect(leadsCreate).not.toHaveBeenCalled();
  });

  it('reports a plan that has disappeared as unavailable', async () => {
    offersList.mockResolvedValue({ offers: [] });
    const result = await saveDetails({ ...input(), details: mobileDetails });
    expect(result).toMatchObject({ ok: false, code: 'offer_unavailable' });
  });

  it('stores the mobile credit-check consent with its version, and no province in the cookie', async () => {
    offersList.mockResolvedValue({ offers: [offerOfType('mobile')] });
    leadsCreate.mockResolvedValue({ lead: { id: LEAD_A }, draftGrant: { token: 'grant-a' } });

    const result = await saveDetails({
      ...input(),
      details: mobileDetails,
      documentKeys: ['government_id'],
    });

    expect(result).toEqual({ ok: true, data: { leadId: LEAD_A } });
    expect(leadsCreate.mock.calls[0]?.[0]).toMatchObject({
      form: {
        payload: {
          category: 'mobile',
          creditCheck: { consent: true, version: 'TEST-credit-check-v1' },
          documents: { required: ['government_id'] },
        },
      },
    });
    expect(JSON.parse(jar.get('cp_order_draft') ?? '{}')).not.toHaveProperty('province');
  });

  it('rejects invalid details with per-field messages before any backend call', async () => {
    const result = await saveDetails({
      ...input(),
      details: { ...internetDetails, dateOfBirth: '2015-01-01', postalCode: 'T2P 1J9' },
    });
    expect(result).toMatchObject({
      ok: false,
      code: 'validation_error',
      fieldErrors: { dateOfBirth: expect.any(String), postalCode: expect.any(String) },
    });
    expect(offersList).not.toHaveBeenCalled();
    expect(leadsCreate).not.toHaveBeenCalled();
  });

  it('does not store a draft when the plan lookup fails', async () => {
    offersList.mockRejectedValue(new BackendError('persistence_unavailable', 503, 'req-3'));
    const result = await saveDetails(input());
    expect(result).toMatchObject({ ok: false, code: 'not_saved' });
    expect(leadsCreate).not.toHaveBeenCalled();
  });
});

describe('requestQuote', () => {
  async function startInternetDraft() {
    offersList.mockResolvedValue({ offers: [offerOfType('internet')] });
    leadsCreate.mockResolvedValue({ lead: { id: LEAD_A }, draftGrant: { token: 'grant-a' } });
    await saveDetails({ ...input(), details: internetDetails });
  }

  it('asks for the quote in the province the customer chose', async () => {
    await startInternetDraft();
    quotesCreate.mockResolvedValue({ quote: { id: 'quote' } });
    await requestQuote({ turnstileToken: 'synthetic-quote-token' });
    expect(quotesCreate).toHaveBeenCalledWith(
      { leadId: LEAD_A, productId: PRODUCT_ID, province: 'SK' },
      { draftGrant: 'grant-a', turnstileToken: 'synthetic-quote-token' },
    );
  });

  it('tells the customer when the backend says the plan is not sold in their province', async () => {
    await startInternetDraft();
    quotesCreate.mockRejectedValue(new BackendError('region_not_served', 409, 'req-4'));
    expect(await requestQuote({ turnstileToken: 'synthetic-quote-token' })).toMatchObject({
      ok: false,
      code: 'region_not_served',
    });
  });
});

describe('single-use proof and order recovery', () => {
  it('refuses a missing proof before any backend call', async () => {
    expect(await saveDetails({ ...input(), turnstileToken: undefined })).toMatchObject({
      ok: false,
      code: 'verification_failed',
    });
    expect(offersList).not.toHaveBeenCalled();
    expect(leadsCreate).not.toHaveBeenCalled();
  });
  it('asks for a new proof after transport failure and retains the same business key', async () => {
    leadsCreate.mockResolvedValue({ lead: { id: LEAD_A }, draftGrant: { token: 'grant-a' } });
    await saveDetails(input());
    const key = draftKey();
    const body = {
      quoteId: '44444444-4444-4444-8444-444444444444',
      termsVersion: 'test-terms',
      marketingOptIn: false,
      details,
      documentKeys: ['passport'],
    };
    ordersSubmit.mockRejectedValueOnce(new TypeError('synthetic dropped response'));
    expect(await submitOrder({ ...body, turnstileToken: 'submit-proof-1' })).toMatchObject({
      ok: false,
      code: 'transport_retry',
    });
    expect(ordersSubmit).toHaveBeenCalledTimes(1);
    ordersSubmit.mockResolvedValueOnce({ order: { id: LEAD_B, reference: 'CP-ONE' } });
    expect(await submitOrder({ ...body, turnstileToken: 'submit-proof-2' })).toMatchObject({
      ok: true,
      data: { reference: 'CP-ONE' },
    });
    expect(ordersSubmit.mock.calls.map((call) => call[1])).toEqual([
      { draftGrant: 'grant-a', idempotencyKey: key, turnstileToken: 'submit-proof-1' },
      { draftGrant: 'grant-a', idempotencyKey: key, turnstileToken: 'submit-proof-2' },
    ]);
    expect(draftKey()).toBe(key);
  });
  it('treats an idempotency conflict as an order already received, with no retry loop', async () => {
    leadsCreate.mockResolvedValue({ lead: { id: LEAD_A }, draftGrant: { token: 'grant-a' } });
    await saveDetails(input());
    ordersSubmit.mockRejectedValueOnce(new BackendError('idempotency_conflict', 409, 'req-1'));
    expect(
      await submitOrder({
        quoteId: '44444444-4444-4444-8444-444444444444',
        termsVersion: 'test-terms',
        marketingOptIn: true,
        details,
        documentKeys: ['passport'],
        turnstileToken: 'submit-proof',
      }),
    ).toMatchObject({
      ok: false,
      code: 'draft_expired',
      message: expect.stringMatching(/already received an order/),
    });
    // The finished draft is cleared, so the next order gets a fresh key.
    expect(jar.has('cp_order_draft')).toBe(false);
  });
});

it('forwards separate intent/finalization proofs with the same private draft grant', async () => {
  leadsCreate.mockResolvedValue({ lead: { id: LEAD_A }, draftGrant: { token: 'grant-a' } });
  await saveDetails(input());
  const uploadId = '55555555-5555-4555-8555-555555555555';
  uploadIntent.mockResolvedValue({ uploadId, url: 'https://upload.example.test', headers: {} });
  uploadFinalize.mockResolvedValue({ file: { id: 'file-id', documentType: 'passport' } });
  expect(
    await createDocumentIntent({
      documentType: 'passport',
      fileName: 'identity.pdf',
      contentType: 'application/pdf',
      sizeBytes: 100,
      turnstileToken: 'intent-proof',
    }),
  ).toMatchObject({ ok: true, uploadId });
  expect(
    await finalizeDocument({
      uploadId,
      checksumSha256: 'a'.repeat(64),
      turnstileToken: 'finalize-proof',
    }),
  ).toMatchObject({ ok: true, fileId: 'file-id' });
  expect(uploadIntent.mock.lastCall?.[1]).toEqual({
    draftGrant: 'grant-a',
    turnstileToken: 'intent-proof',
  });
  expect(uploadFinalize.mock.lastCall?.[2]).toEqual({
    draftGrant: 'grant-a',
    turnstileToken: 'finalize-proof',
  });
});
