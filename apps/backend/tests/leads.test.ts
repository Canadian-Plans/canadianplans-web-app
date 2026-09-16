import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiErrorResponseSchema, createLeadResponseSchema } from '@canadian-plans/contracts';
import type { WebsiteCredentialResolution } from '@canadian-plans/db';

import { createApp } from '../src/app.js';
import type { StaffSessionVerifier } from '../src/auth/session.js';
import type {
  CreateLeadInput,
  CreateLeadResult,
  LeadStore,
  UpdateLeadInput,
  UpdateLeadOutcome,
} from '../src/leads/store.js';
import type { StaffStore } from '../src/staff/store.js';
import type { WebsiteCredentialStore } from '../src/website/store.js';
import { generateServiceSecret } from '../src/website/credential.js';

const WORKSPACE = '10000000-0000-4000-8000-000000000301';
const CREDENTIAL = '80000000-0000-4000-8000-000000000301';
const LEAD_A = '90000000-0000-4000-8000-000000000301';
const LEAD_B = '90000000-0000-4000-8000-000000000302';
const VALID_GRANT_A = 'cpldg_valid-grant-for-lead-a';

const { secret: SECRET, secretHash: SECRET_HASH } = generateServiceSecret();

const resolution: WebsiteCredentialResolution = {
  credentialId: CREDENTIAL,
  workspaceId: WORKSPACE,
  scopes: ['leads:write'],
  revoked: false,
};

/**
 * A faithful in-memory re-implementation of the grant-matching rules
 * `DatabaseLeadStore` enforces in SQL: a token must hash-match AND belong to
 * the exact lead in the URL, and must be neither expired nor revoked. This
 * lets the route's handling of each outcome be tested without a live
 * database (see `apps/backend/tests/leads-store.integration.test.ts` for
 * coverage of the real SQL these rules mirror).
 */
class FakeLeadStore implements LeadStore {
  readonly createCalls: CreateLeadInput[] = [];
  readonly updateCalls: UpdateLeadInput[] = [];
  grants = new Map<string, { leadId: string; expiresAt: number; revoked: boolean }>([
    [VALID_GRANT_A, { leadId: LEAD_A, expiresAt: Date.now() + 60_000, revoked: false }],
  ]);
  leadStatus = new Map<string, 'incomplete' | 'submitted'>([
    [LEAD_A, 'incomplete'],
    [LEAD_B, 'incomplete'],
  ]);

  async createLead(input: CreateLeadInput): Promise<CreateLeadResult> {
    this.createCalls.push(input);
    return {
      lead: { id: LEAD_A, workspaceId: input.workspaceId, status: 'incomplete', updatedAt: NOW },
      grant: { token: VALID_GRANT_A, expiresAt: new Date(Date.now() + 60_000).toISOString() },
    };
  }

  async updateLead(input: UpdateLeadInput): Promise<UpdateLeadOutcome> {
    this.updateCalls.push(input);
    const grant = this.grants.get(input.grantToken);
    if (!grant || grant.leadId !== input.leadId) return { status: 'grant_invalid' };
    if (grant.revoked || grant.expiresAt <= Date.now()) return { status: 'grant_expired' };
    return {
      status: 'updated',
      lead: {
        id: input.leadId,
        workspaceId: input.workspaceId,
        status: 'incomplete',
        updatedAt: NOW,
      },
    };
  }

  async listLeads() {
    return { leads: [], page: { page: 1, pageSize: 25, total: 0 } };
  }
}

const NOW = '2026-09-16T00:00:00.000Z';

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
let leadStore: FakeLeadStore;

