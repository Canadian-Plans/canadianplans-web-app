import { describe, expect, it } from 'vitest';
import type { OrderSummary, SubmitOrderRequest } from '@canadian-plans/contracts';

import { OrderService } from '../src/orders/service.js';
import type {
  OrderSubmissionStore,
  SubmitOrderStoreInput,
  SubmitOrderStoreResult,
} from '../src/orders/store.js';
import { validateTransition } from '../src/orders/transitions.js';

const WORKSPACE = '10000000-0000-4000-8000-000000000512';
const ACTOR = '20000000-0000-4000-8000-000000000512';
const REQUEST = '30000000-0000-4000-8000-000000000512';
const QUOTE_A = '40000000-0000-4000-8000-000000000512';
const QUOTE_B = '50000000-0000-4000-8000-000000000512';
const LEAD = '60000000-0000-4000-8000-000000000512';
const ORDER = '70000000-0000-4000-8000-000000000512';
const NOW = new Date('2026-09-16T12:00:00.000Z');

const body: SubmitOrderRequest = {
  quoteId: QUOTE_A,
  termsVersion: 'terms-1',
  form: { schemaVersion: 1, payload: { givenName: 'Synthetic' } },
  consent: { termsVersion: 'terms-1', marketingOptIn: false },
};

interface MemoryQuote {
  leadId: string;
  expiresAt: Date;
  revoked: boolean;
  consumed: boolean;
}

interface MemoryIdempotency {
  fingerprint: string;
  leadId: string;
  order: OrderSummary;
}

class MemoryOrderStore implements OrderSubmissionStore {
  readonly quotes = new Map<string, MemoryQuote>();
  readonly orders = new Map<string, OrderSummary>();
  readonly idempotency = new Map<string, MemoryIdempotency>();
  readonly jobs: Array<{ type: string; orderId: string }> = [];
  readonly history: Array<{ orderId: string; status: string }> = [];
  failCommit = false;
  private gate = Promise.resolve();

  constructor() {
    this.quotes.set(QUOTE_A, {
      leadId: LEAD,
      expiresAt: new Date(NOW.getTime() + 15 * 60_000),
      revoked: false,
      consumed: false,
    });
  }

  submit(input: SubmitOrderStoreInput): Promise<SubmitOrderStoreResult> {
    const previous = this.gate;
    let release: () => void = () => {};
    this.gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    return previous.then(async () => {
      try {
        return await this.submitAtomically(input);
      } finally {
        release();
      }
    });
  }

  private async submitAtomically(input: SubmitOrderStoreInput): Promise<SubmitOrderStoreResult> {
    const prior = this.idempotency.get(input.keyHash);
    if (prior) {
      return prior.fingerprint === input.requestFingerprint
        ? { status: 'existing', order: prior.order }
        : { status: 'idempotency_conflict' };
    }
    const quote = this.quotes.get(input.body.quoteId);
    if (!quote) return { status: 'quote_not_found' };
    if (this.orders.has(quote.leadId)) return { status: 'draft_already_submitted' };
    if (quote.consumed) return { status: 'quote_consumed' };
    if (quote.revoked) return { status: 'quote_withdrawn' };
    if (quote.expiresAt.getTime() <= input.now.getTime()) return { status: 'quote_expired' };
    if (input.body.termsVersion !== 'terms-1' || input.body.consent.termsVersion !== 'terms-1') {
      return { status: 'terms_version_unsupported' };
    }

    const order: OrderSummary = {
      id: ORDER,
      workspaceId: input.workspaceId,
      reference: input.reference,
      fulfilmentStatus: 'submitted',
      paymentState: 'not_required',
      deliveryState: 'none',
      archiveState: 'active',
      total: { amountMinor: 4500, currency: 'CAD' },
      amountPayableToday: { amountMinor: 0, currency: 'CAD' },
      recordVersion: 1,
      createdAt: input.now.toISOString(),
      updatedAt: input.now.toISOString(),
    };
    if (this.failCommit) throw new Error('synthetic_commit_failure');

    quote.consumed = true;
    this.orders.set(quote.leadId, order);
    this.idempotency.set(input.keyHash, {
      fingerprint: input.requestFingerprint,
      leadId: quote.leadId,
      order,
    });
    this.history.push({ orderId: order.id, status: 'submitted' });
    this.jobs.push(
      { type: 'order_acknowledgement_email', orderId: order.id },
      { type: 'analytics_order_submitted', orderId: order.id },
    );
    return { status: 'created', order };
  }
}

function service(store: MemoryOrderStore, now = () => NOW) {
  return new OrderService(store, 'honour_until_expiry', now, () => 'CP-SYNTHETIC1234');
}

function submit(orderService: OrderService, key: string, requestBody = body) {
  return orderService.submit({
    workspaceId: WORKSPACE,
    actorId: ACTOR,
    requestId: REQUEST,
    grantToken: 'cpldg_synthetic-order-test-grant',
    idempotencyKey: key,
    body: requestBody,
  });
}

