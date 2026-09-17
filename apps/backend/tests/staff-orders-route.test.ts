import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  apiErrorResponseSchema,
  bulkAssignOrdersResponseSchema,
  getWorkspaceOrderResponseSchema,
  listAssignableMembersResponseSchema,
  listWorkspaceOrdersResponseSchema,
  type OrderCapabilities,
  type OrderDetail,
  type OrderListItem,
} from '@canadian-plans/contracts';

import { createApp } from '../src/app.js';
import type { StaffSessionVerifier, VerifiedStaffSession } from '../src/auth/session.js';
import type { StaffAccessSnapshot } from '../src/staff/authorization.js';
import type { LeadStore } from '../src/leads/store.js';
import type {
  BootstrapStaffInput,
  InviteStaffInput,
  RevokeResult,
  StaffStore,
} from '../src/staff/store.js';
import type { WebsiteCredentialStore } from '../src/website/store.js';
import type {
  ListOrdersInput,
  OrderDetailRecord,
  OrderQueryStore,
} from '../src/orders/query-store.js';
import type {
  OrderTransitionStore,
  TransitionOrderInput,
  TransitionOrderResult,
} from '../src/orders/transitions.js';
import type {
  BulkAssignInput,
  BulkAssignOutcome,
  StaffOrderActionStore,
} from '../src/orders/staff-actions.js';

const ACTOR = '20000000-0000-4000-8000-000000000101';
const WORKSPACE = '10000000-0000-4000-8000-000000000101';
const FOREIGN_WORKSPACE = '10000000-0000-4000-8000-0000000001ff';
const MEMBERSHIP = '30000000-0000-4000-8000-000000000101';
const ORDER = '80000000-0000-4000-8000-000000000101';
const NOW = '2026-09-16T12:00:00.000Z';

const noopCredentialStore: WebsiteCredentialStore = {
  createCredential: async () => {
    throw new Error('not used');
  },
  listCredentials: async () => [],
  revokeCredential: async () => ({ status: 'not_found' }),
};

const noopLeadStore: LeadStore = {
  createLead: () => {
    throw new Error('not used');
  },
  updateLead: () => {
    throw new Error('not used');
  },
  listLeads: async () => ({ leads: [], page: { page: 1, pageSize: 25, total: 0 } }),
};

const sampleSnapshot: OrderDetail['snapshot'] = {
  quoteId: '90000000-0000-4000-8000-000000000101',
  productId: '91000000-0000-4000-8000-000000000101',
  offerVersionId: '92000000-0000-4000-8000-000000000101',
  offer: {
    productKey: 'rogers-basic',
    productTitle: 'Rogers Basic',
    productType: 'sim',
    offerName: 'Basic 10 GB',
    currency: 'CAD',
    recurringChargeAmountMinor: 4500,
    oneTimeFees: [],
    amountPayableTodayMinor: 0,
    paymentRequired: false,
    documentChecklist: ['passport'],
    eligibility: 'New arrivals',
    availability: 'Canada',
    billingParty: 'Rogers',
    contractTerms: [{ _type: 'block', children: [] }],
    termsVersion: 'terms-2026-09',
    specs: { carrier: 'Rogers', dataAllowance: '10 GB' },
  },
  currency: 'CAD',
  charges: [
    { code: 'base', label: 'Monthly plan', amount: { amountMinor: 4500, currency: 'CAD' } },
  ],
  total: { amountMinor: 4500, currency: 'CAD' },
  amountPayableToday: { amountMinor: 0, currency: 'CAD' },
  paymentRequired: false,
  documentChecklist: ['passport'],
  termsVersion: 'terms-2026-09',
};

