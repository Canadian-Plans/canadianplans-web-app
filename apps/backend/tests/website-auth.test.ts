import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiErrorResponseSchema } from '@canadian-plans/contracts';
import type {
  RateLimitInput,
  RateLimitResult,
  WebsiteCredentialResolution,
} from '@canadian-plans/db';

import { createApp } from '../src/app.js';
import type { StaffSessionVerifier } from '../src/auth/session.js';
import type { StaffStore } from '../src/staff/store.js';
import type { WebsiteCredentialStore } from '../src/website/store.js';
import { generateServiceSecret } from '../src/website/credential.js';

const WORKSPACE = '10000000-0000-4000-8000-000000000101';

// A valid, well-formed credential secret and its stored hash.
const { secret: VALID_SECRET, secretHash: VALID_HASH } = generateServiceSecret();

class FakeCredentialResolver {
  resolution: WebsiteCredentialResolution | undefined = {
    workspaceId: WORKSPACE,
    scopes: ['leads:write', 'quotes:create'],
    revoked: false,
  };

  resolve = async (secretHash: string): Promise<WebsiteCredentialResolution | undefined> =>
    secretHash === VALID_HASH ? this.resolution : undefined;
}

/** In-memory fixed-window limiter mirroring the SQL function's semantics. */
class FakeRateLimiter {
  private counts = new Map<string, number>();
  denyPrefixes = new Set<string>();

  hit = async (input: RateLimitInput): Promise<RateLimitResult> => {
    if ([...this.denyPrefixes].some((prefix) => input.bucketKey.startsWith(prefix))) {
      return { allowed: false, retryAfterSeconds: 42 };
    }
    const next = (this.counts.get(input.bucketKey) ?? 0) + 1;
    this.counts.set(input.bucketKey, next);
    return { allowed: next <= input.maxCount, retryAfterSeconds: next <= input.maxCount ? 0 : 42 };
  };
}

// Staff dependencies exist only so the app mounts; the staff verifier rejects
// any bearer that is not a known Supabase token (a website credential is not).
const staffOnly: {
  sessionVerifier: StaffSessionVerifier;
  store: StaffStore;
  credentialStore: WebsiteCredentialStore;
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
};

let server: Server;
let baseUrl: string;
let resolver: FakeCredentialResolver;
let limiter: FakeRateLimiter;

function post(path: string, headers: Record<string, string>, body?: unknown) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(async () => {
  resolver = new FakeCredentialResolver();
  limiter = new FakeRateLimiter();
  server = createApp({
    staff: staffOnly,
    website: { auth: { resolveCredential: resolver.resolve, rateLimit: limiter.hit } },
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
    resolver.resolution = { workspaceId: WORKSPACE, scopes: ['leads:write'], revoked: true };
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
      { workspace_id: '10000000-0000-4000-8000-0000000000ff', email: 'x@example.test' },
    );
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ workspaceId: WORKSPACE, callerType: 'website' });
  });

  it('denies a credential that lacks the required scope', async () => {
    resolver.resolution = { workspaceId: WORKSPACE, scopes: ['tracking:otp'], revoked: false };
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
