import { describe, expect, it } from 'vitest';
import { websiteOfferSchema, type LeadDraft, type WebsiteOffer } from '@canadian-plans/contracts';
import { buildOrderForm, parseOrderDetails, type OrderDetailsInput } from './details';
import { restoreOrderDetails, selectOrderDraft } from './resume';

const ID = '10000000-0000-4000-8000-000000000001';
function offer(productType: 'sim' | 'internet' | 'mobile', id = ID): WebsiteOffer {
  return websiteOfferSchema.parse({
    productId: id,
    offerVersionId: ID,
    lastSyncedAt: null,
    commercial: {
      productKey: `test-${productType}`,
      productTitle: 'TEST plan',
      productType,
      offerName: 'TEST plan',
      currency: 'CAD',
      recurringChargeAmountMinor: 3500,
      oneTimeFees: [],
      amountPayableTodayMinor: 3500,
      paymentRequired: false,
      documentChecklist: ['none'],
      eligibility: 'TEST',
      availability: 'TEST',
      billingParty: 'TEST',
      contractTerms: [{ _type: 'block', children: [] }],
      termsVersion: 'test-v1',
      regions: ['CA'],
      specs: { carrier: 'TEST', dataAllowance: '10 GB', speed: '100 Mbps' },
    },
  });
}
const contact = { fullName: 'Saved Customer', email: 'saved@example.test', phone: '4165550123' };
const address = {
  streetAddress: '1 Queen Street',
  aptUnit: '2',
  city: 'Toronto',
  postalCode: 'M5V 2T6',
};
const samples: OrderDetailsInput[] = [
  {
    category: 'sim',
    ...contact,
    countryCode: 'BD',
    currentCountry: 'Bangladesh',
    destination: 'Toronto',
    arrivalDate: '2026-12-01',
  },
  {
    category: 'internet',
    ...contact,
    ...address,
    province: 'ON',
    dateOfBirth: '1990-01-01',
    currentProvider: 'Bell',
    preferredInstallationTime: 'Morning',
  },
  {
    category: 'mobile',
    ...contact,
    ...address,
    lines: '2',
    currentProvider: 'Rogers',
    keepNumber: 'yes',
    simType: 'esim',
    creditCheckConsent: true,
  },
];
function saved(details: OrderDetailsInput): LeadDraft {
  const checked = parseOrderDetails(details);
  if (!checked.ok) throw new Error('invalid test sample');
  return {
    leadId: ID,
    productId: ID,
    contact: checked.order.contact,
    form: buildOrderForm(checked.order, ['none'], true, { creditCheckConsentVersion: 'test-v1' }),
  };
}
describe('saved order restoration', () => {
  for (const sample of samples) {
    it(`round-trips ${sample.category} fields without restoring consent`, () => {
      expect(restoreOrderDetails(saved(sample), offer(sample.category))).toEqual(
        sample.category === 'mobile' ? { ...sample, creditCheckConsent: false } : sample,
      );
    });
  }
  it('rejects malformed, unsupported-version, wrong-category and wrong-product data', () => {
    const sample = samples[0];
    if (!sample) throw new Error('missing sample');
    const draft = saved(sample);
    expect(
      restoreOrderDetails({ ...draft, form: { schemaVersion: 2, payload: {} } }, offer('sim')),
    ).toBeUndefined();
    expect(
      restoreOrderDetails({ ...draft, form: { schemaVersion: 1, payload: {} } }, offer('sim')),
    ).toBeUndefined();
    expect(restoreOrderDetails(draft, offer('mobile'))).toBeUndefined();
    expect(
      restoreOrderDetails(draft, offer('sim', '10000000-0000-4000-8000-000000000002')),
    ).toBeUndefined();
  });
  it('restores a saved province but honors explicit category, plan and province choices', () => {
    const sample = samples[1];
    if (!sample) throw new Error('missing sample');
    const draft = saved(sample);
    const internet = offer('internet');
    const mobile = offer('mobile', '10000000-0000-4000-8000-000000000002');
    const base = {
      offers: [internet, mobile],
      draft,
      requestedPlan: undefined,
      category: undefined,
      province: undefined,
    };
    expect(selectOrderDraft(base)).toMatchObject({
      selected: internet,
      details: sample,
      province: 'ON',
    });
    expect(selectOrderDraft({ ...base, category: 'mobile' }).selected).toBeUndefined();
    expect(selectOrderDraft({ ...base, requestedPlan: mobile.productId })).toMatchObject({
      selected: mobile,
      details: undefined,
    });
    expect(selectOrderDraft({ ...base, requestedPlan: 'missing' }).selected).toBeUndefined();
    // Static marketing pages link by the stable catalogue productKey.
    expect(selectOrderDraft({ ...base, requestedPlan: 'test-mobile' }).selected).toBe(mobile);
    expect(
      selectOrderDraft({ ...base, requestedPlan: 'test-mobile', category: 'internet' }).selected,
    ).toBeUndefined();
    expect(selectOrderDraft({ ...base, province: 'BC' })).toMatchObject({
      details: undefined,
      province: 'BC',
    });
  });
  it('does not select a withdrawn or geographically unavailable saved offer', () => {
    const sample = samples[1];
    if (!sample) throw new Error('missing sample');
    const draft = saved(sample);
    const input = { draft, requestedPlan: undefined, category: undefined, province: 'ON' as const };
    expect(selectOrderDraft({ ...input, offers: [] }).selected).toBeUndefined();
    const onlyBC = offer('internet');
    onlyBC.commercial.regions = ['BC'];
    expect(selectOrderDraft({ ...input, offers: [onlyBC] }).selected).toBeUndefined();
  });
});
