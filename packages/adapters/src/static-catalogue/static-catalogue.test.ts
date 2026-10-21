import { describe, expect, it } from 'vitest';

import { commercialOfferSchema } from '@canadian-plans/contracts';

import { OPEN_INPUT_PREFIX, site1CommercialOffers } from './site-1-plans.js';
import { StaticCatalogue, findOpenInputs } from './static-catalogue.js';

const byKey = (key: string) => {
  const found = site1CommercialOffers.find((offer) => offer.productKey === key);
  if (!found) throw new Error(`missing offer ${key}`);
  return found;
};

/** docs/LAUNCH_PLANS.md section A, confirmed by the owner on 20 October 2026. */
const internetPrices: [string, string, number][] = [
  ['internet-sk-1000', 'SK', 50],
  ['internet-sk-2000', 'SK', 60],
  ['internet-tv-sk-1000', 'SK', 90],
  ['internet-mb-500', 'MB', 90],
  ['internet-mb-2000', 'MB', 100],
  ['internet-tv-mb-2000', 'MB', 150],
  ['internet-bc-500', 'BC', 70],
  ['internet-bc-1000', 'BC', 80],
  ['internet-streamsaver-bc-1000', 'BC', 115],
  ['internet-tv-bc-1000', 'BC', 140],
  ['internet-ab-500', 'AB', 70],
  ['internet-ab-1000', 'AB', 80],
  ['internet-streamsaver-ab-1000', 'AB', 115],
  ['internet-tv-ab-1000', 'AB', 140],
];

/** docs/LAUNCH_PLANS.md section C. */
const mobilePrices: [string, number][] = [
  ['mobile-can-us-100', 40],
  ['mobile-can-us-mex-150', 65],
  ['mobile-5g-plus-complete-unlimited', 90],
];

/** docs/LAUNCH_PLANS.md section D. */
const arrivalPrices: [string, number, string][] = [
  ['prearrival-fido-essential-75', 35, 'month'],
  ['prearrival-rogers-plus-100', 40, 'month'],
  ['prearrival-rogers-unlimited-120', 50, 'month'],
  ['prearrival-chatr-50', 35, '30_days'],
  ['prearrival-chatr-90', 40, '30_days'],
  ['prearrival-chatr-75-90-day', 75, '90_days'],
];

describe('site-1 catalogue contents', () => {
  it('has exactly the confirmed plans, no more and no fewer', () => {
    expect(site1CommercialOffers).toHaveLength(
      internetPrices.length + mobilePrices.length + arrivalPrices.length,
    );
  });

  it('uses unique, valid product keys and parses against the contract', () => {
    const keys = site1CommercialOffers.map((offer) => offer.productKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const offer of site1CommercialOffers) {
      expect(commercialOfferSchema.safeParse(offer).success).toBe(true);
    }
  });

  it.each(internetPrices)('%s is sold only in %s at $%i', (key, province, dollars) => {
    const offer = byKey(key);
    expect(offer.productType).toBe('internet');
    expect(offer.regions).toEqual([province]);
    expect(offer.recurringChargeAmountMinor).toBe(dollars * 100);
    expect(offer.currency).toBe('CAD');
  });

  it.each(mobilePrices)('%s is a national mobile plan at $%i', (key, dollars) => {
    const offer = byKey(key);
    expect(offer.productType).toBe('mobile');
    expect(offer.regions).toEqual(['CA']);
    expect(offer.recurringChargeAmountMinor).toBe(dollars * 100);
    expect(offer.documentChecklist).toEqual(['government_id']);
  });

  it.each(arrivalPrices)('%s is a national pre-arrival plan at $%i', (key, dollars, period) => {
    const offer = byKey(key);
    expect(offer.productType).toBe('sim');
    expect(offer.regions).toEqual(['CA']);
    expect(offer.recurringChargeAmountMinor).toBe(dollars * 100);
    expect(offer.billingPeriod).toBe(period);
  });

  it('names bundles without repeating TV, and stores the full speed', () => {
    expect(byKey('internet-tv-sk-1000').offerName).toBe('Internet + TV Bundle 1 Gbps');
    expect(byKey('internet-tv-sk-1000').specs.speed).toBe('1 Gbps + TV');
    expect(byKey('internet-streamsaver-bc-1000').offerName).toBe(
      'Internet + StreamSaver TV 1 Gbps',
    );
    expect(byKey('internet-streamsaver-bc-1000').specs.speed).toBe('1 Gbps + StreamSaver TV');
    expect(byKey('internet-sk-1000').specs.speed).toBe('1 Gbps');
  });

  it('takes no payment on the website for any plan', () => {
    for (const offer of site1CommercialOffers) {
      expect(offer.paymentRequired).toBe(false);
      expect(offer.amountPayableTodayMinor).toBe(0);
      expect(offer.oneTimeFees).toEqual([]);
    }
  });

  it('runs the free-months promotion in Saskatchewan and the price-lock offer elsewhere', () => {
    for (const [key, province] of internetPrices) {
      const promotion = byKey(key).promotion;
      expect(promotion?.id).toBe(province === 'SK' ? 'two-months-free' : 'no-upfront-price-lock');
    }
  });

  it('keeps promotion terms in the contract terms so the order snapshot freezes them', () => {
    const offer = byKey('internet-mb-500');
    const text = JSON.stringify(offer.contractTerms);
    for (const term of offer.promotion?.terms ?? []) expect(text).toContain(term);
  });

  it('keeps mobile and pre-arrival promotion-free', () => {
    for (const offer of site1CommercialOffers) {
      if (offer.productType !== 'internet') expect(offer.promotion).toBeUndefined();
    }
  });

  it('gives each province its own plans, with BC and Alberta at equal prices under separate keys', () => {
    const price = (key: string) => byKey(key).recurringChargeAmountMinor;
    expect(price('internet-bc-500')).toBe(price('internet-ab-500'));
    expect(price('internet-tv-bc-1000')).toBe(price('internet-tv-ab-1000'));
    expect(byKey('internet-bc-500').productKey).not.toBe(byKey('internet-ab-500').productKey);
  });
});

