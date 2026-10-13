import type { FaqItemContent, FigmaAsset } from '@canadian-plans/ui/canadian-plans';
import { footerContent, type FooterContent } from './components';
import { internetChrome, internetPlans } from './home-internet';

export const categoryInternetChrome = {
  ...internetChrome,
  navigation: internetChrome.navigation.map((link) => ({
    ...link,
    href: link.href === '#installation' ? '#guide' : link.href,
  })),
};

export interface CategoryInternetPlan {
  readonly id: string;
  readonly speed: string;
  readonly price: string;
  readonly audience: string;
  readonly streams: string;
  readonly download: string;
  readonly popular?: boolean;
  readonly previewOnly: true;
}

export interface CategoryAreaCard {
  readonly name: string;
  readonly postalPrefixes: string;
  readonly speed: string;
  readonly networks: readonly string[];
  readonly install: string;
}

export interface CategoryCityCard {
  readonly name: string;
  readonly postalPrefixes: string;
  readonly price: string;
  readonly networks: readonly string[];
  readonly href: string;
}

export interface CategoryInternetContent {
  readonly previewOnly: true;
  readonly slug: 'vancouver' | 'ontario';
  readonly region: string;
  readonly title: string;
  readonly pageTitle: string;
  readonly eyebrow: string;
  readonly description: string;
  readonly postalExample: string;
  readonly postalPlaceholder: string;
  readonly previewNotice: string;
  readonly breadcrumbs: readonly { readonly label: string; readonly href?: string }[];
  readonly promo: string;
  readonly promoAction: string;
  readonly heroBadges: readonly string[];
  readonly metricLabels: readonly string[];
  readonly metrics: readonly {
    readonly value: string;
    readonly label: string;
    readonly note: string;
  }[];
  readonly directoryTitle: string;
  readonly directoryDescription: string;
  readonly networkLegend?: readonly string[];
  readonly areas?: readonly CategoryAreaCard[];
  readonly cities?: readonly CategoryCityCard[];
  readonly showAll: string;
  readonly tipsTitle: string;
  readonly tips: readonly {
    readonly title: string;
    readonly description: string;
    readonly alt: string;
  }[];
  readonly planTitle: string;
  readonly planNote: string;
  readonly plans: readonly CategoryInternetPlan[];
  readonly planTableHeaders: readonly string[];
  readonly planIncludes: readonly string[];
  readonly planFootnote: string;
  readonly planFeatures: readonly string[];
  readonly stepsTitle: string;
  readonly steps: readonly {
    readonly number: string;
    readonly title: string;
    readonly description: string;
  }[];
  readonly guideEyebrow: string;
  readonly guideTitle: string;
  readonly guideAlt: string;
  readonly guideQuestions: readonly { readonly question: string; readonly answer: string }[];
  readonly factsTitle: string;
  readonly facts: readonly { readonly label: string; readonly value: string }[];
  readonly reviewsEyebrow: string;
  readonly reviewsTitle: string;
  readonly reviewScore: string;
  readonly reviewCount: string;
  readonly reviews: readonly {
    readonly quote: string;
    readonly name: string;
    readonly context: string;
  }[];
  readonly faqTitle: string;
  readonly faqIntro: string;
  readonly faqs: readonly FaqItemContent[];
  readonly exploreTitle: string;
  readonly nearbyTitle: string;
  readonly nearby: readonly { readonly label: string; readonly href: string }[];
  readonly exploreGroups: readonly {
    readonly title: string;
    readonly links: readonly { readonly label: string; readonly href: string }[];
  }[];
  readonly finalTitle: string;
  readonly finalDescription: string;
  readonly finalAddressAction: string;
  readonly finalAdvisorAction: string;
  readonly quickAnswer: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
  };
  readonly mapAlt: string;
  readonly mapStatusTitle: string;
  readonly mapStatusDetail: string;
  readonly priceSticker: {
    readonly eyebrow: string;
    readonly amount: string;
    readonly note: string;
  };
}

