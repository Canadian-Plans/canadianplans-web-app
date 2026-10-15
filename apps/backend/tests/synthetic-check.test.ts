import { describe, expect, it } from 'vitest';
import type { LeadSummary, OrderSummary, Quote } from '@canadian-plans/contracts';

import { runSyntheticOrderCheck, type SyntheticCheckDependencies } from '../src/synthetic/check.js';

const WORKSPACE = '10000000-0000-4000-8000-000000000901';
const PRODUCT = '90000000-0000-4000-8000-000000000901';
const ACTOR = '20000000-0000-4000-8000-000000000901';
const REQUEST = '30000000-0000-4000-8000-000000000901';
const LEAD = '60000000-0000-4000-8000-000000000901';
const QUOTE = '40000000-0000-4000-8000-000000000901';
const ORDER = '70000000-0000-4000-8000-000000000901';

const LEAD_SUMMARY: LeadSummary = {
  id: LEAD,
  workspaceId: WORKSPACE,
  status: 'incomplete',
  updatedAt: '2026-09-21T00:00:00.000Z',
};

const QUOTE_FIXTURE: Quote = {
  id: QUOTE,
  workspaceId: WORKSPACE,
  productId: PRODUCT,
  offerVersionId: '91000000-0000-4000-8000-000000000901',
  currency: 'CAD',
  charges: [
    { code: 'recurring', label: 'Recurring charge', amount: { amountMinor: 1, currency: 'CAD' } },
  ],
  total: { amountMinor: 1, currency: 'CAD' },
  amountPayableToday: { amountMinor: 1, currency: 'CAD' },
  paymentRequired: false,
  documentChecklist: [],
  termsVersion: 'synthetic-check-v1',
  createdAt: '2026-09-21T00:00:00.000Z',
  expiresAt: '2026-09-21T01:00:00.000Z',
};

const ORDER_SUMMARY: OrderSummary = {
  id: ORDER,
  workspaceId: WORKSPACE,
  reference: 'CP-SYN-1',
  fulfilmentStatus: 'submitted',
  paymentState: 'not_required',
  deliveryState: 'none',
  archiveState: 'active',
  total: { amountMinor: 1, currency: 'CAD' },
  amountPayableToday: { amountMinor: 1, currency: 'CAD' },
  recordVersion: 0,
  createdAt: '2026-09-21T00:00:00.000Z',
  updatedAt: '2026-09-21T00:00:00.000Z',
};

function baseDependencies(): SyntheticCheckDependencies {
  return {
    workspaceId: WORKSPACE,
    productId: PRODUCT,
    leads: {
      createLead: async () => ({
        lead: LEAD_SUMMARY,
        grant: { token: 'grant-token', expiresAt: '2026-09-21T01:00:00.000Z' },
      }),
    },
    quotes: {
      createQuote: async () => ({ status: 'created', quote: QUOTE_FIXTURE }),
    },
    orders: {
      submit: async () => ({ status: 'created', order: ORDER_SUMMARY }),
    },
    transitions: {
      transition: async () => ({
        status: 'transitioned',
        orderId: ORDER,
        orderStatus: 'cancelled',
        version: 1,
      }),
    },
  };
}

describe('runSyntheticOrderCheck', () => {
  it('reports ok after lead -> quote -> order -> cancel all succeed', async () => {
    const result = await runSyntheticOrderCheck(baseDependencies(), {
      actorId: ACTOR,
      requestId: REQUEST,
    });
    expect(result).toMatchObject({ status: 'ok', orderId: ORDER, reference: 'CP-SYN-1' });
  });

  it('reports the quote step when quote creation fails', async () => {
    const dependencies = baseDependencies();
    dependencies.quotes = { createQuote: async () => ({ status: 'offer_unavailable' }) };
    const result = await runSyntheticOrderCheck(dependencies, {
      actorId: ACTOR,
      requestId: REQUEST,
    });
    expect(result).toEqual({
      status: 'failed',
      step: 'quote',
      code: 'offer_unavailable',
      durationMs: expect.any(Number),
    });
  });

  it('reports the order step when order submission fails', async () => {
    const dependencies = baseDependencies();
    dependencies.orders = { submit: async () => ({ status: 'quote_expired' }) };
    const result = await runSyntheticOrderCheck(dependencies, {
      actorId: ACTOR,
      requestId: REQUEST,
    });
    expect(result).toEqual({
      status: 'failed',
      step: 'order',
      code: 'quote_expired',
      durationMs: expect.any(Number),
    });
  });

  it('reports the cancel step when the cleanup transition fails', async () => {
    const dependencies = baseDependencies();
    dependencies.transitions = { transition: async () => ({ status: 'version_conflict' }) };
    const result = await runSyntheticOrderCheck(dependencies, {
      actorId: ACTOR,
      requestId: REQUEST,
    });
    expect(result).toEqual({
      status: 'failed',
      step: 'cancel',
      code: 'version_conflict',
      durationMs: expect.any(Number),
    });
  });

  it('reports the step in progress when a dependency throws unexpectedly', async () => {
    const dependencies = baseDependencies();
    dependencies.leads = {
      createLead: async () => {
        throw new Error('connection_refused');
      },
    };
    const result = await runSyntheticOrderCheck(dependencies, {
      actorId: ACTOR,
      requestId: REQUEST,
    });
    expect(result).toEqual({
      status: 'failed',
      step: 'lead',
      code: 'connection_refused',
      durationMs: expect.any(Number),
    });
  });
});
