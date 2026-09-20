import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  apiErrorResponseSchema,
  changeCommissionStateResponseSchema,
  listPartnersResponseSchema,
  partnerDetailResponseSchema,
} from '@canadian-plans/contracts';
import type { StaffRoleName } from '@canadian-plans/types';

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
  ChangeCommissionStateInput,
  CommissionStateOutcome,
  PartnerDetail,
  PartnerStore,
} from '../src/partners/store.js';
import { validateCommissionStateTransition } from '../src/partners/commission-state.js';

const ACTOR = '20000000-0000-4000-8000-000000000801';
const WORKSPACE = '10000000-0000-4000-8000-000000000801';
const MEMBERSHIP = '30000000-0000-4000-8000-000000000801';
const PARTNER = '80000000-0000-4000-8000-000000000801';
const ORDER = '80000000-0000-4000-8000-0000000008a1';
const COMMISSION = '80000000-0000-4000-8000-0000000008b1';
const NOW = '2026-09-20T12:00:00.000Z';

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

class MemoryStaffStore implements StaffStore {
  access: StaffAccessSnapshot = {
    membershipId: MEMBERSHIP,
    status: 'active',
    roles: ['partners'],
    permissions: [],
  };

  async bootstrapStaff(_input: BootstrapStaffInput) {
    return [
      { id: WORKSPACE, slug: 'site-1', name: 'Site One', membershipId: MEMBERSHIP, roles: [] },
    ];
  }
  async loadStaffAccess(actorId: string, workspaceId: string) {
    return actorId === ACTOR && workspaceId === WORKSPACE ? this.access : undefined;
  }
  inviteStaff = async (_input: InviteStaffInput): Promise<string> => MEMBERSHIP;
  revokeStaff = async (): Promise<RevokeResult> => 'revoked';
}

function detail(): PartnerDetail {
  return {
    partner: {
      id: PARTNER,
      workspaceId: WORKSPACE,
      name: 'Maple Referrals',
      referralCode: 'MAPLE10',
      status: 'approved',
      createdAt: NOW,
    },
    referredOrders: [
      { id: ORDER, reference: 'CP-PARTNER-1', fulfilmentStatus: 'activated', submittedAt: NOW },
    ],
    commissions: [
      {
        id: COMMISSION,
        orderId: ORDER,
        orderReference: 'CP-PARTNER-1',
        state: 'earned',
        amount: { amountMinor: 1500, currency: 'CAD' },
        invoiceId: null,
        earnedAt: NOW,
        updatedAt: NOW,
      },
    ],
  };
}

class MemoryPartnerStore implements PartnerStore {
  readonly stateCalls: ChangeCommissionStateInput[] = [];
  commissionState: 'earned' | 'carrier_paid' | 'partner_paid' = 'earned';

  async listPartners() {
    return [
      {
        ...detail().partner,
        referredOrderCount: 1,
        commissionLineCount: 1,
      },
    ];
  }

  async getPartnerDetail(_workspaceId: string, _actorId: string, partnerId: string) {
    return partnerId === PARTNER ? detail() : undefined;
  }