function sampleRecord(status: OrderDetail['fulfilmentStatus'] = 'submitted'): OrderDetailRecord {
  return {
    id: ORDER,
    workspaceId: WORKSPACE,
    reference: 'CP-ROUTE-1',
    fulfilmentStatus: status,
    paymentState: 'not_required',
    deliveryState: 'none',
    archiveState: 'active',
    total: { amountMinor: 4500, currency: 'CAD' },
    amountPayableToday: { amountMinor: 0, currency: 'CAD' },
    recordVersion: 1,
    createdAt: NOW,
    updatedAt: NOW,
    assigneeId: null,
    partnerCode: null,
    customer: {
      fullName: 'Jane Doe',
      email: 'jane@example.test',
      phone: '+14165550123',
      countryCode: 'CA',
    },
    source: 'direct',
    submittedAt: NOW,
    snapshot: sampleSnapshot,
    payload: { schemaVersion: 1, payload: {} },
    consent: { termsVersion: 'terms-2026-09', marketingOptIn: false },
    history: [],
    audit: [],
    notes: [],
    reminders: [],
    changeRequests: [],
    amendments: [],
    payments: [],
    dispatch: null,
  };
}

function sampleListItem(): OrderListItem {
  const record = sampleRecord();
  return {
    id: record.id,
    workspaceId: record.workspaceId,
    reference: record.reference,
    fulfilmentStatus: record.fulfilmentStatus,
    paymentState: record.paymentState,
    deliveryState: record.deliveryState,
    archiveState: record.archiveState,
    total: record.total,
    amountPayableToday: record.amountPayableToday,
    recordVersion: record.recordVersion,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    assigneeId: record.assigneeId,
    partnerCode: record.partnerCode,
    customer: record.customer,
    source: record.source,
    submittedAt: record.submittedAt,
  };
}

class MemoryStaffStore implements StaffStore {
  access: StaffAccessSnapshot = {
    membershipId: MEMBERSHIP,
    status: 'active',
    roles: ['orders'],
    permissions: [],
  };

  async bootstrapStaff(_input: BootstrapStaffInput) {
    return [
      {
        id: WORKSPACE,
        slug: 'site-1',
        name: 'Site One',
        membershipId: MEMBERSHIP,
        roles: ['orders' as const],
      },
    ];
  }

  async loadStaffAccess(actorId: string, workspaceId: string) {
    return actorId === ACTOR && workspaceId === WORKSPACE ? this.access : undefined;
  }

  inviteStaff = async (_input: InviteStaffInput): Promise<string> => MEMBERSHIP;
  revokeStaff = async (): Promise<RevokeResult> => 'revoked';
}

class MemoryQueryStore implements OrderQueryStore {
  readonly listCalls: ListOrdersInput[] = [];
  order: OrderDetailRecord | undefined = sampleRecord();

  async listOrders(input: ListOrdersInput) {
    this.listCalls.push(input);
    return { orders: [sampleListItem()], page: { page: 1, pageSize: 25, total: 1 } };
  }

  async getOrder() {
    return this.order;
  }

  async listAssignableMembers() {
    return [{ membershipId: MEMBERSHIP, roles: ['orders' as const], isSelf: true }];
  }
}

class MemoryTransitionStore implements OrderTransitionStore {
  readonly calls: TransitionOrderInput[] = [];
  result: TransitionOrderResult = {
    status: 'transitioned',
    orderId: ORDER,
    orderStatus: 'in_progress',
    version: 2,
  };

  async transition(input: TransitionOrderInput) {
    this.calls.push(input);
    return this.result;
  }
}

class MemoryActionStore implements StaffOrderActionStore {
  readonly bulkCalls: BulkAssignInput[] = [];
  bulkResult: BulkAssignOutcome = {
    status: 'assigned',
    results: [{ orderId: ORDER, status: 'assigned', version: 2 }],
  };

