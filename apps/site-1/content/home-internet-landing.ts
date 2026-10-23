import type { CpStepContent, FaqItemContent } from '@canadian-plans/ui/canadian-plans';
import { provinceSlug } from '@canadian-plans/contracts';
import type { RedesignAssetKey } from './home-redesign';
import { siteFooter } from './site-chrome';
import {
  internetOrderHref,
  internetPlansByProvince,
  internetProvinceNames,
  internetProvinces,
  type InternetPlan,
  type InternetProvince,
} from './home-internet';

/**
 * Home internet landing pages (23 October 2026): /home-internet (one card per province)
 * and /home-internet/<province> (that province's plans and offer). Every number comes
 * from content/home-internet.ts, which mirrors the backend catalogue
 * (packages/adapters/src/static-catalogue/site-1-plans.ts, LAUNCH_PLANS.md A–B, verified
 * against canadawideinternet.com/plan/<province> on 23 October 2026). Prices stay
 * backend-authoritative at order time: every "Get started" link opens /order, which
 * re-reads the plan from the backend.
 */

const allPlans = Object.values(internetPlansByProvince).flat();
const lowestPrice = Math.min(...allPlans.map((plan) => plan.priceCad));
const topSpeedOf = (plans: readonly InternetPlan[]) =>
  plans.reduce((best, plan) => (plan.mbps > best.mbps ? plan : best)).allowance;
const lowestOf = (plans: readonly InternetPlan[]) => Math.min(...plans.map((p) => p.priceCad));
const provinceList = internetProvinces.map((province) => internetProvinceNames[province]);
const provinceSentence = `${provinceList.slice(0, -1).join(', ')} and ${provinceList.at(-1)}`;
const capitalize = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

/** `/home-internet/british-columbia` and friends. */
export const internetProvinceHref = (province: InternetProvince) =>
  `/home-internet/${provinceSlug(province)}`;

/** Where a visitor outside the four provinces leaves their email (/order wish list). */
export const internetWishListHref = '/order?category=internet&province=ON';

export type InternetLandingFaq = FaqItemContent;

/** An image the owner drops into /public; until then the slot shows its caption. */
export interface LandingImage {
  readonly caption: string;
  readonly src?: string;
  readonly alt?: string;
}

export interface LandingShowcaseRow {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
  readonly action: { readonly label: string; readonly href: string };
  readonly image: LandingImage;
  /** Image on the left instead of the right. */
  readonly reverse?: boolean;
}

interface ProvinceOffer {
  readonly badge: string;
  readonly bullet: string;
  readonly detail: string;
  readonly heroTitle: string;
  readonly heroBullets: readonly string[];
  readonly firstBill: string;
}

const trialOffer = (name: string): ProvinceOffer => ({
  badge: '15-day trial',
  bullet: '2-year price lock',
  detail:
    'No upfront payment, first bill 15 days after install, and your price is locked for 2 years.',
  heroTitle: `No upfront payment on home internet in ${name}.`,
  heroBullets: [
    'No upfront payment',
    'First bill 15 days after install',
    '2-year price lock',
    '15-day trial period',
  ],
  firstBill:
    'Your first bill comes 15 days after installation. There is no deposit, no activation fee and nothing to pay on install day.',
});

/** The offer each province runs (LAUNCH_PLANS.md table B), in the words the cards and heroes use. */
const offers: Record<InternetProvince, ProvinceOffer> = {
  SK: {
    badge: '2 months free',
    bullet: 'Up to 2 months free',
    detail: 'First 2 months free once your service is active. Billing starts in month three.',
    heroTitle: 'Enjoy 2 months free on home internet in Saskatchewan.',
    heroBullets: [
      'Up to 2 months free',
      'No upfront payment',
      'Free WiFi router and modem',
      'Unlimited data',
    ],
    firstBill:
      'Your first two months are free once your service is active, and billing starts in month three at your agreed price.',
  },
  MB: trialOffer('Manitoba'),
  BC: trialOffer('British Columbia'),
  AB: trialOffer('Alberta'),
};

const isTvPlan = (plan: InternetPlan) =>
  plan.id.includes('-tv-') || plan.id.includes('streamsaver');