  async changeCommissionState(input: ChangeCommissionStateInput): Promise<CommissionStateOutcome> {
    this.stateCalls.push(input);
    const transition = validateCommissionStateTransition(this.commissionState, input.toState);
    if (transition.status === 'partner_paid_disabled') return { status: 'partner_paid_disabled' };
    if (transition.status === 'invalid_transition') return { status: 'invalid_transition' };
    return {
      status: 'updated',
      commission: {
        id: COMMISSION,
        workspaceId: WORKSPACE,
        orderId: ORDER,
        partnerId: PARTNER,
        ruleId: '80000000-0000-4000-8000-0000000008c1',
        ruleSnapshot: {
          ruleId: '80000000-0000-4000-8000-0000000008c1',
          ruleType: 'fixed',
          value: { amountMinor: 1500, currency: 'CAD' },
          isTest: true,
          effectiveFrom: NOW,
          effectiveTo: null,
        },
        amount: { amountMinor: 1500, currency: 'CAD' },
        state: input.toState,
        invoiceId: null,
        earnedAt: NOW,
        updatedAt: NOW,
      },
      history: [
        {
          id: '80000000-0000-4000-8000-0000000008d1',
          fromState: null,
          toState: 'earned',
          createdAt: NOW,
        },
        {
          id: '80000000-0000-4000-8000-0000000008d2',
          fromState: 'earned',
          toState: input.toState,
          createdAt: NOW,
        },
      ],
    };
  }
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
let partnerStore: MemoryPartnerStore;

beforeEach(async () => {
  verifier = new TokenVerifier();
  verifier.sessions.set('aal1', {
    actorId: ACTOR,
    verifiedEmail: 'partner-staff@example.test',
    assuranceLevel: 'aal1',
  });
  verifier.sessions.set('aal2', {
    actorId: ACTOR,
    verifiedEmail: 'partner-staff@example.test',
    assuranceLevel: 'aal2',
  });
  store = new MemoryStaffStore();
  partnerStore = new MemoryPartnerStore();
  server = createApp({
    staff: {
      sessionVerifier: verifier,
      store,
      credentialStore: noopCredentialStore,
      leadStore: noopLeadStore,
      partnerStore,
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

function withRoles(...roles: StaffRoleName[]) {
  store.access = { ...store.access, roles, permissions: [] };
}

function getDetail(token = 'aal1') {
  return fetch(`${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/partners/${PARTNER}`, {
    headers: headers(token),
  });
}

function markState(toState: string, token = 'aal2') {
  return fetch(`${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/partners/${PARTNER}/commissions`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ commissionId: COMMISSION, toState }),
  });
}

describe('partner directory role matrix (T19)', () => {
  it('lists partners for the Partners role', async () => {
    withRoles('partners');
    const response = await fetch(`${baseUrl}/api/v1/staff/workspaces/${WORKSPACE}/partners`, {
      headers: headers(),
    });
    expect(response.status).toBe(200);
    const body = listPartnersResponseSchema.parse(await response.json());
    expect(body.partners[0]).toMatchObject({ referralCode: 'MAPLE10', referredOrderCount: 1 });
  });

  it('hides payout amounts from a Viewer (no financial.read)', async () => {
    withRoles('viewer');
    const response = await getDetail();
    expect(response.status).toBe(200);
    const body = partnerDetailResponseSchema.parse(await response.json());
    expect(body.canViewPayouts).toBe(false);
    expect(body.canMarkCarrierPaid).toBe(false);
    const [viewerCommission] = body.commissions;
    expect(viewerCommission?.amount).toBeNull();
    // States are still visible — only the money is a payout detail.
    expect(viewerCommission?.state).toBe('earned');
  });

  it('hides payout amounts from the Partners role too, but shows commission states', async () => {
    withRoles('partners');
    const body = partnerDetailResponseSchema.parse(await (await getDetail()).json());
    expect(body.canViewPayouts).toBe(false);
    expect(body.commissions[0]?.amount).toBeNull();
    expect(body.partnerPaidEnabled).toBe(false);
    expect(body.payoutDisabledReason.length).toBeGreaterThan(0);
  });

  it('shows payout amounts to Finance on a verified aal2 session', async () => {
    withRoles('finance');
    const body = partnerDetailResponseSchema.parse(await (await getDetail('aal2')).json());
    expect(body.canViewPayouts).toBe(true);
    expect(body.canMarkCarrierPaid).toBe(true);
    expect(body.commissions[0]?.amount).toEqual({ amountMinor: 1500, currency: 'CAD' });
  });

  it('lets a Viewer see the partner record without payout details', async () => {
    withRoles('viewer');
    const body = partnerDetailResponseSchema.parse(await (await getDetail()).json());
    expect(body.partner.referralCode).toBe('MAPLE10');
    expect(body.referredOrders).toHaveLength(1);
  });
});

describe('commission state actions (T19)', () => {
  it('forbids the Partners role from marking a commission paid', async () => {
    withRoles('partners');
    const response = await markState('carrier_paid', 'aal2');
    expect(response.status).toBe(403);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe(
      'permission_denied',
    );
    expect(partnerStore.stateCalls).toEqual([]);
  });

  it('forbids a Viewer from marking a commission paid', async () => {
    withRoles('viewer');
    const response = await markState('carrier_paid', 'aal2');
    expect(response.status).toBe(403);
    expect(partnerStore.stateCalls).toEqual([]);
  });

  it('requires a verified aal2 session for Finance to mark carrier_paid', async () => {
    withRoles('finance');
    const response = await markState('carrier_paid', 'aal1');
    expect(response.status).toBe(403);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('mfa_required');
    expect(partnerStore.stateCalls).toEqual([]);
  });

  it('lets Finance (aal2) mark carrier_paid and returns the state history', async () => {
    withRoles('finance');
    const response = await markState('carrier_paid', 'aal2');
    expect(response.status).toBe(200);
    const body = changeCommissionStateResponseSchema.parse(await response.json());
    expect(body.commission.state).toBe('carrier_paid');
    expect(body.history.map((event) => event.toState)).toEqual(['earned', 'carrier_paid']);
    expect(partnerStore.stateCalls).toHaveLength(1);
  });

  it('keeps partner_paid disabled for Finance (OPEN_INPUTS #18)', async () => {
    withRoles('finance');
    partnerStore.commissionState = 'carrier_paid';
    const response = await markState('partner_paid', 'aal2');
    expect(response.status).toBe(409);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe(
      'feature_not_ready',
    );
  });
});
