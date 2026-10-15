import { landingBreadcrumb, landingFaqIntro, landingSkip } from './shared';
import type { LandingBlock, LandingFaqItem, LandingPageContent } from './types';

/**
 * Home internet city/region pages (/home-internet/vancouver, /home-internet/ontario).
 * Primary keywords: home internet <region>, internet for renters <region>, internet
 * installation <region>. Coverage, speeds and install times are the 5 Oct 2026 preview
 * examples, unverified; the address check is a local fixture.
 */
const steps = (region: string): LandingBlock => ({
  kind: 'steps',
  id: 'how-it-works',
  eyebrow: 'How it works',
  title: `How to get home internet in ${region}`,
  aside: 'Done in 3 steps',
  items: [
    {
      id: 'check',
      marker: '1',
      meta: 'About 2 minutes',
      title: 'Check your address',
      body: 'Enter your postal code and pick a speed.',
    },
    {
      id: 'call',
      marker: '2',
      meta: 'Same day',
      title: 'An advisor calls you',
      body: 'We confirm your plan, price and install date. Nothing is charged before this call.',
    },
    {
      id: 'install',
      marker: '✓',
      meta: 'About 3 days',
      title: 'A technician installs it',
      body: 'Usually within about 3 days of your call. Your WiFi modem is included.',
      done: true,
    },
  ],
});

const homeTypes: LandingBlock = {
  kind: 'cards',
  id: 'home-types',
  eyebrow: 'Your home',
  title: 'Internet tips for your type of home',
  columns: 2,
  items: [
    {
      id: 'apartment',
      title: 'Apartment or condo',
      body: 'Most towers are pre-wired. We check your building first so the install is quick.',
      icon: 'feature-hi-wifi',
    },
    {
      id: 'basement',
      title: 'Basement suite',
      body: 'Share a line with upstairs? We can set up your own account and WiFi.',
      icon: 'feature-hi-moving',
    },
    {
      id: 'house',
      title: 'House',
      body: 'We test the signal in every room and can add WiFi pods for large homes.',
      icon: 'feature-hi-install',
    },
    {
      id: 'student',
      title: 'Student housing',
      body: 'Short lease? Ask about month-to-month and we will explain the options.',
      icon: 'feature-hi-unlimited',
    },
  ],
};

const guide = (region: string): LandingBlock => ({
  kind: 'article',
  id: 'guide',
  eyebrow: 'Renter’s guide',
  title: `Home internet in ${region}: a renter’s guide`,
  sections: [
    {
      title: 'What internet speed do I need?',
      body: [
        'For 1 or 2 people, 150 Mbps covers streaming and work. Most shared apartments are happiest on 500 Mbps. Gamers and creators should look at 1 Gbps or more.',
      ],
    },
    {
      title: 'Do I need my landlord’s permission to get internet?',
      body: [
        'Most renters don’t, but some older buildings need building access for the technician. We check this on the call, so you can book with confidence.',
      ],
    },
    {
      title: 'Fibre or cable: what is the difference?',
      body: [
        'Fibre gives equally fast upload and download speeds and is available in many newer towers. Cable is widely available and fine for streaming. Your address check shows what your building supports.',
      ],
    },
  ],
  facts: {
    title: 'Key facts',
    items: [
      { label: 'Price range', value: '$55–$105/mo, CAD + tax' },
      { label: 'Typical install', value: 'About 3 days after your call' },
      { label: 'Top speed', value: 'Up to 1.5 Gbps' },
      { label: 'Data', value: 'Unlimited on every plan' },
      { label: 'Equipment', value: 'WiFi modem included' },
      { label: 'Network', value: 'Rogers' },
    ],
    note: 'Updated 5 October 2026',
  },
});

const faq = (region: string, installAnswer: string): readonly LandingFaqItem[] => [
  {
    id: 'installation',
    question: `How fast can you install internet in ${region}?`,
    answer: installAnswer,
  },
  {
    id: 'credit',
    question: 'Do I need a Canadian credit history for home internet?',
    answer:
      'Not always. Many newcomers sign up with a passport and permit. If a deposit or a different plan is needed, your advisor tells you before anything is booked.',
  },
  {
    id: 'fibre',
    question: 'Is fibre available in my building?',
    answer:
      'It depends on the exact building. Your advisor confirms what is available at your address on the call.',
  },
  {
    id: 'suite',
    question: 'Do you install in basement suites?',
    answer:
      'This answer is awaiting approved content. An advisor confirms the wiring and account options for your address.',
    pending: true,
  },
  {
    id: 'move',
    question: 'What happens if I move?',
    answer:
      'This answer is awaiting approved content. Transfer options depend on the new address; ask an advisor before you move.',
    pending: true,
  },
];

const related = (other: { label: string; href: string }) => ({
  title: 'Keep exploring',
  groups: [
    {
      title: 'Other regions',
      links: [other],
    },
    {
      title: 'Internet',
      links: [
        { label: 'All home internet plans', href: '/home-internet' },
        { label: 'Business internet', href: '/business-internet' },
      ],
    },
    {
      title: 'New to Canada',
      links: [
        { label: 'Pre-arrival SIM plans', href: '/pre-arrival-sim' },
        { label: 'Newcomer guides', href: '/guides' },
      ],
    },
  ],
  note: 'Prices in Canadian dollars, before tax, as of October 2026. Coverage, speeds and install times are typical examples; your address check and advisor confirm what applies to you.',
});

