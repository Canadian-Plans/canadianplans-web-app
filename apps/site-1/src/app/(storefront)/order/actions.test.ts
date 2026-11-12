import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendError, type WebsitePlan } from '@canadian-plans/crm-contracts';

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
const plansList = vi.fn();
const uploadIntent = vi.fn();
const uploadFinalize = vi.fn();
vi.mock('@/lib/backendClient', () => ({
  getBackendClient: () => ({
    leads: { create: leadsCreate, update: leadsUpdate },
    plans: { list: plansList },
    uploads: { createIntent: uploadIntent, finalize: uploadFinalize },
  }),
}));

const {
  requestCallback,
  requestQuote,
  saveDetails,
  saveDocuments,
  submitOrder,
  createDocumentIntent,
  finalizeDocument,
} = await import('./actions');

const LEAD_A = '11111111-1111-4111-8111-111111111111';
const LEAD_B = '22222222-2222-4222-8222-222222222222';
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';
const TERMS = 'terms-2026-10-v2';
const CONSENT = 'privacy-2026-10-v2';
const CREDIT_CHECK = 'TEST-credit-check-v1';
const FIRST_CONSENT_AT = '2026-10-20T12:00:00.000Z';

/** A plan as the CRM returns it for the storefront. */
function plan(
  leadType: WebsitePlan['leadType'],
  overrides: Partial<WebsitePlan> = {},
  properties: WebsitePlan['properties'] = {},
): WebsitePlan {
  return {
    id: PRODUCT_ID,
    leadType,
    name: 'Visitor eSIM',
    priceMinor: 3500,
    currency: 'CAD',
    billingPeriod: '30_days',
    paymentRequired: false,
    requiredDocuments: ['passport'],
    properties: { custom_product_key: 'visitor-esim', ...properties },
    ...overrides,
  };
}

const simDetails = {
  category: 'sim' as const,
  fullName: 'Test Customer',
  email: 'customer@example.test',
  phone: '1712345678',
  countryCode: 'BD',
  currentCountry: 'Bangladesh',
  destination: 'Toronto',
  arrivalDate: '2026-10-01',
};

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

const attribution = { utm_source: 'newsletter' };

function saveInput(details: typeof simDetails | typeof internetDetails | typeof mobileDetails) {
  return {
    details,
    productId: PRODUCT_ID,
    attribution,
    turnstileToken: 'synthetic-first-token',
  };
}

function submitInput(
  details: typeof simDetails | typeof internetDetails | typeof mobileDetails,
  turnstileToken = 'submit-proof',
) {
  return { termsVersion: TERMS, details, attribution, turnstileToken };
}

/** The draft cookie as stored. */
function cookie(): Record<string, unknown> {
  const raw = jar.get('cp_order_draft');
  if (!raw) throw new Error('no draft cookie');
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null) throw new Error('unexpected draft cookie');
  return Object.fromEntries(Object.entries(parsed));
}

function draftKey(): string {
  const { idempotencyKey } = cookie();
  if (typeof idempotencyKey !== 'string') throw new Error('unexpected idempotency key');
  return idempotencyKey;
}

function sentOptions(mock: typeof leadsCreate, call = 0): unknown {
  return mock.mock.calls[call]?.[mock === leadsUpdate ? 2 : 1];
}

/** Saves a SIM draft, so the cookie holds a lead and grant. */
async function startSimDraft() {
  plansList.mockResolvedValue({ plans: [plan('sim_order')] });
  leadsCreate.mockResolvedValueOnce({ lead: { id: LEAD_A }, draftGrant: { token: 'grant-a' } });
  const saved = await saveDetails(saveInput(simDetails));
  expect(saved).toEqual({ ok: true, data: { saved: true } });
  leadsCreate.mockClear();
  plansList.mockClear();
}

/** Saves an internet or mobile order's plan choice, so the cookie holds only the plan. */
async function startOneShotOrder(category: 'internet' | 'mobile') {
  if (category === 'internet') {
    plansList.mockResolvedValue({ plans: [plan('internet')] });
    expect(await saveDetails(saveInput(internetDetails))).toMatchObject({ ok: true });
  } else {
    plansList.mockResolvedValue({ plans: [plan('mobility')] });
    expect(await saveDetails(saveInput(mobileDetails))).toMatchObject({ ok: true });
  }
  plansList.mockClear();
}

