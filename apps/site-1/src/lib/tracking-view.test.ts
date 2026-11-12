import { describe, expect, it } from 'vitest';
import type { TrackingOrder } from '@canadian-plans/crm-contracts';

import {
  canUploadDocuments,
  changeFormValues,
  changeFromValues,
  currentValue,
  documentRows,
  fillTemplate,
  findOrder,
  formatDate,
  formatPrice,
  needsAttention,
  pendingChangeView,
  planView,
  trackChangeFieldsSchema,
} from './tracking-view';

const NOW = '2026-10-25T12:00:00.000Z';
const order: TrackingOrder = {
  reference: 'MS-153',
  leadType: 'sim_order',
  stage: 'pending',
  stageLabel: 'Received',
  submittedAt: NOW,
  plan: {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Rogers 100 GB',
    priceMinor: 4000,
    billingPeriod: 'month',
  },
  quantity: 1,
  delivery: 'esim',
  courier: null,
  trackingNumber: null,
  dispatchedAt: null,
  simNumber: null,
  details: {
    fullName: 'Jane Doe',
    phone: '+1 555 010 0000',
    arrivalDate: '2026-11-20',
    permitType: 'student',
    canadaAddress: 'Toronto',
    shippingAddress: null,
    flightBooked: true,
  },
  documents: [
    { documentType: 'passport', state: 'needs_replacement' },
    { documentType: 'visa', state: 'missing' },
  ],
  canRequestChange: true,
  pendingChange: null,
};

const pending = (
  fields: NonNullable<TrackingOrder['pendingChange']>['fields'],
  documents: NonNullable<TrackingOrder['pendingChange']>['documents'] = [],
): TrackingOrder['pendingChange'] => ({
  requestNo: 7,
  fields,
  documents,
  createdAt: NOW,
  updatedAt: NOW,
});

describe('tracking view helpers', () => {
  it('formats templates, prices and dates', () => {
    expect(fillTemplate('Hi {name} {missing}', { name: 'Jane' })).toBe('Hi Jane {missing}');
    expect(formatPrice(4000)).toContain('40.00');
    expect(formatDate(NOW)).toBe('25 Oct 2026');
    expect(formatDate('2026-11-20')).toBe('20 Nov 2026');
    expect(formatDate('not a date')).toBe('not a date');
  });

  it('finds an order by its exact reference only', () => {
    expect(findOrder([order], 'MS-153')).toBe(order);
    expect(findOrder([order], 'ms-153')).toBeUndefined();
    expect(findOrder([], 'MS-153')).toBeUndefined();
  });

  it('names the plan from the frozen plan, else the website label', () => {
    expect(planView(order)).toEqual({
      name: 'Rogers 100 GB',
      priceMinor: 4000,
      billingPeriod: 'month',
    });
    expect(
      planView({
        ...order,
        plan: null,
        details: { ...order.details, websitePlanLabel: 'Old plan' },
      }),
    ).toEqual({ name: 'Old plan', priceMinor: null, billingPeriod: null });
    expect(planView({ ...order, plan: null }).name).toBeNull();
  });

  it('reads the current value of each editable detail', () => {
    expect(currentValue(order, 'fullName')).toBe('Jane Doe');
    expect(currentValue(order, 'canadaAddress')).toBe('Toronto');
    expect(
      currentValue({ ...order, details: { ...order.details, phone: null } }, 'phone'),
    ).toBeNull();
  });
});

