import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiErrorResponseSchema, createLeadResponseSchema } from '@canadian-plans/contracts';
import type {
  RateLimitInput,
  RateLimitResult,
  WebsiteCredentialResolution,
} from '@canadian-plans/db';

import { createApp } from '../src/app.js';
import type { StaffSessionVerifier } from '../src/auth/session.js';
import type {
  CreateLeadInput,
  CreateLeadResult,
  LeadStore,
  UpdateLeadOutcome,
} from '../src/leads/store.js';
import type { StaffStore } from '../src/staff/store.js';
import type { WebsiteCredentialStore } from '../src/website/store.js';
import { generateServiceSecret } from '../src/website/credential.js';

const WORKSPACE = '10000000-0000-4000-8000-000000000101';
const CREDENTIAL = '80000000-0000-4000-8000-000000000201';

// A valid, well-formed credential secret and its stored hash.
const { secret: VALID_SECRET, secretHash: VALID_HASH } = generateServiceSecret();

class FakeCredentialResolver {
  resolution: WebsiteCredentialResolution | undefined = {
    credentialId: CREDENTIAL,
    workspaceId: WORKSPACE,
    scopes: ['leads:write', 'quotes:create'],
    revoked: false,
  };

  resolve = async (secretHash: string): Promise<WebsiteCredentialResolution | undefined> =>
    secretHash === VALID_HASH ? this.resolution : undefined;
}

/** In-memory fixed-window limiter mirroring the SQL function's semantics. */
class FakeRateLimiter {
  readonly inputs: RateLimitInput[] = [];
  private counts = new Map<string, number>();
  denyPrefixes = new Set<string>();

  hit = async (input: RateLimitInput): Promise<RateLimitResult> => {
    this.inputs.push(input);
    if ([...this.denyPrefixes].some((prefix) => input.bucketKey.startsWith(prefix))) {
      return { allowed: false, retryAfterSeconds: 42 };
    }
    const next = (this.counts.get(input.bucketKey) ?? 0) + 1;
    this.counts.set(input.bucketKey, next);
    return { allowed: next <= input.maxCount, retryAfterSeconds: next <= input.maxCount ? 0 : 42 };
  };
}

/** Records every call so a test can assert what the route handed to the store, without a real database. */
class FakeLeadStore implements LeadStore {
  readonly createCalls: CreateLeadInput[] = [];

  async createLead(input: CreateLeadInput): Promise<CreateLeadResult> {
    this.createCalls.push(input);
    return {
      lead: {
        id: '90000000-0000-4000-8000-000000000001',
        workspaceId: input.workspaceId,
        status: 'incomplete',
        updatedAt: '2026-09-14T00:00:00.000Z',
      },
      grant: { token: 'cpldg_test', expiresAt: '2026-10-14T00:00:00.000Z' },
    };
  }

  async updateLead(): Promise<UpdateLeadOutcome> {
    throw new Error('not used in these auth tests');
  }

  async listLeads() {
    return { leads: [], page: { page: 1, pageSize: 25, total: 0 } };
  }
}

