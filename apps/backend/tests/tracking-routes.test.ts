import { createHmac } from 'node:crypto';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InMemoryR2DocumentStore, sha256Hex } from '@canadian-plans/adapters';
import {
  apiErrorResponseSchema,
  createUploadIntentResponseSchema,
  trackingChangeRequestResponseSchema,
  trackingOrderResponseSchema,
  trackingOrdersResponseSchema,
  trackingOtpResponseSchema,
  trackingUploadFinalizeResponseSchema,
  trackingVerifyResponseSchema,
} from '@canadian-plans/contracts';
import type { WebsiteCredentialResolution } from '@canadian-plans/db';

import { createApp } from '../src/app.js';
import type { StaffSessionVerifier } from '../src/auth/session.js';
import {
  InMemoryDocumentContextResolver,
  InMemoryDocumentRecordStore,
} from '../src/documents/memory-store.js';
import { DocumentService } from '../src/documents/service.js';
import type { StaffStore } from '../src/staff/store.js';
import type { WebsiteCredentialStore } from '../src/website/store.js';
import { generateServiceSecret } from '../src/website/credential.js';
import { InMemoryTrackingStore, trackingDetail } from '../src/tracking/memory-store.js';
import { TrackingService } from '../src/tracking/service.js';
import { signTrackingGrant } from '../src/tracking/secrets.js';

const SECRET = 'tracking-route-test-secret-value-32-chars';
const WORKSPACE = '10000000-0000-4000-8000-000000000501';
const OTHER_WORKSPACE = '10000000-0000-4000-8000-000000000502';
const JANE_ORDER = '90000000-0000-4000-8000-000000000501';
const JANE_SECOND_ORDER = '90000000-0000-4000-8000-000000000502';
const BOB_ORDER = '90000000-0000-4000-8000-000000000503';
const FOREIGN_ORDER = '90000000-0000-4000-8000-000000000504';
const CREDENTIAL = '80000000-0000-4000-8000-000000000501';
const INFO_REQUEST = '70000000-0000-4000-8000-000000000501';
const EMAIL = 'jane@example.test';
const PDF = new TextEncoder().encode('%PDF-1.4\n% synthetic test document\n');

const { secret: SERVICE_SECRET, secretHash: SECRET_HASH } = generateServiceSecret();

const resolution: WebsiteCredentialResolution = {
  credentialId: CREDENTIAL,
  workspaceId: WORKSPACE,
  scopes: ['tracking:otp'],
  revoked: false,
};

const staffOnly: {
  sessionVerifier: StaffSessionVerifier;
  store: StaffStore;
  credentialStore: WebsiteCredentialStore;
  leadStore: {
    readLead: () => Promise<never>;
    createLead: () => Promise<never>;
    updateLead: () => Promise<never>;
    listLeads: () => Promise<{
      leads: never[];
      page: { page: number; pageSize: number; total: number };
    }>;
  };
} = {
  sessionVerifier: { verify: async () => undefined },
  store: {
    bootstrapStaff: async () => [],
    loadStaffAccess: async () => undefined,
    inviteStaff: async () => {
      throw new Error('unused');
    },
    revokeStaff: async () => 'not_found',
  },
  credentialStore: {
    createCredential: async () => {
      throw new Error('unused');
    },
    listCredentials: async () => [],
    revokeCredential: async () => ({ status: 'not_found' }),
  },
  leadStore: {
    readLead: async () => {
      throw new Error('unused');
    },
    createLead: async () => {
      throw new Error('unused');
    },
    updateLead: async () => {
      throw new Error('unused');
    },
    listLeads: async () => ({ leads: [], page: { page: 1, pageSize: 25, total: 0 } }),
  },
};

let server: Server;
let baseUrl: string;
let store: InMemoryTrackingStore;
let r2: InMemoryR2DocumentStore;
let documents: DocumentService;
let nowMs: number;
let originalSecret: string | undefined;
let originalLatency: string | undefined;
let denyRateLimit: boolean;
let botChecks: string[];
/** Counts per bucket like app.rate_limit_hit, so shared buckets would show up. */
let bucketCounts: Map<string, number>;