describe('order submission integrity', () => {
  it('keeps priced order submission disabled while the withdrawal policy is unresolved', async () => {
    const store = new MemoryOrderStore();
    const orderService = new OrderService(store, 'unresolved', () => NOW);
    expect(await submit(orderService, 'order-key-0000')).toEqual({ status: 'checkout_disabled' });
    expect(store.orders.size).toBe(0);
  });

  it('double submit and timeout-after-commit retry return one stable reference', async () => {
    const store = new MemoryOrderStore();
    const orderService = service(store);
    const first = await submit(orderService, 'order-key-0001');
    const retry = await submit(orderService, 'order-key-0001');
    expect(first.status).toBe('created');
    expect(retry).toMatchObject({ status: 'existing', order: { reference: 'CP-SYNTHETIC1234' } });
    expect(store.orders.size).toBe(1);
    expect(store.jobs.map((job) => job.type)).toEqual([
      'order_acknowledgement_email',
      'analytics_order_submitted',
    ]);
  });

  it('returns a completed outcome before checking an expired consumed quote', async () => {
    const store = new MemoryOrderStore();
    const orderService = service(store);
    await submit(orderService, 'order-key-0002');
    const quote = store.quotes.get(QUOTE_A);
    if (!quote) throw new Error('fixture quote missing');
    quote.expiresAt = new Date(NOW.getTime() - 1);
    expect(await submit(orderService, 'order-key-0002')).toMatchObject({ status: 'existing' });
  });

  it('rejects the same key with a different request fingerprint', async () => {
    const store = new MemoryOrderStore();
    const orderService = service(store);
    await submit(orderService, 'order-key-0003');
    const changed = {
      ...body,
      form: { schemaVersion: 1, payload: { givenName: 'Changed' } },
    };
    expect(await submit(orderService, 'order-key-0003', changed)).toEqual({
      status: 'idempotency_conflict',
    });
  });

  it('two different keys cannot create two orders for one submitted draft', async () => {
    const store = new MemoryOrderStore();
    store.quotes.set(QUOTE_B, {
      leadId: LEAD,
      expiresAt: new Date(NOW.getTime() + 15 * 60_000),
      revoked: false,
      consumed: false,
    });
    const orderService = service(store);
    await submit(orderService, 'order-key-0004');
    const second = await submit(orderService, 'order-key-0005', { ...body, quoteId: QUOTE_B });
    expect(second).toEqual({ status: 'draft_already_submitted' });
    expect(store.orders.size).toBe(1);
  });

  it('parallel submissions create exactly one order and one quote consumption', async () => {
    const store = new MemoryOrderStore();
    const orderService = service(store);
    const outcomes = await Promise.all([
      submit(orderService, 'order-key-0006'),
      submit(orderService, 'order-key-0006'),
    ]);
    expect(outcomes.map((outcome) => outcome.status).sort()).toEqual(['created', 'existing']);
    expect(store.orders.size).toBe(1);
    expect(store.quotes.get(QUOTE_A)?.consumed).toBe(true);
    expect(store.jobs).toHaveLength(2);
  });

  it('a failed commit leaves no order, idempotency outcome, history, job, or quote consumption', async () => {
    const store = new MemoryOrderStore();
    store.failCommit = true;
    await expect(submit(service(store), 'order-key-0007')).rejects.toThrow(
      'synthetic_commit_failure',
    );
    expect(store.orders.size).toBe(0);
    expect(store.idempotency.size).toBe(0);
    expect(store.history).toHaveLength(0);
    expect(store.jobs).toHaveLength(0);
    expect(store.quotes.get(QUOTE_A)?.consumed).toBe(false);
  });
});

describe('order transition policy', () => {
  it('rejects illegal transitions', () => {
    expect(
      validateTransition('submitted', 'activated', {
        partnered: false,
        allowOperationalTransitions: true,
      }),
    ).toBe('illegal_transition');
  });

  it('requires a cancellation reason', () => {
    expect(
      validateTransition('submitted', 'cancelled', {
        partnered: false,
        allowOperationalTransitions: true,
      }),
    ).toBe('cancellation_reason_required');
  });

  it('keeps partnered activation disabled until a commission line can be created (T19)', () => {
    expect(
      validateTransition('dispatched', 'activated', {
        partnered: true,
        allowOperationalTransitions: true,
      }),
    ).toBe('feature_not_ready');
  });

  it('allows partnered activation once the commission path is wired (T19)', () => {
    expect(
      validateTransition('dispatched', 'activated', {
        partnered: true,
        allowOperationalTransitions: true,
        commissionConfigured: true,
      }),
    ).toBeUndefined();
  });

  it('still blocks partnered activation when operational transitions are off', () => {
    expect(
      validateTransition('dispatched', 'activated', {
        partnered: true,
        allowOperationalTransitions: false,
        commissionConfigured: true,
      }),
    ).toBe('feature_not_ready');
  });
});