// Staff dependencies exist only so the app mounts; the staff verifier rejects
// any bearer that is not a known Supabase token (a website credential is not).
const staffOnly: {
  sessionVerifier: StaffSessionVerifier;
  store: StaffStore;
  credentialStore: WebsiteCredentialStore;
  leadStore: LeadStore;
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
let resolver: FakeCredentialResolver;
let limiter: FakeRateLimiter;
let leadStore: FakeLeadStore;
let admitted: boolean;
let admissionFailure: boolean;

function post(path: string, headers: Record<string, string>, body?: unknown) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const VALID_LEAD_BODY = { consentVersion: 'terms-2026-09' };

beforeEach(async () => {
  resolver = new FakeCredentialResolver();
  limiter = new FakeRateLimiter();
  leadStore = new FakeLeadStore();
  admitted = true;
  admissionFailure = false;
  server = createApp({
    staff: staffOnly,
    website: {
      auth: {
        resolveCredential: resolver.resolve,
        rateLimit: limiter.hit,
        botCheck: async () => {
          if (admissionFailure) throw new Error('provider unavailable');
          return admitted;
        },
      },
      leads: { store: leadStore },
    },
  }).listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('expected TCP server');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('public website credential authentication', () => {
  it('denies an asynchronous admission exception without database work', async () => {
    admissionFailure = true;
    const response = await post(
      '/api/v1/website/leads',
      { authorization: `Bearer ${VALID_SECRET}` },
      {},
    );
    expect(response.status).toBe(403);
    expect(limiter.inputs).toHaveLength(0);
  });
  it('denies failed admission before touching database-backed dependencies', async () => {
    admitted = false;
    const response = await post(
      '/api/v1/website/leads',
      { authorization: `Bearer ${VALID_SECRET}` },
      {},
    );
    expect(response.status).toBe(403);
    expect(limiter.inputs).toHaveLength(0);
  });

  it('ignores spoofed forwarding headers when selecting the IP bucket', async () => {
    for (const address of ['203.0.113.1', '203.0.113.2']) {
      expect(
        (
          await post(
            '/api/v1/website/leads',
            { authorization: `Bearer ${VALID_SECRET}`, 'x-forwarded-for': address },
            VALID_LEAD_BODY,
          )
        ).status,
      ).toBe(201);
    }
    const buckets = limiter.inputs
      .filter((input) => input.bucketKey.startsWith('ip:'))
      .map((input) => input.bucketKey);
    expect(new Set(buckets).size).toBe(1);
    expect(buckets[0]).not.toContain('203.0.113.');
  });

  it('requires a well-formed service credential', async () => {
    const missing = await post('/api/v1/website/leads', {}, {});
    expect(missing.status).toBe(401);
    expect(apiErrorResponseSchema.parse(await missing.json()).error.code).toBe(
      'missing_credential',
    );

    const malformed = await post('/api/v1/website/leads', { authorization: 'Bearer not-ours' }, {});
    expect(malformed.status).toBe(401);
    expect(apiErrorResponseSchema.parse(await malformed.json()).error.code).toBe(
      'missing_credential',
    );
  });

  it('rejects an unknown credential', async () => {
    const { secret } = generateServiceSecret();
    const response = await post('/api/v1/website/leads', { authorization: `Bearer ${secret}` }, {});
    expect(response.status).toBe(401);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe(
      'invalid_credential',
    );
  });

  it('denies a revoked credential', async () => {
    resolver.resolution = {
      credentialId: CREDENTIAL,
      workspaceId: WORKSPACE,
      scopes: ['leads:write'],
      revoked: true,
    };
    const response = await post(
      '/api/v1/website/leads',
      { authorization: `Bearer ${VALID_SECRET}` },
      {},
    );
    expect(response.status).toBe(401);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe(
      'credential_revoked',
    );
  });

  it('derives the workspace from the credential and ignores a forged workspace_id in the body', async () => {
    const response = await post(
      '/api/v1/website/leads',
      { authorization: `Bearer ${VALID_SECRET}` },
      { ...VALID_LEAD_BODY, workspace_id: '10000000-0000-4000-8000-0000000000ff' },
    );
    expect(response.status).toBe(201);
    const body = createLeadResponseSchema.parse(await response.json());
    expect(body.lead.workspaceId).toBe(WORKSPACE);
    expect(leadStore.createCalls).toHaveLength(1);
    expect(leadStore.createCalls[0]?.workspaceId).toBe(WORKSPACE);
    expect(leadStore.createCalls[0]?.actorId).toBe(CREDENTIAL);
  });

  it('denies a credential that lacks the required scope', async () => {
    resolver.resolution = {
      credentialId: CREDENTIAL,
      workspaceId: WORKSPACE,
      scopes: ['tracking:otp'],
      revoked: false,
    };
    const response = await post(
      '/api/v1/website/leads',
      { authorization: `Bearer ${VALID_SECRET}` },
      {},
    );
    expect(response.status).toBe(403);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('scope_denied');
  });

  it('rate-limits before doing credential work', async () => {
    limiter.denyPrefixes.add('ip:');
    const response = await post(
      '/api/v1/website/leads',
      { authorization: `Bearer ${VALID_SECRET}` },
      {},
    );
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('42');
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('rate_limited');
  });

  it('refuses a website credential on a staff-only endpoint', async () => {
    const response = await fetch(`${baseUrl}/api/v1/staff/workspaces`, {
      headers: { authorization: `Bearer ${VALID_SECRET}` },
    });
    expect(response.status).toBe(401);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('invalid_session');
  });
});