function request(
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: unknown,
) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${SERVICE_SECRET}`,
      'content-type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function grantFor(email: string, workspaceId = WORKSPACE, atMs = nowMs): string {
  return signTrackingGrant(SECRET, { workspaceId, normalizedEmail: email }, atMs).token;
}

async function errorCode(response: Response): Promise<string> {
  return apiErrorResponseSchema.parse(await response.json()).error.code;
}

beforeEach(async () => {
  originalSecret = process.env['TRACKING_HASH_SECRET'];
  originalLatency = process.env['TRACKING_OTP_MIN_LATENCY_MS'];
  process.env['TRACKING_HASH_SECRET'] = SECRET;
  process.env['TRACKING_OTP_MIN_LATENCY_MS'] = '200';
  denyRateLimit = false;
  botChecks = [];
  bucketCounts = new Map();
  nowMs = Date.now();
  store = new InMemoryTrackingStore(SECRET);
  store.addOrder({
    workspaceId: WORKSPACE,
    orderId: JANE_ORDER,
    email: EMAIL,
    detail: trackingDetail('CP-000501', { actionNeeded: true }),
  });
  store.addOrder({
    workspaceId: WORKSPACE,
    orderId: JANE_SECOND_ORDER,
    email: EMAIL,
    detail: trackingDetail('CP-000502', { documentsRequired: [] }),
  });
  store.addOrder({
    workspaceId: WORKSPACE,
    orderId: BOB_ORDER,
    email: 'bob@example.test',
    detail: trackingDetail('CP-000503'),
  });
  // Same email, another website (brand): never visible on this one.
  store.addOrder({
    workspaceId: OTHER_WORKSPACE,
    orderId: FOREIGN_ORDER,
    email: EMAIL,
    detail: trackingDetail('CP-000504'),
  });
  store.addInfoRequest(JANE_ORDER, INFO_REQUEST, ['form.arrivalDate']);

  const resolver = new InMemoryDocumentContextResolver();
  for (const orderId of [JANE_ORDER, JANE_SECOND_ORDER, BOB_ORDER])
    resolver.setChecklist('order', orderId, ['passport']);
  r2 = new InMemoryR2DocumentStore();
  documents = new DocumentService(new InMemoryDocumentRecordStore(), r2, resolver);

  const service = new TrackingService({
    store,
    contactHashSecret: () => SECRET,
    secret: SECRET,
    now: () => new Date(nowMs),
  });
  server = createApp({
    staff: staffOnly,
    website: {
      auth: {
        resolveCredential: async (hash) => (hash === SECRET_HASH ? resolution : undefined),
        rateLimit: async (input) => {
          if (denyRateLimit) return { allowed: false, retryAfterSeconds: 60 };
          const count = (bucketCounts.get(input.bucketKey) ?? 0) + 1;
          bucketCounts.set(input.bucketKey, count);
          return count > input.maxCount
            ? { allowed: false, retryAfterSeconds: 60 }
            : { allowed: true, retryAfterSeconds: 0 };
        },
        botCheck: async (_req, action) => {
          botChecks.push(action);
          return true;
        },
      },
      leads: { store: staffOnly.leadStore },
      documents: { service: documents, grants: { verifyLead: async () => undefined } },
      tracking: { service },
    },
  }).listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('expected TCP server');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  if (originalSecret === undefined) delete process.env['TRACKING_HASH_SECRET'];
  else process.env['TRACKING_HASH_SECRET'] = originalSecret;
  if (originalLatency === undefined) delete process.env['TRACKING_OTP_MIN_LATENCY_MS'];
  else process.env['TRACKING_OTP_MIN_LATENCY_MS'] = originalLatency;
});

describe('POST /api/v1/website/tracking/otp', () => {
  it('answers identically for an email with orders and one without', async () => {
    const known = await request('POST', '/api/v1/website/tracking/otp', {}, { email: EMAIL });
    const unknown = await request(
      'POST',
      '/api/v1/website/tracking/otp',
      {},
      { email: 'nobody@example.test' },
    );
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    const knownBody = trackingOtpResponseSchema.parse(await known.json());
    const unknownBody = trackingOtpResponseSchema.parse(await unknown.json());
    expect({ ...knownBody, requestId: 'x' }).toEqual({ ...unknownBody, requestId: 'x' });
    // Only the email with orders actually produces a code, never echoed back.
    expect(store.sent).toHaveLength(1);
    expect(JSON.stringify(knownBody)).not.toContain(store.sent[0]?.code ?? 'no-code');
  });

  it('runs the bot check once and needs the website credential', async () => {
    const response = await request('POST', '/api/v1/website/tracking/otp', {}, { email: EMAIL });
    expect(response.status).toBe(200);
    expect(botChecks).toEqual(['tracking-request']);
    const anonymous = await fetch(`${baseUrl}/api/v1/website/tracking/otp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: EMAIL }),
    });
    expect(anonymous.status).toBe(401);
  });

  it('responds no faster than the latency floor for a match and a non-match', async () => {
    async function timed(email: string) {
      const start = Date.now();
      const response = await request('POST', '/api/v1/website/tracking/otp', {}, { email });
      return { elapsed: Date.now() - start, status: response.status };
    }
    const known = await timed(EMAIL);
    const unknown = await timed('nobody@example.test');
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.elapsed).toBeGreaterThanOrEqual(180);
    expect(unknown.elapsed).toBeGreaterThanOrEqual(180);
  });
});

