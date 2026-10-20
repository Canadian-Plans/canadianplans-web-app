import { describe, expect, it } from 'vitest';

import { commercialOfferSchema } from './catalogue';
import { createQuoteRequestSchema } from './quotes';
import {
  isOfferSoldIn,
  provinceFromName,
  provinceFromPostalCode,
  provinceFromSlug,
  provinceNames,
  provinceSlug,
  regionCodeSchema,
} from './regions';

const baseOffer = {
  productKey: 'internet-sk-1000',
  productTitle: 'High Speed Unlimited',
  productType: 'internet',
  offerName: '1 Gbps Unlimited',
  currency: 'CAD',
  recurringChargeAmountMinor: 5000,
  oneTimeFees: [],
  amountPayableTodayMinor: 0,
  paymentRequired: false,
  documentChecklist: [],
  eligibility: 'Subject to availability at your address.',
  availability: 'Saskatchewan.',
  billingParty: 'Provider',
  contractTerms: [{ _type: 'block' }],
  termsVersion: 'TEST-terms',
  specs: { carrier: 'Provider', dataAllowance: 'Unlimited' },
};

describe('provinceFromName', () => {
  it('resolves names and codes regardless of case, spacing and accents', () => {
    expect(provinceFromName('British Columbia')).toBe('BC');
    expect(provinceFromName('  saskatchewan ')).toBe('SK');
    expect(provinceFromName('MB')).toBe('MB');
    expect(provinceFromName('Québec')).toBe('QC');
    expect(provinceFromName('newfoundland   and labrador')).toBe('NL');
  });

  it('returns undefined for anything that is not a province', () => {
    expect(provinceFromName('')).toBeUndefined();
    expect(provinceFromName('   ')).toBeUndefined();
    expect(provinceFromName('Atlantis')).toBeUndefined();
    expect(provinceFromName('CA')).toBeUndefined();
  });
});

describe('province slugs', () => {
  it('round-trips every province', () => {
    for (const code of Object.keys(provinceNames)) {
      const province = provinceFromName(code);
      expect(province).toBe(code);
      if (!province) continue;
      expect(provinceFromSlug(provinceSlug(province))).toBe(province);
    }
    expect(provinceSlug('BC')).toBe('british-columbia');
  });

  it('rejects an unknown slug', () => {
    expect(provinceFromSlug('not-a-province')).toBeUndefined();
  });
});

describe('provinceFromPostalCode', () => {
  it.each([
    ['T2P 1J9', 'AB'],
    ['v6b 1a1', 'BC'],
    ['R3C 0V8', 'MB'],
    ['S7K 0A1', 'SK'],
    ['M5V-2T6', 'ON'],
    ['H2Y1C6', 'QC'],
    ['A1C 5S7', 'NL'],
    ['Y1A 0A1', 'YT'],
  ])('maps %s to %s', (postal, province) => {
    expect(provinceFromPostalCode(postal)).toBe(province);
  });

  it('cannot tell the territories sharing X apart, and rejects malformed codes', () => {
    expect(provinceFromPostalCode('X0A 0H0')).toBeUndefined();
    expect(provinceFromPostalCode('')).toBeUndefined();
    expect(provinceFromPostalCode('12345')).toBeUndefined();
    expect(provinceFromPostalCode('D1A 1A1')).toBeUndefined();
  });
});

describe('isOfferSoldIn', () => {
  it('matches the listed provinces only', () => {
    expect(isOfferSoldIn(['SK'], 'SK')).toBe(true);
    expect(isOfferSoldIn(['SK'], 'MB')).toBe(false);
    expect(isOfferSoldIn(['BC', 'AB'], 'AB')).toBe(true);
  });

  it('sells a national offer everywhere', () => {
    expect(isOfferSoldIn(['CA'], 'ON')).toBe(true);
    expect(isOfferSoldIn(['CA'], 'NU')).toBe(true);
  });
});

describe('commercial offer regions', () => {
  it('treats an offer stored before regions existed as national', () => {
    const parsed = commercialOfferSchema.parse(baseOffer);
    expect(parsed.regions).toEqual(['CA']);
  });

  it('accepts a province list and the new product types', () => {
    const parsed = commercialOfferSchema.parse({ ...baseOffer, regions: ['SK'] });
    expect(parsed.regions).toEqual(['SK']);
    for (const productType of ['sim', 'mobile', 'internet']) {
      expect(commercialOfferSchema.safeParse({ ...baseOffer, productType }).success).toBe(true);
    }
  });

  it('rejects an unknown product type, an unknown region and an empty list', () => {
    expect(commercialOfferSchema.safeParse({ ...baseOffer, productType: 'tv' }).success).toBe(
      false,
    );
    expect(commercialOfferSchema.safeParse({ ...baseOffer, regions: ['XX'] }).success).toBe(false);
    expect(commercialOfferSchema.safeParse({ ...baseOffer, regions: [] }).success).toBe(false);
  });

  it('rejects CA mixed with provinces', () => {
    expect(commercialOfferSchema.safeParse({ ...baseOffer, regions: ['CA', 'SK'] }).success).toBe(
      false,
    );
  });

  it('accepts presentation copy and a promotion, and bounds them', () => {
    const promotion = {
      id: 'two-months-free',
      headline: '2 months free',
      terms: ['Billing starts in month three'],
    };
    const presentation = { features: ['Unlimited data'], popular: true };
    expect(
      commercialOfferSchema.safeParse({ ...baseOffer, regions: ['SK'], promotion, presentation })
        .success,
    ).toBe(true);
    expect(
      commercialOfferSchema.safeParse({
        ...baseOffer,
        promotion: { ...promotion, terms: [] },
      }).success,
    ).toBe(false);
    expect(
      commercialOfferSchema.safeParse({ ...baseOffer, promotion: { ...promotion, id: 'Bad Id' } })
        .success,
    ).toBe(false);
  });
});

describe('quote request province', () => {
  const ids = {
    leadId: '11111111-1111-4111-8111-111111111111',
    productId: '22222222-2222-4222-8222-222222222222',
  };

  it('accepts an optional province and rejects the national marker or junk', () => {
    expect(createQuoteRequestSchema.safeParse(ids).success).toBe(true);
    expect(createQuoteRequestSchema.safeParse({ ...ids, province: 'SK' }).success).toBe(true);
    expect(createQuoteRequestSchema.safeParse({ ...ids, province: 'CA' }).success).toBe(false);
    expect(createQuoteRequestSchema.safeParse({ ...ids, province: 'Saskatchewan' }).success).toBe(
      false,
    );
  });
});

describe('regionCodeSchema', () => {
  it('includes every province and the national marker', () => {
    expect(regionCodeSchema.options).toContain('CA');
    expect(regionCodeSchema.options).toContain('SK');
    expect(regionCodeSchema.options).toHaveLength(14);
  });
});