const tvBullet = (province: InternetProvince) =>
  internetPlansByProvince[province].some((plan) => plan.id.includes('streamsaver'))
    ? 'Optional StreamSaver TV bundle'
    : 'Optional TV bundle: 120+ channels';

/**
 * One card per province on /home-internet; each opens that province's page. Card pattern
 * (Mobbin pricing references, 23 October 2026): name, one line of context, price, sub-line,
 * button, then an "Includes" tick list. The standout offer (SK) is the highlighted card.
 */
export const internetProvinceCards = internetProvinces.map((province) => {
  const plans = internetPlansByProvince[province];
  const offer = offers[province];
  return {
    province,
    href: internetProvinceHref(province),
    highlighted: province === 'SK',
    tag: offer.badge,
    name: internetProvinceNames[province],
    context: `${plans.length} plans · ${offer.bullet.toLowerCase()}`,
    fromLabel: 'From',
    currency: '$',
    price: `${lowestOf(plans)}`,
    period: '/mo',
    priceNote: 'CAD · taxes extra · no contract',
    action: 'View plans & offers',
    includesTitle: 'Every plan includes:',
    includes: [
      `Unlimited data up to ${topSpeedOf(plans)}`,
      'Free WiFi router & modem',
      'Free professional installation',
      'No upfront payment',
      tvBullet(province),
    ],
  };
});

export interface InternetPlanCardContent {
  readonly plan: InternetPlan;
  readonly href: string;
  readonly featured: boolean;
  readonly tag?: string;
  readonly tv: boolean;
  readonly eyebrow: string;
  readonly bestFor: string;
  readonly currency: string;
  readonly price: string;
  readonly period: string;
  readonly priceNote: string;
  readonly action: string;
  readonly includesTitle: string;
  readonly includes: readonly string[];
}

const bestForOf = (plan: InternetPlan, tv: boolean): string => {
  if (tv) {
    return plan.id.includes('streamsaver')
      ? 'Best for gaming, streaming & TV'
      : 'Best for families who want internet and TV';
  }
  return plan.mbps >= 1000
    ? 'Best for whole-home & work-from-home'
    : 'Best for streaming & everyday use';
};

const tvExtras = (plan: InternetPlan): readonly string[] =>
  plan.features
    .map((text) => text.replace(/^✓\s*/u, ''))
    .filter((text) => !/^Unlimited data|WiFi router/u.test(text));

/**
 * A province's plan cards in one row, as sold on Canada Wide: the entry plan lists what
 * every plan includes, each faster tier says "Everything in <previous>, plus:", and a TV
 * bundle says what it adds to its internet speed. Every button opens that plan in /order.
 */
export function internetProvincePlanCards(province: InternetProvince): InternetPlanCardContent[] {
  const plans = internetPlansByProvince[province];
  const offer = offers[province];
  const internet = plans.filter((plan) => !isTvPlan(plan)).sort((a, b) => a.mbps - b.mbps);
  const tv = plans.filter(isTvPlan);
  const card = (
    plan: InternetPlan,
    isTv: boolean,
    includesTitle: string,
    includes: readonly string[],
  ): InternetPlanCardContent => ({
    plan,
    href: internetOrderHref(province, plan),
    featured: plan.badge !== undefined,
    ...(plan.badge ? { tag: plan.badge } : {}),
    tv: isTv,
    eyebrow: isTv ? plan.carrier : 'Internet',
    bestFor: bestForOf(plan, isTv),
    currency: '$',
    price: `${plan.priceCad}`,
    period: '/mo',
    priceNote: 'CAD · taxes extra · no contract',
    action: `Choose ${plan.allowance}`,
    includesTitle,
    includes,
  });
  return [
    ...internet.map((plan, index) => {
      const previous = internet[index - 1];
      return previous
        ? card(plan, false, `Everything in ${previous.allowance}, plus:`, [
            `Unlimited data up to ${plan.allowance}`,
            'Maximum speed for the entire household',
            'Ideal for remote work & video calls',
          ])
        : card(plan, false, 'Includes:', [
            `Unlimited data up to ${plan.allowance}`,
            'Free WiFi router & modem',
            'Free professional installation',
            'No upfront payment',
            offer.bullet,
          ]);
    }),
    ...tv.map((plan) =>
      card(plan, true, `Everything in ${plan.allowance} internet, plus:`, tvExtras(plan)),
    ),
  ];
}

