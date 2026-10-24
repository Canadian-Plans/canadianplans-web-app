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
import { arrivalCopy, arrivalPlans, preArrivalProductKeys, type ArrivalPlan } from './pre-arrival';

/**
 * /pre-arrival-sim landing page (24 October 2026) on the category landing kit. Plans,
 * prices and inclusions come from content/pre-arrival.ts, which mirrors the backend
 * catalogue (LAUNCH_PLANS.md table D). Research for the section order (Airalo, Holafly,
 * aloSIM, newcomer guides, Mobbin) is in docs/LANDING_PAGES.md. No "in store" comparison
 * prices appear here: they are still unverified (LAUNCH_PLANS.md section E).
 */

const monthly = arrivalPlans.filter((plan) => plan.payType === 'Postpaid');
const prepaid = arrivalPlans.filter((plan) => plan.payType === 'Prepaid');
const lowestMonthly = Math.min(...monthly.map((plan) => Number(plan.amount.replace('$', ''))));
const lowestPrepaid = Math.min(...prepaid.map((plan) => Number(plan.amount.replace('$', ''))));

const planHref = (plan: ArrivalPlan) => {
  const key = preArrivalProductKeys[plan.id];
  if (!key) throw new Error(`No catalogue key for ${plan.id}`);
  return `/order?plan=${key}&category=sim`;
};

const card = (plan: ArrivalPlan): LandingPlanCard => ({
  id: plan.id,
  href: planHref(plan),
  featured: plan.popular,
  ...(plan.badge ? { tag: plan.badge } : {}),
  eyebrow: `${plan.carrier} · ${plan.payType}`,
  name: plan.allowance,
  context: plan.goodFor?.replace(/^Good for:\s*/u, '') ?? '',
  currency: '$',
  price: plan.amount.replace('$', ''),
  period: plan.term,
  priceNote: 'CAD · taxes extra · $0 due today',
  action: `Choose ${plan.allowance}`,
  includesTitle: 'Includes:',
  includes: plan.features.map((text) => text.replace(/^✓\s*/u, '')),
});

/** Two groups, as the catalogue sells them: monthly plans for long stays, prepaid for visitors. */
export const preArrivalPlanGroups = [
  {
    id: 'monthly',
    title: 'Staying over 90 days',
    description:
      'Study permit, work permit or permanent resident. Monthly Rogers and Fido plans, no contract.',
    cards: monthly.map(card),
  },
  {
    id: 'prepaid',
    title: 'Visiting under 90 days',
    description: 'Visitor visa or Super Visa. Prepaid Chatr plans for 30 or 90 days.',
    cards: prepaid.map(card),
  },
] as const;

const steps = [
  {
    id: 'order',
    marker: '1',
    meta: '1–3 weeks before you fly',
    title: 'Order from any country',
    body: 'Pick the plan for your stay and send your name, email, phone, destination and arrival date. About 2 minutes. No payment, no documents.',
  },
  {
    id: 'esim',
    marker: '2',
    meta: 'Same day',
    title: 'We confirm and email your eSIM',
    body: 'An advisor confirms your eligibility by phone or email, assigns your Canadian number and emails the eSIM. Install it before you fly; your number is ready for bank and school forms.',
  },
  {
    id: 'land',
    marker: '✓',
    meta: 'When you land',
    title: 'Switch it on at arrivals',
    body: 'Turn the eSIM on when you land and you are online before baggage claim. The provider bills you from activation, and we stay your contact.',
    done: true,
  },
] satisfies readonly CpStepContent[];

