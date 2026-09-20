import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  apiErrorResponseSchema,
  trackingOtpResponseSchema,
  trackingStatusResponseSchema,
  trackingVerifyResponseSchema,
} from '@canadian-plans/contracts';
import type { WebsiteCredentialResolution } from '@canadian-plans/db';

import { createApp } from '../src/app.js';
import type { StaffSessionVerifier } from '../src/auth/session.js';
import type { StaffStore } from '../src/staff/store.js';
import type { WebsiteCredentialStore } from '../src/website/store.js';
import { generateServiceSecret } from '../src/website/credential.js';
import type { TrackingNotifier, TrackingOtpMessage } from '../src/tracking/notifier.js';
import { TrackingService } from '../src/tracking/service.js';
import { signTrackingGrant } from '../src/tracking/secrets.js';
import type { ConsumeOutcome, TrackingStatusView, TrackingStore } from '../src/tracking/store.js';

const SECRET = 'tracking-route-test-secret-value-32-chars';
const WORKSPACE = '10000000-0000-4000-8000-000000000501';
const OTHER_WORKSPACE = '10000000-0000-4000-8000-000000000502';
const ORDER = '90000000-0000-4000-8000-000000000501';
const CREDENTIAL = '80000000-0000-4000-8000-000000000501';
const REFERENCE = 'CP-000501';
const EMAIL = 'jane@example.test';

const { secret: SERVICE_SECRET, secretHash: SECRET_HASH } = generateServiceSecret();

const resolution: WebsiteCredentialResolution = {
  credentialId: CREDENTIAL,
  workspaceId: WORKSPACE,
  scopes: ['tracking:otp'],
  revoked: false,
};

class FakeTrackingStore implements TrackingStore {
  readonly orders = new Map<string, { orderId: string; email: string }>([
    [`${WORKSPACE}:${REFERENCE}`, { orderId: ORDER, email: EMAIL }],
  ]);
  readonly rows: {
    codeHash: string;
    attempts: number;
    expiresAt: Date;
    status: 'pending' | 'consumed';
  }[] = [];
  view: TrackingStatusView | undefined = {
    reference: REFERENCE,
    fulfilmentStatus: 'dispatched',
    paymentState: 'paid',
    deliveryState: 'dispatched',
    trackingReference: 'TRACK-9',
    documentsRequired: ['passport'],
    updatedAt: new Date('2026-09-20T12:00:00.000Z'),
  };

  async matchOrder(input: { workspaceId: string; reference: string; normalizedEmail: string }) {
    const row = this.orders.get(`${input.workspaceId}:${input.reference}`);
    return row && row.email === input.normalizedEmail ? { orderId: row.orderId } : undefined;
  }

  async invalidatePending() {
    for (const row of this.rows) if (row.status === 'pending') row.status = 'consumed';
  }

  async createChallenge(input: { codeHash: string; expiresAt: Date }) {
    this.rows.push({
      codeHash: input.codeHash,
      attempts: 0,
      expiresAt: input.expiresAt,
      status: 'pending',
    });
    return { challengeId: crypto.randomUUID() };
  }

  async consume(input: { candidateCodeHash: string; now: Date }): Promise<ConsumeOutcome> {
    const row = this.rows.filter((candidate) => candidate.status === 'pending').at(-1);
    if (!row) return 'not_found';
    if (row.expiresAt.getTime() <= input.now.getTime()) {
      row.status = 'consumed';
      return 'expired';
    }
    if (row.attempts >= 5) {
      row.status = 'consumed';
      return 'exhausted';
    }
    if (row.codeHash !== input.candidateCodeHash) {
      row.attempts += 1;
      return 'invalid';
    }
    row.status = 'consumed';
    return 'verified';
  }

  async status() {
    return this.view;
  }
}

class RecordingNotifier implements TrackingNotifier {
  readonly sent: TrackingOtpMessage[] = [];
  async send(message: TrackingOtpMessage) {
    this.sent.push({ ...message });
  }
}