const showcase: readonly LandingShowcaseRow[] = [
  {
    id: 'install',
    eyebrow: 'Free professional install',
    title: 'A technician sets it up. You do not touch a cable.',
    body: 'Installation is included on every plan, with nothing to pay on install day. The technician connects the line, places the WiFi router where it covers your home best, and tests it before leaving.',
    action: { label: 'See plans for my province', href: '#plans' },
    image: { caption: 'PHOTO · technician installing a WiFi router in a living room' },
  },
  {
    id: 'equipment',
    eyebrow: 'Equipment included',
    title: 'WiFi router and modem included, no rental fee.',
    body: 'The equipment comes with the plan. There is no monthly rental charge and nothing to buy, so the price you see is the price you pay, plus tax.',
    action: { label: 'What every plan includes', href: '#included' },
    image: { caption: 'PHOTO · WiFi router on a shelf in a bright apartment' },
    reverse: true,
  },
  {
    id: 'move-in',
    eyebrow: 'Moving in?',
    title: 'Be online from move-in day.',
    body: 'Add your move-in date to your order. An advisor books the first install slot after you get the keys, so the internet is working before the boxes are unpacked.',
    action: { label: 'Book my install date', href: '#plans' },
    image: { caption: 'PHOTO · family unpacking boxes, laptop open on the kitchen counter' },
  },
];

const steps = [
  {
    id: 'choose',
    marker: '1',
    meta: 'Online · 5 minutes',
    title: 'Choose your plan',
    body: 'Pick your province and plan, and send your name, email, phone and address. No payment, no card.',
  },
  {
    id: 'call',
    marker: '2',
    meta: 'Within 24 hours',
    title: 'An advisor calls you',
    body: 'We confirm availability at your address, your exact price and offer, and book your install date.',
  },
  {
    id: 'install',
    marker: '✓',
    meta: 'About 3 days',
    title: 'A technician installs it',
    body: 'Your WiFi router and modem are set up and tested. The provider bills you from then on, and we stay your contact.',
    done: true,
  },
] satisfies readonly CpStepContent[];

const sharedFaq = {
  install: {
    id: 'install',
    question: 'How fast can you install home internet?',
    answer:
      'Most installs happen within about 3 days of your call with us. Tell us your move-in date and we book the first slot after you get the keys.',
  },
  pay: {
    id: 'pay',
    question: 'Do I pay anything on this website?',
    answer:
      'No. You submit a request and an advisor calls to confirm. The provider bills you directly after your service is installed, and Canadian Plans charges no fees of its own.',
  },
  credit: {
    id: 'credit',
    question: 'Do I need a Canadian credit history?',
    answer:
      'Not always. Many newcomers sign up with a passport and permit. If a deposit or a different plan is needed, your advisor tells you before anything is booked.',
  },
  contract: {
    id: 'contract',
    question: 'Is there a contract?',
    answer:
      'No. There is no term commitment on any plan, including the 2-year price lock in British Columbia, Alberta and Manitoba. Your service agreement is with the provider, and an advisor explains it before anything is booked.',
  },
  equipment: {
    id: 'equipment',
    question: 'Is the WiFi router included?',
    answer:
      'Yes. A WiFi router and modem are included on every plan, with no monthly equipment rental fee.',
  },
  provider: {
    id: 'provider',
    question: 'Which internet provider is it?',
    answer:
      'Canadian Plans is an authorized sales agent. Your advisor confirms the provider for your address on the call, before anything is booked, and your service agreement is with them.',
  },
  availability: {
    id: 'availability',
    question: 'Is the service available at my address?',
    answer:
      'Availability depends on your exact address. Send your details and an advisor confirms what is available, usually within 24 hours.',
  },
  cancel: {
    id: 'cancel',
    question: 'Can I cancel?',
    answer:
      'Before activation, cancel with us at any time for free. After activation you cancel with the provider, and there is no contract holding you.',
  },
  move: {
    id: 'move',
    question: 'What happens to my internet if I move again?',
    answer:
      'Talk to your advisor before you move. They check whether service is available at your new address and what it costs there.',
  },
} satisfies Record<string, InternetLandingFaq>;

