import {
  commercialOfferSchema,
  type CommercialOffer,
  type OfferPromotion,
  type ProvinceCode,
} from '@canadian-plans/contracts';

/**
 * The site-1 plan catalogue, written in code until Sanity returns (ADR 0005).
 * Plans, prices and promotions are copied from docs/LAUNCH_PLANS.md, which the
 * owner confirmed on 20 October 2026. Prices are CAD; `priceDollars` becomes
 * integer minor units in {@link offer}.
 *
 * Facts the owner has not supplied are marked with a `TEST-` prefix (see
 * {@link OPEN_INPUT_PREFIX}); the provider refuses to publish them in
 * production until they are replaced, per PLATFORM_CONTEXT.md §8.
 */

/** Marks a value that is a placeholder for an unanswered owner decision. */
export const OPEN_INPUT_PREFIX = 'TEST-';

/*
 * Wording follows the owner's other businesses (20 October 2026). Canada Wide
 * sells internet and mobile as an authorised sales agent: the service comes
 * from the provider and the service agreement is with them. The pre-arrival
 * eSIM site sells Rogers, Fido and chatr plans as an authorised reseller.
 */
const AGENT_BILLING_PARTY =
  'Your service provider. Canadian Plans is its authorised sales agent, and your service agreement is with the provider.';
const ARRIVAL_BILLING_PARTY =
  'The carrier named on your plan. Canadian Plans is an authorised reseller, and nothing is charged on the website.';
const INTERNET_PROVIDER = 'The provider is confirmed by your advisor before installation';
const MOBILE_PROVIDER = 'The provider is confirmed when your order is approved';
const TERMS_VERSION_OPEN = 'TEST-terms-2026-10-v1';

const block = (text: string) => ({
  _type: 'block',
  style: 'normal',
  children: [{ _type: 'span', text }],
});

interface OfferInput {
  productKey: string;
  productTitle: string;
  productType: CommercialOffer['productType'];
  regions: CommercialOffer['regions'];
  offerName: string;
  billingPeriod?: CommercialOffer['billingPeriod'];
  priceDollars: number;
  documentChecklist: string[];
  eligibility: string;
  availability: string;
  billingParty: string;
  terms: readonly string[];
  carrier: string;
  dataAllowance: string;
  speed?: string;
  notes?: string;
  presentation: NonNullable<CommercialOffer['presentation']>;
  promotion?: OfferPromotion;
}

