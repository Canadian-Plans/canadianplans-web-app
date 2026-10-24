import type { CpStepContent } from '@canadian-plans/ui/canadian-plans';
import {
  landingAbout,
  landingChrome,
  landingFaqIntro,
  type LandingFaq,
  type LandingKitPage,
  type LandingKitShared,
  type LandingPlanCard,
} from './landing-kit';
import { mobileCopy, mobilePlans, type MobilePlan } from './mobile-plans';
import { MAX_LINES } from './order-forms';

/**
 * /mobile-plans landing page (24 October 2026) on the category landing kit. Plans, prices
 * and inclusions come from content/mobile-plans.ts, which mirrors the backend catalogue
 * (LAUNCH_PLANS.md table C, re-read from canadawideinternet.com/mobility on 23 October
 * 2026). Research for the section order is in docs/LANDING_PAGES.md.
 */

const lowestPrice = Math.min(...mobilePlans.map((plan) => plan.priceCad));
const planHref = (plan: MobilePlan) => `/order?plan=${plan.id}&category=mobile`;
const byId = (id: string): MobilePlan => {
  const plan = mobilePlans.find((candidate) => candidate.id === id);
  if (!plan) throw new Error(`Unknown mobile plan ${id}`);
  return plan;
};

const priceNote = 'CAD · taxes extra · $10 pre-authorized payment discount included';

const card = (
  plan: MobilePlan,
  context: string,
  includesTitle: string,
  includes: readonly string[],
): LandingPlanCard => ({
  id: plan.id,
  href: planHref(plan),
  featured: plan.featured,
  ...(plan.badge ? { tag: plan.badge } : {}),
  eyebrow: plan.carrier,
  name: plan.allowance,
  context,
  currency: '$',
  price: `${plan.priceCad}`,
  period: '/mo',
  priceNote,
  action: `Choose ${plan.allowance}`,
  includesTitle,
  includes,
});

/** The three cards in one row: the entry plan lists everything, 175 GB says what it adds. */
export const mobilePlanCards: readonly LandingPlanCard[] = [
  card(byId('mobile-5g-plus-complete-100'), 'Best for most people', 'Includes:', [
    '100 GB of 5G+ data, speeds up to 2 Gbps',
    'Unlimited talk & text in Canada and the US',
    'US roaming data up to 5 GB/day',
    '5-year price lock',
    'AI scam protection',
  ]),
  card(
    byId('mobile-5g-plus-complete-175'),
    'Best value while the offer lasts',
    'Everything in 100 GB, plus:',
    ['175 GB of 5G+ data, speeds up to 2 Gbps', '75 GB more for $5 more a month'],
  ),
  card(
    byId('mobile-5g-plus-complete-unlimited'),
    'Best for heavy data, hotspot and Mexico',
    'Includes:',
    [
      'Unlimited data, speeds up to 2 Gbps*',
      '50 GB mobile hotspot',
      'Unlimited talk & text',
      'Use it in Canada, the US & Mexico',
      'Nationwide 5G+ network',
    ],
  ),
];

const steps = [
  {
    id: 'choose',
    marker: '1',
    meta: 'Online · 5 minutes',
    title: 'Choose your plan and lines',
    body: `Pick a plan, how many lines (up to ${MAX_LINES}), eSIM or SIM card, and whether to keep your number. No payment, no card.`,
  },
  {
    id: 'verify',
    marker: '2',
    meta: 'Same day',
    title: 'Verify your ID',
    body: 'Upload a government ID over a secure connection. An advisor runs the identity and credit check and confirms your exact price with you.',
  },
  {
    id: 'activate',
    marker: '✓',
    meta: 'After approval',
    title: 'Activate and keep your number',
    body: 'Your eSIM arrives by email, or a SIM card is sent to you. We move your number over, and the provider bills you from then on.',
    done: true,
  },
] satisfies readonly CpStepContent[];