interface IconCard {
  readonly id: string;
  readonly icon: RedesignAssetKey;
  readonly title: string;
  readonly body: string;
}

/** Everything the landing page and the province pages share. */
export const internetLandingShared = {
  skip: 'Skip to main content',
  mainId: 'internet-main',
  breadcrumbLabel: 'Breadcrumb',
  separator: '/',
  promo: {
    text: 'Moving in soon? Book your install date now and be online on move-in day.',
    link: { label: 'See plans for my province', href: '#plans' },
  },
  proof: [
    { title: 'Nothing paid online', body: 'The provider bills you after installation.' },
    { title: 'Free pro install', body: 'A technician sets up your modem and WiFi.' },
    { title: 'Unlimited data', body: 'No caps, no overage, on every plan.' },
    { title: 'Cancel free before install', body: 'Change your mind before activation at no cost.' },
  ],
  included: {
    id: 'included',
    eyebrow: 'What you get',
    title: 'Everything you need to get online, with no surprise fees.',
    items: [
      {
        id: 'install',
        icon: 'feature-hi-install',
        title: 'Professional installation, $0',
        body: 'A technician comes to your home, connects the line and sets up your WiFi. Nothing to pay on install day.',
      },
      {
        id: 'router',
        icon: 'feature-hi-wifi',
        title: 'WiFi router and modem included',
        body: 'Equipment comes with the plan. There is no monthly rental fee and nothing to buy.',
      },
      {
        id: 'unlimited',
        icon: 'feature-hi-unlimited',
        title: 'Unlimited data, every plan',
        body: 'Stream, game, study and work from home without watching a meter or paying overage.',
      },
      {
        id: 'moving',
        icon: 'feature-hi-moving',
        title: 'No contract, and we stay your contact',
        body: 'No term commitment. Moving again? Tell your advisor and they check your new address.',
      },
    ] satisfies readonly IconCard[],
  },
  showcase,
  speed: {
    id: 'speed',
    eyebrow: 'Which speed?',
    title: 'What each speed feels like at home.',
    lead: 'Real examples instead of tech terms. Times are based on each plan’s top speed; WiFi inside your home can be a little slower.',
    caption: 'How many people and devices each internet speed supports',
    usageLabel: 'Everyday use',
    columns: ['500 Mbps', '1 Gbps', '2 Gbps'],
    recommended: 1,
    recommendedLabel: 'Most popular',
    rows: [
      { label: '4K streams at the same time', values: ['3', '6', '8+'] },
      { label: 'HD video calls at the same time', values: ['6', '10+', '15+'] },
      { label: 'Download a 50 GB game', values: ['≈ 14 min', '≈ 7 min', '≈ 3 min'] },
      { label: 'Devices online comfortably', values: ['15', '30', '40+'] },
      { label: 'Best for', values: ['1–3 people', '3–5 people', 'Busy homes, creators'] },
    ],
    note: 'Download times are theoretical at full plan speed (50 GB = 400 gigabits). Device and stream counts are guidance, not guarantees. Available speeds vary by province and address.',
    action: { label: 'See plans and prices', href: '#plans' },
  },
  how: {
    id: 'how-it-works',
    eyebrow: 'How it works',
    title: 'Online in three steps, usually within days.',
    lead: 'You choose online. A real person confirms everything. A technician installs it.',
    label: 'How ordering works',
    steps,
    aside: {
      title: 'Moving in on a set date?',
      body: 'Add your move-in date to the order and we book the first install slot after you get the keys, so you are online from day one.',
      action: { label: 'Book my install date', href: '#plans' },
    },
  },
  tv: {
    id: 'tv',
    eyebrow: 'Add TV',
    title: 'Add TV to any plan, on the same bill.',
    body: 'An Internet + TV Bundle adds 120+ live channels and a PVR box to record and pause live TV. In British Columbia and Alberta you can also pick Internet + StreamSaver TV: 70+ channels on the app plus Netflix, Disney+ and Apple TV. Your advisor explains the packages in plain words when they call.',
    facts: [
      { label: 'TV Bundle', value: '120+ channels + 1 PVR box' },
      { label: 'StreamSaver (BC, AB)', value: '70+ app channels + Netflix, Disney+, Apple TV' },
      { label: 'Bundle prices', value: 'From $90/mo in Saskatchewan' },
    ],
    action: { label: 'See TV bundles', href: '#plans' },
  },
  who: {
    id: 'who',
    eyebrow: 'Made for your move',
    title: 'Built for newcomers, renters and anyone moving.',
    items: [
      {
        id: 'newcomer',
        icon: 'why-pa-forms',
        title: 'New to Canada',
        body: 'No Canadian credit history? Many newcomers sign up with a passport and permit. If a deposit or a different plan is needed, your advisor tells you before anything is booked.',
      },
      {
        id: 'renter',
        icon: 'who-bz-home',
        title: 'Renting an apartment, condo or suite',
        body: 'Most buildings are pre-wired. We check your building on the call so the install is quick, and we tell you if the technician needs building access.',
      },
      {
        id: 'mover',
        icon: 'feature-hi-moving',
        title: 'Moving within Canada',
        body: 'Tell us your move-in date and new address. We check availability and book the first install slot after you get the keys.',
      },
    ] satisfies readonly IconCard[],
  },
  about: {
    id: 'about',
    eyebrow: 'Who you are buying from',
    title: 'A real office in Surrey, BC. A real person on the phone.',
    body: 'Canadian Plans is an authorized sales agent. Your service agreement is with the internet provider, who installs the line and bills you directly after activation. Our advisor confirms the provider, your price and your install date before anything is booked. Our help costs you nothing extra.',
    points: [
      'You pay the provider, never this website',
      'Cancel with us free any time before the provider activates your service',
      'One advisor from order to install, and afterwards',
    ],
    contactTitle: 'Talk to us',
    contactLines: siteFooter.contactLines ?? [],
    hours: 'Monday to Saturday, 9am–9pm Pacific',
    action: { label: 'Contact an advisor', href: '/contact' },
    secondary: { label: 'About Canadian Plans', href: '/about' },
  },
  faqIntro: {
    id: 'faq',
    eyebrow: 'FAQ',
    title: 'Home internet questions, answered.',
    lead: 'Still unsure? An advisor can answer in a quick call, at no cost.',
    helpTitle: 'Prefer to ask a person?',
    helpBody: 'Call, email or send us a message and an advisor replies the same day.',
    helpAction: { label: 'Talk to an advisor', href: '/contact' },
    symbols: { expand: '+', collapse: '×' },
  },
  final: {
    icon: 'cta-home-internet' satisfies RedesignAssetKey,
    secondary: { label: 'Talk to an advisor ›', href: '/contact' },
  },
  stickyButton: 'See plans',
  related: {
    title: 'Keep reading',
    links: [
      { label: 'Home internet in Vancouver', href: '/home-internet/vancouver' },
      { label: 'Home internet in Ontario', href: '/home-internet/ontario' },
      { label: 'Pre-arrival SIM plans', href: '/pre-arrival-sim' },
      { label: 'Mobile plans', href: '/mobile-plans' },
      { label: 'Newcomer guides', href: '/guides' },
    ],
  },
} as const;