const planExamples = [
  { id: 'preview-internet-150', streams: '1', download: '≈ 45 min' },
  { id: 'preview-internet-500', streams: '3', download: '≈ 14 min' },
  { id: 'preview-internet-1000', streams: '6', download: '≈ 7 min' },
  { id: 'preview-internet-1500', streams: '8+', download: '≈ 5 min' },
] as const;

export const categoryPlans: readonly CategoryInternetPlan[] = internetPlans.map((plan) => {
  const example = planExamples.find((item) => item.id === plan.id);
  return {
    id: plan.id,
    speed: plan.resultLabel,
    price: plan.resultPrice,
    audience: plan.goodFor?.replace('Good for: ', '') ?? '',
    streams: example?.streams ?? '',
    download: example?.download ?? '',
    popular: plan.badge === 'Most popular',
    previewOnly: plan.previewOnly,
  };
});

const sharedTips = [
  {
    title: 'Apartment or condo',
    description: 'Most towers are pre-wired. We check your building first so install is quick.',
    alt: 'Rogers WiFi modem on a shelf in a Vancouver condo, window view behind',
  },
  {
    title: 'Basement suite',
    description: 'Share a line with upstairs? We can set up your own account and WiFi.',
    alt: 'Tenant plugging in a WiFi modem in a bright basement suite',
  },
  {
    title: 'House',
    description: 'We test signal in every room — add WiFi pods for large homes.',
    alt: 'Family streaming in a house living room, WiFi pod on a bookshelf',
  },
  {
    title: 'Student housing',
    description: 'Short lease? Ask for month-to-month and we’ll explain the options.',
    alt: 'Student on a video call at a desk in a shared rental room',
  },
] as const;

const sharedSteps = [
  {
    number: '1',
    title: 'Check your address',
    description: 'Enter your postal code and pick a plan. It takes about 2 minutes.',
  },
  {
    number: '2',
    title: 'An advisor calls you',
    description:
      'We confirm your plan, price and install date. Nothing is charged before this call.',
  },
  {
    number: '3',
    title: 'A technician installs it',
    description: 'Usually within about 3 days of your call. Your WiFi modem is included.',
  },
] as const;

const sharedFacts = [
  { label: 'Price range', value: '$55–$105/mo · CAD + tax' },
  { label: 'Typical install', value: 'About 3 days after your call' },
  { label: 'Top speed', value: 'Up to 1.5 Gbps' },
  { label: 'Data', value: 'Unlimited on every plan' },
  { label: 'Equipment', value: 'WiFi modem included' },
  { label: 'Network', value: 'Rogers' },
] as const;

const sharedPlans = categoryPlans;
const sharedFaqs: readonly FaqItemContent[] = [
  {
    id: 'installation',
    question: 'How fast can you install internet in Vancouver?',
    answer:
      'Most installs happen within about 3 days of your call with us. Tell us your move-in date and we’ll book the first slot after you get the keys.',
  },
  {
    id: 'credit',
    question: 'Do I need a Canadian credit history?',
    answer:
      'Not always. Many newcomers sign up with a passport and permit. If a deposit or a different plan is needed, your advisor tells you before anything is booked.',
  },
  {
    id: 'fibre',
    question: 'Is fibre available in my building?',
    answer:
      'Availability depends on the exact building. Enter your postal code to see a sample preview state; the result is not a live provider check.',
  },
  {
    id: 'tv',
    question: 'Can I bundle TV with internet?',
    answer:
      'TV bundle details are a design example. Current packages and prices are not verified here.',
  },
  {
    id: 'suite',
    question: 'Do you install in basement suites?',
    answer:
      'Building wiring and account options vary. An advisor would confirm the details for your address.',
  },
  {
    id: 'move',
    question: 'What happens if I move?',
    answer:
      'Transfer options depend on the new address and provider. This preview does not check transfer availability.',
  },
];
const sharedReviews = [
  {
    quote:
      '“Booked my install from Delhi before I flew in. The advisor called, we picked a date, and the WiFi was working when I got to my apartment.”',
    name: 'Aarav S.',
    context: 'Student · Delhi → Vancouver',
  },
  {
    quote:
      '“Internet was installed in our Mount Pleasant apartment three days after we moved in. Someone actually called back when they said.”',
    name: 'Maria L.',
    context: 'Nurse · Manila → Vancouver',
  },
  {
    quote:
      '“Clear prices, no surprises on the first bill. The advisor explained the speeds in plain words.”',
    name: 'Tanvir H.',
    context: 'PR · Dhaka → Vancouver',
  },
] as const;
const sharedExplore = [
  {
    title: 'Plans & bundles',
    links: [
      { label: 'TV bundles', href: '#plans' },
      { label: 'Cheap internet', href: '#plans' },
      { label: 'Fibre internet', href: '#plans' },
      { label: 'No-contract internet', href: '#plans' },
    ],
  },
  {
    title: 'Guides',
    links: [
      { label: 'Internet for newcomers', href: '/guides' },
      { label: 'Renter internet checklist', href: '/guides' },
    ],
  },
] as const;

