import { randomUUID } from 'node:crypto';

import {
  patchFieldKeys,
  type AmendableFieldKey,
  type TrackingOrderDetail,
  type TrackingOrderSummary,
} from '@canadian-plans/contracts';

import { openTrackingCode } from './cipher.js';
import {
  MAX_PENDING_CUSTOMER_CHANGES,
  MAX_TRACKING_ATTEMPTS,
  type ConsumeOutcome,
  type CustomerChangeInput,
  type CustomerChangeOutcome,
  type QueueTrackingChallengeInput,
  type TrackingStore,
} from './store.js';

interface MemoryChallenge {
  workspaceId: string;
  emailHash: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  status: 'pending' | 'consumed';
}

interface MemoryOrder {
  workspaceId: string;
  orderId: string;
  email: string;
  detail: TrackingOrderDetail;
  infoRequests: { id: string; fields: AmendableFieldKey[]; status: 'pending' | 'answered' }[];
  customerChanges: { id: string; status: 'pending'; fields: AmendableFieldKey[] }[];
}

/**
 * Deterministic in-memory `TrackingStore` for unit and route tests. It keeps
 * the same ownership rule as the database store: an order is visible only to
 * its own workspace **and** email, and a queued code is opened with the real
 * cipher so a test can read what would have been emailed.
 */
export class InMemoryTrackingStore implements TrackingStore {
  readonly challenges: MemoryChallenge[] = [];
  readonly orders: MemoryOrder[] = [];
  /** Codes that would have been emailed, newest last. */
  readonly sent: { workspaceId: string; email: string; code: string }[] = [];

  constructor(private readonly secret: string) {}

  /** Test seam: add an order owned by `email` in `workspaceId`. */
  addOrder(input: {
    workspaceId: string;
    orderId: string;
    email: string;
    detail: TrackingOrderDetail;
  }): void {
    this.orders.push({ ...input, infoRequests: [], customerChanges: [] });
  }

  /** Test seam: a pending staff request for missing details. */
  addInfoRequest(orderId: string, id: string, fields: AmendableFieldKey[]): void {
    const order = this.orders.find((candidate) => candidate.orderId === orderId);
    if (!order) throw new Error('unknown order');
    order.infoRequests.push({ id, fields, status: 'pending' });
  }

  private owned(workspaceId: string, normalizedEmail: string): MemoryOrder[] {
    return this.orders.filter(
      (order) => order.workspaceId === workspaceId && order.email === normalizedEmail,
    );
  }

  private find(input: {
    workspaceId: string;
    normalizedEmail: string;
    reference: string;
  }): MemoryOrder | undefined {
    return this.owned(input.workspaceId, input.normalizedEmail).find(
      (order) => order.detail.reference === input.reference,
    );
  }

  async hasActiveOrders(input: { workspaceId: string; normalizedEmail: string }) {
    return this.owned(input.workspaceId, input.normalizedEmail).length > 0;
  }

  async createChallengeAndQueue(input: QueueTrackingChallengeInput): Promise<void> {
    if (!(await this.hasActiveOrders(input))) return;
    for (const challenge of this.challenges) {
      if (
        challenge.workspaceId === input.workspaceId &&
        challenge.emailHash === input.emailHash &&
        challenge.status === 'pending'
      )
        challenge.status = 'consumed';
    }
    this.challenges.push({
      workspaceId: input.workspaceId,
      emailHash: input.emailHash,
      codeHash: input.codeHash,
      attempts: 0,
      expiresAt: input.expiresAt,
      status: 'pending',
    });
    const code = openTrackingCode(this.secret, input, input.sealedCode);
    if (!code) throw new Error('invalid queued code');
    this.sent.push({ workspaceId: input.workspaceId, email: input.normalizedEmail, code });
  }