export interface InternetPageContent {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly breadcrumb: readonly { readonly label: string; readonly href?: string }[];
  readonly hero: {
    readonly eyebrow: string;
    readonly title: string;
    readonly lead: string;
    /** Offer bullets on a province page; empty on the landing page. */
    readonly bullets: readonly string[];
    readonly primary: { readonly label: string; readonly href: string };
    readonly secondary: { readonly label: string; readonly href: string };
    readonly priceLabel: string;
    readonly price: string;
    readonly priceSuffix: string;
    readonly chips: readonly string[];
    readonly art: RedesignAssetKey;
    readonly artLabel: string;
    readonly badge: { readonly top: string; readonly price: string; readonly suffix: string };
    readonly sticker: string;
  };
  readonly plans: {
    readonly eyebrow: string;
    readonly title: string;
    readonly lead: string;
    readonly date: string;
    /** Set on a province page: its plans and offer. Absent on the landing page (province cards). */
    readonly province?: InternetProvince;
    readonly promoLabel: string;
    readonly promo?: string;
    readonly includesTitle: string;
    readonly includes: readonly string[];
    readonly elsewhere: {
      readonly title: string;
      readonly body: string;
      readonly action: { readonly label: string; readonly href: string };
    };
    readonly groups: { readonly internet: string; readonly tv: string };
    readonly cardsLabel: string;
  };
  readonly faq: readonly InternetLandingFaq[];
  readonly final: {
    readonly title: string;
    readonly subtitle: string;
    readonly primary: { readonly label: string; readonly href: string };
  };
  readonly sticky: { readonly title: string; readonly detail: string };
  readonly otherProvinces: {
    readonly title: string;
    readonly links: readonly { readonly label: string; readonly href: string }[];
  };
}

