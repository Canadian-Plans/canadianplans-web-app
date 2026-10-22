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
 * /pre-arrival-sim/toronto-pearson — primary keywords: Toronto Pearson eSIM, YYZ SIM card,
 * SIM card at Toronto airport, phone signal when landing in Toronto.
 * Facts carried over from the 5 Oct 2026 page; nothing new is claimed.
 */
export const torontoPearsonLanding: LandingPageContent = {
  path: '/pre-arrival-sim/toronto-pearson',
  title: 'Toronto Pearson (YYZ) eSIM: Be Online When You Land | Canadian Plans',
  description:
    'Landing at Toronto Pearson? Order a Canadian eSIM before you fly and switch it on at YYZ. No airport SIM kiosk, no roaming. Plans from $35/month.',
  mainId: 'pearson-main',
  skip: landingSkip,
  tone: 'amber',
  breadcrumb: {
    ...landingBreadcrumb,
    items: [
      { label: 'Home', href: '/' },
      { label: 'Pre-arrival SIM', href: '/pre-arrival-sim' },
      { label: 'Toronto Pearson (YYZ)' },
    ],
  },
  hero: {
    eyebrow: 'Airport eSIM · Toronto Pearson (YYZ)',
    title: 'Toronto Pearson eSIM: signal before you leave the gate',
    description:
      'Order your eSIM before you fly and switch it on when you land at YYZ. No airport kiosk, no line and no roaming charges.',
    action: { label: 'See eSIM plans', href: '#plans' },
    pricePrefix: 'from',
    price: '$35',
    priceSuffix: '/mo',
    photo: 'PHOTO · traveller at Pearson arrivals turning off airplane mode',
    highlights: ['No airport kiosk', 'Order from any country', 'Nothing to pay online'],
  },
  byline: 'Updated 5 October 2026 · Reviewed by a Canadian Plans plan advisor',
  onThisPage: {
    label: 'On this page',
    links: [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Plans', href: '#plans' },
      { label: 'What you need', href: '#documents' },
      { label: 'Pearson guide', href: '#guide' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  quick: {
    eyebrow: 'Quick answer',
    title: 'Can I use my phone as soon as I land at Toronto Pearson?',
    answer:
      'Yes. Order a Canadian eSIM 1 to 3 weeks before your flight and install it at home. When you land at Pearson (YYZ), turn off airplane mode and you are connected, with no airport WiFi or SIM kiosk needed. Plans start at $35 a month (CAD, plus tax).',
  },
  facts: {
    label: 'Pearson arrival facts',
    items: [
      { label: 'Airport', value: 'YYZ', detail: 'Terminals 1 and 3' },
      { label: 'Price', value: '$35–$50/mo', detail: 'CAD, plus tax' },
      { label: 'Order', value: '1–3 weeks before', detail: 'From any country' },
      { label: 'Online', value: 'On landing', detail: 'Turn off airplane mode' },
    ],
  },
  blocks: [
    preArrivalSteps('From touchdown at YYZ to texting home'),
    { kind: 'slot', id: 'plans' },
    {
      kind: 'checklist',
      id: 'documents',
      eyebrow: 'Before you fly',
      title: 'What to have ready before you land',
      description:
        'You do not upload anything to order. Have these ready in case your advisor asks for them.',
      mark: '✓',
      items: [
        { title: 'Passport', body: 'The photo page, with your name and photo.' },
        {
          title: 'Study or work permit, or PR confirmation',
          body: 'The document you are travelling on.',
        },
        { title: 'Arrival date and city', body: 'So your plan starts the day you land.' },
        { title: 'Email address', body: 'We send your eSIM QR code here.' },
      ],
      aside: eSimCheck,
    },
    {
      kind: 'article',
      id: 'guide',
      eyebrow: 'Arrival guide',
      title: 'Arriving at Toronto Pearson: your phone guide',
      sections: [
        {
          title: 'Is there free WiFi at Pearson Airport?',
          body: [
            'Yes, Pearson has free WiFi, but you have to log in and it can be busy at peak times. With your eSIM already installed, you can book a ride or message family right away.',
          ],
        },
        {
          title: 'Should I buy a SIM card at Toronto airport?',
          body: [
            'You can, but airport prices are often higher and there may be a line after a long flight. Ordering before you fly means your number is ready for forms, and you are online the moment you land.',
          ],
        },
        {
          title: 'Which network works best in Toronto?',
          body: [
            'Rogers, Fido and Chatr all use the Rogers network, which covers Toronto and the GTA well. The difference between them is price and extras, not signal.',
          ],
        },
      ],
      facts: {
        title: 'Key facts',
        items: [
          { label: 'Price range', value: '$35–$50/mo, CAD + tax' },
          { label: 'Payment today', value: '$0, nothing paid upfront' },
          { label: 'When to order', value: '1–3 weeks before your flight' },
          { label: 'How you get it', value: 'eSIM by email, any country' },
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
      title: 'Pearson arrival questions',
      description:
        'Advisors are available Monday to Saturday, 9am–9pm Pacific (noon to midnight Eastern).',
    }),
    items: [
      {
        id: 'arrival',
        question: 'Will my eSIM work the moment I land at YYZ?',
        answer:
          'Yes. If you install it at home before your flight, it connects as soon as you turn off airplane mode at Pearson.',
      },
      {
        id: 'landed',
        question: 'I have already landed. Can I still order?',
        answer:
          'Yes. Choose a plan and an advisor will call you to confirm. If you need a number right now, message us on WhatsApp and we will tell you the fastest way to get connected.',
      },
      {
        id: 'device',
        question: 'How do I know if my phone supports eSIM?',
        answer:
          'Check your phone settings for an EID or an “Add eSIM” option. Your phone also has to be unlocked. Send us the model if you are unsure.',
      },
      {
        id: 'wifi',
        question: 'Do I need WiFi at the airport to turn it on?',
        answer: 'This answer is awaiting approved content. Talk to an advisor for current details.',
        pending: true,
      },
      {
        id: 'flight',
        question: 'What if my flight changes?',
        answer: 'This answer is awaiting approved content. Talk to an advisor for current details.',
        pending: true,
      },
      {
        id: 'family',
        question: 'Can I order eSIMs for my whole family?',
        answer: 'This answer is awaiting approved content. Talk to an advisor for current details.',
        pending: true,
      },
      {
        id: 'airport',
        question: 'What if I land at a different airport?',
        answer: 'This answer is awaiting approved content. Talk to an advisor for current details.',
        pending: true,
      },
    ],
  },
  related: {
    title: 'Keep exploring',
    groups: [
      {
        title: 'Who you are',
        links: [
          { label: 'International students', href: '/pre-arrival-sim/students' },
          { label: 'Workers, residents and visitors', href: '/pre-arrival-sim#plans' },
        ],
      },
      {
        title: 'Moving from',
        links: [{ label: 'India', href: '/pre-arrival-sim/from-india' }],
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
    title: 'Signal on before you clear customs',
    subtitle: 'Choose a plan in about 2 minutes. Nothing to pay today.',
    primary: { label: 'See eSIM plans →', href: '#plans' },
    secondary: { label: 'Talk to an advisor ›', href: '/contact' },
    icon: 'cta-pre-arrival',
  },
};

export const torontoPearsonPlanHeading = {
  title: ['Pick your plan before you land'],
  description:
    'Every plan is an eSIM with nothing to pay upfront, and it works the minute you land at YYZ.',
};