describe('POST /api/v1/website/tracking/verify', () => {
  it('keeps code requests and code checks on separate per-email counters', async () => {
    await request('POST', '/api/v1/website/tracking/otp', {}, { email: EMAIL });
    const code = store.sent[0]?.code ?? '';
    const wrongCode = code === '000000' ? '111111' : '000000';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(
        'POST',
        '/api/v1/website/tracking/verify',
        {},
        { email: EMAIL, code: wrongCode },
      );
    }
    // A customer who mistyped five times can still ask for a fresh code.
    await request('POST', '/api/v1/website/tracking/otp', {}, { email: EMAIL });
    expect(store.sent).toHaveLength(2);
    const emailBuckets = [...bucketCounts.keys()].filter((key) => key.startsWith('email:'));
    expect(emailBuckets.some((key) => key.startsWith('email:otp:'))).toBe(true);
    expect(emailBuckets.some((key) => key.startsWith('email:verify:'))).toBe(true);
  });

  it('rejects a wrong code and accepts the sent code once', async () => {
    await request('POST', '/api/v1/website/tracking/otp', {}, { email: EMAIL });
    const code = store.sent[0]?.code ?? '';
    const wrongCode = code === '000000' ? '111111' : '000000';
    const wrong = await request(
      'POST',
      '/api/v1/website/tracking/verify',
      {},
      { email: EMAIL, code: wrongCode },
    );
    expect(wrong.status).toBe(400);
    expect(await errorCode(wrong)).toBe('tracking_challenge_invalid');

    const ok = await request('POST', '/api/v1/website/tracking/verify', {}, { email: EMAIL, code });
    expect(ok.status).toBe(200);
    const body = trackingVerifyResponseSchema.parse(await ok.json());
    expect(body.grant.token).not.toContain(EMAIL);

    const again = await request(
      'POST',
      '/api/v1/website/tracking/verify',
      {},
      { email: EMAIL, code },
    );
    expect(again.status).toBe(400);
  });

  it('rejects an expired code with the same generic failure', async () => {
    await request('POST', '/api/v1/website/tracking/otp', {}, { email: EMAIL });
    const code = store.sent[0]?.code ?? '';
    nowMs += 10 * 60 * 1_000 + 1;
    const response = await request(
      'POST',
      '/api/v1/website/tracking/verify',
      {},
      { email: EMAIL, code },
    );
    expect(response.status).toBe(400);
    expect(await errorCode(response)).toBe('tracking_challenge_invalid');
  });

  it('does not accept one email’s code for another email', async () => {
    await request('POST', '/api/v1/website/tracking/otp', {}, { email: EMAIL });
    const code = store.sent[0]?.code ?? '';
    const response = await request(
      'POST',
      '/api/v1/website/tracking/verify',
      {},
      { email: 'bob@example.test', code },
    );
    expect(response.status).toBe(400);
  });

  it('rate-limits code verification by email and IP before consuming', async () => {
    await request('POST', '/api/v1/website/tracking/otp', {}, { email: EMAIL });
    const code = store.sent[0]?.code ?? '';
    denyRateLimit = true;
    const response = await request(
      'POST',
      '/api/v1/website/tracking/verify',
      {},
      { email: EMAIL, code },
    );
    expect(response.status).toBe(429);
    expect(await errorCode(response)).toBe('rate_limited');
    // The challenge is untouched — the limiter denied before any consumption.
    expect(store.challenges.filter((row) => row.status === 'consumed')).toHaveLength(0);
  });
});

