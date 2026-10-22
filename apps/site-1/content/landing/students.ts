import {
  eSimCheck,
  landingBreadcrumb,
  landingFaqIntro,
  landingSkip,
  preArrivalSteps,
  pricesNote,
} from './shared';
import type { LandingPageContent } from './types';

/**
 * /pre-arrival-sim/students — primary keywords: student SIM card Canada, international
 * student eSIM Canada, best phone plan for international students in Canada.
 * Facts carried over from the 5 Oct 2026 page; nothing new is claimed.
 */
export const studentsLanding: LandingPageContent = {
  path: '/pre-arrival-sim/students',
  title: 'Student SIM Card & eSIM for Canada (2026) | Canadian Plans',
  description:
    'Get a Canadian SIM card or eSIM before you fly. Student plans from $35/month, no Canadian credit history, Rogers, Fido and Chatr from an authorized dealer.',
  mainId: 'students-main',
  skip: landingSkip,
  tone: 'amber',
  breadcrumb: {
    ...landingBreadcrumb,
    items: [
      { label: 'Home', href: '/' },
      { label: 'Pre-arrival SIM', href: '/pre-arrival-sim' },
      { label: 'International students' },
    ],
  },
  hero: {
    eyebrow: 'Student SIM · Canada',
    title: 'Student SIM and eSIM for Canada, ready before your first class',
    description:
      'Order from home, get your Canadian number right away and switch it on when you land. Rogers, Fido and Chatr plans with no Canadian credit history needed.',
    action: { label: 'See student plans', href: '#plans' },
    pricePrefix: 'from',
    price: '$35',
    priceSuffix: '/mo',
    photo: 'PHOTO · student checking a new Canadian number at Toronto Pearson arrivals',
    highlights: ['Order from any country', 'No credit check', 'Nothing to pay online'],
  },
  byline: 'Updated 5 October 2026 · Reviewed by a Canadian Plans plan advisor',
  onThisPage: {
    label: 'On this page',
    links: [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Student plans', href: '#plans' },
      { label: 'What you need', href: '#documents' },
      { label: 'Student guide', href: '#guide' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  quick: {
    eyebrow: 'Quick answer',
    title: 'What is the best SIM card for international students in Canada?',
    answer:
      'Most international students do well with a 75 to 100 GB eSIM plan. Order it 1 to 3 weeks before your flight, from any country, and your Canadian number is ready for bank and college forms before you land. Plans start at $35 a month (CAD, plus tax) and you don’t need a Canadian credit history.',
  },
  facts: {
    label: 'Student plan facts',
    items: [
      { label: 'Price', value: '$35–$50/mo', detail: 'CAD, plus tax' },
      { label: 'Data', value: '75–120 GB', detail: 'Every month' },
      { label: 'Credit check', value: 'None', detail: 'No Canadian history needed' },
      { label: 'Order', value: '1–3 weeks before', detail: 'From any country' },
    ],
  },
  blocks: [
    preArrivalSteps('Get your student SIM in 3 steps'),
    { kind: 'slot', id: 'plans' },
    {
      kind: 'checklist',
      id: 'documents',
      eyebrow: 'Before you order',
      title: 'What you need to order a student SIM',
      description:
        'You do not upload anything to order. Have these ready in case your advisor asks for them.',
      mark: '✓',
      items: [
        { title: 'Passport', body: 'The photo page. Your name should match your study permit.' },
        {
          title: 'Study permit or letter of introduction',
          body: 'Your study permit or letter of introduction. You can order before the permit itself arrives.',
        },
        { title: 'Arrival date and city', body: 'So your plan starts the day you land.' },
        { title: 'Email address', body: 'We send your eSIM QR code here.' },
      ],
      aside: eSimCheck,
    },
    {
      kind: 'article',
      id: 'guide',
      eyebrow: 'Student guide',
      title: 'Phone plans for international students in Canada: a short guide',
      sections: [
        {
          title: 'How much data do international students need?',
          body: [
            'Campus WiFi covers most classes and libraries, so many students use 15–30 GB a month. Our plans start at 75 GB, which leaves room for daily video calls home and streaming on the bus.',
            'You can change your plan after the first month if you use more or less than expected.',
          ],
        },
        {
          title: 'Prepaid or postpaid as a student?',
          body: [
            'Postpaid plans bought in a Canadian store usually need a credit check or a deposit. Our pre-arrival plans are postpaid but skip that: no Canadian credit history and nothing to pay upfront.',
            'Prepaid also works from day one if you would rather top up each month.',
          ],
        },
        {
          title: 'Which carrier works best on campus?',
          body: [
            'Rogers, Fido and Chatr all run on the Rogers network, so coverage on campus is the same. The difference is price and extras: Chatr is the cheapest, Fido is the best value and Rogers adds 5G+ and US roaming.',
          ],
        },
      ],
      facts: {
        title: 'Key facts',
        items: [
          { label: 'Price range', value: '$35–$50/mo, CAD + tax' },
          { label: 'Credit check', value: 'None needed' },
          { label: 'When to order', value: '1–3 weeks before your flight' },
          { label: 'How you get it', value: 'eSIM by email, from any country' },
          { label: 'Plan starts', value: 'When you land' },
          { label: 'Networks', value: 'Rogers, Fido, Chatr' },
        ],
        note: 'Updated 5 October 2026',
      },
    },
  ],
  faq: {
    intro: landingFaqIntro({
      eyebrow: 'FAQ',
      title: 'Student SIM questions',
      description: 'Advisors are available Monday to Saturday, 9am–9pm Pacific time.',
    }),
    items: [
      {
        id: 'student-permit',
        question: 'Can I order a Canadian SIM before I get my study permit?',
        answer:
          'Yes. Order with your passport and letter of introduction; we activate the line once you land with your permit.',
      },
      {
        id: 'student-pay',
        question: 'When do I pay for my student plan?',
        answer:
          'Nothing is paid online. Once your number is active, your first bill comes from Rogers or Fido, and an advisor walks you through the date before anything is billed.',
      },
      {
        id: 'student-esim',
        question: 'How do I know if my phone supports eSIM?',
        answer:
          'Check your phone settings for an EID or an “Add eSIM” option. Your phone also has to be unlocked. Send us the model if you are unsure.',
      },
      {
        id: 'student-discount',
        question: 'Is there a student discount?',
        answer:
          'This answer is awaiting approved content. Ask an advisor to confirm current offers.',
        pending: true,
      },
      {
        id: 'student-flight',
        question: 'What if my flight date changes?',
        answer:
          'This answer is awaiting approved content. Ask an advisor about your dates before ordering.',
        pending: true,
      },
      {
        id: 'student-parents',
        question: 'Can my parents pay for my plan?',
        answer: 'This answer is awaiting approved content. Ask an advisor about payment options.',
        pending: true,
      },
    ],
  },
  related: {
    title: 'Keep exploring',
    groups: [
      {
        title: 'Moving from',
        links: [{ label: 'India', href: '/pre-arrival-sim/from-india' }],
      },
      {
        title: 'Arriving at',
        links: [{ label: 'Toronto Pearson (YYZ)', href: '/pre-arrival-sim/toronto-pearson' }],
      },
      {
        title: 'Compare and learn',
        links: [
          { label: 'All pre-arrival plans', href: '/pre-arrival-sim' },
          { label: 'Newcomer guides', href: '/guides' },
        ],
      },
    ],
    note: pricesNote,
  },
  cta: {
    title: 'Your Canadian number, ready before your first class',
    subtitle: 'Choose a plan in about 2 minutes. Nothing to pay today.',
    primary: { label: 'See student plans →', href: '#plans' },
    secondary: { label: 'Talk to an advisor ›', href: '/contact' },
    icon: 'cta-pre-arrival',
  },
};

/** Plan block heading on the students page; the plan list itself is shared. */
export const studentsPlanHeading = {
  title: ['Pick your student plan'],
  description:
    'Every plan is an eSIM with nothing to pay upfront, and it works the minute you land. Choose “Student” to see what most students pick.',
};