describe('change form', () => {
  it('starts from the order, with pending values on top', () => {
    expect(changeFormValues(order)).toEqual({
      fullName: 'Jane Doe',
      phone: '+1 555 010 0000',
      arrivalDate: '2026-11-20',
      canadaAddress: 'Toronto',
    });
    expect(
      changeFormValues({ ...order, pendingChange: pending({ arrivalDate: '2026-12-01' }) }),
    ).toMatchObject({ arrivalDate: '2026-12-01', fullName: 'Jane Doe' });
  });

  it('sends only the details that differ, trimmed', () => {
    const values = { ...changeFormValues(order), canadaAddress: '  Vancouver ' };
    expect(changeFromValues(order, values)).toEqual({
      ok: true,
      fields: { canadaAddress: 'Vancouver' },
    });
  });

  it('carries a pending change again so a new request does not drop it', () => {
    const withPending = { ...order, pendingChange: pending({ arrivalDate: '2026-12-01' }) };
    const values = { ...changeFormValues(withPending), fullName: 'Jane A. Doe' };
    expect(changeFromValues(withPending, values)).toEqual({
      ok: true,
      fields: { fullName: 'Jane A. Doe', arrivalDate: '2026-12-01' },
    });
  });

  it('reports an unchanged form', () => {
    expect(changeFromValues(order, changeFormValues(order))).toEqual({
      ok: false,
      unchanged: true,
      errors: {},
    });
  });

  it('rejects emptied and invalid values per field', () => {
    const values = changeFormValues(order);
    expect(changeFromValues(order, { ...values, fullName: ' ' })).toEqual({
      ok: false,
      unchanged: false,
      errors: { fullName: 'required' },
    });
    expect(
      changeFromValues(order, {
        fullName: 'J',
        phone: '12345',
        arrivalDate: '2026-02-31',
        canadaAddress: 'x'.repeat(301),
      }),
    ).toEqual({
      ok: false,
      unchanged: false,
      errors: {
        fullName: 'invalid',
        phone: 'invalid',
        arrivalDate: 'invalid',
        canadaAddress: 'invalid',
      },
    });
  });

  it('accepts only the four storefront details in a change request', () => {
    expect(trackChangeFieldsSchema.safeParse({ phone: '+1 555 010 0001' }).success).toBe(true);
    for (const fields of [
      {},
      { planId: '11111111-1111-4111-8111-111111111111' },
      { delivery: 'pickup' },
      { email: 'new@example.test' },
      { fullName: 'Jane Doe', flightBooked: false },
    ])
      expect(trackChangeFieldsSchema.safeParse(fields).success).toBe(false);
  });
});

describe('documents', () => {
  it('asks for missing and rejected documents on a changeable SIM order', () => {
    expect(canUploadDocuments(order)).toBe(true);
    expect(documentRows(order)).toEqual([
      {
        documentType: 'passport',
        state: 'needs_replacement',
        sent: false,
        uploadable: true,
        needed: true,
      },
      { documentType: 'visa', state: 'missing', sent: false, uploadable: true, needed: true },
    ]);
    expect(needsAttention(order)).toBe(true);
  });

  it('stops asking once a document was sent with the pending request or approved', () => {
    const rows = documentRows({
      ...order,
      documents: [
        { documentType: 'passport', state: 'approved' },
        { documentType: 'visa', state: 'missing' },
      ],
      pendingChange: pending({}, ['visa']),
    });
    expect(rows[0]).toMatchObject({ uploadable: false, needed: false });
    expect(rows[1]).toMatchObject({ sent: true, uploadable: true, needed: false });
  });

  it('offers no upload when the order cannot change, is not a SIM order or lists another type', () => {
    const locked = { ...order, canRequestChange: false };
    expect(canUploadDocuments(locked)).toBe(false);
    expect(documentRows(locked).every((row) => !row.uploadable && !row.needed)).toBe(true);
    expect(needsAttention(locked)).toBe(false);

    const internet: TrackingOrder = { ...order, leadType: 'internet' };
    expect(canUploadDocuments(internet)).toBe(false);
    expect(documentRows(internet).some((row) => row.uploadable)).toBe(false);

    const other: TrackingOrder = {
      ...order,
      documents: [{ documentType: 'address_proof', state: 'missing' }],
    };
    expect(documentRows(other)).toEqual([
      {
        documentType: 'address_proof',
        state: 'missing',
        sent: false,
        uploadable: false,
        needed: false,
      },
    ]);
  });
});

describe('pendingChangeView', () => {
  it('is null without a pending request', () => {
    expect(pendingChangeView(order)).toBeNull();
  });

  it('lists the field keys in contract order and never their values', () => {
    const view = pendingChangeView({
      ...order,
      pendingChange: pending({ canadaAddress: 'Vancouver', fullName: 'Jane A. Doe' }, ['passport']),
    });
    expect(view).toEqual({
      requestNo: 7,
      fields: ['fullName', 'canadaAddress'],
      documents: ['passport'],
      updatedAt: NOW,
    });
    expect(JSON.stringify(view)).not.toContain('Vancouver');
  });
});
