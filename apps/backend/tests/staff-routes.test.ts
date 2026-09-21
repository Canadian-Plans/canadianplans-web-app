import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiErrorResponseSchema,
  deleteCustomerDataResponseSchema,
  inviteStaffResponseSchema,
  listWorkspaceJobsResponseSchema,
  listWorkspaceLeadsResponseSchema,
  retryWorkspaceJobResponseSchema,
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
import type { OrderQueryStore } from '../src/orders/query-store.js';
import type { OrderTransitionStore } from '../src/orders/transitions.js';
import type { JobAdminStore, AdminJob } from '../src/jobs/store.js';
import type { CatalogueStore } from '../src/catalogue/store.js';
import type {
  DeleteCustomerDataInput,
  DeleteCustomerDataOutcome,
  DeletionStore,
} from '../src/deletion/store.js';

const noopCredentialStore: WebsiteCredentialStore = {
  createCredential: async () => {
    throw new Error('not used in these staff-route tests');
  },
  listCredentials: async () => [],
  revokeCredential: async () => ({ status: 'not_found' }),
};

const conflictTransitionStore: OrderTransitionStore = {
  transition: async () => ({ status: 'version_conflict' }),
};

const noopOrderQueryStore: OrderQueryStore = {
  getOrder: async () => undefined,
  listOrders: async () => ({ orders: [], page: { page: 1, pageSize: 25, total: 0 } }),
  listAssignableMembers: async () => [],
};

class MemoryJobStore implements JobAdminStore {
  jobs: Awaited<ReturnType<JobAdminStore['listActive']>> = [];
  readonly listCalls: { workspaceId: string; actorId: string }[] = [];
  readonly retryCalls: { workspaceId: string; jobId: string }[] = [];
  retryResult: Awaited<ReturnType<JobAdminStore['retry']>> = 'retried';

  async listActive(workspaceId: string, actorId: string) {
    this.listCalls.push({ workspaceId, actorId });
    return this.jobs;
  }

  async retry(input: { workspaceId: string; actorId: string; jobId: string; requestId: string }) {
    this.retryCalls.push({ workspaceId: input.workspaceId, jobId: input.jobId });
    return this.retryResult;
  }
}

const noopCatalogueStore: CatalogueStore = {
  acceptEvent: async () => {
    throw new Error('not used in these staff-route tests');
  },
  getEvent: async () => undefined,
  listDrainableEvents: async () => [],
  markEvent: async () => undefined,
  productKeyByDocumentId: async () => undefined,
  listProductKeys: async () => [],
  acquireLease: async () => false,
  releaseLease: async () => undefined,
  persistPublished: async () => {
    throw new Error('not used in these staff-route tests');
  },
  withdrawProduct: async () => false,
  recordSyncResult: async () => undefined,
  prepareQuote: async () => ({ status: 'product_not_found' }),
  issueQuote: async () => ({ status: 'product_not_found' }),
  validateQuote: async () => ({ status: 'not_found' }),
  listPublishedOffers: async () => [],
  catalogueStatus: async () => ({
    sync: { lastAttemptAt: null, lastSuccessAt: null, lastErrorCode: null },
    offers: [],
    errors: [],
    requestId: 'req',
  }),
};

