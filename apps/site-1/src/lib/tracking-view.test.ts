import { describe, expect, it } from 'vitest';
import type { TrackingOrderDetail } from '@canadian-plans/contracts';

import {
  currentValue,
  documentRows,
  fillTemplate,
  formatDate,
  formatMoney,
  patchFromValues,
  progressFor,
} from './tracking-view';

const NOW = '2026-10-25T12:00:00.000Z';
const order: TrackingOrderDetail = {
  reference: 'CP-1',
  productTitle: 'Pre-arrival eSIM',
  offerName: 'Rogers 100 GB',
  productType: 'sim',
  fulfilmentStatus: 'in_progress',
  paymentState: 'not_required',
  deliveryState: 'none',
  actionNeeded: true,
  submittedAt: NOW,
  updatedAt: NOW,
  billingPeriod: 'month',
  price: {
    recurring: { amountMinor: 4000, currency: 'CAD' },
    total: { amountMinor: 4000, currency: 'CAD' },
    amountPayableToday: { amountMinor: 0, currency: 'CAD' },
    paymentRequired: false,
  },
  trackingReference: null,
  customer: { fullName: 'Jane', email: 'jane@example.test', phone: null, countryCode: 'IN' },
  details: { currentCountry: 'India', destination: 'Toronto', arrivalDate: '2026-11-14' },
  documentChecklist: ['passport', 'visa'],
  documentsRequired: ['passport', 'visa'],
  documents: [
    { id: 'a', documentType: 'passport', status: 'needs_replacement', uploadedAt: NOW },
    { id: 'b', documentType: 'visa', status: 'received', uploadedAt: NOW },
  ],
  infoRequests: [],
  changeRequests: [],
};

describe('progressFor', () => {
  it('marks earlier steps done and the current one current', () => {
    expect(progressFor('ready_for_delivery').map((step) => step.kind)).toEqual([
      'done',
      'done',
      'current',
      'future',
      'future',
    ]);
  });

  it('shows a waiting step while staff wait for the customer', () => {
    expect(progressFor('awaiting_customer')[1]).toMatchObject({ kind: 'waiting', marker: '!' });
  });

  it('completes every step when active and none when cancelled', () => {
    expect(progressFor('activated').every((step) => step.kind === 'done')).toBe(true);
    expect(progressFor('cancelled').every((step) => step.kind === 'future')).toBe(true);
  });
});

describe('patchFromValues', () => {
  it('builds a contact and form patch with normalized values', () => {
    expect(
      patchFromValues({
        'contact.countryCode': ' in ',
        'form.arrivalDate': '2026-11-20',
      }),
    ).toEqual({
      ok: true,
      patch: { contact: { countryCode: 'IN' }, form: { arrivalDate: '2026-11-20' } },
    });
  });

  it('reports empty, malformed email and country-code values per field', () => {
    expect(
      patchFromValues({
        'contact.email': 'not-an-email',
        'contact.countryCode': 'IND',
        'form.destination': '  ',
      }),
    ).toEqual({
      ok: false,
      errors: {
        'contact.email': 'email',
        'contact.countryCode': 'countryCode',
        'form.destination': 'value',
      },
    });
    expect(patchFromValues({})).toEqual({ ok: false, errors: {} });
  });
});

describe('documentRows', () => {
  it('asks for a replacement but not while a new file waits for review', () => {
    expect(documentRows(order)).toEqual([
      { documentType: 'passport', status: 'needs_replacement', uploadable: true },
      { documentType: 'visa', status: 'received', uploadable: false },
    ]);
  });

  it('lists a missing checklist document as uploadable', () => {
    expect(documentRows({ ...order, documents: [] })[0]).toEqual({
      documentType: 'passport',
      status: 'missing',
      uploadable: true,
    });
  });
});

describe('formatting', () => {
  it('formats money, dates and templates for display', () => {
    expect(formatMoney({ amountMinor: 4000, currency: 'CAD' })).toBe('$40.00');
    expect(formatDate(NOW)).toBe('25 Oct 2026');
    expect(fillTemplate('Sent to {email}.', { email: 'a@b.co' })).toBe('Sent to a@b.co.');
    expect(currentValue(order, 'form.destination')).toBe('Toronto');
    expect(currentValue(order, 'contact.phone')).toBeNull();
  });
});