describe('owner decisions', () => {
  it('leaves no placeholder for the owner to fill, and uses the published terms version', () => {
    expect(findOpenInputs(site1CommercialOffers)).toEqual([]);
    expect(site1CommercialOffers.every((offer) => offer.termsVersion === 'terms-2026-10-v2')).toBe(
      true,
    );
  });

  it('still catches a placeholder if one is added later', () => {
    const withPlaceholder = site1CommercialOffers.map((offer, index) =>
      index === 0 ? { ...offer, termsVersion: `${OPEN_INPUT_PREFIX}terms-next` } : offer,
    );
    const open = findOpenInputs(withPlaceholder);
    expect(open.map((item) => item.field)).toEqual(['termsVersion']);
    expect(open[0]?.productKey).toBe(site1CommercialOffers[0]?.productKey);
  });

  it("describes who sells and bills in the owner's own words, and who each pre-arrival plan is for", () => {
    const byKey = (key: string) => {
      const found = site1CommercialOffers.find((offer) => offer.productKey === key);
      if (!found) throw new Error(`missing ${key}`);
      return found;
    };
    expect(byKey('internet-sk-1000').billingParty).toMatch(/authorised sales agent/);
    expect(byKey('mobile-can-us-100').billingParty).toMatch(/authorised sales agent/);
    expect(byKey('prearrival-fido-essential-75').billingParty).toMatch(/authorised reseller/);
    expect(byKey('prearrival-fido-essential-75').eligibility).toMatch(
      /study permit.*more than 90 days/,
    );
    const chatr = site1CommercialOffers.filter((offer) =>
      offer.productKey.startsWith('prearrival-chatr'),
    );
    expect(chatr.length).toBeGreaterThan(0);
    for (const offer of chatr) expect(offer.eligibility).toMatch(/visitor visa.*under 90 days/);
  });
});

describe('StaticCatalogue', () => {
  const open = new StaticCatalogue(site1CommercialOffers, { allowOpenInputs: true });
  const withPlaceholder = site1CommercialOffers.map((offer, index) =>
    index === 0 ? { ...offer, termsVersion: `${OPEN_INPUT_PREFIX}terms-next` } : offer,
  );

  it('refuses to publish while owner decisions are open, unless explicitly allowed', async () => {
    const guarded = new StaticCatalogue(withPlaceholder, { allowOpenInputs: false });
    await expect(guarded.listPublished()).rejects.toThrow('catalogue_open_inputs');
    await expect(guarded.fetchPublishedByProductKey('internet-sk-1000')).rejects.toThrow(
      'catalogue_open_inputs',
    );
    await expect(
      new StaticCatalogue(withPlaceholder, { allowOpenInputs: true }).listPublished(),
    ).resolves.toHaveLength(site1CommercialOffers.length);
    await expect(
      new StaticCatalogue(site1CommercialOffers, { allowOpenInputs: false }).listPublished(),
    ).resolves.toHaveLength(site1CommercialOffers.length);
  });

  it('defaults to the guarded behaviour', async () => {
    await expect(new StaticCatalogue(withPlaceholder).listPublished()).rejects.toThrow(
      'catalogue_open_inputs',
    );
  });

  it('finds an offer by product key and by document id, and returns undefined for unknowns', async () => {
    const byProduct = await open.fetchPublishedByProductKey('internet-sk-1000');
    expect(byProduct?.commercial.recurringChargeAmountMinor).toBe(5000);
    const byDocument = await open.fetchPublishedByDocumentId('static:internet-sk-1000');
    expect(byDocument?.commercial.productKey).toBe('internet-sk-1000');
    await expect(open.fetchPublishedByProductKey('nope')).resolves.toBeUndefined();
    await expect(open.fetchPublishedByDocumentId('static:nope')).resolves.toBeUndefined();
  });

  it('gives a stable revision for unchanged content and a new one when the price changes', async () => {
    const first = await open.fetchPublishedByProductKey('mobile-can-us-100');
    const again = await new StaticCatalogue(site1CommercialOffers, {
      allowOpenInputs: true,
    }).fetchPublishedByProductKey('mobile-can-us-100');
    expect(again?.revisionId).toBe(first?.revisionId);

    const repriced = site1CommercialOffers.map((offer) =>
      offer.productKey === 'mobile-can-us-100'
        ? { ...offer, recurringChargeAmountMinor: 4500 }
        : offer,
    );
    const changed = await new StaticCatalogue(repriced, {
      allowOpenInputs: true,
    }).fetchPublishedByProductKey('mobile-can-us-100');
    expect(changed?.revisionId).not.toBe(first?.revisionId);
  });

  it('rejects a catalogue with a duplicated product key', () => {
    const duplicate = [site1CommercialOffers[0]!, site1CommercialOffers[0]!];
    expect(() => new StaticCatalogue(duplicate, { allowOpenInputs: true })).toThrow(
      'ambiguous_product',
    );
  });
});