const highlights = ['Free professional install', 'Unlimited data', 'Nothing to pay until we call'];

export const vancouverInternetLanding: LandingPageContent = {
  path: '/home-internet/vancouver',
  title: 'Home Internet in Vancouver: Plans from $55, Installed in ~3 Days | Canadian Plans',
  description:
    'Home internet in Vancouver for apartments, condos and basement suites. Unlimited data, WiFi modem and free install on the Rogers network, from $55/month.',
  mainId: 'vancouver-main',
  skip: landingSkip,
  tone: 'mint',
  breadcrumb: {
    ...landingBreadcrumb,
    items: [
      { label: 'Home', href: '/' },
      { label: 'Home Internet', href: '/home-internet' },
      { label: 'Vancouver' },
    ],
  },
  hero: {
    eyebrow: 'Home internet · Vancouver, BC',
    title: 'Home internet in Vancouver, installed in about 3 days',
    description:
      'Rogers-network internet for apartments, condos and basement suites. Unlimited data, a WiFi modem and free professional install.',
    action: { label: 'Check my address', href: '#plans' },
    pricePrefix: 'from',
    price: '$55',
    priceSuffix: '/mo',
    photo: 'PHOTO · technician connecting a WiFi modem in a Vancouver apartment',
    highlights,
  },
  byline: 'Updated 5 October 2026 · Reviewed by a Canadian Plans plan advisor',
  onThisPage: {
    label: 'On this page',
    links: [
      { label: 'Check your address', href: '#plans' },
      { label: 'Coverage', href: '#coverage' },
      { label: 'Renter’s guide', href: '#guide' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  quick: {
    eyebrow: 'Quick answer',
    title: 'How much is home internet in Vancouver?',
    answer:
      'With us, Rogers-network home internet in Vancouver starts at $55 a month for 150 Mbps (CAD, plus tax), with unlimited data, a WiFi modem and free professional installation. Most homes are installed within about 3 days of your call.',
  },
  facts: {
    label: 'Vancouver internet facts',
    items: [
      { label: 'Typical install', value: '3 days', detail: 'After your call' },
      { label: 'Top speed', value: '1.5 Gbps', detail: 'In most buildings' },
      { label: 'Starting price', value: '$55/mo', detail: 'CAD, plus tax' },
      { label: 'Neighbourhoods', value: '8 listed', detail: 'See coverage below' },
    ],
  },
  blocks: [
    steps('Vancouver'),
    { kind: 'slot', id: 'plans' },
    {
      kind: 'table',
      id: 'coverage',
      eyebrow: 'Coverage',
      title: 'Vancouver internet coverage by neighbourhood',
      description:
        'Typical availability. Your exact building is confirmed by the address check and your advisor.',
      caption: 'Typical internet speed, network type and install time by Vancouver neighbourhood',
      columns: ['Neighbourhood', 'Postal codes', 'Top speed', 'Network', 'Typical install'],
      rows: [
        {
          label: 'Downtown and West End',
          values: ['V6B, V6E, V6G', '1.5 Gbps', 'Fibre, cable', '2–3 days'],
        },
        {
          label: 'Yaletown and False Creek',
          values: ['V6Z, V6H', '1.5 Gbps', 'Fibre', '2–3 days'],
        },
        {
          label: 'Kitsilano and Fairview',
          values: ['V6K, V6J', '1 Gbps', 'Fibre, cable', '3 days'],
        },
        { label: 'Mount Pleasant and Main', values: ['V5T, V5V', '1 Gbps', 'Cable', '3–4 days'] },
        {
          label: 'East Vancouver',
          values: ['V5L, V5N, V5K', '1 Gbps', 'Fibre, cable', '3–4 days'],
        },
        { label: 'Kerrisdale and Marpole', values: ['V6M, V6P', '500 Mbps', 'Cable', '3–5 days'] },
        { label: 'UBC area', values: ['V6T', '1 Gbps', 'Fibre', '3 days'] },
        { label: 'South Vancouver', values: ['V5P, V5X', '500 Mbps', 'Cable', '3–5 days'] },
      ],
    },
    homeTypes,
    guide('Vancouver'),
  ],
  faq: {
    intro: landingFaqIntro({
      eyebrow: 'FAQ',
      title: 'Vancouver internet questions',
      description: 'Advisors are available Monday to Saturday, 9am–9pm Pacific time.',
    }),
    items: faq(
      'Vancouver',
      'Most installs happen within about 3 days of your call. Tell us your move-in date and we book the first slot after you get the keys.',
    ),
  },
  related: related({ label: 'Home internet in Ontario', href: '/home-internet/ontario' }),
  cta: {
    title: 'Online on move-in day in Vancouver',
    subtitle: 'Check your address in about 2 minutes. An advisor confirms it the same day.',
    primary: { label: 'Check my address →', href: '#plans' },
    secondary: { label: 'Talk to an advisor ›', href: '/contact' },
    icon: 'cta-home-internet',
  },
};

export const ontarioInternetLanding: LandingPageContent = {
  path: '/home-internet/ontario',
  title: 'Home Internet in Ontario: Toronto, Ottawa & More from $55 | Canadian Plans',
  description:
    'Home internet across Ontario, from Toronto and Ottawa to Hamilton and London. Unlimited data, WiFi modem and free install on the Rogers network, from $55/month.',
  mainId: 'ontario-main',
  skip: landingSkip,
  tone: 'mint',
  breadcrumb: {
    ...landingBreadcrumb,
    items: [
      { label: 'Home', href: '/' },
      { label: 'Home Internet', href: '/home-internet' },
      { label: 'Ontario' },
    ],
  },
  hero: {
    eyebrow: 'Home internet · Ontario',
    title: 'Home internet in Ontario, city by city',
    description:
      'Rogers-network internet in Toronto, Ottawa, Mississauga and more. Unlimited data, a WiFi modem and free professional install.',
    action: { label: 'Check my address', href: '#plans' },
    pricePrefix: 'from',
    price: '$55',
    priceSuffix: '/mo',
    photo: 'PHOTO · technician connecting a WiFi modem in a Toronto condo',
    highlights,
  },
  byline: 'Updated 5 October 2026 · Reviewed by a Canadian Plans plan advisor',
  onThisPage: {
    label: 'On this page',
    links: [
      { label: 'Check your address', href: '#plans' },
      { label: 'Cities', href: '#coverage' },
      { label: 'Renter’s guide', href: '#guide' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  quick: {
    eyebrow: 'Quick answer',
    title: 'How much is home internet in Ontario?',
    answer:
      'With us, home internet across Ontario starts at $55 a month for 150 Mbps (CAD, plus tax), with unlimited data, a WiFi modem and free professional install. Most addresses are installed within about 3 days of your call.',
  },
  facts: {
    label: 'Ontario internet facts',
    items: [
      { label: 'Typical install', value: '3 days', detail: 'After your call' },
      { label: 'Top speed', value: '1.5 Gbps', detail: 'In most buildings' },
      { label: 'Starting price', value: '$55/mo', detail: 'CAD, plus tax' },
      { label: 'Cities', value: '8 listed', detail: 'See the city list below' },
    ],
  },
  blocks: [
    steps('Ontario'),
    { kind: 'slot', id: 'plans' },
    {
      kind: 'table',
      id: 'coverage',
      eyebrow: 'Cities',
      title: 'Home internet in Ontario cities',
      description:
        'Coverage and pricing vary by city. Your exact address is confirmed by the address check and your advisor.',
      caption: 'Starting price and network type by Ontario city',
      columns: ['City', 'Postal codes', 'Plans from', 'Network'],
      rows: [
        { label: 'Toronto', values: ['M4, M5, M6', '$55/mo', 'Fibre, cable'] },
        { label: 'Ottawa', values: ['K1, K2', '$55/mo', 'Fibre'] },
        { label: 'Mississauga', values: ['L4, L5', '$55/mo', 'Fibre, cable'] },
        { label: 'Hamilton', values: ['L8, L9', '$58/mo', 'Cable'] },
        { label: 'London', values: ['N5, N6', '$58/mo', 'Cable'] },
        { label: 'Kitchener', values: ['N2', '$55/mo', 'Fibre'] },
        { label: 'Windsor', values: ['N8, N9', '$60/mo', 'Cable'] },
        { label: 'Vaughan', values: ['L4, L6', '$55/mo', 'Fibre'] },
      ],
    },
    homeTypes,
    guide('Ontario'),
  ],
  faq: {
    intro: landingFaqIntro({
      eyebrow: 'FAQ',
      title: 'Ontario internet questions',
      description:
        'Advisors are available Monday to Saturday, 9am–9pm Pacific (noon to midnight Eastern).',
    }),
    items: faq(
      'Ontario',
      'Most addresses are installed within about 3 days of your call. Tell us your move-in date and we book the first slot after you get the keys.',
    ),
  },
  related: related({ label: 'Home internet in Vancouver', href: '/home-internet/vancouver' }),
  cta: {
    title: 'Online on move-in day in Ontario',
    subtitle: 'Check your address in about 2 minutes. An advisor confirms it the same day.',
    primary: { label: 'Check my address →', href: '#plans' },
    secondary: { label: 'Talk to an advisor ›', href: '/contact' },
    icon: 'cta-home-internet',
  },
};

/** Address check + speed cards heading on the region pages. */
export const internetLandingPlans = {
  eyebrow: 'Check your address',
  title: 'Is internet available at your address?',
  price: 'From $55/mo',
  priceNote: 'CAD, plus tax. Pay $0 to order.',
  speedsEyebrow: 'Internet plans',
  speedsTitle: 'Pick your internet speed',
  date: 'Prices as of October 2026 · CAD, taxes extra',
};
