import type { WebsitePlan } from '@canadian-plans/crm-contracts';
import { describe, expect, it } from 'vitest';

import { offerFromPlan, type WebsiteOffer } from '@/lib/offers';
import { buildOrderForm, parseOrderDetails, type OrderDetailsInput } from './details';
import { restoreOrderDetails, selectOrderDraft, type SavedOrderDraft } from './resume';

const SIM_ID = '10000000-0000-4000-8000-000000000001';
const INTERNET_ID = '10000000-0000-4000-8000-000000000002';
const MOBILE_ID = '10000000-0000-4000-8000-000000000003';
const OTHER_SIM_ID = '10000000-0000-4000-8000-000000000004';

function offerOf(
  id: string,
  leadType: WebsitePlan['leadType'],
  properties: WebsitePlan['properties'] = {},
): WebsiteOffer {
  return offerFromPlan({
    id,
    leadType,
    name: 'TEST plan',
    priceMinor: 3500,
    currency: 'CAD',
    billingPeriod: 'month',
    paymentRequired: false,
    requiredDocuments: [],
    properties,
  });
}

const simOffer = offerOf(SIM_ID, 'sim_order', { custom_product_key: 'test-sim' });
const internetOffer = offerOf(INTERNET_ID, 'internet', {
  custom_product_key: 'test-internet',
  custom_regions: 'ON',
});
const mobileOffer = offerOf(MOBILE_ID, 'mobility', { custom_product_key: 'test-mobile' });

const simDetails: OrderDetailsInput = {
  category: 'sim',
  fullName: 'Saved Customer',
  email: 'saved@example.test',
  phone: '4165550123',
  countryCode: 'BD',
  currentCountry: 'Bangladesh',
  destination: 'Toronto',
  arrivalDate: '2026-12-01',
};

/** A SIM draft as the CRM returns it: the contact and form that `saveDetails` wrote. */
function savedSim(overrides: Partial<SavedOrderDraft> = {}): SavedOrderDraft {
  const checked = parseOrderDetails(simDetails);
  if (!checked.ok) throw new Error('invalid test sample');
  return {
    productId: SIM_ID,
    contact: checked.order.contact,
    form: buildOrderForm(
      checked.order,
      { productKey: 'test-sim', offerName: 'TEST plan' },
      { consentedAt: '2026-10-20T12:00:00.000Z' },
    ),
    ...overrides,
  };
}

describe('restoreOrderDetails', () => {
  it('round-trips a SIM draft', () => {
    expect(restoreOrderDetails(savedSim(), simOffer)).toEqual(simDetails);
  });

  it('refuses a draft saved without a current country, which the details rules require', () => {
    const draft = savedSim({
      form: { schemaVersion: 1, payload: { arrivalDate: '2026-12-01', canadaAddress: 'Toronto' } },
    });
    expect(restoreOrderDetails(draft, simOffer)).toBeUndefined();
  });

  it('refuses an offer that is not a SIM plan', () => {
    const draft = savedSim({ productId: MOBILE_ID });
    expect(restoreOrderDetails(draft, mobileOffer)).toBeUndefined();
    expect(
      restoreOrderDetails({ ...draft, productId: INTERNET_ID }, internetOffer),
    ).toBeUndefined();
  });

  it('refuses a different plan from the one the draft was saved for', () => {
    expect(restoreOrderDetails(savedSim(), offerOf(OTHER_SIM_ID, 'sim_order'))).toBeUndefined();
  });

  it('refuses a draft with no form or another schema version', () => {
    expect(restoreOrderDetails(savedSim({ form: null }), simOffer)).toBeUndefined();
    const draft = savedSim();
    const payload = draft.form?.payload ?? {};
    expect(
      restoreOrderDetails({ ...draft, form: { schemaVersion: 2, payload } }, simOffer),
    ).toBeUndefined();
  });

  it('refuses an invalid payload', () => {
    expect(
      restoreOrderDetails(savedSim({ form: { schemaVersion: 1, payload: {} } }), simOffer),
    ).toBeUndefined();
    expect(
      restoreOrderDetails(
        savedSim({ form: { schemaVersion: 1, payload: { arrivalDate: 5, canadaAddress: 'x' } } }),
        simOffer,
      ),
    ).toBeUndefined();
  });

  it('refuses a draft whose stored values no longer pass the details rules', () => {
    const draft = savedSim();
    const payload = { ...draft.form?.payload, arrivalDate: 'next week' };
    expect(
      restoreOrderDetails({ ...draft, form: { schemaVersion: 1, payload } }, simOffer),
    ).toBeUndefined();
    expect(
      restoreOrderDetails({ ...draft, contact: { ...draft.contact, email: 'nope' } }, simOffer),
    ).toBeUndefined();
  });
});