export const vancouverContent: CategoryInternetContent = {
  previewOnly: true,
  slug: 'vancouver',
  region: 'Vancouver',
  title: 'Home internet in Vancouver, installed in about 3 days.',
  pageTitle: 'Home Internet in Vancouver | Canadian Plans preview',
  eyebrow: 'Home internet · Vancouver, BC',
  description:
    'Rogers-network internet for apartments, condos and basement suites. Unlimited data, WiFi modem and free professional install.',
  postalExample: 'V6B 1A1',
  postalPlaceholder: 'Your Vancouver postal code, e.g. V6B 1A1',
  previewNotice:
    'Design preview only. All provider, coverage, price, review and installation details on this page are unverified examples. The address checker is a local fixture; no order or provider request is created.',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Home Internet', href: '/home-internet' },
    { label: 'British Columbia', href: '#coverage' },
    { label: 'Vancouver' },
  ],
  promo: 'Moving in Vancouver? Book your install before you get the keys.',
  promoAction: 'Check my address',
  heroBadges: ['Free install', 'Authorized Rogers dealer', '$0 until we call'],
  metricLabels: ['Local stats', 'Coverage', 'Plans', 'FAQ'],
  metrics: [
    { value: '3 days', label: 'Typical install', note: 'after your call' },
    { value: '1.5 Gbps', label: 'Top speed', note: 'in most buildings' },
    { value: '$55/mo', label: 'Starting price', note: 'CAD, taxes extra' },
    { value: '20+', label: 'Areas covered', note: 'Vancouver neighbourhoods*' },
  ],
  directoryTitle: 'Coverage by neighbourhood',
  networkLegend: ['Fibre', 'Cable'],
  directoryDescription:
    'Typical availability — your exact building is confirmed by the address check.',
  areas: [
    {
      name: 'Downtown & West End',
      postalPrefixes: 'V6B · V6E · V6G',
      speed: 'Up to 1.5 Gbps',
      networks: ['Fibre', 'Cable'],
      install: 'Install 2–3 days',
    },
    {
      name: 'Yaletown & False Creek',
      postalPrefixes: 'V6Z · V6H',
      speed: 'Up to 1.5 Gbps',
      networks: ['Fibre'],
      install: 'Install 2–3 days',
    },
    {
      name: 'Kitsilano & Fairview',
      postalPrefixes: 'V6K · V6J',
      speed: 'Up to 1 Gbps',
      networks: ['Fibre', 'Cable'],
      install: 'Install 3 days',
    },
    {
      name: 'Mount Pleasant & Main',
      postalPrefixes: 'V5T · V5V',
      speed: 'Up to 1 Gbps',
      networks: ['Cable'],
      install: 'Install 3–4 days',
    },
    {
      name: 'East Vancouver',
      postalPrefixes: 'V5L · V5N · V5K',
      speed: 'Up to 1 Gbps',
      networks: ['Fibre', 'Cable'],
      install: 'Install 3–4 days',
    },
    {
      name: 'Kerrisdale & Marpole',
      postalPrefixes: 'V6M · V6P',
      speed: 'Up to 500 Mbps',
      networks: ['Cable'],
      install: 'Install 3–5 days',
    },
    {
      name: 'UBC area',
      postalPrefixes: 'V6T',
      speed: 'Up to 1 Gbps',
      networks: ['Fibre'],
      install: 'Install 3 days',
    },
    {
      name: 'South Vancouver',
      postalPrefixes: 'V5P · V5X',
      speed: 'Up to 500 Mbps',
      networks: ['Cable'],
      install: 'Install 3–5 days',
    },
  ],
  showAll: 'Show all 8 neighbourhoods',
  tipsTitle: 'Tips for your type of home',
  tips: sharedTips,
  planTitle: 'Internet plans in Vancouver',
  planNote: 'Prices as of Oct 2026 · CAD, taxes extra',
  plans: sharedPlans,
  planTableHeaders: ['Speed', 'Price', 'Best for', '4K streams', '50 GB download'],
  planIncludes: ['Unlimited data', 'WiFi modem', 'Free install'],
  planFootnote: 'Download times are theoretical at full plan speed.',
  planFeatures: ['Unlimited data', 'WiFi modem', 'Free install'],
  stepsTitle: 'How to get home internet in 3 steps',
  steps: sharedSteps,
  guideEyebrow: 'Renter’s guide',
  guideTitle: 'Internet in Vancouver: a renter’s guide',
  guideAlt:
    'Technician connecting a Rogers WiFi modem in a Vancouver apartment while the tenant watches',
  guideQuestions: [
    {
      question: 'How fast should my internet be in Vancouver?',
      answer:
        'For 1–2 people, 150 Mbps covers streaming and work. Most shared apartments are happiest on 500 Mbps. Gamers and creators should look at 1 Gbps or more.',
    },
    {
      question: 'Do I need my landlord’s permission?',
      answer:
        'Most renters don’t need permission to get internet, but some older buildings need building access for the technician. Check this in the call and you’ll be fine booking.',
    },
    {
      question: 'Fibre or cable — what’s the difference?',
      answer:
        'Fibre gives the same fast upload and download speeds and is available in many newer towers. Cable is widely available and fine for streaming. Your address check shows what your building supports.',
    },
  ],
  factsTitle: 'Key facts',
  facts: sharedFacts,
  reviewsEyebrow: 'Reviews',
  reviewsTitle: 'Newcomers recommend us.',
  reviewScore: '4.8',
  reviewCount: '1,200+ Google reviews',
  reviews: sharedReviews,
  faqTitle: 'Vancouver internet questions',
  faqIntro: 'Talk to an advisor, Monday to Saturday, 9am–9pm Pacific time.',
  faqs: sharedFaqs,
  exploreTitle: 'Explore more',
  nearbyTitle: 'Nearby cities',
  nearby: [
    { label: 'Burnaby', href: '#coverage' },
    { label: 'Surrey', href: '#coverage' },
    { label: 'Richmond', href: '#coverage' },
    { label: 'North Vancouver', href: '#coverage' },
    { label: 'Coquitlam', href: '#coverage' },
    { label: 'New Westminster', href: '#coverage' },
  ],
  exploreGroups: sharedExplore,
  finalTitle: 'Online on move‑in day in Vancouver.',
  finalDescription: 'Choose a plan in 2 minutes. An advisor confirms it the same day.',
  finalAddressAction: 'Check my address',
  finalAdvisorAction: 'Talk to an advisor',
  quickAnswer: {
    eyebrow: 'Quick answer',
    title: 'How much is home internet in Vancouver?',
    description:
      'With us, Rogers-network home internet starts at $55/mo for 150 Mbps (CAD, taxes extra), with unlimited data, a WiFi modem and free professional installation. Most homes in BC can be installed within about 3 days.',
  },
  mapAlt:
    'Illustrative Vancouver coverage map with sample postal-code markers; availability is not checked.',
  mapStatusTitle: 'V6B · Downtown',
  mapStatusDetail: 'Up to 1.5 Gbps available',
  priceSticker: { eyebrow: 'Internet from', amount: '$55', note: '/mo · CAD + tax' },
};