const staffOnly: {
  sessionVerifier: StaffSessionVerifier;
  store: StaffStore;
  credentialStore: WebsiteCredentialStore;
  leadStore: {
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
let store: FakeTrackingStore;
let notifier: RecordingNotifier;
let nowMs: number;
let originalSecret: string | undefined;

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

beforeEach(async () => {
  originalSecret = process.env['TRACKING_HASH_SECRET'];
  process.env['TRACKING_HASH_SECRET'] = SECRET;
  store = new FakeTrackingStore();
  notifier = new RecordingNotifier();
  nowMs = Date.parse('2026-09-20T12:00:00.000Z');
  const service = new TrackingService({
    store,
    notifier,
    secret: SECRET,
    now: () => new Date(nowMs),
  });
  server = createApp({
    staff: staffOnly,
    website: {
      auth: {
        resolveCredential: async (hash) => (hash === SECRET_HASH ? resolution : undefined),
        rateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
        botCheck: async () => true,
      },
      leads: { store: staffOnly.leadStore },
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
});

describe('POST /api/v1/website/tracking/otp', () => {
  it('answers neutrally for a known and an unknown reference', async () => {
    const known = await request(
      'POST',
      '/api/v1/website/tracking/otp',
      {},
      { email: EMAIL, orderReference: REFERENCE },
    );
    const unknown = await request(
      'POST',
      '/api/v1/website/tracking/otp',
      {},
      { email: EMAIL, orderReference: 'CP-NOPE' },
    );

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    const knownBody = trackingOtpResponseSchema.parse(await known.json());
    const unknownBody = trackingOtpResponseSchema.parse(await unknown.json());
    expect({ ...knownBody, requestId: 'x' }).toEqual({ ...unknownBody, requestId: 'x' });
    // Only the matching order actually produces a code.
    expect(notifier.sent).toHaveLength(1);
    // The code is never echoed in the response.
    const text = JSON.stringify(knownBody);
    expect(text).not.toContain(notifier.sent[0]?.code ?? 'no-code');
  });

  it('requires the website credential', async () => {
    const response = await fetch(`${baseUrl}/api/v1/website/tracking/otp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, orderReference: REFERENCE }),
    });
    expect(response.status).toBe(401);
  });
});

describe('POST /api/v1/website/tracking/verify', () => {
  it('rejects a wrong code and accepts the sent code once', async () => {
    await request(
      'POST',
      '/api/v1/website/tracking/otp',
      {},
      { email: EMAIL, orderReference: REFERENCE },
    );
    const code = notifier.sent[0]?.code ?? '';

    const wrongCode = code === '000000' ? '111111' : '000000';
    const wrong = await request(
      'POST',
      '/api/v1/website/tracking/verify',
      {},
      { email: EMAIL, orderReference: REFERENCE, code: wrongCode },
    );
    expect(wrong.status).toBe(400);
    expect(apiErrorResponseSchema.parse(await wrong.json()).error.code).toBe(
      'tracking_challenge_invalid',
    );

    const ok = await request(
      'POST',
      '/api/v1/website/tracking/verify',
      {},
      { email: EMAIL, orderReference: REFERENCE, code },
    );
    expect(ok.status).toBe(200);
    const body = trackingVerifyResponseSchema.parse(await ok.json());
    expect(body.grant.token.length).toBeGreaterThan(0);

    const again = await request(
      'POST',
      '/api/v1/website/tracking/verify',
      {},
      { email: EMAIL, orderReference: REFERENCE, code },
    );
    expect(again.status).toBe(400);
  });

  it('rejects an expired code', async () => {
    await request(
      'POST',
      '/api/v1/website/tracking/otp',
      {},
      { email: EMAIL, orderReference: REFERENCE },
    );
    const code = notifier.sent[0]?.code ?? '';
    nowMs += 10 * 60 * 1_000 + 1;
    const response = await request(
      'POST',
      '/api/v1/website/tracking/verify',
      {},
      { email: EMAIL, orderReference: REFERENCE, code },
    );
    expect(response.status).toBe(400);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('tracking_expired');
  });
});

describe('GET /api/v1/website/tracking', () => {
  it('returns status with a valid grant and denies a missing or foreign grant', async () => {
    const grant = signTrackingGrant(
      SECRET,
      { workspaceId: WORKSPACE, orderId: ORDER, emailHash: 'abc' },
      Date.now(),
    );
    const ok = await request('GET', '/api/v1/website/tracking', {
      'x-customer-grant': grant.token,
    });
    expect(ok.status).toBe(200);
    const status = trackingStatusResponseSchema.parse(await ok.json());
    expect(status.trackingReference).toBe('TRACK-9');
    expect(status.documentsRequired).toEqual(['passport']);

    const missing = await request('GET', '/api/v1/website/tracking');
    expect(missing.status).toBe(401);

    const foreign = signTrackingGrant(
      SECRET,
      { workspaceId: OTHER_WORKSPACE, orderId: ORDER, emailHash: 'abc' },
      Date.now(),
    );
    const crossWorkspace = await request('GET', '/api/v1/website/tracking', {
      'x-customer-grant': foreign.token,
    });
    expect(crossWorkspace.status).toBe(401);
  });

  it('denies an expired grant', async () => {
    const grant = signTrackingGrant(
      SECRET,
      { workspaceId: WORKSPACE, orderId: ORDER, emailHash: 'abc' },
      Date.now() - 31 * 60 * 1_000,
    );
    const response = await request('GET', '/api/v1/website/tracking', {
      'x-customer-grant': grant.token,
    });
    expect(response.status).toBe(401);
  });
});