const sampleJob: AdminJob = {
  id: '40000000-0000-4000-8000-000000000001',
  jobType: 'order_acknowledgement_email',
  status: 'failed',
  attempts: 1,
  availableAt: new Date('2026-09-14T00:00:00.000Z'),
  leaseExpiresAt: null,
  lastErrorCode: 'provider_rejected',
  createdAt: new Date('2026-09-14T00:00:00.000Z'),
  updatedAt: new Date('2026-09-14T00:00:00.000Z'),
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

class MemoryDeletionStore implements DeletionStore {
  readonly calls: DeleteCustomerDataInput[] = [];
  result: DeleteCustomerDataOutcome = {
    status: 'deleted',
    deletionId: '70000000-0000-4000-8000-0000000000d1',
  };

  async deleteCustomerData(input: DeleteCustomerDataInput): Promise<DeleteCustomerDataOutcome> {
    this.calls.push(input);
    return this.result;
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
let jobStore: MemoryJobStore;
let deletionStore: MemoryDeletionStore;

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
  jobStore = new MemoryJobStore();
  deletionStore = new MemoryDeletionStore();
  jobStore.jobs = [{ ...sampleJob }];
  server = createApp({
    staff: {
      sessionVerifier: verifier,
      store,
      credentialStore: noopCredentialStore,
      leadStore,
      orderTransitionStore: conflictTransitionStore,
      orderQueryStore: noopOrderQueryStore,
      jobStore,
      catalogueStore: noopCatalogueStore,
      deletionStore,
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
  it('returns 409 when an order transition expectedVersion is stale', async () => {
    const orderId = '80000000-0000-4000-8000-000000000001';
    const response = await fetch(
      `${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/orders/${orderId}`,
      {
        method: 'PATCH',
        headers: {
          authorization: 'Bearer aal1-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          action: 'transition',
          toStatus: 'in_progress',
          expectedVersion: 1,
        }),
      },
    );
    expect(response.status).toBe(409);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('version_conflict');
  });

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

  it('requires verified aal2 for customer-data deletion', async () => {
    const orderId = '80000000-0000-4000-8000-0000000000d1';
    const response = await fetch(
      `${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/orders/${orderId}/deletion`,
      {
        method: 'POST',
        headers: { authorization: 'Bearer aal1-token', 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'customer request' }),
      },
    );
    expect(response.status).toBe(403);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('mfa_required');
    expect(deletionStore.calls).toHaveLength(0);
  });

  it('deletes customer data with a verified aal2 owner session', async () => {
    const orderId = '80000000-0000-4000-8000-0000000000d1';
    const response = await fetch(
      `${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/orders/${orderId}/deletion`,
      {
        method: 'POST',
        headers: { authorization: 'Bearer aal2-token', 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'customer request' }),
      },
    );
    expect(response.status).toBe(202);
    const body = deleteCustomerDataResponseSchema.parse(await response.json());
    expect(body.deletionId).toBe('70000000-0000-4000-8000-0000000000d1');
    expect(body.ledgerStatus).toBe('pending_acknowledgement');
    expect(deletionStore.calls[0]).toMatchObject({
      workspaceId: WORKSPACE,
      orderId,
      reason: 'customer request',
    });
  });

  it('rejects a deletion without a reason', async () => {
    const orderId = '80000000-0000-4000-8000-0000000000d1';
    const response = await fetch(
      `${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/orders/${orderId}/deletion`,
      {
        method: 'POST',
        headers: { authorization: 'Bearer aal2-token', 'content-type': 'application/json' },
        body: JSON.stringify({}),
      },
    );
    expect(response.status).toBe(400);
    expect(deletionStore.calls).toHaveLength(0);
  });

  it('denies deletion to a role without the deletion permission', async () => {
    store.access = { ...store.access, roles: ['viewer'] };
    const orderId = '80000000-0000-4000-8000-0000000000d1';
    const response = await fetch(
      `${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/orders/${orderId}/deletion`,
      {
        method: 'POST',
        headers: { authorization: 'Bearer aal2-token', 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'customer request' }),
      },
    );
    expect(response.status).toBe(403);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe(
      'permission_denied',
    );
    expect(deletionStore.calls).toHaveLength(0);
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

  it('lets a viewer list jobs with canRetry false', async () => {
    store.access = { ...store.access, roles: ['viewer'], permissions: [] };

    const response = await fetch(`${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/jobs`, {
      headers: { authorization: 'Bearer aal1-token' },
    });

    expect(response.status).toBe(200);
    const body = listWorkspaceJobsResponseSchema.parse(await response.json());
    expect(body.jobs).toHaveLength(1);
    expect(body.jobs[0]).toMatchObject({ id: sampleJob.id, status: 'failed' });
    // The route serialises the job timestamps to ISO strings for the contract.
    expect(body.jobs[0]?.availableAt).toBe('2026-09-14T00:00:00.000Z');
    expect(body.canRetry).toBe(false);
    expect(jobStore.listCalls).toEqual([{ workspaceId: WORKSPACE, actorId: ACTOR }]);
  });

  it('denies a viewer the job retry with 403 and no store call', async () => {
    store.access = { ...store.access, roles: ['viewer'], permissions: [] };

    const response = await fetch(
      `${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/jobs/${sampleJob.id}/retry`,
      { method: 'POST', headers: { authorization: 'Bearer aal1-token' } },
    );

    expect(response.status).toBe(403);
    expect(jobStore.retryCalls).toEqual([]);
  });

  it('lets an integration-management holder retry a failed job', async () => {
    // `integration.manage` is privileged, so an owner session must have
    // completed MFA (aal2) before the retry is allowed.
    store.access = {
      ...store.access,
      roles: ['owner'],
      permissions: [{ name: 'integration_management', effect: 'allow' }],
    };

    const unverified = await fetch(
      `${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/jobs/${sampleJob.id}/retry`,
      { method: 'POST', headers: { authorization: 'Bearer aal1-token' } },
    );
    expect(unverified.status).toBe(403);
    expect(apiErrorResponseSchema.parse(await unverified.json()).error.code).toBe('mfa_required');
    expect(jobStore.retryCalls).toEqual([]);

    const response = await fetch(
      `${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/jobs/${sampleJob.id}/retry`,
      { method: 'POST', headers: { authorization: 'Bearer aal2-token' } },
    );

    expect(response.status).toBe(200);
    const body = retryWorkspaceJobResponseSchema.parse(await response.json());
    expect(body).toMatchObject({ jobId: sampleJob.id, status: 'pending' });
    expect(jobStore.retryCalls).toEqual([{ workspaceId: WORKSPACE, jobId: sampleJob.id }]);
  });

  it('denies a foreign workspace the job list with 403 and no store call', async () => {
    const FOREIGN_WORKSPACE = '10000000-0000-4000-8000-0000000000ff';

    const response = await fetch(`${baseUrl}/api/v1/staff/workspaces/${FOREIGN_WORKSPACE}/jobs`, {
      headers: { authorization: 'Bearer aal1-token' },
    });

    expect(response.status).toBe(403);
    expect(jobStore.listCalls).toEqual([]);
  });

  it('rejects a cancel without a reason before reaching the transition store', async () => {
    const orderId = '80000000-0000-4000-8000-000000000002';
    const response = await fetch(
      `${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/orders/${orderId}`,
      {
        method: 'PATCH',
        headers: { authorization: 'Bearer aal1-token', 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', expectedVersion: 1 }),
      },
    );

    expect(response.status).toBe(400);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('invalid_request');
  });

  it.each([
    ['dispatch', { action: 'dispatch', courier: 'Canada Post', expectedVersion: 1 }],
    ['activate', { action: 'activate', expectedVersion: 1 }],
  ])('returns feature_not_ready for a partnered %s', async (_label, payload) => {
    // A transition store that refuses operational transitions, as the partnered
    // path does, must surface feature_not_ready rather than a generic error.
    const refusingStore: OrderTransitionStore = {
      transition: async () => ({ status: 'feature_not_ready' }),
    };
    const app = createApp({
      staff: {
        sessionVerifier: verifier,
        store,
        credentialStore: noopCredentialStore,
        leadStore,
        orderTransitionStore: refusingStore,
        orderQueryStore: noopOrderQueryStore,
        jobStore,
      },
    }).listen(0);
    await new Promise<void>((resolve) => app.once('listening', resolve));
    const address = app.address();
    if (address === null || typeof address === 'string') throw new Error('expected TCP server');

    try {
      const orderId = '80000000-0000-4000-8000-000000000003';
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/staff/workspaces/${WORKSPACE}/orders/${orderId}`,
        {
          method: 'PATCH',
          headers: { authorization: 'Bearer aal1-token', 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      expect(response.status).toBe(409);
      expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe(
        'feature_not_ready',
      );
    } finally {
      await new Promise<void>((resolve) => app.close(() => resolve()));
    }
  });
});