describe('GET /api/v1/website/tracking/orders', () => {
  it('lists every order of the verified email on this website only', async () => {
    await request('POST', '/api/v1/website/tracking/otp', {}, { email: EMAIL });
    const code = store.sent[0]?.code ?? '';
    const verified = trackingVerifyResponseSchema.parse(
      await (
        await request('POST', '/api/v1/website/tracking/verify', {}, { email: EMAIL, code })
      ).json(),
    );
    const response = await request('GET', '/api/v1/website/tracking/orders', {
      'x-customer-grant': verified.grant.token,
    });
    expect(response.status).toBe(200);
    const body = trackingOrdersResponseSchema.parse(await response.json());
    expect(body.orders.map((order) => order.reference)).toEqual(['CP-000501', 'CP-000502']);
  });

  it('denies a missing, forged, expired, foreign-workspace or pre-release grant', async () => {
    const missing = await request('GET', '/api/v1/website/tracking/orders');
    expect(missing.status).toBe(401);

    const forged = signTrackingGrant(
      'some-other-secret-value-that-is-long-enough',
      { workspaceId: WORKSPACE, normalizedEmail: EMAIL },
      nowMs,
    ).token;
    const expired = grantFor(EMAIL, WORKSPACE, nowMs - 31 * 60 * 1_000);
    const foreign = grantFor(EMAIL, OTHER_WORKSPACE);
    const body = Buffer.from(
      JSON.stringify({
        workspaceId: WORKSPACE,
        orderId: JANE_ORDER,
        emailHash: 'abc',
        exp: nowMs + 60_000,
      }),
    ).toString('base64url');
    const legacy = `${body}.${createHmac('sha256', SECRET).update(body).digest('base64url')}`;
    for (const token of [forged, expired, foreign, legacy]) {
      const response = await request('GET', '/api/v1/website/tracking/orders', {
        'x-customer-grant': token,
      });
      expect(response.status).toBe(401);
      expect(await errorCode(response)).toBe('not_found');
    }
  });
});

describe('GET /api/v1/website/tracking/orders/:reference', () => {
  it('shows the verified email’s own order', async () => {
    const response = await request('GET', '/api/v1/website/tracking/orders/CP-000501', {
      'x-customer-grant': grantFor(EMAIL),
    });
    expect(response.status).toBe(200);
    const { order } = trackingOrderResponseSchema.parse(await response.json());
    expect(order).toMatchObject({
      reference: 'CP-000501',
      documentsRequired: ['passport'],
      infoRequests: [{ id: INFO_REQUEST, fields: ['form.arrivalDate'] }],
    });
  });

  it('answers 404 for another email’s order and for another website’s order', async () => {
    for (const reference of ['CP-000503', 'CP-000504', 'CP-UNKNOWN']) {
      const response = await request('GET', `/api/v1/website/tracking/orders/${reference}`, {
        'x-customer-grant': grantFor(EMAIL),
      });
      expect(response.status).toBe(404);
      expect(await errorCode(response)).toBe('order_not_found');
    }
  });
});

describe('POST /api/v1/website/tracking/orders/:reference/change-requests', () => {
  it('records a pending change and returns only field names', async () => {
    const response = await request(
      'POST',
      '/api/v1/website/tracking/orders/CP-000501/change-requests',
      { 'x-customer-grant': grantFor(EMAIL) },
      { patch: { contact: { phone: '+1 604 555 0142' } }, note: 'New number' },
    );
    expect(response.status).toBe(201);
    const text = await response.text();
    expect(text).not.toContain('555 0142');
    const body = trackingChangeRequestResponseSchema.parse(JSON.parse(text));
    expect(body.changeRequest).toMatchObject({ status: 'pending', fields: ['contact.phone'] });
  });

  it('refuses another email’s order, a commercial field and an expired grant', async () => {
    const other = await request(
      'POST',
      '/api/v1/website/tracking/orders/CP-000503/change-requests',
      { 'x-customer-grant': grantFor(EMAIL) },
      { patch: { contact: { phone: '+1' } } },
    );
    expect(other.status).toBe(404);
    // Only amendable fields exist in the schema: a price edit is an empty patch.
    const commercial = await request(
      'POST',
      '/api/v1/website/tracking/orders/CP-000501/change-requests',
      { 'x-customer-grant': grantFor(EMAIL) },
      { patch: { snapshot: { total: 0 } } },
    );
    expect(commercial.status).toBe(400);
    const expired = await request(
      'POST',
      '/api/v1/website/tracking/orders/CP-000501/change-requests',
      { 'x-customer-grant': grantFor(EMAIL, WORKSPACE, nowMs - 31 * 60 * 1_000) },
      { patch: { contact: { phone: '+1' } } },
    );
    expect(expired.status).toBe(401);
  });

  it('caps open customer changes per order and writes per email', async () => {
    const send = () =>
      request(
        'POST',
        '/api/v1/website/tracking/orders/CP-000502/change-requests',
        { 'x-customer-grant': grantFor(EMAIL) },
        { patch: { contact: { phone: '+1' } } },
      );
    for (let i = 0; i < 3; i += 1) expect((await send()).status).toBe(201);
    const capped = await send();
    expect(capped.status).toBe(409);
    expect(await errorCode(capped)).toBe('too_many_pending_requests');
    denyRateLimit = true;
    expect((await send()).status).toBe(429);
  });
});