const faq: readonly LandingFaq[] = [
  {
    id: 'before-arrival',
    question: 'Can I get a Canadian phone number before I arrive?',
    answer: `Yes. Order 1 to 3 weeks before your flight, from any country. We email your eSIM with your Canadian number right away, and the plan starts when you land. Monthly plans from $${lowestMonthly}/mo for students, workers and permanent residents; prepaid plans from $${lowestPrepaid} for 30 days for visitors. CAD, plus tax.`,
  },
  {
    id: 'which',
    question: 'Monthly or prepaid: which plan is for me?',
    answer:
      'Staying over 90 days on a study permit, work permit or as a permanent resident? Choose a monthly Rogers or Fido plan. Visiting under 90 days on a visitor visa or Super Visa? Choose a prepaid Chatr plan for 30 or 90 days. Not sure? Tell us your permit and arrival date and an advisor picks with you.',
  },
  {
    id: 'credit',
    question: 'Do I need a Canadian credit history?',
    answer:
      'No. Pre-arrival plans need no Canadian credit history and no credit check, and you upload nothing to order. An advisor confirms your eligibility with you by phone or email.',
  },
  {
    id: 'when-order',
    question: 'When should I order?',
    answer:
      'Order 1 to 3 weeks before your flight. Your eSIM arrives by email minutes after we confirm, so your number is ready for bank and college forms right away, and billing only starts when you land.',
  },
  {
    id: 'esim-ready',
    question: 'How do I know if my phone supports eSIM?',
    answer:
      'On an iPhone, go to Settings, General, About and look for "EID" or "Digital SIM". On Samsung and Android, go to Settings, Connections, SIM manager and look for "Add eSIM". iPhone XS or later, Google Pixel 3 or later and Samsung Galaxy S20 or later all support it. Not sure? Send us your phone model and we check.',
  },
  {
    id: 'unlocked',
    question: 'Does my phone need to be unlocked?',
    answer:
      'Yes. Your phone must be unlocked and support eSIM. If it is locked to a carrier at home, ask that carrier to unlock it before you order.',
  },
  {
    id: 'home-sim',
    question: 'Can I keep my home SIM for bank codes?',
    answer:
      'Yes. On a dual-SIM phone your home SIM stays in for calls, texts and one-time codes, and the Canadian eSIM handles your data and your new number. Turn off data roaming on the home SIM to avoid charges.',
  },
  {
    id: 'pay',
    question: 'When will I be charged for my plan?',
    answer:
      'Nothing is paid on this website. Your first bill comes from Rogers, Fido or Chatr once your number is active, and an advisor walks you through the date before anything is billed.',
  },
  {
    id: 'documents',
    question: 'What documents do I need?',
    answer:
      'None to order. An advisor confirms your eligibility, for example your permit type and arrival date, by phone or email. Regular online orders upload no documents.',
  },
  {
    id: 'airport',
    question: 'Will it work at the airport?',
    answer:
      'Yes. Install the eSIM before you fly, then turn it on when you land. You are online at arrivals, with your Canadian number working for calls, texts and maps.',
  },
  {
    id: 'change',
    question: 'Can I change my plan later?',
    answer:
      'Yes. There is no contract. Talk to your advisor and they move you to a different plan or add home internet when you have an address.',
  },
];

const comparisonRows = arrivalCopy.comparison.rows.map((row) => ({
  label: row.feature,
  values: row.values,
}));