  async consume(input: {
    workspaceId: string;
    normalizedEmail: string;
    emailHash: string;
    candidateCodeHash: string;
    now: Date;
  }): Promise<ConsumeOutcome> {
    const challenge = this.challenges
      .filter(
        (candidate) =>
          candidate.workspaceId === input.workspaceId &&
          candidate.emailHash === input.emailHash &&
          candidate.status === 'pending',
      )
      .at(-1);
    if (!challenge) return 'not_found';
    if (challenge.expiresAt.getTime() <= input.now.getTime()) {
      challenge.status = 'consumed';
      return 'expired';
    }
    if (challenge.attempts >= MAX_TRACKING_ATTEMPTS) {
      challenge.status = 'consumed';
      return 'exhausted';
    }
    if (challenge.codeHash !== input.candidateCodeHash) {
      challenge.attempts += 1;
      return 'invalid';
    }
    challenge.status = 'consumed';
    return (await this.hasActiveOrders(input)) ? 'verified' : 'not_found';
  }

  async listOrders(input: {
    workspaceId: string;
    normalizedEmail: string;
  }): Promise<TrackingOrderSummary[]> {
    return this.owned(input.workspaceId, input.normalizedEmail).map(({ detail }) => ({
      reference: detail.reference,
      productTitle: detail.productTitle,
      offerName: detail.offerName,
      productType: detail.productType,
      fulfilmentStatus: detail.fulfilmentStatus,
      paymentState: detail.paymentState,
      deliveryState: detail.deliveryState,
      actionNeeded: detail.actionNeeded,
      submittedAt: detail.submittedAt,
      updatedAt: detail.updatedAt,
    }));
  }

  async orderDetail(input: {
    workspaceId: string;
    normalizedEmail: string;
    reference: string;
  }): Promise<TrackingOrderDetail | undefined> {
    const order = this.find(input);
    if (!order) return undefined;
    return {
      ...order.detail,
      infoRequests: order.infoRequests
        .filter((info) => info.status === 'pending')
        .map((info) => ({
          id: info.id,
          fields: info.fields,
          message: null,
          createdAt: order.detail.updatedAt,
        })),
      changeRequests: order.customerChanges.map((change) => ({
        ...change,
        createdAt: order.detail.updatedAt,
      })),
    };
  }

  async orderId(input: { workspaceId: string; normalizedEmail: string; reference: string }) {
    return this.find(input)?.orderId;
  }

  async createCustomerChange(input: CustomerChangeInput): Promise<CustomerChangeOutcome> {
    const order = this.find(input);
    if (!order) return { status: 'not_found' };
    const fields = patchFieldKeys(input.patch);
    if (input.infoRequestId) {
      const info = order.infoRequests.find(
        (candidate) => candidate.id === input.infoRequestId && candidate.status === 'pending',
      );
      if (!info) return { status: 'info_request_not_found' };
      if ([...info.fields].sort().join() !== fields.join()) return { status: 'fields_mismatch' };
      info.status = 'answered';
    } else if (order.customerChanges.length >= MAX_PENDING_CUSTOMER_CHANGES) {
      return { status: 'too_many_pending' };
    }
    const change = { id: randomUUID(), status: 'pending' as const, fields };
    order.customerChanges.push(change);
    return {
      status: 'created',
      changeRequest: { ...change, createdAt: input.now.toISOString() },
    };
  }
}

const FIXTURE_TIME = '2026-10-25T12:00:00.000Z';

/** A complete, valid customer view of one order for tests; override what a case needs. */
export function trackingDetail(
  reference: string,
  overrides: Partial<TrackingOrderDetail> = {},
): TrackingOrderDetail {
  return {
    reference,
    productTitle: 'Pre-arrival eSIM',
    offerName: 'Rogers 100 GB',
    productType: 'sim',
    fulfilmentStatus: 'submitted',
    paymentState: 'not_required',
    deliveryState: 'none',
    actionNeeded: false,
    submittedAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
    billingPeriod: 'month',
    price: {
      recurring: { amountMinor: 4000, currency: 'CAD' },
      total: { amountMinor: 4000, currency: 'CAD' },
      amountPayableToday: { amountMinor: 0, currency: 'CAD' },
      paymentRequired: false,
    },
    trackingReference: null,
    customer: { fullName: 'Jane Doe', email: 'jane@example.test', phone: null, countryCode: 'IN' },
    details: { currentCountry: 'India', destination: 'Toronto', arrivalDate: '2026-11-14' },
    documentChecklist: ['passport'],
    documentsRequired: ['passport'],
    documents: [],
    infoRequests: [],
    changeRequests: [],
    ...overrides,
  };
}