export const ontarioContent: CategoryInternetContent = {
  previewOnly: true,
  slug: 'ontario',
  region: 'Ontario',
  title: 'Home internet across Ontario, city by city.',
  pageTitle: 'Home Internet in Ontario | Canadian Plans preview',
  eyebrow: 'Home internet · Ontario',
  description:
    'Find home internet across Ontario. Coverage, prices and installation options vary by city.',
  postalExample: 'M4B 1B3',
  postalPlaceholder: 'Your Ontario postal code, e.g. M4B 1B3',
  previewNotice:
    'Design preview only. All provider, coverage, price, review and installation details on this page are unverified examples. The address checker is a local fixture; no order or provider request is created.',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Home Internet', href: '/home-internet' },
    { label: 'Ontario' },
  ],
  promo: 'Moving within Ontario? Book your install before you get the keys.',
  promoAction: 'Check my address',
  heroBadges: ['Free install', 'Authorized Rogers dealer', '$0 until we call'],
  metricLabels: ['Local stats', 'Cities', 'Plans', 'FAQ'],
  metrics: [
    { value: '3 days', label: 'Typical install', note: 'after your call' },
    { value: '1.5 Gbps', label: 'Top speed', note: 'in most buildings' },
    { value: '$55/mo', label: 'Starting price', note: 'CAD, taxes extra' },
    { value: '8', label: 'Areas covered', note: 'major Ontario cities*' },
  ],
  directoryTitle: 'Pick your city',
  directoryDescription:
    'Coverage and pricing vary by city — tap yours for exact availability at your address.',
  cities: [
    {
      name: 'Toronto',
      postalPrefixes: 'M4 · M5 · M6',
      price: 'From $55/mo',
      networks: ['Fibre', 'Cable'],
      href: '#plans',
    },
    {
      name: 'Ottawa',
      postalPrefixes: 'K1 · K2',
      price: 'From $55/mo',
      networks: ['Fibre'],
      href: '#plans',
    },
    {
      name: 'Mississauga',
      postalPrefixes: 'L4 · L5',
      price: 'From $55/mo',
      networks: ['Fibre', 'Cable'],
      href: '#plans',
    },
    {
      name: 'Hamilton',
      postalPrefixes: 'L8 · L9',
      price: 'From $58/mo',
      networks: ['Cable'],
      href: '#plans',
    },
    {
      name: 'London',
      postalPrefixes: 'N5 · N6',
      price: 'From $58/mo',
      networks: ['Cable'],
      href: '#plans',
    },
    {
      name: 'Kitchener',
      postalPrefixes: 'N2',
      price: 'From $55/mo',
      networks: ['Fibre'],
      href: '#plans',
    },
    {
      name: 'Windsor',
      postalPrefixes: 'N8 · N9',
      price: 'From $60/mo',
      networks: ['Cable'],
      href: '#plans',
    },
    {
      name: 'Vaughan',
      postalPrefixes: 'L4 · L6',
      price: 'From $55/mo',
      networks: ['Fibre'],
      href: '#plans',
    },
  ],
  showAll: 'Show all 8 cities',
  tipsTitle: 'Tips for your type of home',
  tips: sharedTips,
  planTitle: 'Internet plans across Ontario',
  planNote: 'Prices as of Oct 2026 · CAD, taxes extra',
  plans: sharedPlans,
  planTableHeaders: ['Speed', 'Price', 'Best for', '4K streams', '50 GB download'],
  planIncludes: ['Unlimited data', 'WiFi modem', 'Free install'],
  planFootnote: 'Download times are theoretical at full plan speed.',
  planFeatures: ['Unlimited data', 'WiFi modem', 'Free install'],
  stepsTitle: 'How to get home internet in 3 steps',
  steps: sharedSteps,
  guideEyebrow: 'Renter’s guide',
  guideTitle: 'Internet in Ontario: a renter’s guide',
  guideAlt: 'Technician connecting a Rogers WiFi modem in a Toronto condo while the tenant watches',
  guideQuestions: [
    {
      question: 'How fast should my internet be?',
      answer:
        'For 1–2 people, 150 Mbps covers streaming and work. Most shared apartments are happiest on 500 Mbps. Gamers and creators should look at 1 Gbps or more.',
    },
    {
      question: 'Do I need my landlord’s permission?',
      answer:
        'Most renters don’t need permission to get internet, but some older buildings need building access for the technician. Check this in the call and you’ll be fine booking.',
    },
    {
      question: 'Fibre or cable — what’s the difference?',
      answer:
        'Fibre gives the same fast upload and download speeds and is available in many newer towers. Cable is widely available and fine for streaming. Your address check shows what your building supports.',
    },
  ],
  factsTitle: 'Key facts',
  facts: sharedFacts,
  reviewsEyebrow: 'REVIEWS',
  reviewsTitle: 'Newcomers recommend us.',
  reviewScore: '4.8',
  reviewCount: '1,200+ Google reviews',
  reviews: [
    {
      quote:
        '“Booked my install from Delhi before I flew in. The advisor called, we picked a date, and the WiFi was working when I got to my apartment.”',
      name: 'Aarav S.',
      context: 'Student · Delhi → Toronto',
    },
    {
      quote:
        '“Internet was installed in our Brampton apartment three days after we moved in. Someone actually called back when they said.”',
      name: 'Maria L.',
      context: 'Nurse · Manila → Brampton',
    },
    { ...sharedReviews[2], context: 'PR · Dhaka → Ottawa' },
  ],
  faqTitle: 'Ontario internet questions',
  faqIntro: 'Talk to an advisor, Monday to Saturday, 9am–9pm Pacific (noon to midnight Eastern).',
  faqs: [
    {
      id: 'installation',
      question: 'How fast can you install internet in Ontario?',
      answer:
        'Most addresses are installed within about 3 days of your call. Tell us your move-in date and we book the first slot after you get the keys.',
    },
    {
      id: 'credit',
      question: 'Do I need a credit check for home internet?',
      answer:
        'Credit-check requirements vary by provider and plan. These design examples do not represent a verified eligibility check.',
    },
    {
      id: 'fibre',
      question: 'Is fibre available in my building?',
      answer:
        'Fibre availability depends on the exact Ontario address. The postal-code checker on this page returns local sample states, not live coverage.',
    },
    {
      id: 'tv',
      question: 'Can I bundle TV in Ontario?',
      answer:
        'TV bundles and prices are examples shown in this design preview and are not verified offers.',
    },
    {
      id: 'suite',
      question: 'Do you install in basement suites?',
      answer:
        'Installation options vary by building. This preview does not check building access or account availability.',
    },
    {
      id: 'move',
      question: 'What happens if I move to another Ontario city?',
      answer:
        'Transfer options depend on the new address and provider. The preview does not check availability at another address.',
    },
  ],
  exploreTitle: 'Explore more',
  nearbyTitle: 'Ontario cities',
  nearby: [
    { label: 'Toronto', href: '#coverage' },
    { label: 'Ottawa', href: '#coverage' },
    { label: 'Mississauga', href: '#coverage' },
    { label: 'Hamilton', href: '#coverage' },
    { label: 'London', href: '#coverage' },
    { label: 'Kitchener', href: '#coverage' },
  ],
  exploreGroups: sharedExplore,
  finalTitle: 'Online on move‑in day in Ontario.',
  finalDescription: 'Choose a plan in 2 minutes. An advisor confirms it the same day.',
  finalAddressAction: 'Check my address',
  finalAdvisorAction: 'Talk to an advisor',
  quickAnswer: {
    eyebrow: 'Quick answer',
    title: 'How much is home internet in Ontario?',
    description:
      'With us, home internet across Ontario starts at $55 a month for 150 Mbps (CAD, plus tax), with unlimited data, a Wi-Fi modem and free professional install. Most addresses are installed within about 3 days.',
  },
  mapAlt:
    'Illustrative Ontario coverage map with a sample Toronto postal-code marker; availability is not checked.',
  mapStatusTitle: 'M4B · Toronto',
  mapStatusDetail: 'Fibre & cable available',
  priceSticker: { eyebrow: 'Internet from', amount: '$55', note: '/mo · CAD + tax' },
};