export const preArrivalLandingShared: LandingKitShared = {
  key: 'pre-arrival',
  ...landingChrome,
  mainId: 'arrival-main',
  promo: {
    text: 'Flying soon? Order your eSIM now and land with your Canadian number working.',
    link: { label: 'See pre-arrival plans', href: '#plans' },
  },
  proof: [
    { title: 'Nothing paid online', body: 'The carrier bills you once your plan is active.' },
    { title: 'Number before you fly', body: 'Ready for bank, school and job forms.' },
    { title: 'No credit check', body: 'No Canadian credit history, no deposit, no documents.' },
    { title: 'Works when you land', body: 'eSIM by email; switch it on at arrivals.' },
  ],
  included: {
    id: 'included',
    eyebrow: 'What you get',
    title: 'A real Canadian number, set up before you land.',
    items: [
      {
        id: 'number',
        icon: 'why-pa-bank',
        title: 'A Canadian number before you fly',
        body: 'Banks, schools, landlords and employers ask for one. Yours is assigned when we confirm, weeks before you land.',
      },
      {
        id: 'esim',
        icon: 'step-pa-esim',
        title: 'eSIM by email, nothing to ship',
        body: 'Scan one code before you fly. It switches on when you land, with no kiosk and no queue at arrivals.',
      },
      {
        id: 'credit',
        icon: 'why-pa-forms',
        title: 'No credit check, no deposit',
        body: 'Real Rogers, Fido and Chatr plans with no Canadian credit history needed and nothing to upload.',
      },
      {
        id: 'help',
        icon: 'why-pa-roaming',
        title: 'Help in plain English',
        body: 'One advisor by phone or email, before you fly and after you land. Our help costs nothing extra.',
      },
    ],
  },
  showcase: [
    {
      id: 'why-number',
      eyebrow: 'Why order before you fly',
      title: 'Everything in Canada asks for a Canadian number first.',
      body: 'Opening a bank account, booking your SIN appointment, signing a lease, your school portal, your first job application: each form wants a Canadian phone number. With a pre-arrival eSIM you have one weeks before you land, and it is already working when you turn your phone on at arrivals.',
      action: { label: 'See pre-arrival plans', href: '#plans' },
      image: {
        caption: 'PHOTO · newcomer at arrivals, phone in hand, Canadian signal bars on screen',
      },
    },
    {
      id: 'esim-steps',
      eyebrow: 'eSIM in three taps',
      title: 'Install at home. Switch on when you land.',
      body: 'We email a QR code. You scan it in your phone settings before you fly, so there is nothing to find at the airport. On landing you turn the eSIM on and you are online. Your home SIM can stay in for bank codes; just switch its data roaming off.',
      action: { label: 'Is my phone eSIM-ready?', href: '#compatibility' },
      image: {
        caption:
          'PHOTO · phone screen scanning an eSIM QR code next to a passport and boarding pass',
      },
      reverse: true,
    },
    {
      id: 'stay',
      eyebrow: 'Pick by your stay',
      title: 'Monthly plans for permits and PRs. Prepaid for visitors.',
      body: `Staying over 90 days on a study permit, work permit or as a permanent resident? A monthly Rogers or Fido plan from $${lowestMonthly}/mo, no contract. Visiting family or on a Super Visa for under 90 days? A prepaid Chatr plan for 30 or 90 days from $${lowestPrepaid}. An advisor confirms the fit before anything is activated.`,
      action: { label: 'Choose my plan', href: '#plans' },
      image: {
        caption: 'PHOTO · student with a suitcase video-calling family from a campus bench',
      },
    },
  ],
  showcaseLabel: 'Why order your SIM before you fly',
  table: {
    id: 'compare',
    eyebrow: arrivalCopy.comparison.heading.eyebrow,
    title: arrivalCopy.comparison.heading.title.join(' '),
    lead: 'What changes when your number is set up before you fly instead of after you land.',
    caption: arrivalCopy.comparison.label,
    rowHeaderLabel: arrivalCopy.comparison.featureLabel,
    columns: arrivalCopy.comparison.columns,
    recommended: 0,
    recommendedLabel: 'Our offer',
    rows: comparisonRows,
    note: arrivalCopy.comparison.note,
    action: { label: 'See pre-arrival plans', href: '#plans' },
  },
  how: {
    id: 'how-it-works',
    eyebrow: 'How it works',
    title: 'Ordered at home, working at arrivals.',
    lead: 'You order online from any country. A real person confirms it. Your number is live the minute you land.',
    label: 'How a pre-arrival eSIM works',
    steps,
    aside: {
      title: 'Travelling soon?',
      body: 'Add your arrival date to the order. Your plan starts when you land, not when you order, so ordering early costs nothing extra.',
      action: { label: 'Order my eSIM', href: '#plans' },
    },
  },
  spotlight: {
    id: 'compatibility',
    eyebrow: 'Is my phone eSIM-ready?',
    title: 'Most phones from the last few years are.',
    body: 'Your phone needs to be unlocked and support eSIM. On an iPhone, Settings, General, About shows an "EID" or "Digital SIM" line. On Samsung and Android, look for "Add eSIM" under SIM manager. Not sure? Send us the model and we check it free before you order.',
    facts: [
      { label: 'Apple', value: 'iPhone XS or later' },
      {
        label: 'Android',
        value: 'Google Pixel 3 or later, Samsung Galaxy S20 or later, most newer phones',
      },
      { label: 'Not sure?', value: 'Send us the model and we check it free' },
    ],
    action: { label: 'See pre-arrival plans', href: '#plans' },
  },
  who: {
    id: 'who',
    eyebrow: 'Who orders before they fly',
    title: 'Students, workers, new permanent residents and visitors.',
    items: [
      {
        id: 'student',
        icon: 'why-pa-forms',
        title: 'International students',
        body: 'A monthly Rogers or Fido plan with 1,000 minutes to India, China, Bangladesh, Mexico and the UK. Your number is ready for your school portal and your first bank account.',
      },
      {
        id: 'worker',
        icon: 'why-pa-bank',
        title: 'Workers and new permanent residents',
        body: 'Land with a number employers and landlords can call. Monthly plans with no contract; add home internet when you have an address.',
      },
      {
        id: 'visitor',
        icon: 'why-pa-roaming',
        title: 'Visitors and Super Visa',
        body: 'Prepaid Chatr plans for 30 or 90 days, activated 24 hours before you land, with unlimited Canada and US calling on the 30-day plans.',
      },
    ],
  },
  about: landingAbout(
    'Your plan is a real Rogers, Fido or Chatr account in your name; we set it up and help you afterwards.',
    'Canadian Plans is an authorized reseller of Rogers, Fido and Chatr pre-arrival plans.',
  ),
  faqIntro: landingFaqIntro('Pre-arrival SIM questions, answered.'),
  final: {
    icon: 'cta-pre-arrival',
    secondary: { label: 'Talk to an advisor ›', href: '/contact' },
  },
  stickyButton: 'See plans',
  related: {
    title: 'Keep reading',
    links: [
      { label: 'SIM plans for students', href: '/pre-arrival-sim/students' },
      { label: 'Arriving from India', href: '/pre-arrival-sim/from-india' },
      { label: 'Landing at Toronto Pearson', href: '/pre-arrival-sim/toronto-pearson' },
      { label: 'Home internet', href: '/home-internet' },
      { label: 'Mobile plans', href: '/mobile-plans' },
      { label: 'Newcomer guides', href: '/guides' },
    ],
  },
};

