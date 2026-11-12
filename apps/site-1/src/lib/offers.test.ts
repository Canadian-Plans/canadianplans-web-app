import type { WebsitePlan } from '@canadian-plans/crm-contracts';
import { describe, expect, it } from 'vitest';

import {
  isDraftCategory,
  leadTypeByCategory,
  offerFromPlan,
  offerSoldIn,
  offersFromPlans,
} from './offers';

const PLAN_ID = '10000000-0000-4000-8000-000000000001';
const OTHER_ID = '10000000-0000-4000-8000-000000000002';

function plan(overrides: Partial<WebsitePlan> = {}): WebsitePlan {
  return {
    id: PLAN_ID,
    leadType: 'sim_order',
    name: 'Visitor eSIM 20 GB',
    priceMinor: 3500,
    currency: 'CAD',
    billingPeriod: '30_days',
    paymentRequired: false,
    requiredDocuments: ['passport'],
    properties: {},
    ...overrides,
  };
}

describe('offerFromPlan', () => {
  it('maps a plan with no custom properties, falling back to the plan id and name', () => {
    expect(offerFromPlan(plan())).toEqual({
      productId: PLAN_ID,
      commercial: {
        productKey: PLAN_ID,
        productType: 'sim',
        regions: ['CA'],
        offerName: 'Visitor eSIM 20 GB',
        productTitle: 'Visitor eSIM 20 GB',
        currency: 'CAD',
        recurringChargeAmountMinor: 3500,
        billingPeriod: '30_days',
        documentChecklist: ['passport'],
      },
    });
  });

  it('reads the custom properties marked for the website', () => {
    const offer = offerFromPlan(
      plan({
        properties: {
          custom_product_key: 'visitor-20',
          custom_regions: 'on, bc',
          custom_product_title: 'Visitor eSIM',
          custom_best_for: 'Short trips',
          custom_features: '20 GB data\n\n  Canada-wide  \nHotspot',
          custom_promotion: 'First month free',
        },
      }),
    );
    expect(offer.commercial).toMatchObject({
      productKey: 'visitor-20',
      regions: ['ON', 'BC'],
      productTitle: 'Visitor eSIM',
      offerName: 'Visitor eSIM 20 GB',
      presentation: {
        bestFor: 'Short trips',
        features: ['20 GB data', 'Canada-wide', 'Hotspot'],
      },
      promotion: { headline: 'First month free' },
    });
  });

  it('ignores blank and non-text custom values', () => {
    const { commercial } = offerFromPlan(
      plan({
        properties: {
          custom_product_key: '   ',
          custom_product_title: 42,
          custom_best_for: true,
          custom_features: '',
          custom_promotion: ' ',
        },
      }),
    );
    expect(commercial.productKey).toBe(PLAN_ID);
    expect(commercial.productTitle).toBe('Visitor eSIM 20 GB');
    expect(commercial).not.toHaveProperty('presentation');
    expect(commercial).not.toHaveProperty('promotion');
  });

  it('keeps a presentation with only a best-for line or only features', () => {
    expect(
      offerFromPlan(plan({ properties: { custom_best_for: 'Students' } })).commercial.presentation,
    ).toEqual({ bestFor: 'Students', features: [] });
    expect(
      offerFromPlan(plan({ properties: { custom_features: 'One' } })).commercial.presentation,
    ).toEqual({ features: ['One'] });
  });

  it.each([
    ['sim_order', 'sim'],
    ['internet', 'internet'],
    ['mobility', 'mobile'],
  ] as const)('maps the %s lead type to the %s category', (leadType, category) => {
    expect(offerFromPlan(plan({ leadType })).commercial.productType).toBe(category);
  });

  it('omits a billing period the storefront does not word', () => {
    expect(offerFromPlan(plan({ billingPeriod: 'one_time' })).commercial).not.toHaveProperty(
      'billingPeriod',
    );
    expect(offerFromPlan(plan({ billingPeriod: 'year' })).commercial).not.toHaveProperty(
      'billingPeriod',
    );
    expect(offerFromPlan(plan({ billingPeriod: 'month' })).commercial.billingPeriod).toBe('month');
    expect(offerFromPlan(plan({ billingPeriod: '90_days' })).commercial.billingPeriod).toBe(
      '90_days',
    );
  });
});

describe('regions', () => {
  const regionsOf = (value: string | undefined) =>
    offerFromPlan(plan({ properties: value === undefined ? {} : { custom_regions: value } }))
      .commercial.regions;

  it('parses a comma list, in any case', () => {
    expect(regionsOf('ON,bc, ab')).toEqual(['ON', 'BC', 'AB']);
  });

  it('ignores invalid codes', () => {
    expect(regionsOf('ON, ZZ, nope, ')).toEqual(['ON']);
  });

  it('defaults to national when absent, empty or entirely invalid', () => {
    expect(regionsOf(undefined)).toEqual(['CA']);
    expect(regionsOf('')).toEqual(['CA']);
    expect(regionsOf('ZZ, QQ')).toEqual(['CA']);
  });

  it('accepts the national marker', () => {
    expect(regionsOf('ca')).toEqual(['CA']);
  });
});

describe('document checklist', () => {
  it('is the plan documents for a SIM order, which is a draft that can take uploads', () => {
    const { commercial } = offerFromPlan(plan({ requiredDocuments: ['passport', 'visa'] }));
    expect(commercial.documentChecklist).toEqual(['passport', 'visa']);
  });

  it.each(['internet', 'mobility'] as const)(
    'is empty for %s, whose documents staff collect',
    (leadType) => {
      expect(
        offerFromPlan(plan({ leadType, requiredDocuments: ['government_id'] })).commercial
          .documentChecklist,
      ).toEqual([]);
    },
  );
});

describe('category helpers', () => {
  it('maps each category to its CRM lead type', () => {
    expect(leadTypeByCategory).toEqual({
      sim: 'sim_order',
      mobile: 'mobility',
      internet: 'internet',
    });
  });

  it('treats only a SIM order as a draft', () => {
    expect(isDraftCategory('sim')).toBe(true);
    expect(isDraftCategory('internet')).toBe(false);
    expect(isDraftCategory('mobile')).toBe(false);
  });
});

describe('offersFromPlans', () => {
  it('maps every plan in order', () => {
    const offers = offersFromPlans([plan(), plan({ id: OTHER_ID, leadType: 'internet' })]);
    expect(offers.map((offer) => offer.productId)).toEqual([PLAN_ID, OTHER_ID]);
    expect(offers.map((offer) => offer.commercial.productType)).toEqual(['sim', 'internet']);
    expect(offersFromPlans([])).toEqual([]);
  });
});

describe('offerSoldIn', () => {
  const sold = (regions: string) =>
    offerFromPlan(plan({ leadType: 'internet', properties: { custom_regions: regions } }));

  it('sells a national offer in every province', () => {
    expect(offerSoldIn(offerFromPlan(plan()), 'NS')).toBe(true);
  });

  it('sells a provincial offer only in its provinces', () => {
    expect(offerSoldIn(sold('ON,BC'), 'BC')).toBe(true);
    expect(offerSoldIn(sold('ON,BC'), 'SK')).toBe(false);
  });

  it('does not filter when no province is chosen', () => {
    expect(offerSoldIn(sold('ON'), undefined)).toBe(true);
  });
});