export const categoryAddressCopy = {
  title: 'Preview address check',
  description:
    'This local design preview returns sample outcomes only. No provider is contacted and no address is saved.',
  postalLabel: 'Postal code',
  postalHint: 'Use a Canadian postal code format.',
  submit: 'Check availability',
  retry: 'Try sample check again',
  pending: 'Checking preview…',
  invalid: 'Enter a complete Canadian postal code, such as the example shown.',
  available:
    'Sample state: an example plan is shown for this postal code. This is not a live availability result.',
  unavailable:
    'Sample state: no example plan is shown for this postal code. This is not a live coverage decision.',
  unconfigured: 'No sample result is configured for that postal code. No live lookup was made.',
  error: 'The preview could not be checked. Your postal code is still here; try again.',
  close: 'Close address preview',
  previewLabel: 'Preview only',
  back: 'Close',
} as const;

export const categoryPageLabels = {
  skip: 'Skip to main content',
  breadcrumb: 'Breadcrumb',
  separator: '/',
  preview: 'Design preview',
  image: 'IMAGE',
  author: 'Daniel K.',
  authorRole: 'Written by',
  reviewBy: 'Reviewed by',
  reviewByName: 'Priya',
  advisor: 'plan advisor',
  updated: 'Updated 5 Oct 2026 · 7 min read',
  onPage: 'On this page:',
  guide: 'Renter’s guide',
  faq: 'FAQ',
  whatsapp: 'WhatsApp us',
  popular: 'Most popular',
  perMonth: '/mo · CAD + tax',
  bestFor: 'Best for',
  streams: 'streams in 4K at a time',
  download: '50 GB download in',
  choose: 'Choose',
  installationUpdated: 'Updated 5 Oct 2026',
  stars: '5 out of 5 stars',
  starSymbols: '★★★★★',
  check: '✓',
  arrow: '→',
  expand: '+',
  collapse: '−',
  pageInformation: 'Page information',
  everyPlan: 'Every plan:',
  talk: 'Prefer to talk? Call 1-888-555-0199',
  authorDescription: (region: string) => `Written by · ${region} renter since 2021`,
  reviewerDescription: 'Reviewed by · plan advisor',
  onPageLinks: [
    { label: 'Local stats', href: '#local-stats' },
    { label: 'Neighbourhoods', href: '#coverage' },
    { label: 'Plans & prices', href: '#plans' },
    { label: 'Renter’s guide', href: '#guide' },
    { label: 'FAQ', href: '#faq' },
  ],
  sources:
    'Sources: Rogers serviceability and plan pages, checked 5 Oct 2026. Install times are typical, not guaranteed.',
  networkFibre: 'Fibre',
  networkCable: 'Cable',
} as const;

