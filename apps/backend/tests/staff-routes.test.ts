import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiErrorResponseSchema,
  inviteStaffResponseSchema,
  listWorkspaceLeadsResponseSchema,
  staffWorkspaceAccessResponseSchema,
  staffWorkspacesResponseSchema,
  type LeadListItem,
  type StaffWorkspace,
} from '@canadian-plans/contracts';

import { createApp } from '../src/app.js';
import type { StaffSessionVerifier, VerifiedStaffSession } from '../src/auth/session.js';
import type { StaffAccessSnapshot } from '../src/staff/authorization.js';
import type { ListLeadsInput, LeadStore } from '../src/leads/store.js';
import type {
  BootstrapStaffInput,
  InviteStaffInput,
  RevokeResult,
  StaffStore,
} from '../src/staff/store.js';
import type { WebsiteCredentialStore } from '../src/website/store.js';

const noopCredentialStore: WebsiteCredentialStore = {
  createCredential: async () => {
    throw new Error('not used in these staff-route tests');
  },
  listCredentials: async () => [],
  revokeCredential: async () => ({ status: 'not_found' }),
};

const ACTOR = '20000000-0000-4000-8000-000000000001';
const WORKSPACE = '10000000-0000-4000-8000-000000000001';
const MEMBERSHIP = '30000000-0000-4000-8000-000000000001';
const INVITATION = '30000000-0000-4000-8000-000000000002';

const sampleLead: LeadListItem = {
  id: '90000000-0000-4000-8000-000000000001',
  workspaceId: WORKSPACE,
  status: 'incomplete',
  contact: { email: 'jane@example.test' },
  source: 'utm:google/cpc',
  attribution: { utmSource: 'google', utmMedium: 'cpc' },
  selectedOfferVersionId: null,
  consentVersion: 'terms-2026-09',
  createdAt: '2026-09-14T00:00:00.000Z',
  updatedAt: '2026-09-14T00:00:00.000Z',
};

class MemoryLeadStore implements LeadStore {
  readonly listLeadsCalls: ListLeadsInput[] = [];

  createLead: LeadStore['createLead'] = () => {
    throw new Error('not used in these staff-route tests');
  };

  updateLead: LeadStore['updateLead'] = () => {
    throw new Error('not used in these staff-route tests');
  };

  async listLeads(input: ListLeadsInput) {
    this.listLeadsCalls.push(input);
    return { leads: [sampleLead], page: { page: 1, pageSize: 25, total: 1 } };
  }
}

const workspace: StaffWorkspace = {
  id: WORKSPACE,
  slug: 'site-1',
  name: 'Northern Arrival Mobile',
  membershipId: MEMBERSHIP,
  roles: ['owner'],
};

class TokenVerifier implements StaffSessionVerifier {
  readonly sessions = new Map<string, VerifiedStaffSession>();

  async verify(accessToken: string) {
    return this.sessions.get(accessToken);
  }
}

class MemoryStaffStore implements StaffStore {
  access: StaffAccessSnapshot = {
    membershipId: MEMBERSHIP,
    status: 'active',
    roles: ['owner'],
    permissions: [],
  };
  inviteStaff = vi.fn(async (_input: InviteStaffInput) => INVITATION);
  revokeStaff = vi.fn(async (): Promise<RevokeResult> => 'revoked');

  async bootstrapStaff(_input: BootstrapStaffInput) {
    return this.access.status === 'active' ? [workspace] : [];
  }

  async loadStaffAccess(actorId: string, workspaceId: string) {
    return actorId === ACTOR && workspaceId === WORKSPACE ? this.access : undefined;
  }
}

let server: Server;
let baseUrl: string;
let verifier: TokenVerifier;
let store: MemoryStaffStore;
let leadStore: MemoryLeadStore;