function offer(input: OfferInput): CommercialOffer {
  const promotionTerms = input.promotion
    ? [`${input.promotion.headline}.`, ...input.promotion.terms]
    : [];
  return commercialOfferSchema.parse({
    productKey: input.productKey,
    productTitle: input.productTitle,
    productType: input.productType,
    regions: input.regions,
    offerName: input.offerName,
    currency: 'CAD',
    ...(input.billingPeriod ? { billingPeriod: input.billingPeriod } : {}),
    recurringChargeAmountMinor: input.priceDollars * 100,
    oneTimeFees: [],
    // No payment is taken on the website, on any plan (owner decision, 20 Oct 2026).
    amountPayableTodayMinor: 0,
    paymentRequired: false,
    documentChecklist: input.documentChecklist,
    eligibility: input.eligibility,
    availability: input.availability,
    billingParty: input.billingParty,
    contractTerms: [...input.terms, ...promotionTerms].map(block),
    termsVersion: TERMS_VERSION_OPEN,
    presentation: input.presentation,
    ...(input.promotion ? { promotion: input.promotion } : {}),
    specs: {
      carrier: input.carrier,
      dataAllowance: input.dataAllowance,
      ...(input.speed ? { speed: input.speed } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    },
  });
}

/* ------------------------------------------------------------------------ */
/* Internet and TV: price and promotion vary by province                    */
/* ------------------------------------------------------------------------ */

/** The four provinces internet and TV are sold in at launch. */
export const INTERNET_PROVINCES = ['SK', 'MB', 'BC', 'AB'] as const;
export type InternetProvince = (typeof INTERNET_PROVINCES)[number];

const provinceLabel: Record<InternetProvince, string> = {
  SK: 'Saskatchewan',
  MB: 'Manitoba',
  BC: 'British Columbia',
  AB: 'Alberta',
};

const twoMonthsFree: OfferPromotion = {
  id: 'two-months-free',
  headline: '2 months free',
  terms: [
    'Your first two months of internet are free once service is activated.',
    'Billing begins in month three at your agreed rate.',
    'No upfront payment is required.',
  ],
};

const noUpfrontPriceLock: OfferPromotion = {
  id: 'no-upfront-price-lock',
  headline: 'No upfront payment and a 2-year price lock',
  terms: [
    'No deposit, no activation fee and no payment on installation day.',
    'Your first bill is issued 15 days after installation.',
    'Your monthly price is locked for 2 years.',
    'Trial: if the service is not right for you, contact us within 15 days of installation.',
  ],
};

/** Saskatchewan runs the free-months promotion; Manitoba, BC and Alberta the trial offer. */
const promotionFor = (province: InternetProvince): OfferPromotion =>
  province === 'SK' ? twoMonthsFree : noUpfrontPriceLock;

const promoFeature = (province: InternetProvince): string =>
  province === 'SK' ? 'Up to 2 months FREE' : '2-year price lock';

const internetTerms = (province: InternetProvince): readonly string[] => [
  'Prices are in Canadian dollars and exclude applicable taxes and government fees.',
  'The advertised price includes the autopay discount.',
  'Availability depends on your exact address; an advisor confirms it before installation.',
  'A WiFi router and modem are included, with no monthly equipment rental fee.',
  'Free professional installation covers standard installation only.',
  `Sold in ${provinceLabel[province]}.`,
];

interface InternetPlanInput {
  province: InternetProvince;
  /** Part of the product key and name: `1000`, `500`, `tv-1000`, `streamsaver-1000`. */
  slug: string;
  tier: 'entry' | 'upper' | 'tv' | 'streamsaver';
  /** The speed alone, e.g. `1 Gbps`; the TV part is added to the stored speed where it applies. */
  speed: string;
  /** The entry plan's speed, referenced by "Everything in …, plus:". */
  entrySpeed?: string;
  priceDollars: number;
}

function internetOffer(input: InternetPlanInput): CommercialOffer {
  const { province, slug, tier, speed } = input;
  const unlimited = `Unlimited data with up to ${speed} speed`;
  const tvFeatures = [
    unlimited,
    'TV with 120+ channels included',
    'Movies, sports, kids, news, history & more',
    '1 PVR box — record and pause live TV',
    '1 WiFi router & modem included',
    'Free professional installation',
    'No upfront payment required',
    'Autopay discount included',
  ];

  const byTier = {
    entry: {
      productKey: `internet-${province.toLowerCase()}-${slug}`,
      productTitle: 'High Speed Unlimited',
      offerName: `High Speed Unlimited ${speed}`,
      bestFor:
        province === 'SK' ? 'Best for gaming & streaming' : 'Best for streaming & everyday use',
      features: [
        promoFeature(province),
        'FREE WiFi router & modem',
        'No upfront payment',
        'Autopay discount included',
        unlimited,
      ],
      popular: false,
      tag: undefined,
      note: undefined,
    },
    upper: {
      productKey: `internet-${province.toLowerCase()}-${slug}`,
      productTitle: 'High Speed Unlimited',
      offerName: `High Speed Unlimited ${speed}`,
      bestFor: 'Best for whole-home & work-from-home',
      features: [
        promoFeature(province),
        `Everything in ${input.entrySpeed ?? 'the entry plan'}, plus:`,
        unlimited,
        'Maximum speed for the entire household',
        'No upfront payment',
        'Ideal for remote work & video calls',
        'FREE WiFi router & modem',
      ],
      popular: true,
      tag: 'Popular',
      note: undefined,
    },
    tv: {
      productKey: `internet-tv-${province.toLowerCase()}-${slug}`,
      productTitle: 'Internet + TV Bundle',
      offerName: `Internet + TV Bundle ${speed}`,
      bestFor: 'Best for families who want internet and TV',
      features: tvFeatures,
      popular: false,
      tag: 'BEST VALUE',
      note:
        province === 'SK'
          ? 'One bill for everything — and your 2 free months cover both internet and TV.'
          : undefined,
    },
    streamsaver: {
      productKey: `internet-streamsaver-${province.toLowerCase()}-${slug}`,
      productTitle: 'Internet + StreamSaver TV',
      offerName: `Internet + StreamSaver TV ${speed}`,
      bestFor: 'Best for gaming, streaming & TV',
      features: [
        unlimited,
        'APP TV with StreamSaver',
        'Watch 70+ channels anywhere on the app',
        'Includes Netflix, Disney+ and Apple TV',
        'FREE WiFi router & modem',
        'Free professional installation',
        'No upfront payment required',
      ],
      popular: false,
      tag: undefined,
      note: 'One bill for everything — internet and StreamSaver TV on a locked 2-year price.',
    },
  }[tier];

  const speedLabel =
    tier === 'tv' ? `${speed} + TV` : tier === 'streamsaver' ? `${speed} + StreamSaver TV` : speed;

  return offer({
    productKey: byTier.productKey,
    productTitle: byTier.productTitle,
    productType: 'internet',
    regions: [province],
    offerName: byTier.offerName,
    priceDollars: input.priceDollars,
    documentChecklist: [],
    eligibility:
      'Subject to service being available at your address. An advisor confirms availability before installation.',
    availability: `${provinceLabel[province]}. Availability depends on your exact address.`,
    billingParty: AGENT_BILLING_PARTY,
    terms: internetTerms(province),
    carrier: INTERNET_PROVIDER,
    dataAllowance: 'Unlimited data',
    speed: speedLabel,
    presentation: {
      bestFor: byTier.bestFor,
      ...(byTier.tag ? { tag: byTier.tag } : {}),
      popular: byTier.popular,
      features: byTier.features,
      ...(byTier.note ? { note: byTier.note } : {}),
    },
    promotion: promotionFor(province),
  });
}

/** BC and Alberta sell the same four plans at the same prices under their own keys. */
const westernPlans = (province: 'BC' | 'AB'): CommercialOffer[] => [
  internetOffer({ province, slug: '500', tier: 'entry', speed: '500 Mbps', priceDollars: 70 }),
  internetOffer({
    province,
    slug: '1000',
    tier: 'upper',
    speed: '1 Gbps',
    entrySpeed: '500 Mbps',
    priceDollars: 80,
  }),
  internetOffer({
    province,
    slug: '1000',
    tier: 'streamsaver',
    speed: '1 Gbps',
    priceDollars: 115,
  }),
  internetOffer({
    province,
    slug: '1000',
    tier: 'tv',
    speed: '1 Gbps',
    priceDollars: 140,
  }),
];

const internetOffers: CommercialOffer[] = [
  // Saskatchewan
  internetOffer({ province: 'SK', slug: '1000', tier: 'entry', speed: '1 Gbps', priceDollars: 50 }),
  internetOffer({
    province: 'SK',
    slug: '2000',
    tier: 'upper',
    speed: '2 Gbps',
    entrySpeed: '1 Gbps',
    priceDollars: 60,
  }),
  internetOffer({
    province: 'SK',
    slug: '1000',
    tier: 'tv',
    speed: '1 Gbps',
    priceDollars: 90,
  }),
  // Manitoba
  internetOffer({
    province: 'MB',
    slug: '500',
    tier: 'entry',
    speed: '500 Mbps',
    priceDollars: 90,
  }),
  internetOffer({
    province: 'MB',
    slug: '2000',
    tier: 'upper',
    speed: '2 Gbps',
    entrySpeed: '500 Mbps',
    priceDollars: 100,
  }),
  internetOffer({
    province: 'MB',
    slug: '2000',
    tier: 'tv',
    speed: '2 Gbps',
    priceDollars: 150,
  }),
  // British Columbia and Alberta
  ...westernPlans('BC'),
  ...westernPlans('AB'),
];

/* ------------------------------------------------------------------------ */
/* Mobile, bring your own device: national                                  */
/* ------------------------------------------------------------------------ */

const mobileTerms = [
  'Prices are in Canadian dollars and exclude applicable taxes and government fees.',
  'Postpaid plan with no connection fee.',
  'Bring your own unlocked, compatible phone. Choose an eSIM or a SIM card.',
  'An identity and credit check is required. An advisor confirms your exact price.',
];

interface MobilePlanInput {
  slug: string;
  title: string;
  dataAllowance: string;
  dataLabel: string;
  priceDollars: number;
  bestFor: string;
  features: string[];
  featured?: boolean;
  tag?: string;
  note?: string;
}

function mobileOffer(input: MobilePlanInput): CommercialOffer {
  return offer({
    productKey: `mobile-${input.slug}`,
    productTitle: input.title,
    productType: 'mobile',
    regions: ['CA'],
    offerName: `${input.title} ${input.dataLabel}`,
    priceDollars: input.priceDollars,
    documentChecklist: ['government_id'],
    eligibility: 'An identity and credit check is required.',
    availability: 'All provinces.',
    terms: mobileTerms,
    billingParty: AGENT_BILLING_PARTY,
    carrier: MOBILE_PROVIDER,
    dataAllowance: input.dataAllowance,
    ...(input.note ? { notes: input.note } : {}),
    presentation: {
      bestFor: input.bestFor,
      ...(input.tag ? { tag: input.tag } : {}),
      popular: input.featured ?? false,
      features: input.features,
      ...(input.note ? { note: input.note } : {}),
    },
  });
}

const mobileOffers: CommercialOffer[] = [
  mobileOffer({
    slug: 'can-us-100',
    title: 'Canada + US',
    dataAllowance: '100 GB',
    dataLabel: '100 GB',
    priceDollars: 40,
    bestFor: 'Talk, text and 5G data in Canada and the US.',
    tag: 'Limited time offer',
    featured: true,
    features: [
      '100 GB of high-speed 5G data',
      'Unlimited talk & text',
      'Use it in Canada & the US',
      'Roaming data up to 5 GB/day',
    ],
  }),
  mobileOffer({
    slug: 'can-us-mex-150',
    title: 'Canada + US + Mexico',
    dataAllowance: '150 GB',
    dataLabel: '150 GB',
    priceDollars: 65,
    bestFor: 'More data, plus Mexico for travel and family calls.',
    features: [
      '150 GB of high-speed 5G data',
      'Unlimited talk & text',
      'Use it in Canada, the US & Mexico',
      'Roaming data up to 5 GB/day',
    ],
  }),
  mobileOffer({
    slug: '5g-plus-complete-unlimited',
    title: '5G+ Complete Unlimited',
    dataAllowance: 'Unlimited',
    dataLabel: 'Unlimited',
    priceDollars: 90,
    bestFor: 'Unlimited data at our fastest speeds, nationwide.',
    features: [
      'Unlimited data, speeds up to 2 Gbps*',
      '50 GB mobile hotspot',
      'Unlimited talk & text',
      'Use it in Canada, the US & Mexico',
      'Nationwide 5G+ network',
    ],
    note: 'Data sharing is not included on this plan.',
  }),
];

/* ------------------------------------------------------------------------ */
/* Pre-arrival eSIM: national, a separate category from mobile              */
/* ------------------------------------------------------------------------ */

const arrivalTerms = [
  'Prices are in Canadian dollars and exclude applicable taxes.',
  'Bring your own unlocked, eSIM-capable phone.',
  'Nothing is due today.',
];

interface ArrivalPlanInput {
  slug: string;
  title: string;
  carrier: string;
  payType: 'Postpaid' | 'Prepaid';
  billingPeriod: NonNullable<CommercialOffer['billingPeriod']>;
  dataAllowance: string;
  priceDollars: number;
  bestFor: string;
  features: string[];
  audiences: string[];
  popular?: boolean;
  tag?: string;
}

function arrivalOffer(input: ArrivalPlanInput): CommercialOffer {
  return offer({
    productKey: `prearrival-${input.slug}`,
    productTitle: input.title,
    productType: 'sim',
    regions: ['CA'],
    offerName: `${input.title} ${input.dataAllowance}`,
    billingPeriod: input.billingPeriod,
    priceDollars: input.priceDollars,
    // Regular online orders upload no documents; an advisor asks if anything is needed (canadaesim terms, section 4).
    documentChecklist: [],
    eligibility:
      input.payType === 'Postpaid'
        ? 'For people arriving in Canada on a study permit, a work permit or as a permanent resident, staying more than 90 days.'
        : 'For visitors arriving on a visitor visa or a Super Visa, staying under 90 days.',
    availability: 'Ordered before you arrive in Canada. Available across Canada.',
    billingParty: ARRIVAL_BILLING_PARTY,
    terms: arrivalTerms,
    carrier: input.carrier,
    dataAllowance: input.dataAllowance,
    notes: input.payType,
    presentation: {
      bestFor: input.bestFor,
      ...(input.tag ? { tag: input.tag } : {}),
      popular: input.popular ?? false,
      audiences: input.audiences,
      features: input.features,
    },
  });
}

const longStay = ['student', 'worker', 'resident'];
const internationalMinutes = '1,000 min to India, China, Bangladesh, Mexico & UK';

const arrivalOffers: CommercialOffer[] = [
  arrivalOffer({
    slug: 'fido-essential-75',
    title: 'Fido Essential',
    carrier: 'Fido · 5G',
    payType: 'Postpaid',
    billingPeriod: 'month',
    dataAllowance: '75 GB',
    priceDollars: 35,
    bestFor: 'Everyday use at the lowest monthly price.',
    audiences: longStay,
    features: [
      '75 GB of 5G data',
      'Unlimited Canada-wide calling',
      'Unlimited local & international texts',
      internationalMinutes,
      'No contract · hotspot not included',
    ],
  }),
  arrivalOffer({
    slug: 'rogers-plus-100',
    title: 'Rogers Plus',
    carrier: 'Rogers · 5G',
    payType: 'Postpaid',
    billingPeriod: 'month',
    dataAllowance: '100 GB',
    priceDollars: 40,
    bestFor: 'Heavy data users who want room to spare.',
    audiences: longStay,
    popular: true,
    tag: 'Most popular',
    features: [
      '100 GB at up to 1 Gbps, then unlimited at reduced speed',
      'Unlimited Canada-wide calling',
      'Unlimited local & international texts',
      internationalMinutes,
      'No contract · hotspot included',
    ],
  }),
  arrivalOffer({
    slug: 'rogers-unlimited-120',
    title: 'Rogers Unlimited',
    carrier: 'Rogers · 5G',
    payType: 'Postpaid',
    billingPeriod: 'month',
    dataAllowance: '120 GB',
    priceDollars: 50,
    bestFor: 'Trips to the USA and heavy data use.',
    audiences: longStay,
    features: [
      '120 GB at up to 1 Gbps, then unlimited at reduced speed',
      'USA & Canada roaming included',
      'Unlimited USA & Canada-wide calling',
      'Unlimited local & international texts',
      internationalMinutes,
      'No contract · hotspot included',
    ],
  }),
  arrivalOffer({
    slug: 'chatr-50',
    title: 'Chatr 50 GB',
    carrier: 'Chatr · 4G LTE',
    payType: 'Prepaid',
    billingPeriod: '30_days',
    dataAllowance: '50 GB',
    priceDollars: 35,
    bestFor: 'Short visits of up to a month.',
    audiences: ['visitor'],
    features: [
      '50 GB of 4G LTE data, then slower speed',
      '5 GB bonus with Autopay',
      'Unlimited Canada & US calling',
      'Unlimited Canada, US & international texts',
      'eSIM activated 24 hours before you land',
    ],
  }),
  arrivalOffer({
    slug: 'chatr-90',
    title: 'Chatr 90 GB',
    carrier: 'Chatr · 4G LTE',
    payType: 'Prepaid',
    billingPeriod: '30_days',
    dataAllowance: '90 GB',
    priceDollars: 40,
    bestFor: 'Visitors who stream, video call and use maps a lot.',
    audiences: ['visitor'],
    popular: true,
    tag: 'Popular with visitors',
    features: [
      '90 GB of 4G LTE data, then slower speed',
      '10 GB bonus with Autopay',
      'Unlimited Canada & US calling',
      'Unlimited Canada, US & international texts',
      'eSIM activated 24 hours before you land',
    ],
  }),
  arrivalOffer({
    slug: 'chatr-75-90-day',
    title: 'Chatr 90-day',
    carrier: 'Chatr · 4G LTE',
    payType: 'Prepaid',
    billingPeriod: '90_days',
    dataAllowance: '75 GB',
    priceDollars: 75,
    bestFor: 'Super Visa and longer stays of up to 3 months.',
    audiences: ['visitor'],
    features: [
      '75 GB of 4G LTE data over 90 days, then slower speed',
      'Unlimited Canada-wide calling',
      'Unlimited Canada, US & international texts',
      'eSIM activated 24 hours before you land',
    ],
  }),
];

/** Every site-1 offer: internet and TV by province, national BYOD mobile, pre-arrival eSIM. */
export const site1CommercialOffers: readonly CommercialOffer[] = [
  ...internetOffers,
  ...mobileOffers,
  ...arrivalOffers,
];

export type { ProvinceCode };