const faq: readonly LandingFaq[] = [
  {
    id: 'cost',
    question: 'How much is a bring-your-own-phone plan with you?',
    answer: `From $${lowestPrice}/mo for 100 GB, $60/mo for 175 GB for a limited time, and $90/mo for unlimited data, in Canadian dollars before tax. Every price already includes the $10 pre-authorized payment discount, and there is no connection fee.`,
  },
  {
    id: 'keep-number',
    question: 'Can I keep my number when I switch?',
    answer:
      'Yes. Keep your current plan active, give us your account number and PIN, and we move your number to the new plan, usually the same day. Do not cancel your old plan first, or the number is released.',
  },
  {
    id: 'unlocked',
    question: 'Is my phone unlocked, and will it work?',
    answer:
      'Any unlocked phone works. Phones sold in Canada since December 2017 are unlocked by law. On an iPhone, Settings, General, About, Carrier Lock should say "No SIM restrictions". Not sure? Send us the model and we check before you order.',
  },
  {
    id: 'esim',
    question: 'eSIM or SIM card: which should I choose?',
    answer:
      'An eSIM is built into the phone and is activated from an email, so it is the fastest. iPhone XS or later, Google Pixel 3 or later, Samsung Galaxy S21 or later and most newer phones support it. Choose a SIM card if your phone does not, or if you prefer a physical card.',
  },
  {
    id: 'credit',
    question: 'Do I need a credit check for a phone plan in Canada?',
    answer:
      'Yes, for these plans. They are postpaid, so the provider runs an identity and credit check, and you upload a government ID with your order. New to Canada with no credit history yet? Our pre-arrival SIM plans need no credit check.',
  },
  {
    id: 'pay',
    question: 'When do I pay?',
    answer:
      'Nothing is paid on this website. The provider bills you directly once your plan is active, and Canadian Plans charges no fees of its own.',
  },
  {
    id: 'postpaid',
    question: 'What does postpaid mean?',
    answer:
      'You use the plan first and the provider bills you monthly afterwards, like most Canadian plans. Prepaid plans are paid in advance; these three are postpaid with no contract.',
  },
  {
    id: 'roaming',
    question: 'Can I use my plan in the US or Mexico?',
    answer:
      'The 100 GB and 175 GB plans include unlimited talk and text in Canada and the US, with up to 5 GB of roaming data a day in the US. The Unlimited plan also works in Mexico. Outside the US, Easy Roam is available from $16 a day.',
  },
  {
    id: 'provider',
    question: 'Who provides the service?',
    answer:
      'Canadian Plans is an authorized sales agent. The provider is confirmed when your order is approved, and your service agreement is with them.',
  },
  {
    id: 'lines',
    question: 'Can I order for my family too?',
    answer: `Yes. Choose up to ${MAX_LINES} lines in one order, one plan per line, or ask an advisor to help you mix plans.`,
  },
  {
    id: 'cancel',
    question: 'Is there a contract? Can I cancel?',
    answer:
      'No contract. Cancel with us free any time before activation. After activation you cancel with the provider, month to month.',
  },
];