beforeEach(async () => {
  verifier = new TokenVerifier();
  verifier.sessions.set('aal1-token', {
    actorId: ACTOR,
    verifiedEmail: 'owner@example.test',
    assuranceLevel: 'aal1',
  });
  verifier.sessions.set('aal2-token', {
    actorId: ACTOR,
    verifiedEmail: 'owner@example.test',
    assuranceLevel: 'aal2',
  });
  store = new MemoryStaffStore();
  leadStore = new MemoryLeadStore();
  server = createApp({
    staff: {
      sessionVerifier: verifier,
      store,
      credentialStore: noopCredentialStore,
      leadStore,
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

describe('protected staff routes', () => {
  it('rejects malformed JSON with the shared safe error envelope', async () => {
    const response = await fetch(`${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/invitations`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer aal2-token',
        'content-type': 'application/json',
      },
      body: '{"email":',
    });
    expect(response.status).toBe(400);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('invalid_request');
  });

  it('requires a server-verified bearer session', async () => {
    const missing = await fetch(`${baseUrl}/api/v1/staff/workspaces`);
    expect(missing.status).toBe(401);
    expect(apiErrorResponseSchema.parse(await missing.json()).error.code).toBe('missing_session');

    const invalid = await fetch(`${baseUrl}/api/v1/staff/workspaces`, {
      headers: { authorization: 'Bearer forged-token' },
    });
    expect(invalid.status).toBe(401);
    expect(apiErrorResponseSchema.parse(await invalid.json()).error.code).toBe('invalid_session');
  });

  it('lists only the verified actor workspaces and exposes current access', async () => {
    const list = await fetch(`${baseUrl}/api/v1/staff/workspaces`, {
      headers: { authorization: 'Bearer aal1-token' },
    });
    const listBody = staffWorkspacesResponseSchema.parse(await list.json());
    expect(listBody.workspaces).toEqual([workspace]);

    const access = await fetch(`${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/access`, {
      headers: { authorization: 'Bearer aal1-token' },
    });
    expect(staffWorkspaceAccessResponseSchema.parse(await access.json()).workspace).toEqual(
      workspace,
    );
  });

  it('denies a revoked member on the very next request with the same live token', async () => {
    const before = await fetch(`${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/access`, {
      headers: { authorization: 'Bearer aal2-token' },
    });
    expect(before.status).toBe(200);

    store.access = { ...store.access, status: 'revoked' };
    const after = await fetch(`${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/access`, {
      headers: { authorization: 'Bearer aal2-token' },
    });
    expect(after.status).toBe(403);
    expect(apiErrorResponseSchema.parse(await after.json()).error.code).toBe('membership_revoked');
  });

  it('rejects a forged assurance header when the verified session is only aal1', async () => {
    const response = await fetch(`${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/invitations`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer aal1-token',
        'content-type': 'application/json',
        'x-auth-assurance-level': 'aal2',
      },
      body: JSON.stringify({ email: 'new.staff@example.test', roles: ['orders'] }),
    });

    expect(response.status).toBe(403);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('mfa_required');
    expect(store.inviteStaff).not.toHaveBeenCalled();
  });

  it('allows the same privileged invitation with a verified aal2 session', async () => {
    const response = await fetch(`${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/invitations`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer aal2-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email: 'new.staff@example.test', roles: ['orders'] }),
    });

    expect(response.status).toBe(201);
    expect(inviteStaffResponseSchema.parse(await response.json()).status).toBe('pending');
    expect(store.inviteStaff).toHaveBeenCalledOnce();
  });

  it('lists leads for any active member, with attribution, and applies the status filter', async () => {
    const response = await fetch(
      `${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/leads?status=incomplete`,
      { headers: { authorization: 'Bearer aal1-token' } },
    );
    expect(response.status).toBe(200);
    const body = listWorkspaceLeadsResponseSchema.parse(await response.json());
    expect(body.leads).toEqual([sampleLead]);
    expect(leadStore.listLeadsCalls).toEqual([
      {
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        status: 'incomplete',
        page: undefined,
        pageSize: undefined,
      },
    ]);
  });

  it('denies a revoked member the leads list', async () => {
    store.access = { ...store.access, status: 'revoked' };
    const response = await fetch(`${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/leads`, {
      headers: { authorization: 'Bearer aal1-token' },
    });
    expect(response.status).toBe(403);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe(
      'membership_revoked',
    );
  });

  it('rejects an unknown status filter value', async () => {
    const response = await fetch(
      `${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/leads?status=archived`,
      { headers: { authorization: 'Bearer aal1-token' } },
    );
    expect(response.status).toBe(400);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('invalid_request');
  });
});