  addNote: StaffOrderActionStore['addNote'] = async (input) => ({
    status: 'created',
    note: { id: ORDER, authorId: input.actorId, body: input.body, createdAt: NOW },
  });
  listNotes: StaffOrderActionStore['listNotes'] = async () => ({ status: 'found', notes: [] });
  createReminder: StaffOrderActionStore['createReminder'] = async (input) => ({
    status: 'created',
    reminder: {
      id: ORDER,
      createdBy: input.actorId,
      remindAt: input.remindAt,
      note: input.note ?? null,
      createdAt: NOW,
    },
  });
  deleteReminder: StaffOrderActionStore['deleteReminder'] = async () => ({ status: 'deleted' });
  assign: StaffOrderActionStore['assign'] = async () => ({ status: 'updated' });
  archive: StaffOrderActionStore['archive'] = async () => ({ status: 'updated' });
  bulkAssign = async (input: BulkAssignInput) => {
    this.bulkCalls.push(input);
    return this.bulkResult;
  };
  recordPayment: StaffOrderActionStore['recordPayment'] = async () => ({ status: 'updated' });
  createChangeRequest: StaffOrderActionStore['createChangeRequest'] = async (input) => ({
    status: 'created',
    changeRequest: {
      id: ORDER,
      requestedBy: input.actorId,
      status: 'pending',
      patch: input.payload.patch,
      note: input.payload.note ?? null,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: NOW,
    },
  });
  resolveChangeRequest: StaffOrderActionStore['resolveChangeRequest'] = async () => ({
    status: 'updated',
  });
}

class TokenVerifier implements StaffSessionVerifier {
  readonly sessions = new Map<string, VerifiedStaffSession>();
  async verify(accessToken: string) {
    return this.sessions.get(accessToken);
  }
}

let server: Server;
let baseUrl: string;
let verifier: TokenVerifier;
let store: MemoryStaffStore;
let queryStore: MemoryQueryStore;
let transitionStore: MemoryTransitionStore;
let actionStore: MemoryActionStore;

function capabilitiesOf(body: { capabilities: OrderCapabilities }): OrderCapabilities {
  return body.capabilities;
}