describe('POST /api/v1/website/tracking/orders/:reference/info-requests/:id/response', () => {
  const path = `/api/v1/website/tracking/orders/CP-000501/info-requests/${INFO_REQUEST}/response`;

  it('accepts exactly the requested fields once', async () => {
    const mismatch = await request(
      'POST',
      path,
      { 'x-customer-grant': grantFor(EMAIL) },
      { patch: { contact: { phone: '+1' } } },
    );
    expect(mismatch.status).toBe(422);
    expect(await errorCode(mismatch)).toBe('info_request_fields_mismatch');
    const ok = await request(
      'POST',
      path,
      { 'x-customer-grant': grantFor(EMAIL) },
      { patch: { form: { arrivalDate: '2026-11-20' } } },
    );
    expect(ok.status).toBe(201);
    const again = await request(
      'POST',
      path,
      { 'x-customer-grant': grantFor(EMAIL) },
      { patch: { form: { arrivalDate: '2026-11-21' } } },
    );
    expect(again.status).toBe(404);
    expect(await errorCode(again)).toBe('info_request_not_found');
  });

  it('cannot answer through another email’s grant', async () => {
    const response = await request(
      'POST',
      path,
      { 'x-customer-grant': grantFor('bob@example.test') },
      { patch: { form: { arrivalDate: '2026-11-20' } } },
    );
    expect(response.status).toBe(404);
    expect(await errorCode(response)).toBe('order_not_found');
  });
});

describe('tracking uploads', () => {
  async function intent(reference: string, email: string, documentType = 'passport') {
    return request(
      'POST',
      `/api/v1/website/tracking/orders/${reference}/uploads/intents`,
      { 'x-customer-grant': grantFor(email), 'x-turnstile-token': 'proof' },
      { documentType, fileName: 'passport.pdf', contentType: 'application/pdf', sizeBytes: 64 },
    );
  }
  function putBytes(url: string): void {
    // memory://<workspace>/<stagingKey>
    const stagingKey = url.replace(/^memory:\/\/[^/]+\//, '');
    r2.putStagingObject(stagingKey, PDF);
  }
  function finalize(reference: string, email: string, uploadId: string) {
    return request(
      'POST',
      `/api/v1/website/tracking/orders/${reference}/uploads/${uploadId}/finalize`,
      { 'x-customer-grant': grantFor(email), 'x-turnstile-token': 'proof' },
      { checksumSha256: sha256Hex(PDF) },
    );
  }

  it('uploads and verifies a checklist document on the customer’s own order', async () => {
    const created = await intent('CP-000501', EMAIL);
    expect(created.status).toBe(201);
    const upload = createUploadIntentResponseSchema.parse(await created.json());
    putBytes(upload.url);
    const done = await finalize('CP-000501', EMAIL, upload.uploadId);
    expect(done.status).toBe(200);
    const body = trackingUploadFinalizeResponseSchema.parse(await done.json());
    expect(body.document).toMatchObject({ documentType: 'passport', status: 'received' });
    expect(botChecks).toEqual(['upload-intent', 'upload-finalize']);
  });

  it('refuses an off-checklist type and another email’s order', async () => {
    const offList = await intent('CP-000501', EMAIL, 'bank_statement');
    expect(offList.status).toBe(409);
    expect(await errorCode(offList)).toBe('checklist_mismatch');
    const others = await intent('CP-000503', EMAIL);
    expect(others.status).toBe(404);
    expect(await errorCode(others)).toBe('order_not_found');
  });

  it('never finalizes an upload that belongs to someone else’s order', async () => {
    // Bob starts an upload on his own order...
    const bobs = createUploadIntentResponseSchema.parse(
      await (await intent('CP-000503', 'bob@example.test')).json(),
    );
    putBytes(bobs.url);
    // ...Jane cannot attach it through her own order or reach his order.
    const viaOwnOrder = await finalize('CP-000501', EMAIL, bobs.uploadId);
    expect(viaOwnOrder.status).toBe(404);
    expect(await errorCode(viaOwnOrder)).toBe('upload_not_found');
    const viaHisOrder = await finalize('CP-000503', EMAIL, bobs.uploadId);
    expect(viaHisOrder.status).toBe(404);
    expect(await errorCode(viaHisOrder)).toBe('order_not_found');
    // Bob still can.
    expect((await finalize('CP-000503', 'bob@example.test', bobs.uploadId)).status).toBe(200);
  });
});