describe('selectOrderDraft', () => {
  const base = {
    offers: [simOffer, internetOffer, mobileOffer],
    draft: savedSim(),
    requestedPlan: undefined,
    category: undefined,
    province: undefined,
  };

  it('selects the saved plan and restores its details when nothing else is asked for', () => {
    expect(selectOrderDraft(base)).toEqual({
      selected: simOffer,
      details: simDetails,
      province: undefined,
    });
  });

  it('selects nothing without a draft or a request', () => {
    expect(selectOrderDraft({ ...base, draft: undefined })).toEqual({
      selected: undefined,
      details: undefined,
      province: undefined,
    });
  });

  it('prefers an explicitly requested plan, by id, over the saved draft', () => {
    expect(selectOrderDraft({ ...base, requestedPlan: MOBILE_ID })).toMatchObject({
      selected: mobileOffer,
      details: undefined,
    });
  });

  it('prefers an explicitly requested plan, by product key, over the saved draft', () => {
    expect(selectOrderDraft({ ...base, requestedPlan: 'test-internet' }).selected).toBe(
      internetOffer,
    );
  });

  it('restores the details when the request names the saved plan', () => {
    expect(selectOrderDraft({ ...base, requestedPlan: 'test-sim' })).toMatchObject({
      selected: simOffer,
      details: simDetails,
    });
  });

  it('selects nothing for an unknown requested plan rather than falling back to the draft', () => {
    expect(selectOrderDraft({ ...base, requestedPlan: 'missing' }).selected).toBeUndefined();
  });

  it('filters by category', () => {
    expect(selectOrderDraft({ ...base, category: 'mobile' }).selected).toBeUndefined();
    expect(selectOrderDraft({ ...base, category: 'sim' }).selected).toBe(simOffer);
    expect(
      selectOrderDraft({ ...base, requestedPlan: 'test-mobile', category: 'internet' }).selected,
    ).toBeUndefined();
    expect(
      selectOrderDraft({ ...base, requestedPlan: 'test-mobile', category: 'mobile' }).selected,
    ).toBe(mobileOffer);
  });

  it('filters by province and passes the province through', () => {
    expect(
      selectOrderDraft({ ...base, requestedPlan: 'test-internet', province: 'ON' }),
    ).toMatchObject({
      selected: internetOffer,
      province: 'ON',
    });
    expect(
      selectOrderDraft({ ...base, requestedPlan: 'test-internet', province: 'BC' }),
    ).toMatchObject({ selected: undefined, province: 'BC' });
    // A national SIM plan is sold in every province.
    expect(selectOrderDraft({ ...base, province: 'BC' }).selected).toBe(simOffer);
  });

  it('does not select a withdrawn saved plan', () => {
    expect(selectOrderDraft({ ...base, offers: [] }).selected).toBeUndefined();
    expect(selectOrderDraft({ ...base, offers: [internetOffer] }).selected).toBeUndefined();
  });

  it('does not restore details onto a different plan than the draft was saved for', () => {
    const other = offerOf(OTHER_SIM_ID, 'sim_order');
    expect(
      selectOrderDraft({ ...base, offers: [simOffer, other], requestedPlan: OTHER_SIM_ID }),
    ).toMatchObject({ selected: other, details: undefined });
  });
});