export const categoryFooterContent: FooterContent = {
  ...footerContent,
  legal: footerContent.legal.map((link) => ({
    ...link,
    href: link.label === 'Privacy' ? '/privacy' : link.label === 'Terms' ? '/terms' : link.href,
  })),
};

export function categoryEditorialAssets(region: CategoryInternetContent['slug']) {
  const prefix = `/design/category-internet/${region}-desktop-`;
  return {
    author: {
      src: `${prefix}imgEllipse4.svg`,
      width: 36,
      height: 36,
      nodeId: region === 'vancouver' ? '154:88' : '186:89',
    },
    reviewer: {
      src: `${prefix}imgEllipse5.svg`,
      width: 36,
      height: 36,
      nodeId: region === 'vancouver' ? '154:93' : '186:94',
    },
    reviews: [
      {
        src: `${prefix}imgEllipse6.svg`,
        width: 40,
        height: 40,
        nodeId: region === 'vancouver' ? '157:45' : '186:358',
      },
      {
        src: `${prefix}imgEllipse7.svg`,
        width: 40,
        height: 40,
        nodeId: region === 'vancouver' ? '157:53' : '186:366',
      },
      {
        src: `${prefix}imgEllipse8.svg`,
        width: 40,
        height: 40,
        nodeId: region === 'vancouver' ? '157:61' : '186:374',
      },
    ],
    includes: {
      src: `/design/category-internet/${region}-mobile-imgFrame1.svg`,
      width: 16,
      height: 16,
      nodeId: region === 'vancouver' ? '314:1406' : '314:1643',
    },
    planDetail: {
      src: `/design/category-internet/${region}-mobile-imgFrame2.svg`,
      width: 18,
      height: 18,
      nodeId: region === 'vancouver' ? '314:1428' : '314:1564',
    },
  } satisfies {
    author: FigmaAsset;
    reviewer: FigmaAsset;
    reviews: readonly FigmaAsset[];
    includes: FigmaAsset;
    planDetail: FigmaAsset;
  };
}