export const preArrivalLandingPage: LandingKitPage = {
  path: '/pre-arrival-sim',
  title: 'Pre-arrival SIM & eSIM for Canada from $35/mo | Canadian Plans',
  description: `Get a Rogers, Fido or Chatr number before you fly, from $${lowestMonthly}/mo. eSIM by email, no credit check, works the minute you land. Monthly plans for students, workers and PRs; prepaid for visitors. Nothing to pay online.`,
  breadcrumb: [{ label: 'Home', href: '/' }, { label: 'Pre-arrival SIM' }],
  hero: {
    eyebrow: 'Pre-arrival SIM · eSIM · order from any country',
    title: 'Land in Canada with your number already working.',
    lead: 'Get a Rogers, Fido or Chatr number before you fly, ready for your bank, school and job forms. We email your eSIM; it switches on when you land. No Canadian credit history needed, and nothing to pay on this website.',
    bullets: [],
    primary: { label: 'See pre-arrival plans', href: '#plans' },
    secondary: { label: 'Is my phone eSIM-ready?', href: '#compatibility' },
    priceLabel: 'From',
    price: `$${lowestMonthly}`,
    priceSuffix: '/mo + tax',
    chips: ['No credit check', '$0 to order'],
    art: 'art-pre-arrival',
    artLabel: 'Illustration of a phone with an eSIM QR code beside a passport',
    badge: { top: 'Plans from', price: `$${lowestMonthly}`, suffix: '/mo · CAD' },
    sticker: 'Number before you fly',
  },
  plans: {
    eyebrow: 'Plans and prices',
    title: 'Pick the plan for your stay.',
    lead: 'All pre-arrival plans are eSIM, with exact prices and no contract. Monthly Rogers and Fido plans for stays over 90 days; prepaid Chatr plans for visitors under 90 days. Taxes are extra.',
    date: 'Prices as of October 2026 · CAD · taxes extra',
    cardsLabel: 'Pre-arrival plans',
    includesTitle: 'Every plan includes',
    includes: [
      'Canadian number before you fly',
      'eSIM by email in minutes',
      'No Canadian credit history needed',
      'Activation help by phone or email',
      'Nothing to pay online',
    ],
    aside: {
      title: 'Not sure which group you are in?',
      body: 'Tell us your permit type and arrival date and an advisor picks the plan with you, by phone or email, before anything is activated.',
      action: { label: 'Ask an advisor', href: '/contact' },
    },
  },
  faq,
  final: {
    title: 'Land connected, not stranded.',
    subtitle: `A Canadian number from $${lowestMonthly}/mo, eSIM by email, no credit check, nothing to pay online.`,
    primary: { label: 'See pre-arrival plans', href: '#plans' },
  },
  sticky: {
    title: `Pre-arrival eSIM from $${lowestMonthly}/mo`,
    detail: 'Number before you fly · No credit check · $0 to order',
  },
};
