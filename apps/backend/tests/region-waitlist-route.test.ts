import type { Server } from 'node:http';
import express from 'express';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  apiErrorResponseSchema,
  joinRegionWaitlistResponseSchema,
} from '@canadian-plans/contracts';
import type { WebsiteCredentialResolution } from '@canadian-plans/db';

import type { LeadStore } from '../src/leads/store.js';
import { requestId } from '../src/requestId.js';
import { createWebsiteRouter } from '../src/routes/website.js';
import type { JoinRegionWaitlistInput, RegionWaitlistStore } from '../src/waitlist/store.js';
import { generateServiceSecret } from '../src/website/credential.js';
import type { WebsiteAuthDependencies } from '../src/website/session.js';

const WORKSPACE = '10000000-0000-4000-8000-000000000a01';
const CREDENTIAL = '80000000-0000-4000-8000-000000000a01';

const { secret: VALID_SECRET, secretHash: VALID_HASH } = generateServiceSecret();

class FakeLeadStore implements LeadStore {
  readLead: LeadStore['readLead'] = async () => ({ status: 'grant_invalid' });
  async createLead(): Promise<never> {
    throw new Error('leads are not used by the wish list route');
  }

  async updateLead(): Promise<never> {
    throw new Error('leads are not used by the wish list route');
  }

  async listLeads(): Promise<never> {
    throw new Error('leads are not used by the wish list route');
  }
}

class FakeWaitlistStore implements RegionWaitlistStore {
  readonly joined: JoinRegionWaitlistInput[] = [];
  fail = false;

  async join(input: JoinRegionWaitlistInput): Promise<void> {
    if (this.fail) throw new Error('database unavailable');
    this.joined.push(input);
  }
}

describe('POST /api/v1/website/region-waitlist', () => {
  let server: Server;
  let baseUrl: string;
  let store: FakeWaitlistStore;
  let resolution: WebsiteCredentialResolution;
  let rateLimitAllowed: boolean;

  beforeEach(async () => {
    store = new FakeWaitlistStore();
    rateLimitAllowed = true;
    resolution = {
      credentialId: CREDENTIAL,
      workspaceId: WORKSPACE,
      scopes: ['leads:write'],
      revoked: false,
    };
    const auth: WebsiteAuthDependencies = {
      resolveCredential: async (secretHash) => (secretHash === VALID_HASH ? resolution : undefined),
      rateLimit: async () => ({ allowed: rateLimitAllowed, retryAfterSeconds: 7 }),
      botCheck: () => true,
    };
    const app = express();
    app.use(requestId);
    app.use(express.json());
    app.use(
      '/api/v1/website',
      createWebsiteRouter({
        auth,
        leads: { store: new FakeLeadStore() },
        regionWaitlist: { store },
      }),
    );
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('expected TCP server');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const valid = { province: 'ON', email: 'a@b.co', interest: 'internet', consentVersion: 'v1' };

  function post(body: unknown, headers: Record<string, string> = {}) {
    return fetch(`${baseUrl}/api/v1/website/region-waitlist`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  }

  const auth = () => ({ authorization: `Bearer ${VALID_SECRET}` });

  it('stores the wish for the credential workspace and answers 201 with only a request id', async () => {
    const response = await post(valid, auth());
    expect(response.status).toBe(201);
    const body = joinRegionWaitlistResponseSchema.parse(await response.json());
    expect(Object.keys(body)).toEqual(['requestId']);
    expect(store.joined).toEqual([
      {
        workspaceId: WORKSPACE,
        actorId: CREDENTIAL,
        requestId: body.requestId,
        province: 'ON',
        email: 'a@b.co',
        interest: 'internet',
        consentVersion: 'v1',
      },
    ]);
  });

  it('accepts a wish without a plan interest', async () => {
    const response = await post({ province: 'NS', email: 'a@b.co', consentVersion: 'v1' }, auth());
    expect(response.status).toBe(201);
    expect(store.joined[0]?.interest).toBeUndefined();
  });

  it.each([
    ['the national marker', { ...valid, province: 'CA' }],
    ['an unknown province', { ...valid, province: 'ZZ' }],
    ['a bad email', { ...valid, email: 'not-an-email' }],
    ['an unknown interest', { ...valid, interest: 'tv' }],
    ['no consent version', { province: 'ON', email: 'a@b.co' }],
  ])('refuses %s with validation_error and stores nothing', async (_name, body) => {
    const response = await post(body, auth());
    expect(response.status).toBe(400);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('validation_error');
    expect(store.joined).toHaveLength(0);
  });

  it('requires a credential', async () => {
    const response = await post(valid);
    expect(response.status).toBe(401);
    expect(store.joined).toHaveLength(0);
  });

  it('requires the leads:write scope', async () => {
    resolution = { ...resolution, scopes: ['quotes:create'] };
    const response = await post(valid, auth());
    expect(response.status).toBe(403);
    expect(store.joined).toHaveLength(0);
  });

  it('is rate limited', async () => {
    rateLimitAllowed = false;
    const response = await post(valid, auth());
    expect(response.status).toBe(429);
    expect(store.joined).toHaveLength(0);
  });

  it('answers a store failure with internal_error and no detail', async () => {
    store.fail = true;
    const response = await post(valid, auth());
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toContain('database unavailable');
    expect(apiErrorResponseSchema.parse(JSON.parse(text)).error.code).toBe('internal_error');
  });
});