beforeEach(async () => {
  verifier = new TokenVerifier();
  verifier.sessions.set('aal1', {
    actorId: ACTOR,
    verifiedEmail: 'orders@example.test',
    assuranceLevel: 'aal1',
  });
  verifier.sessions.set('aal2', {
    actorId: ACTOR,
    verifiedEmail: 'orders@example.test',
    assuranceLevel: 'aal2',
  });
  store = new MemoryStaffStore();
  queryStore = new MemoryQueryStore();
  transitionStore = new MemoryTransitionStore();
  actionStore = new MemoryActionStore();
  server = createApp({
    staff: {
      sessionVerifier: verifier,
      store,
      credentialStore: noopCredentialStore,
      leadStore: noopLeadStore,
      orderQueryStore: queryStore,
      orderTransitionStore: transitionStore,
      orderActionStore: actionStore,
      operationalTransitionsEnabled: false,
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

function headers(token = 'aal1') {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

function patchOrder(body: unknown, token = 'aal1') {
  return fetch(`${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/orders/${ORDER}`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify(body),
  });
}

describe('staff order API role matrix', () => {
  it('denies a viewer any transition and never reaches the transition store', async () => {
    store.access = { ...store.access, roles: ['viewer'], permissions: [] };
    const response = await patchOrder({
      action: 'transition',
      toStatus: 'in_progress',
      expectedVersion: 1,
    });
    expect(response.status).toBe(403);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe(
      'permission_denied',
    );
    expect(transitionStore.calls).toEqual([]);
  });

  it('lets the orders role transition and returns the recomputed detail', async () => {
    store.access = { ...store.access, roles: ['orders'], permissions: [] };
    const response = await patchOrder({
      action: 'transition',
      toStatus: 'in_progress',
      expectedVersion: 1,
    });
    expect(response.status).toBe(200);
    const body = getWorkspaceOrderResponseSchema.parse(await response.json());
    expect(body.order.allowedTransitions).toEqual(['in_progress', 'cancelled']);
    expect(body.order.capabilities.canManageOrders).toBe(true);
    expect(transitionStore.calls[0]).toMatchObject({ toStatus: 'in_progress', expectedVersion: 1 });
  });

  it('denies finance activation without the order permission, and allows it once granted the orders role', async () => {
    store.access = { ...store.access, roles: ['finance'], permissions: [] };
    const denied = await patchOrder({ action: 'activate', expectedVersion: 1 }, 'aal2');
    expect(denied.status).toBe(403);
    expect(apiErrorResponseSchema.parse(await denied.json()).error.code).toBe('permission_denied');
    expect(transitionStore.calls).toEqual([]);

    store.access = { ...store.access, roles: ['finance', 'orders'], permissions: [] };
    transitionStore.result = {
      status: 'transitioned',
      orderId: ORDER,
      orderStatus: 'activated',
      version: 2,
    };
    const allowed = await patchOrder({ action: 'activate', expectedVersion: 1 });
    expect(allowed.status).toBe(200);
    expect(transitionStore.calls).toHaveLength(1);
  });

  it('requires a verified aal2 session for Finance payment recording and accepts Orders without one', async () => {
    store.access = { ...store.access, roles: ['finance'], permissions: [] };
    const financeAal1 = await fetch(
      `${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/orders/${ORDER}/payments`,
      {
        method: 'POST',
        headers: headers('aal1'),
        body: JSON.stringify({ paymentState: 'paid', expectedVersion: 1 }),
      },
    );
    expect(financeAal1.status).toBe(403);
    expect(apiErrorResponseSchema.parse(await financeAal1.json()).error.code).toBe('mfa_required');

    const financeAal2 = await fetch(
      `${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/orders/${ORDER}/payments`,
      {
        method: 'POST',
        headers: headers('aal2'),
        body: JSON.stringify({ paymentState: 'paid', amountMinor: 4500, expectedVersion: 1 }),
      },
    );
    expect(financeAal2.status).toBe(201);

    store.access = { ...store.access, roles: ['orders'], permissions: [] };
    const ordersRole = await fetch(
      `${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/orders/${ORDER}/payments`,
      {
        method: 'POST',
        headers: headers('aal1'),
        body: JSON.stringify({ paymentState: 'paid', expectedVersion: 1 }),
      },
    );
    expect(ordersRole.status).toBe(201);
  });

  it('denies a viewer the bulk assignment with no store call', async () => {
    store.access = { ...store.access, roles: ['viewer'], permissions: [] };
    const response = await fetch(
      `${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/orders/bulk-assign`,
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          assigneeId: MEMBERSHIP,
          orders: [{ orderId: ORDER, expectedVersion: 1 }],
        }),
      },
    );
    expect(response.status).toBe(403);
    expect(actionStore.bulkCalls).toEqual([]);
  });
});

describe('staff order API concurrency and validation', () => {
  it('returns 409 version_conflict on a stale expectedVersion', async () => {
    transitionStore.result = { status: 'version_conflict' };
    const response = await patchOrder({
      action: 'transition',
      toStatus: 'in_progress',
      expectedVersion: 1,
    });
    expect(response.status).toBe(409);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('version_conflict');
  });

  it('rejects a cancel without a reason before reaching the store', async () => {
    const response = await patchOrder({ action: 'cancel', expectedVersion: 1 });
    expect(response.status).toBe(400);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('invalid_request');
    expect(transitionStore.calls).toEqual([]);
  });

  it('surfaces cancellation_reason_required from the transition policy on the generic transition action', async () => {
    transitionStore.result = { status: 'cancellation_reason_required' };
    const response = await patchOrder({
      action: 'transition',
      toStatus: 'cancelled',
      expectedVersion: 1,
    });
    expect(response.status).toBe(400);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe(
      'cancellation_reason_required',
    );
  });

  it('requires courier details for the dispatch action', async () => {
    const response = await patchOrder({ action: 'dispatch', expectedVersion: 1 });
    expect(response.status).toBe(400);
    expect(transitionStore.calls).toEqual([]);
  });

  it('passes courier, tracking reference and dispatch date through to the transition', async () => {
    transitionStore.result = {
      status: 'transitioned',
      orderId: ORDER,
      orderStatus: 'dispatched',
      version: 2,
    };
    const response = await patchOrder({
      action: 'dispatch',
      courier: 'Canada Post',
      trackingReference: 'TRACK-9',
      dispatchDate: '2026-09-20T00:00:00.000Z',
      expectedVersion: 1,
    });
    expect(response.status).toBe(200);
    expect(transitionStore.calls[0]?.dispatch).toEqual({
      courier: 'Canada Post',
      trackingReference: 'TRACK-9',
      dispatchedAt: new Date('2026-09-20T00:00:00.000Z'),
    });
  });

  it('reports per-order bulk assignment results without hiding a partial failure', async () => {
    actionStore.bulkResult = {
      status: 'assigned',
      results: [
        { orderId: ORDER, status: 'assigned', version: 2 },
        { orderId: '80000000-0000-4000-8000-000000000102', status: 'version_conflict' },
      ],
    };
    const response = await fetch(
      `${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/orders/bulk-assign`,
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          assigneeId: MEMBERSHIP,
          orders: [
            { orderId: ORDER, expectedVersion: 1 },
            { orderId: '80000000-0000-4000-8000-000000000102', expectedVersion: 3 },
          ],
        }),
      },
    );
    expect(response.status).toBe(200);
    const body = bulkAssignOrdersResponseSchema.parse(await response.json());
    expect(body.results.map((result) => result.status)).toEqual(['assigned', 'version_conflict']);
    expect(actionStore.bulkCalls).toHaveLength(1);
  });
});