export const mobileLandingShared: LandingKitShared = {
  key: 'mobile-plans',
  ...landingChrome,
  mainId: 'mobile-main',
  promo: {
    text: 'Switching carriers? Keep your number. We handle the transfer for you.',
    link: { label: 'How switching works', href: '#how-it-works' },
  },
  proof: [
    { title: 'Nothing paid online', body: 'The provider bills you once your plan is active.' },
    { title: 'Keep your number', body: 'We move it from your current carrier for you.' },
    { title: 'No contract', body: 'Month to month. Cancel anytime.' },
    { title: 'eSIM or SIM card', body: 'Activate from an email, or get a card sent to you.' },
  ],
  included: {
    id: 'included',
    eyebrow: 'What you get',
    title: 'Every plan, in plain words.',
    items: [
      {
        id: 'byod',
        icon: 'why-mb-phone',
        title: 'Bring your own phone',
        body: 'Any unlocked phone works, with an eSIM or a SIM card. Nothing to buy, no device payments.',
      },
      {
        id: 'number',
        icon: 'step-mb-transfer',
        title: 'Keep your number',
        body: 'Give us your account number and PIN and we transfer your number, usually the same day.',
      },
      {
        id: 'talk',
        icon: 'why-mb-carriers',
        title: 'Unlimited talk & text',
        body: 'Unlimited calls and texts in Canada and the US on every plan, with AI scam protection.',
      },
      {
        id: 'roam',
        icon: 'why-pa-roaming',
        title: 'Use it in the US',
        body: 'Up to 5 GB of roaming data a day in the US on the 100 GB and 175 GB plans; Mexico too on Unlimited.',
      },
    ],
  },
  showcase: [
    {
      id: 'compatibility',
      eyebrow: 'Will my phone work?',
      title: 'If it is unlocked, it works.',
      body: 'Phones sold in Canada since December 2017 are unlocked by law. On an iPhone, check Settings, General, About, Carrier Lock: it should say "No SIM restrictions". Phones from abroad usually work too. Not sure? Send us the model and we check it free before you order.',
      action: { label: 'See the three plans', href: '#plans' },
      image: { caption: 'PHOTO · customer holding their own phone, new SIM card in hand' },
    },
    {
      id: 'port',
      eyebrow: 'Keep your number',
      title: 'Your number moves with you. We handle the transfer.',
      body: 'Keep your current plan active until the day we switch you. Tell us your account number and PIN, and we move the number over, usually the same day. Your old plan ends when the transfer completes, so you are never without service.',
      action: { label: 'How switching works', href: '#how-it-works' },
      image: { caption: 'PHOTO · phone showing a successful number transfer confirmation' },
      reverse: true,
    },
    {
      id: 'family',
      eyebrow: 'Families and couples',
      title: `Up to ${MAX_LINES} lines in one order.`,
      body: 'Pick a plan for each line, one request. An advisor confirms the price for every line and sets them up together, so nobody is left on the old carrier.',
      action: { label: 'Choose plans', href: '#plans' },
      image: { caption: 'PHOTO · family at a kitchen table, each with their own phone' },
    },
  ],
  showcaseLabel: 'Why switch with us',
  table: {
    id: 'compare',
    eyebrow: 'Compare',
    title: mobileCopy.comparison.title,
    lead: mobileCopy.comparison.description,
    caption: 'The three mobile plans compared',
    rowHeaderLabel: 'Feature',
    columns: mobileCopy.comparison.columns,
    recommended: 1,
    recommendedLabel: 'Limited time',
    rows: mobileCopy.comparison.rows,
    note: mobileCopy.comparison.note,
    action: { label: 'Choose a plan', href: '#plans' },
  },
  how: {
    id: 'how-it-works',
    eyebrow: 'How switching works',
    title: 'Switch in three steps, without losing your number.',
    lead: 'You choose online. A real person checks everything. Your number comes with you.',
    label: 'How switching works',
    steps,
    aside: {
      title: 'Switching from another carrier?',
      body: 'Keep your old plan active until your number has moved. If you cancel first, the number is released and cannot be transferred.',
      action: { label: 'See the plans', href: '#plans' },
    },
  },
  spotlight: {
    id: 'esim',
    eyebrow: 'eSIM or SIM card',
    title: 'Activate from an email, or get a card in the post.',
    body: 'An eSIM is a SIM built into your phone. Once your order is approved, you scan a code from our email and the plan is live in minutes, number included. Prefer a physical card, or have an older phone? Choose a SIM card and we send it to you.',
    facts: [
      { label: 'eSIM phones', value: 'iPhone XS or later, Pixel 3 or later, Galaxy S21 or later' },
      { label: 'SIM card', value: 'Any unlocked phone, sent to your address' },
      { label: 'Not sure?', value: 'Send us the model and we check it free' },
    ],
    action: { label: 'Choose a plan', href: '#plans' },
  },
  who: {
    id: 'who',
    eyebrow: 'Who switches with us',
    title: 'Built for people who already have a phone they like.',
    items: [
      {
        id: 'switcher',
        icon: 'why-mb-carriers',
        title: 'Paying too much with another carrier',
        body: 'Bring your phone, keep your number, and pay less for more data. One advisor handles the switch so nothing falls through.',
      },
      {
        id: 'family',
        icon: 'who-bz-home',
        title: 'Families and couples',
        body: `Up to ${MAX_LINES} lines in one order, each with its own plan. One request, one advisor, one switch day.`,
      },
      {
        id: 'newcomer',
        icon: 'why-mb-credit',
        title: 'Newcomers with a Canadian credit file',
        body: 'These postpaid plans need an identity and credit check. No Canadian credit history yet? Start with a pre-arrival SIM plan, which needs none.',
      },
    ],
  },
  about: landingAbout(
    'The provider is confirmed when your order is approved, after the identity and credit check.',
  ),
  faqIntro: landingFaqIntro('Mobile plan questions, answered.'),
  final: {
    icon: 'cta-mobile',
    secondary: { label: 'Talk to an advisor ›', href: '/contact' },
  },
  stickyButton: 'See plans',
  related: {
    title: 'Keep reading',
    links: [
      { label: 'Pre-arrival SIM plans', href: '/pre-arrival-sim' },
      { label: 'Home internet', href: '/home-internet' },
      { label: 'Newcomer guides', href: '/guides' },
      { label: 'FAQ', href: '/faq' },
    ],
  },
};