export const categoryAssets = {
  vancouver: {
    coverageFill: {
      src: '/design/category-internet/vancouver-desktop-imgCoverageFill.png',
      width: 340,
      height: 300,
      nodeId: '154:70',
    },
    coverageRing: {
      src: '/design/category-internet/vancouver-desktop-imgCoverageRing.png',
      width: 340,
      height: 300,
      nodeId: '154:135',
    },
    mapBackdrop: {
      src: '/design/category-internet/vancouver-desktop-imgEllipse1.svg',
      width: 420,
      height: 300,
      nodeId: '154:55',
    },
    mapDot: {
      src: '/design/category-internet/vancouver-desktop-imgEllipse2.svg',
      width: 22,
      height: 22,
      nodeId: '154:71',
    },
    statusDot: {
      src: '/design/category-internet/vancouver-desktop-imgEllipse3.svg',
      width: 12,
      height: 12,
      nodeId: '154:77',
    },
    mobileFill: {
      src: '/design/category-internet/vancouver-mobile-imgCoverageFill.png',
      width: 340,
      height: 300,
      nodeId: '252:401',
    },
    mobileRing: {
      src: '/design/category-internet/vancouver-mobile-imgCoverageRing.png',
      width: 340,
      height: 300,
      nodeId: '252:402',
    },
    mobileBackdrop: {
      src: '/design/category-internet/vancouver-mobile-imgEllipse.svg',
      width: 420,
      height: 300,
      nodeId: '252:386',
    },
    mobileDot: {
      src: '/design/category-internet/vancouver-mobile-imgEllipse1.svg',
      width: 22,
      height: 22,
      nodeId: '252:403',
    },
  },
  ontario: {
    coverageFill: {
      src: '/design/category-internet/ontario-desktop-imgCoverageFill.png',
      width: 340,
      height: 300,
      nodeId: '186:70',
    },
    coverageRing: {
      src: '/design/category-internet/ontario-desktop-imgCoverageRing.png',
      width: 340,
      height: 300,
      nodeId: '186:71',
    },
    mapBackdrop: {
      src: '/design/category-internet/ontario-desktop-imgEllipse1.svg',
      width: 420,
      height: 300,
      nodeId: '186:55',
    },
    mapDot: {
      src: '/design/category-internet/ontario-desktop-imgEllipse2.svg',
      width: 22,
      height: 22,
      nodeId: '186:72',
    },
    statusDot: {
      src: '/design/category-internet/ontario-desktop-imgEllipse3.svg',
      width: 12,
      height: 12,
      nodeId: '186:78',
    },
    mobileFill: {
      src: '/design/category-internet/ontario-mobile-imgCoverageFill.png',
      width: 340,
      height: 300,
      nodeId: '256:549',
    },
    mobileRing: {
      src: '/design/category-internet/ontario-mobile-imgCoverageRing.png',
      width: 340,
      height: 300,
      nodeId: '256:550',
    },
    mobileBackdrop: {
      src: '/design/category-internet/ontario-mobile-imgEllipse.svg',
      width: 420,
      height: 300,
      nodeId: '256:534',
    },
    mobileDot: {
      src: '/design/category-internet/ontario-mobile-imgEllipse1.svg',
      width: 22,
      height: 22,
      nodeId: '256:551',
    },
  },
} satisfies Record<CategoryInternetContent['slug'], Record<string, FigmaAsset>>;

export const categoryAddressFixtures = {
  vancouver: { available: 'V6B 1A1', unavailable: 'V6T 1Z4' },
  ontario: { available: 'M4B 1B3', unavailable: 'N8W 1A1' },
} as const;