const includes = [
  'Unlimited data',
  'WiFi router and modem',
  'Free professional installation',
  'No contract or term',
  'Nothing to pay online',
];

const elsewhere = {
  title: 'Outside these provinces?',
  body: 'We add provinces based on where people ask. Leave your email and we tell you the day plans open in yours.',
  action: { label: 'Join the wish list', href: internetWishListHref },
};

const otherProvinces = (except?: InternetProvince) => ({
  title: except ? 'Home internet in other provinces' : 'Home internet by province',
  links: internetProvinces
    .filter((province) => province !== except)
    .map((province) => ({
      label: internetProvinceNames[province],
      href: internetProvinceHref(province),
    })),
});

const costAnswer = (province?: InternetProvince): InternetLandingFaq => ({
  id: 'cost',
  question: province
    ? `How much does home internet cost in ${internetProvinceNames[province]}?`
    : 'How much does home internet cost in Canada?',
  answer: province
    ? `With us, from $${lowestOf(internetPlansByProvince[province])}/mo in ${internetProvinceNames[province]}, in Canadian dollars before tax. Every plan includes unlimited data, a WiFi router and modem, and free professional installation.`
    : `With us, from $${lowestOf(internetPlansByProvince.SK)}/mo in Saskatchewan, $${lowestOf(internetPlansByProvince.BC)}/mo in British Columbia and Alberta, and $${lowestOf(internetPlansByProvince.MB)}/mo in Manitoba, in Canadian dollars before tax. Every plan includes unlimited data, a WiFi router and modem, and free professional installation.`,
});

/** /home-internet: the overview page with one card per province. */
export const internetLandingPage: InternetPageContent = {
  path: '/home-internet',
  title: 'Home Internet Plans by Province | Canadian Plans',
  description: `Unlimited home internet from $${lowestPrice}/mo in ${provinceSentence}. WiFi router included, free professional install, no contract, nothing to pay online. An advisor books your install date.`,
  breadcrumb: [{ label: 'Home', href: '/' }, { label: 'Home Internet' }],
  hero: {
    eyebrow: `Home internet · ${internetProvinces.join(', ')}`,
    title: 'Home internet for your new place, installed free.',
    lead: `Unlimited data and a WiFi router on every plan, up to ${topSpeedOf(allPlans)}. Pick your province, choose a plan, and an advisor books your install. Nothing to pay on this website.`,
    bullets: [],
    primary: { label: 'See plans for my province', href: '#plans' },
    secondary: { label: 'How it works', href: '#how-it-works' },
    priceLabel: 'From',
    price: `$${lowestPrice}`,
    priceSuffix: '/mo + tax',
    chips: ['No contract', '$0 to order'],
    art: 'art-home-internet',
    artLabel: 'Illustration of a home WiFi router with a strong signal',
    badge: { top: 'Plans from', price: `$${lowestPrice}`, suffix: '/mo · CAD' },
    sticker: 'WiFi router included',
  },
  plans: {
    eyebrow: 'Plans and offers',
    title: 'Find the best internet in your province.',
    lead: 'Prices and offers are set per province, never per city. Pick yours to see every plan and the current offer. Taxes are extra.',
    date: 'Prices as of October 2026 · CAD',
    promoLabel: 'Offer',
    includesTitle: 'Every plan includes',
    includes,
    elsewhere,
    groups: { internet: 'Internet', tv: 'Internet + TV' },
    cardsLabel: 'Provinces',
  },
  faq: [
    costAnswer(),
    sharedFaq.install,
    sharedFaq.pay,
    sharedFaq.credit,
    sharedFaq.contract,
    {
      id: 'first-bill',
      question: 'When is the first bill?',
      answer:
        'In British Columbia, Alberta and Manitoba the first bill comes 15 days after installation, with nothing paid upfront. In Saskatchewan the first two months are free and billing starts in month three.',
    },
    sharedFaq.equipment,
    sharedFaq.provider,
    sharedFaq.availability,
    sharedFaq.cancel,
    sharedFaq.move,
  ],
  final: {
    title: 'Ready to be online from move-in day?',
    subtitle: `Unlimited internet from $${lowestPrice}/mo. Free install, no contract, nothing to pay online.`,
    primary: { label: 'See plans for my province', href: '#plans' },
  },
  sticky: {
    title: `Home internet from $${lowestPrice}/mo`,
    detail: 'Free install · No contract · $0 to order',
  },
  otherProvinces: otherProvinces(),
};