describe('staff order list and permission-aware search', () => {
  it('lists with workspace-scoped filters and no contact search for a viewer', async () => {
    store.access = { ...store.access, roles: ['viewer'], permissions: [] };
    const response = await fetch(
      `${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/orders?search=jane&status=submitted&archiveState=active`,
      { headers: headers() },
    );
    expect(response.status).toBe(200);
    const body = listWorkspaceOrdersResponseSchema.parse(await response.json());
    expect(capabilitiesOf(body)).toEqual({
      canManageOrders: false,
      canRecordPayment: false,
      canSearchContact: false,
    });
    expect(queryStore.listCalls[0]).toMatchObject({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      status: 'submitted',
      archiveState: 'active',
      search: 'jane',
      includeContactSearch: false,
    });
  });

  it('allows contact search for the orders role', async () => {
    store.access = { ...store.access, roles: ['orders'], permissions: [] };
    const response = await fetch(
      `${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/orders?search=jane`,
      { headers: headers() },
    );
    expect(response.status).toBe(200);
    expect(queryStore.listCalls[0]?.includeContactSearch).toBe(true);
  });

  it('rejects an unknown archive filter value instead of silently ignoring it', async () => {
    const response = await fetch(
      `${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/orders?archiveState=everything`,
      { headers: headers() },
    );
    expect(response.status).toBe(400);
  });

  it('denies a foreign workspace with 403 and no store call', async () => {
    const response = await fetch(`${baseUrl}/api/v1/staff/workspaces/${FOREIGN_WORKSPACE}/orders`, {
      headers: headers(),
    });
    expect(response.status).toBe(403);
    expect(queryStore.listCalls).toEqual([]);
  });

  it('exposes assignable members for the workspace', async () => {
    const response = await fetch(`${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/members`, {
      headers: headers(),
    });
    expect(response.status).toBe(200);
    const body = listAssignableMembersResponseSchema.parse(await response.json());
    expect(body.members).toEqual([{ membershipId: MEMBERSHIP, roles: ['orders'], isSelf: true }]);
  });
});

describe('staff order detail', () => {
  it('computes the allowed transitions from the current status and the operational gate', async () => {
    const response = await fetch(
      `${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/orders/${ORDER}`,
      { headers: headers() },
    );
    expect(response.status).toBe(200);
    const body = getWorkspaceOrderResponseSchema.parse(await response.json());
    // `submitted` may go to `in_progress` or `cancelled`; dispatch/activation
    // are gated by the operational-transition flag this app instance disabled.
    expect(body.order.allowedTransitions).toEqual(['in_progress', 'cancelled']);
  });

  it('hides operational transitions and partnered activation when the gates apply', async () => {
    queryStore.order = { ...sampleRecord('ready_for_delivery'), partnerCode: 'MAPLE10' };
    const response = await fetch(
      `${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/orders/${ORDER}`,
      { headers: headers() },
    );
    const body = getWorkspaceOrderResponseSchema.parse(await response.json());
    // The operational gate hides `dispatched`, leaving only cancellation.
    expect(body.order.allowedTransitions).toEqual(['cancelled']);
  });
});