function request(method: string, path: string, headers: Record<string, string>, body?: unknown) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${SECRET}`,
      'content-type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(async () => {
  leadStore = new FakeLeadStore();
  server = createApp({
    staff: staffOnly,
    website: {
      auth: {
        resolveCredential: async (hash) => (hash === SECRET_HASH ? resolution : undefined),
        rateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
        botCheck: async () => true,
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

describe('POST /api/v1/website/leads', () => {
  it('requires a consent version', async () => {
    const response = await request('POST', '/api/v1/website/leads', {}, {});
    expect(response.status).toBe(400);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('validation_error');
    expect(leadStore.createCalls).toHaveLength(0);
  });

  it('creates a lead and returns a draft grant when consent version is present', async () => {
    const response = await request(
      'POST',
      '/api/v1/website/leads',
      {},
      { consentVersion: 'terms-2026-09' },
    );
    expect(response.status).toBe(201);
    const body = createLeadResponseSchema.parse(await response.json());
    expect(body.lead.id).toBe(LEAD_A);
    expect(body.draftGrant.token).toBe(VALID_GRANT_A);
  });

  it('rejects a malformed productId instead of forwarding it to the store', async () => {
    const response = await request(
      'POST',
      '/api/v1/website/leads',
      {},
      { consentVersion: 'terms-2026-09', productId: 'not-a-uuid' },
    );
    expect(response.status).toBe(400);
    expect(leadStore.createCalls).toHaveLength(0);
  });
});

describe('PATCH /api/v1/website/leads/:leadId', () => {
  it('fails a forged grant', async () => {
    const response = await request(
      'PATCH',
      `/api/v1/website/leads/${LEAD_A}`,
      { 'x-draft-grant': 'cpldg_totally-forged-1234567890' },
      { contact: { fullName: 'Jane Doe' } },
    );
    expect(response.status).toBe(401);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('draft_not_found');
  });

  it('fails when the grant header is missing entirely', async () => {
    const response = await request('PATCH', `/api/v1/website/leads/${LEAD_A}`, {}, {});
    expect(response.status).toBe(401);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('draft_not_found');
    expect(leadStore.updateCalls).toHaveLength(0);
  });

  it('fails a grant that belongs to a different lead', async () => {
    const response = await request(
      'PATCH',
      `/api/v1/website/leads/${LEAD_B}`,
      { 'x-draft-grant': VALID_GRANT_A },
      { contact: { fullName: 'Jane Doe' } },
    );
    expect(response.status).toBe(401);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('draft_not_found');
  });

  it('fails an expired grant', async () => {
    leadStore.grants.set(VALID_GRANT_A, {
      leadId: LEAD_A,
      expiresAt: Date.now() - 1,
      revoked: false,
    });
    const response = await request(
      'PATCH',
      `/api/v1/website/leads/${LEAD_A}`,
      { 'x-draft-grant': VALID_GRANT_A },
      { contact: { fullName: 'Jane Doe' } },
    );
    expect(response.status).toBe(401);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('draft_expired');
  });

  it('fails a revoked grant', async () => {
    leadStore.grants.set(VALID_GRANT_A, {
      leadId: LEAD_A,
      expiresAt: Date.now() + 60_000,
      revoked: true,
    });
    const response = await request(
      'PATCH',
      `/api/v1/website/leads/${LEAD_A}`,
      { 'x-draft-grant': VALID_GRANT_A },
      { contact: { fullName: 'Jane Doe' } },
    );
    expect(response.status).toBe(401);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('draft_expired');
  });

  it('updates the same lead on repeated saves with a valid grant', async () => {
    const first = await request(
      'PATCH',
      `/api/v1/website/leads/${LEAD_A}`,
      { 'x-draft-grant': VALID_GRANT_A },
      { contact: { fullName: 'Jane Doe' } },
    );
    expect(first.status).toBe(200);
    const second = await request(
      'PATCH',
      `/api/v1/website/leads/${LEAD_A}`,
      { 'x-draft-grant': VALID_GRANT_A },
      { contact: { email: 'jane@example.test' } },
    );
    expect(second.status).toBe(200);

    expect(leadStore.updateCalls).toHaveLength(2);
    expect(leadStore.updateCalls.every((call) => call.leadId === LEAD_A)).toBe(true);
    expect(leadStore.updateCalls[0]?.contact).toEqual({ fullName: 'Jane Doe' });
    expect(leadStore.updateCalls[1]?.contact).toEqual({ email: 'jane@example.test' });
  });
});