beforeEach(() => {
  jar.clear();
  for (const mock of [leadsCreate, leadsUpdate, plansList, uploadIntent, uploadFinalize]) {
    mock.mockReset();
  }
  plansList.mockResolvedValue({ plans: [plan('sim_order')] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('saveDetails for a SIM order (a resumable draft)', () => {
  it('creates a draft lead from the plan the CRM lists and keeps its grant in the cookie', async () => {
    leadsCreate.mockResolvedValue({ lead: { id: LEAD_A }, draftGrant: { token: 'grant-a' } });

    expect(await saveDetails(saveInput(simDetails))).toEqual({ ok: true, data: { saved: true } });

    expect(plansList).toHaveBeenCalledWith({ leadType: 'sim_order' });
    expect(leadsCreate).toHaveBeenCalledTimes(1);
    expect(leadsCreate.mock.calls[0]?.[0]).toEqual({
      leadType: 'sim_order',
      contact: {
        fullName: 'Test Customer',
        email: 'customer@example.test',
        phone: '1712345678',
        countryCode: 'BD',
      },
      form: {
        schemaVersion: 1,
        payload: {
          planId: 'visitor-esim',
          planLabel: 'Visitor eSIM',
          delivery: 'esim',
          arrivalDate: '2026-10-01',
          canadaAddress: 'Toronto',
          currentCountry: 'Bangladesh',
        },
      },
      order: { planId: PRODUCT_ID },
      attribution,
      consentVersion: CONSENT,
    });
    // A draft is not submitted yet.
    expect(leadsCreate.mock.calls[0]?.[0]).not.toHaveProperty('submit');
    expect(sentOptions(leadsCreate)).toEqual({ turnstileToken: 'synthetic-first-token' });
    expect(cookie()).toMatchObject({
      leadId: LEAD_A,
      draftGrant: 'grant-a',
      productId: PRODUCT_ID,
    });
    expect(cookie()).not.toHaveProperty('province');
    expect(cookie()).not.toHaveProperty('consentedAt');
    expect(draftKey()).toMatch(/^order-/);
  });

  it("records the server's disclosure version, whatever the browser sends", async () => {
    leadsCreate.mockResolvedValue({ lead: { id: LEAD_A }, draftGrant: { token: 'grant-a' } });
    // A tampered request body still carries a consentVersion field.
    await saveDetails({ ...saveInput(simDetails), ...{ consentVersion: 'forged-by-browser' } });
    expect(leadsCreate.mock.calls[0]?.[0]).toMatchObject({ consentVersion: CONSENT });
  });

  it('updates the same lead when resuming, and issues a new idempotency key', async () => {
    await startSimDraft();
    const firstKey = draftKey();
    leadsUpdate.mockResolvedValue({ lead: { id: LEAD_A } });

    const resumed = await saveDetails({
      ...saveInput({ ...simDetails, destination: 'Vancouver' }),
      turnstileToken: 'synthetic-second-token',
    });

    expect(resumed).toEqual({ ok: true, data: { saved: true } });
    expect(leadsCreate).not.toHaveBeenCalled();
    expect(leadsUpdate).toHaveBeenCalledTimes(1);
    expect(leadsUpdate.mock.calls[0]?.[0]).toBe(LEAD_A);
    expect(leadsUpdate.mock.calls[0]?.[1]).toMatchObject({
      form: { payload: { canadaAddress: 'Vancouver' } },
      order: { planId: PRODUCT_ID },
    });
    expect(leadsUpdate.mock.calls[0]?.[1]).not.toHaveProperty('submit');
    expect(sentOptions(leadsUpdate)).toEqual({
      draftGrant: 'grant-a',
      turnstileToken: 'synthetic-second-token',
    });
    expect(cookie()).toMatchObject({ leadId: LEAD_A, draftGrant: 'grant-a' });
    expect(draftKey()).not.toBe(firstKey);
  });

  it.each(['draft_already_submitted', 'draft_expired', 'draft_not_found'] as const)(
    'clears the cookie and asks for a fresh draft when the old one is finished (%s)',
    async (code) => {
      await startSimDraft();
      leadsUpdate.mockRejectedValueOnce(new BackendError(code, 409, 'req-1'));

      expect(await saveDetails(saveInput(simDetails))).toMatchObject({
        ok: false,
        code: 'retry_fresh_draft',
      });
      expect(leadsCreate).not.toHaveBeenCalled();
      expect(jar.has('cp_order_draft')).toBe(false);

      // The retry carries no cookie, so it starts a new draft under a new key.
      leadsCreate.mockResolvedValueOnce({ lead: { id: LEAD_B }, draftGrant: { token: 'grant-b' } });
      const retried = await saveDetails({
        ...saveInput(simDetails),
        turnstileToken: 'fresh-token',
      });
      expect(retried).toEqual({ ok: true, data: { saved: true } });
      expect(sentOptions(leadsCreate)).toEqual({ turnstileToken: 'fresh-token' });
      expect(cookie()).toMatchObject({ leadId: LEAD_B, draftGrant: 'grant-b' });
    },
  );

  it('reports a genuine failure while resuming instead of creating a second lead', async () => {
    await startSimDraft();
    const before = jar.get('cp_order_draft');
    leadsUpdate.mockRejectedValueOnce(new BackendError('persistence_unavailable', 503, 'req-2'));

    expect(await saveDetails(saveInput(simDetails))).toMatchObject({
      ok: false,
      code: 'not_saved',
    });
    expect(leadsCreate).not.toHaveBeenCalled();
    expect(jar.get('cp_order_draft')).toBe(before);
  });

  it('does not save a draft the CRM returned without a grant', async () => {
    leadsCreate.mockResolvedValue({ lead: { id: LEAD_A }, draftGrant: null });
    expect(await saveDetails(saveInput(simDetails))).toMatchObject({
      ok: false,
      code: 'not_saved',
    });
    expect(jar.has('cp_order_draft')).toBe(false);
  });

  it('keeps the cookie to a lead and grant together or neither', async () => {
    await startSimDraft();
    const { leadId, draftGrant } = cookie();
    expect(typeof leadId).toBe('string');
    expect(typeof draftGrant).toBe('string');
  });
});

describe('saveDetails for an internet or mobile order (one-shot)', () => {
  it('only checks an internet order and keeps the plan and province in the cookie', async () => {
    plansList.mockResolvedValue({ plans: [plan('internet')] });

    expect(await saveDetails(saveInput(internetDetails))).toEqual({
      ok: true,
      data: { saved: true },
    });

    expect(plansList).toHaveBeenCalledWith({ leadType: 'internet' });
    expect(leadsCreate).not.toHaveBeenCalled();
    expect(leadsUpdate).not.toHaveBeenCalled();
    expect(cookie()).toMatchObject({ productId: PRODUCT_ID, province: 'SK' });
    expect(cookie()).not.toHaveProperty('leadId');
    expect(cookie()).not.toHaveProperty('draftGrant');
    expect(draftKey()).toMatch(/^order-/);
  });

  it('only checks a mobile order and keeps the province of its postal code', async () => {
    plansList.mockResolvedValue({ plans: [plan('mobility')] });

    expect(await saveDetails(saveInput(mobileDetails))).toEqual({
      ok: true,
      data: { saved: true },
    });

    expect(plansList).toHaveBeenCalledWith({ leadType: 'mobility' });
    expect(leadsCreate).not.toHaveBeenCalled();
    expect(cookie()).toMatchObject({ productId: PRODUCT_ID });
    expect(cookie()).not.toHaveProperty('leadId');
    expect(cookie()).toHaveProperty('province');
  });

  it('replaces the cookie of an earlier SIM draft when the customer orders another plan', async () => {
    await startSimDraft();
    plansList.mockResolvedValue({ plans: [plan('internet')] });

    await saveDetails(saveInput(internetDetails));

    expect(leadsUpdate).not.toHaveBeenCalled();
    expect(cookie()).not.toHaveProperty('leadId');
    expect(cookie()).toMatchObject({ province: 'SK' });
  });

  it('issues a new idempotency key each time the details are saved', async () => {
    await startOneShotOrder('internet');
    const firstKey = draftKey();
    plansList.mockResolvedValue({ plans: [plan('internet')] });
    await saveDetails(saveInput(internetDetails));
    expect(draftKey()).not.toBe(firstKey);
  });
});

describe('saveDetails refusals', () => {
  it('reports an unknown plan as unavailable for a SIM order', async () => {
    plansList.mockResolvedValue({ plans: [] });
    expect(await saveDetails(saveInput(simDetails))).toMatchObject({
      ok: false,
      code: 'offer_unavailable',
    });
    expect(leadsCreate).not.toHaveBeenCalled();
    expect(jar.has('cp_order_draft')).toBe(false);
  });

  it('reports a plan with another id as unavailable', async () => {
    plansList.mockResolvedValue({
      plans: [plan('sim_order', { id: '44444444-4444-4444-8444-444444444444' })],
    });
    expect(await saveDetails(saveInput(simDetails))).toMatchObject({
      ok: false,
      code: 'offer_unavailable',
    });
  });

  it('reports an unknown plan as unavailable for a mobile order', async () => {
    plansList.mockResolvedValue({ plans: [] });
    expect(await saveDetails(saveInput(mobileDetails))).toMatchObject({
      ok: false,
      code: 'offer_unavailable',
    });
    expect(jar.has('cp_order_draft')).toBe(false);
  });

  it('reports a mobile plan not sold where the postal code is as unavailable', async () => {
    plansList.mockResolvedValue({ plans: [plan('mobility', {}, { custom_regions: 'BC' })] });
    expect(await saveDetails(saveInput(mobileDetails))).toMatchObject({
      ok: false,
      code: 'offer_unavailable',
    });
  });

  it('reports an unknown internet plan as not served', async () => {
    plansList.mockResolvedValue({ plans: [] });
    expect(await saveDetails(saveInput(internetDetails))).toMatchObject({
      ok: false,
      code: 'region_not_served',
    });
    expect(jar.has('cp_order_draft')).toBe(false);
  });

  it('refuses an internet plan that is not sold in the chosen province', async () => {
    plansList.mockResolvedValue({ plans: [plan('internet', {}, { custom_regions: 'ON,BC' })] });
    expect(await saveDetails(saveInput(internetDetails))).toMatchObject({
      ok: false,
      code: 'region_not_served',
    });
    expect(jar.has('cp_order_draft')).toBe(false);
  });

  it('accepts an internet plan sold in the chosen province', async () => {
    plansList.mockResolvedValue({ plans: [plan('internet', {}, { custom_regions: 'SK' })] });
    expect(await saveDetails(saveInput(internetDetails))).toMatchObject({ ok: true });
  });

  it('only offers plans of the details category', async () => {
    // The CRM list is asked for internet plans, so a mobile plan is not returned for these details.
    plansList.mockImplementation(async (query: { leadType: string }) => ({
      plans: query.leadType === 'mobility' ? [plan('mobility')] : [],
    }));
    expect(await saveDetails(saveInput(internetDetails))).toMatchObject({
      ok: false,
      code: 'region_not_served',
    });
  });

  it('refuses a missing proof before any backend call', async () => {
    expect(
      await saveDetails({ ...saveInput(simDetails), turnstileToken: undefined }),
    ).toMatchObject({ ok: false, code: 'verification_failed' });
    expect(plansList).not.toHaveBeenCalled();
    expect(leadsCreate).not.toHaveBeenCalled();
  });

  it('refuses an empty proof', async () => {
    expect(await saveDetails({ ...saveInput(simDetails), turnstileToken: '' })).toMatchObject({
      ok: false,
      code: 'verification_failed',
    });
  });

  it('rejects invalid details with per-field messages before any backend call', async () => {
    const result = await saveDetails(
      saveInput({ ...internetDetails, dateOfBirth: '2015-01-01', postalCode: 'T2P 1J9' }),
    );
    expect(result).toMatchObject({
      ok: false,
      code: 'validation_error',
      fieldErrors: { dateOfBirth: expect.any(String), postalCode: expect.any(String) },
    });
    expect(plansList).not.toHaveBeenCalled();
    expect(leadsCreate).not.toHaveBeenCalled();
  });

  it('rejects a plan id that is not a UUID', async () => {
    expect(await saveDetails({ ...saveInput(simDetails), productId: 'not-a-uuid' })).toMatchObject({
      ok: false,
      code: 'validation_error',
    });
    expect(plansList).not.toHaveBeenCalled();
  });

  it('treats a forbidden caller as a failed verification', async () => {
    leadsCreate.mockRejectedValue(new BackendError('caller_forbidden', 403, 'req-3'));
    expect(await saveDetails(saveInput(simDetails))).toMatchObject({
      ok: false,
      code: 'verification_failed',
    });
    expect(jar.has('cp_order_draft')).toBe(false);
  });

  it('reports a rejected plan as unavailable', async () => {
    leadsCreate.mockRejectedValue(new BackendError('plan_not_available', 409, 'req-4'));
    expect(await saveDetails(saveInput(simDetails))).toMatchObject({
      ok: false,
      code: 'offer_unavailable',
    });
  });

  it('does not store a draft when the plan lookup fails', async () => {
    plansList.mockRejectedValue(new BackendError('persistence_unavailable', 503, 'req-5'));
    expect(await saveDetails(saveInput(simDetails))).toMatchObject({
      ok: false,
      code: 'not_saved',
    });
    expect(leadsCreate).not.toHaveBeenCalled();
    expect(jar.has('cp_order_draft')).toBe(false);
  });

  it('does not report success for a transport failure', async () => {
    leadsCreate.mockRejectedValue(new TypeError('synthetic dropped response'));
    expect(await saveDetails(saveInput(simDetails))).toMatchObject({
      ok: false,
      code: 'not_saved',
    });
  });
});

describe('saveDocuments', () => {
  it('confirms the order in progress is still there', async () => {
    await startSimDraft();
    expect(await saveDocuments({ details: simDetails })).toEqual({
      ok: true,
      data: { saved: true },
    });
  });

  it('reports an expired order when there is no cookie', async () => {
    expect(await saveDocuments({ details: simDetails })).toMatchObject({
      ok: false,
      code: 'draft_expired',
    });
  });

  it('rejects invalid details', async () => {
    await startSimDraft();
    expect(await saveDocuments({ details: { ...simDetails, email: 'nope' } })).toMatchObject({
      ok: false,
      code: 'validation_error',
      fieldErrors: { email: expect.any(String) },
    });
  });
});

describe('document uploads', () => {
  const uploadId = '55555555-5555-4555-8555-555555555555';
  const intentInput = {
    documentType: 'passport',
    fileName: 'identity.pdf',
    contentType: 'application/pdf',
    sizeBytes: 100,
    turnstileToken: 'intent-proof',
  };

  it('forwards separate intent and finalization proofs with the same private draft grant', async () => {
    await startSimDraft();
    uploadIntent.mockResolvedValue({
      uploadId,
      url: 'https://upload.example.test',
      method: 'PUT',
      headers: { 'content-type': 'application/pdf' },
    });
    uploadFinalize.mockResolvedValue({ file: { id: 'file-id', documentType: 'passport' } });

    expect(await createDocumentIntent(intentInput)).toEqual({
      ok: true,
      uploadId,
      url: 'https://upload.example.test',
      method: 'PUT',
      headers: { 'content-type': 'application/pdf' },
    });
    expect(
      await finalizeDocument({
        uploadId,
        checksumSha256: 'a'.repeat(64),
        turnstileToken: 'finalize-proof',
      }),
    ).toEqual({ ok: true, fileId: 'file-id', documentType: 'passport' });

    expect(uploadIntent.mock.lastCall).toEqual([
      {
        parentType: 'lead',
        parentId: LEAD_A,
        documentType: 'passport',
        fileName: 'identity.pdf',
        contentType: 'application/pdf',
        sizeBytes: 100,
      },
      { draftGrant: 'grant-a', turnstileToken: 'intent-proof' },
    ]);
    expect(uploadFinalize.mock.lastCall).toEqual([
      uploadId,
      { checksumSha256: 'a'.repeat(64) },
      { draftGrant: 'grant-a', turnstileToken: 'finalize-proof' },
    ]);
  });

  it('needs a saved lead to attach a file to', async () => {
    expect(await createDocumentIntent(intentInput)).toMatchObject({
      ok: false,
      message: expect.stringMatching(/expired/),
    });
    expect(
      await finalizeDocument({ uploadId, checksumSha256: 'a'.repeat(64), turnstileToken: 't' }),
    ).toMatchObject({ ok: false, message: expect.stringMatching(/expired/) });
    expect(uploadIntent).not.toHaveBeenCalled();
    expect(uploadFinalize).not.toHaveBeenCalled();
  });

  it('has no lead to attach to for an internet order', async () => {
    await startOneShotOrder('internet');
    expect(await createDocumentIntent(intentInput)).toMatchObject({
      ok: false,
      message: expect.stringMatching(/expired/),
    });
    expect(uploadIntent).not.toHaveBeenCalled();
  });

  it('refuses a missing proof', async () => {
    await startSimDraft();
    expect(await createDocumentIntent({ ...intentInput, turnstileToken: undefined })).toMatchObject(
      { ok: false },
    );
    expect(await finalizeDocument({ uploadId, checksumSha256: 'a'.repeat(64) })).toMatchObject({
      ok: false,
    });
    expect(uploadIntent).not.toHaveBeenCalled();
    expect(uploadFinalize).not.toHaveBeenCalled();
  });

  it.each([
    ['documentType', { documentType: 'Not Valid!' }],
    ['contentType', { contentType: 'image/gif' }],
    ['fileName', { fileName: '' }],
    ['sizeBytes', { sizeBytes: 0 }],
  ])('refuses an invalid %s', async (_name, override) => {
    await startSimDraft();
    expect(await createDocumentIntent({ ...intentInput, ...override })).toMatchObject({
      ok: false,
      message: 'That file cannot be uploaded.',
    });
    expect(uploadIntent).not.toHaveBeenCalled();
  });

  it('refuses a finalization with a malformed id or checksum', async () => {
    await startSimDraft();
    expect(
      await finalizeDocument({
        uploadId: 'x',
        checksumSha256: 'a'.repeat(64),
        turnstileToken: 't',
      }),
    ).toMatchObject({ ok: false, message: 'That upload cannot be finalized.' });
    expect(
      await finalizeDocument({ uploadId, checksumSha256: 'zz', turnstileToken: 't' }),
    ).toMatchObject({ ok: false, message: 'That upload cannot be finalized.' });
  });

  const errorMessages = [
    ['draft_expired', /expired/],
    ['draft_not_found', /expired/],
    ['document_too_large', /10 MB/],
    ['checklist_mismatch', /not requested for this plan/],
    ['document_verification_failed', /could not be verified/],
    ['feature_not_ready', /not enabled yet/],
    ['persistence_unavailable', /could not be uploaded/],
  ] as const;

  it.each(errorMessages)('words the %s error for an intent', async (code, message) => {
    await startSimDraft();
    uploadIntent.mockRejectedValue(new BackendError(code, 400, 'req-1'));
    expect(await createDocumentIntent(intentInput)).toMatchObject({
      ok: false,
      message: expect.stringMatching(message),
    });
  });

  it.each(errorMessages)('words the %s error for a finalization', async (code, message) => {
    await startSimDraft();
    uploadFinalize.mockRejectedValue(new BackendError(code, 400, 'req-1'));
    expect(
      await finalizeDocument({ uploadId, checksumSha256: 'a'.repeat(64), turnstileToken: 't' }),
    ).toMatchObject({ ok: false, message: expect.stringMatching(message) });
  });

  it('words a transport failure generically', async () => {
    await startSimDraft();
    uploadIntent.mockRejectedValue(new TypeError('offline'));
    expect(await createDocumentIntent(intentInput)).toMatchObject({
      ok: false,
      message: 'The document could not be uploaded. Please try again.',
    });
  });
});

describe('requestQuote', () => {
  it('summarises the plan price with the billing period in the label', async () => {
    await startSimDraft();
    plansList.mockResolvedValue({ plans: [plan('sim_order', { billingPeriod: '30_days' })] });

    expect(await requestQuote({ category: 'sim' })).toEqual({
      ok: true,
      data: {
        quote: {
          currency: 'CAD',
          lines: [{ label: 'Visitor eSIM, per 30 days', amountMinor: 3500 }],
          totalMinor: 3500,
          termsVersion: TERMS,
        },
      },
    });
    expect(plansList).toHaveBeenCalledWith({ leadType: 'sim_order' });
  });

  it.each([
    ['month', 'per month'],
    ['30_days', 'per 30 days'],
    ['90_days', 'per 90 days'],
  ] as const)('words a %s plan as "%s"', async (billingPeriod, words) => {
    await startSimDraft();
    plansList.mockResolvedValue({ plans: [plan('sim_order', { billingPeriod })] });
    const result = await requestQuote({ category: 'sim' });
    expect(result).toMatchObject({
      ok: true,
      data: { quote: { lines: [{ label: `Visitor eSIM, ${words}` }] } },
    });
  });

  it('labels a plan with no wordable billing period by its name alone', async () => {
    await startSimDraft();
    plansList.mockResolvedValue({ plans: [plan('sim_order', { billingPeriod: 'one_time' })] });
    expect(await requestQuote({ category: 'sim' })).toMatchObject({
      ok: true,
      data: { quote: { lines: [{ label: 'Visitor eSIM', amountMinor: 3500 }] } },
    });
  });

  it('prices an internet plan for the province in the cookie', async () => {
    await startOneShotOrder('internet');
    plansList.mockResolvedValue({
      plans: [plan('internet', { priceMinor: 6000, billingPeriod: 'month' })],
    });
    expect(await requestQuote({ category: 'internet' })).toMatchObject({
      ok: true,
      data: { quote: { totalMinor: 6000 } },
    });
    expect(plansList).toHaveBeenCalledWith({ leadType: 'internet' });
  });

  it('reports the plan unavailable when it is not sold in the cookie province', async () => {
    await startOneShotOrder('internet');
    plansList.mockResolvedValue({ plans: [plan('internet', {}, { custom_regions: 'ON' })] });
    expect(await requestQuote({ category: 'internet' })).toMatchObject({
      ok: false,
      code: 'offer_unavailable',
    });
  });

  it('reports the plan unavailable when the CRM no longer lists it', async () => {
    await startSimDraft();
    plansList.mockResolvedValue({ plans: [] });
    expect(await requestQuote({ category: 'sim' })).toMatchObject({
      ok: false,
      code: 'offer_unavailable',
    });
  });

  it('offers a callback when the plan cannot be read', async () => {
    await startSimDraft();
    plansList.mockRejectedValue(new BackendError('persistence_unavailable', 503, 'req-1'));
    expect(await requestQuote({ category: 'sim' })).toMatchObject({
      ok: false,
      code: 'callback',
    });
  });

  it('reports an expired order without a cookie', async () => {
    expect(await requestQuote({ category: 'sim' })).toMatchObject({
      ok: false,
      code: 'draft_expired',
    });
    expect(plansList).not.toHaveBeenCalled();
  });
});

describe('requestCallback', () => {
  it('saves a submitted contact message naming the plan and province', async () => {
    await startOneShotOrder('internet');
    leadsCreate.mockResolvedValue({ lead: { id: LEAD_B }, draftGrant: null });

    const result = await requestCallback({
      details: internetDetails,
      turnstileToken: 'callback-proof',
    });

    expect(result).toEqual({ ok: true, data: { requested: true } });
    expect(leadsCreate).toHaveBeenCalledTimes(1);
    expect(leadsCreate.mock.calls[0]?.[0]).toEqual({
      leadType: 'contact_message',
      contact: {
        fullName: 'Test Customer',
        email: 'customer@example.test',
        phone: '3065550123',
        countryCode: 'CA',
      },
      form: {
        schemaVersion: 1,
        payload: {
          kind: 'callback_request',
          category: 'internet',
          planId: PRODUCT_ID,
          province: 'SK',
        },
      },
      consentVersion: CONSENT,
      submit: true,
    });
    expect(sentOptions(leadsCreate)).toEqual({ turnstileToken: 'callback-proof' });
  });

  it('names no province for a SIM order', async () => {
    await startSimDraft();
    leadsCreate.mockResolvedValue({ lead: { id: LEAD_B }, draftGrant: null });
    await requestCallback({ details: simDetails, turnstileToken: 'callback-proof' });
    expect(leadsCreate.mock.calls[0]?.[0]).toMatchObject({
      leadType: 'contact_message',
      form: { payload: { kind: 'callback_request', category: 'sim', planId: PRODUCT_ID } },
      submit: true,
    });
    expect(leadsCreate.mock.calls[0]?.[0].form.payload).not.toHaveProperty('province');
  });

  it('refuses a missing proof', async () => {
    await startSimDraft();
    expect(await requestCallback({ details: simDetails })).toMatchObject({
      ok: false,
      code: 'verification_failed',
    });
    expect(leadsCreate).not.toHaveBeenCalled();
  });

  it('reports an expired order without a cookie', async () => {
    expect(
      await requestCallback({ details: simDetails, turnstileToken: 'callback-proof' }),
    ).toMatchObject({ ok: false, code: 'draft_expired' });
  });

  it('rejects invalid details', async () => {
    await startSimDraft();
    expect(
      await requestCallback({
        details: { ...simDetails, fullName: '' },
        turnstileToken: 'callback-proof',
      }),
    ).toMatchObject({ ok: false, code: 'validation_error' });
    expect(leadsCreate).not.toHaveBeenCalled();
  });

  it('reports a backend failure as not saved', async () => {
    await startSimDraft();
    leadsCreate.mockRejectedValue(new BackendError('internal_error', 500, 'req-1'));
    expect(
      await requestCallback({ details: simDetails, turnstileToken: 'callback-proof' }),
    ).toMatchObject({ ok: false, code: 'not_saved' });
  });
});

describe('submitOrder for a SIM order', () => {
  it('submits the draft with its grant, the idempotency key and both consent versions', async () => {
    await startSimDraft();
    const key = draftKey();
    leadsUpdate.mockResolvedValue({ lead: { id: LEAD_A, externalRef: 'MS-7' } });

    const result = await submitOrder(submitInput(simDetails));

    expect(result).toEqual({ ok: true, data: { reference: 'MS-7', orderId: LEAD_A } });
    expect(leadsCreate).not.toHaveBeenCalled();
    expect(leadsUpdate).toHaveBeenCalledTimes(1);
    expect(leadsUpdate.mock.calls[0]?.[0]).toBe(LEAD_A);
    expect(leadsUpdate.mock.calls[0]?.[1]).toEqual({
      contact: {
        fullName: 'Test Customer',
        email: 'customer@example.test',
        phone: '1712345678',
        countryCode: 'BD',
      },
      form: {
        schemaVersion: 1,
        payload: {
          planId: 'visitor-esim',
          planLabel: 'Visitor eSIM',
          delivery: 'esim',
          arrivalDate: '2026-10-01',
          canadaAddress: 'Toronto',
          currentCountry: 'Bangladesh',
        },
      },
      order: { planId: PRODUCT_ID },
      consentVersion: `${CONSENT};${TERMS}`,
      submit: true,
    });
    expect(sentOptions(leadsUpdate)).toEqual({
      draftGrant: 'grant-a',
      idempotencyKey: key,
      turnstileToken: 'submit-proof',
    });
    expect(draftKey()).toBe(key);
  });

  it('falls back to the lead id when the CRM issued no order number', async () => {
    await startSimDraft();
    leadsUpdate.mockResolvedValue({ lead: { id: LEAD_A, externalRef: null } });
    expect(await submitOrder(submitInput(simDetails))).toEqual({
      ok: true,
      data: { reference: LEAD_A, orderId: LEAD_A },
    });
  });

  it('refuses SIM details when the cookie holds an internet order', async () => {
    await startOneShotOrder('internet');
    expect(await submitOrder(submitInput(simDetails))).toMatchObject({
      ok: false,
      code: 'draft_expired',
    });
    expect(leadsUpdate).not.toHaveBeenCalled();
  });
});

describe('submitOrder for an internet or mobile order', () => {
  it('creates the internet lead whole, with attribution and the idempotency key', async () => {
    await startOneShotOrder('internet');
    const key = draftKey();
    plansList.mockResolvedValue({ plans: [plan('internet', { name: 'Fibre 500' })] });
    leadsCreate.mockResolvedValue({ lead: { id: LEAD_B, externalRef: 'MS-9' } });

    const result = await submitOrder(submitInput(internetDetails));

    expect(result).toEqual({ ok: true, data: { reference: 'MS-9', orderId: LEAD_B } });
    expect(leadsUpdate).not.toHaveBeenCalled();
    expect(leadsCreate).toHaveBeenCalledTimes(1);
    expect(leadsCreate.mock.calls[0]?.[0]).toEqual({
      leadType: 'internet',
      contact: {
        fullName: 'Test Customer',
        email: 'customer@example.test',
        phone: '3065550123',
        countryCode: 'CA',
      },
      form: {
        schemaVersion: 1,
        payload: {
          planId: 'visitor-esim',
          planLabel: 'Fibre 500',
          streetAddress: '123 Main Street',
          city: 'Saskatoon',
          postalCode: 'S7K 0A1',
          dateOfBirth: '1990-05-15',
          consent: true,
          consentedAt: cookie()['consentedAt'],
        },
      },
      order: { planId: PRODUCT_ID },
      attribution,
      consentVersion: `${CONSENT};${TERMS}`,
      submit: true,
    });
    expect(sentOptions(leadsCreate)).toEqual({
      idempotencyKey: key,
      turnstileToken: 'submit-proof',
    });
  });

  it('creates the mobility lead and adds the credit-check consent version', async () => {
    await startOneShotOrder('mobile');
    plansList.mockResolvedValue({ plans: [plan('mobility')] });
    leadsCreate.mockResolvedValue({ lead: { id: LEAD_B, externalRef: null } });

    const result = await submitOrder(submitInput(mobileDetails));

    expect(result).toEqual({ ok: true, data: { reference: LEAD_B, orderId: LEAD_B } });
    expect(plansList).toHaveBeenCalledWith({ leadType: 'mobility' });
    expect(leadsCreate.mock.calls[0]?.[0]).toMatchObject({
      leadType: 'mobility',
      order: { planId: PRODUCT_ID },
      attribution,
      consentVersion: `${CONSENT};${TERMS};${CREDIT_CHECK}`,
      submit: true,
      form: {
        payload: {
          firstName: 'Test',
          lastName: 'Customer',
          lineCount: 1,
          keepNumber: true,
          simType: 'esim',
          currentProvider: 'Rogers',
        },
      },
    });
  });

  it('reuses the first attempt time and key on a retry, so the body is identical', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(FIRST_CONSENT_AT));
    await startOneShotOrder('internet');
    const key = draftKey();
    expect(cookie()).not.toHaveProperty('consentedAt');
    plansList.mockResolvedValue({ plans: [plan('internet')] });

    leadsCreate.mockRejectedValueOnce(new TypeError('synthetic dropped response'));
    expect(await submitOrder(submitInput(internetDetails, 'proof-1'))).toMatchObject({
      ok: false,
      code: 'transport_retry',
    });
    expect(cookie()['consentedAt']).toBe(FIRST_CONSENT_AT);

    // The customer retries minutes later.
    vi.setSystemTime(new Date('2026-10-20T12:07:00.000Z'));
    leadsCreate.mockResolvedValueOnce({ lead: { id: LEAD_B, externalRef: 'MS-3' } });
    expect(await submitOrder(submitInput(internetDetails, 'proof-2'))).toMatchObject({
      ok: true,
      data: { reference: 'MS-3' },
    });

    expect(leadsCreate).toHaveBeenCalledTimes(2);
    expect(leadsCreate.mock.calls[1]?.[0]).toEqual(leadsCreate.mock.calls[0]?.[0]);
    expect(leadsCreate.mock.calls[0]?.[0].form.payload.consentedAt).toBe(FIRST_CONSENT_AT);
    expect(leadsCreate.mock.calls.map((call) => call[1])).toEqual([
      { idempotencyKey: key, turnstileToken: 'proof-1' },
      { idempotencyKey: key, turnstileToken: 'proof-2' },
    ]);
    expect(draftKey()).toBe(key);
  });

  it('refuses internet details when the cookie holds a SIM draft', async () => {
    await startSimDraft();
    expect(await submitOrder(submitInput(internetDetails))).toMatchObject({
      ok: false,
      code: 'draft_expired',
    });
    expect(leadsCreate).not.toHaveBeenCalled();
  });

  it('reports an internet plan no longer sold in the province as not served', async () => {
    await startOneShotOrder('internet');
    plansList.mockResolvedValue({ plans: [plan('internet', {}, { custom_regions: 'ON' })] });
    expect(await submitOrder(submitInput(internetDetails))).toMatchObject({
      ok: false,
      code: 'region_not_served',
    });
    expect(leadsCreate).not.toHaveBeenCalled();
  });

  it('reports a withdrawn mobile plan as unavailable', async () => {
    await startOneShotOrder('mobile');
    plansList.mockResolvedValue({ plans: [] });
    expect(await submitOrder(submitInput(mobileDetails))).toMatchObject({
      ok: false,
      code: 'offer_unavailable',
    });
    expect(leadsCreate).not.toHaveBeenCalled();
  });
});

describe('submitOrder checks and recovery', () => {
  it('refuses a missing proof before reading anything', async () => {
    await startSimDraft();
    expect(
      await submitOrder({ ...submitInput(simDetails), turnstileToken: undefined }),
    ).toMatchObject({ ok: false, code: 'verification_failed' });
    expect(leadsUpdate).not.toHaveBeenCalled();
  });

  it('reports an expired order without a cookie', async () => {
    expect(await submitOrder(submitInput(simDetails))).toMatchObject({
      ok: false,
      code: 'draft_expired',
    });
  });

  it('rejects invalid details', async () => {
    await startSimDraft();
    expect(await submitOrder(submitInput({ ...simDetails, email: 'nope' }))).toMatchObject({
      ok: false,
      code: 'validation_error',
      fieldErrors: { email: expect.any(String) },
    });
    expect(leadsUpdate).not.toHaveBeenCalled();
  });

  it('refuses terms that are not the current version', async () => {
    await startSimDraft();
    expect(
      await submitOrder({ ...submitInput(simDetails), termsVersion: 'terms-2025-01-v1' }),
    ).toMatchObject({ ok: false, code: 'validation_error' });
    expect(leadsUpdate).not.toHaveBeenCalled();
    expect(plansList).not.toHaveBeenCalled();
  });

  it('asks for a new proof after a transport failure and keeps the same cookie and key', async () => {
    await startSimDraft();
    const key = draftKey();
    leadsUpdate.mockRejectedValueOnce(new TypeError('synthetic dropped response'));
    expect(await submitOrder(submitInput(simDetails, 'proof-1'))).toMatchObject({
      ok: false,
      code: 'transport_retry',
    });
    leadsUpdate.mockResolvedValueOnce({ lead: { id: LEAD_A, externalRef: 'MS-1' } });
    expect(await submitOrder(submitInput(simDetails, 'proof-2'))).toMatchObject({
      ok: true,
      data: { reference: 'MS-1' },
    });
    expect(leadsUpdate.mock.calls.map((call) => call[2])).toEqual([
      { draftGrant: 'grant-a', idempotencyKey: key, turnstileToken: 'proof-1' },
      { draftGrant: 'grant-a', idempotencyKey: key, turnstileToken: 'proof-2' },
    ]);
    expect(leadsUpdate.mock.calls[1]?.[1]).toEqual(leadsUpdate.mock.calls[0]?.[1]);
    expect(draftKey()).toBe(key);
  });

  it('keeps the cookie after a successful submission, so a lost response can be retried', async () => {
    await startSimDraft();
    leadsUpdate.mockResolvedValue({ lead: { id: LEAD_A, externalRef: 'MS-1' } });
    await submitOrder(submitInput(simDetails));
    expect(jar.has('cp_order_draft')).toBe(true);
  });

  it('treats an idempotency conflict as an order already received, and clears the cookie', async () => {
    await startSimDraft();
    leadsUpdate.mockRejectedValueOnce(new BackendError('idempotency_conflict', 409, 'req-1'));
    expect(await submitOrder(submitInput(simDetails))).toMatchObject({
      ok: false,
      code: 'draft_expired',
      message: expect.stringMatching(/already received an order/),
    });
    expect(jar.has('cp_order_draft')).toBe(false);
  });

  it('clears the cookie on an idempotency conflict for an internet order too', async () => {
    await startOneShotOrder('internet');
    plansList.mockResolvedValue({ plans: [plan('internet')] });
    leadsCreate.mockRejectedValueOnce(new BackendError('idempotency_conflict', 409, 'req-1'));
    expect(await submitOrder(submitInput(internetDetails))).toMatchObject({
      ok: false,
      code: 'draft_expired',
    });
    expect(jar.has('cp_order_draft')).toBe(false);
  });

  it('reports an already submitted draft as already ordered, keeping the cookie', async () => {
    await startSimDraft();
    leadsUpdate.mockRejectedValueOnce(new BackendError('draft_already_submitted', 409, 'req-1'));
    expect(await submitOrder(submitInput(simDetails))).toMatchObject({
      ok: false,
      code: 'draft_expired',
      message: expect.stringMatching(/already been placed/),
    });
    expect(jar.has('cp_order_draft')).toBe(true);
  });

  it.each(['draft_expired', 'draft_not_found'] as const)(
    'reports %s as an expired order',
    async (code) => {
      await startSimDraft();
      leadsUpdate.mockRejectedValueOnce(new BackendError(code, 404, 'req-1'));
      expect(await submitOrder(submitInput(simDetails))).toMatchObject({
        ok: false,
        code: 'draft_expired',
      });
    },
  );

  it('reports a plan the CRM rejects at submit as unavailable', async () => {
    await startSimDraft();
    leadsUpdate.mockRejectedValueOnce(new BackendError('plan_not_available', 409, 'req-1'));
    expect(await submitOrder(submitInput(simDetails))).toMatchObject({
      ok: false,
      code: 'offer_unavailable',
    });
  });

  it('treats a forbidden caller as a failed verification', async () => {
    await startSimDraft();
    leadsUpdate.mockRejectedValueOnce(new BackendError('caller_forbidden', 403, 'req-1'));
    expect(await submitOrder(submitInput(simDetails))).toMatchObject({
      ok: false,
      code: 'verification_failed',
    });
  });

  it('never reports a server error as success', async () => {
    await startSimDraft();
    leadsUpdate.mockRejectedValueOnce(new BackendError('internal_error', 500, 'req-1'));
    expect(await submitOrder(submitInput(simDetails))).toMatchObject({
      ok: false,
      code: 'not_saved',
    });
  });
});