export const mobileLandingPage: LandingKitPage = {
  path: '/mobile-plans',
  title: 'Bring Your Own Phone Plans from $55/mo | Canadian Plans',
  description: `Three 5G+ mobile plans with unlimited talk and text, from $${lowestPrice}/mo. Bring your unlocked phone, keep your number, eSIM or SIM card, no contract. Nothing to pay online; an advisor confirms your price.`,
  breadcrumb: [{ label: 'Home', href: '/' }, { label: 'Mobile Plans' }],
  hero: {
    eyebrow: 'Mobile plans · bring your own phone · all provinces',
    title: 'Keep your phone. Keep your number. Pay less.',
    lead: `Three 5G+ plans with unlimited talk and text, from $${lowestPrice} a month. Bring your unlocked phone, choose an eSIM or a SIM card, and we move your number for you. Nothing to pay on this website.`,
    bullets: [],
    primary: { label: 'See the three plans', href: '#plans' },
    secondary: { label: 'Will my phone work?', href: '#compatibility' },
    priceLabel: 'From',
    price: `$${lowestPrice}`,
    priceSuffix: '/mo + tax',
    chips: ['No contract', 'Keep your number'],
    art: 'art-mobile',
    artLabel: 'Illustration of a phone with a 5G signal',
    badge: { top: 'Plans from', price: `$${lowestPrice}`, suffix: '/mo · CAD' },
    sticker: 'Unlimited talk & text',
  },
  plans: {
    eyebrow: 'Plans and prices',
    title: 'Three plans. Same network, same talk and text.',
    lead: 'The difference is data and where you can use it. Every price includes the $10 pre-authorized payment discount; taxes are extra.',
    date: 'Prices as of October 2026 · CAD · taxes extra',
    cardsLabel: 'Mobile plans',
    includesTitle: 'Every plan includes',
    includes: [
      'Unlimited talk & text',
      'Bring your own phone',
      'eSIM or SIM card',
      'No connection fee',
      'No contract',
    ],
    aside: {
      title: 'Need more than one line?',
      body: `Order up to ${MAX_LINES} lines in one request, one plan per line. An advisor confirms every price before anything is switched.`,
      action: { label: 'Start an order', href: '/order?category=mobile' },
    },
  },
  faq,
  final: {
    title: 'Keep your phone. Get a better plan.',
    subtitle: `From $${lowestPrice}/mo with unlimited talk and text. No contract, keep your number, nothing to pay online.`,
    primary: { label: 'See the three plans', href: '#plans' },
  },
  sticky: {
    title: `Mobile plans from $${lowestPrice}/mo`,
    detail: 'Keep your number · No contract · $0 to order',
  },
};