/** /home-internet/<province>: that province's plans, prices and offer. */
export function internetProvincePage(province: InternetProvince): InternetPageContent {
  const name = internetProvinceNames[province];
  const plans = internetPlansByProvince[province];
  const from = lowestOf(plans);
  const offer = offers[province];
  return {
    path: internetProvinceHref(province),
    title: `Home Internet in ${name} from $${from}/mo | Canadian Plans`,
    description: `High speed unlimited internet in ${name} from $${from}/month. ${offer.detail} Free WiFi router and modem, free professional install, no contract. Nothing to pay online.`,
    breadcrumb: [
      { label: 'Home', href: '/' },
      { label: 'Home Internet', href: '/home-internet' },
      { label: name },
    ],
    hero: {
      eyebrow: `Home internet · ${name}`,
      title: offer.heroTitle,
      lead: `High speed unlimited internet in ${name} from $${from}/month, up to ${topSpeedOf(plans)}. Choose a plan and an advisor calls to confirm your address and book the install. Nothing to pay on this website.`,
      bullets: offer.heroBullets,
      primary: { label: 'See plans and prices', href: '#plans' },
      secondary: { label: 'How it works', href: '#how-it-works' },
      priceLabel: 'From',
      price: `$${from}`,
      priceSuffix: '/mo + tax',
      chips: ['No contract', '$0 to order'],
      art: 'art-home-internet',
      artLabel: 'Illustration of a home WiFi router with a strong signal',
      badge: { top: `${name} from`, price: `$${from}`, suffix: '/mo · CAD' },
      sticker: capitalize(offer.badge),
    },
    plans: {
      eyebrow: `Plans in ${name}`,
      title: `Choose your plan in ${name}.`,
      lead: `Every plan below is sold in ${name} with the same offer. Pick one and send your details; an advisor confirms your address and price before anything is booked.`,
      date: 'Prices as of October 2026 · CAD · taxes extra',
      province,
      promoLabel: 'Offer',
      promo: offer.detail,
      includesTitle: 'Every plan includes',
      includes,
      elsewhere,
      groups: { internet: 'Internet', tv: 'Internet + TV' },
      cardsLabel: `${name} plans`,
    },
    faq: [
      costAnswer(province),
      { id: 'first-bill', question: 'When is the first bill?', answer: offer.firstBill },
      sharedFaq.install,
      sharedFaq.pay,
      sharedFaq.credit,
      sharedFaq.contract,
      sharedFaq.equipment,
      sharedFaq.provider,
      sharedFaq.availability,
      sharedFaq.cancel,
      sharedFaq.move,
    ],
    final: {
      title: `Ready for home internet in ${name}?`,
      subtitle: `Unlimited internet from $${from}/mo. ${capitalize(offer.badge)}, free install, nothing to pay online.`,
      primary: { label: 'See plans and prices', href: '#plans' },
    },
    sticky: {
      title: `${name} internet from $${from}/mo`,
      detail: `${capitalize(offer.badge)} · Free install · $0 to order`,
    },
    otherProvinces: otherProvinces(province),
  };
}
