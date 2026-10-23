import {
  landingBreadcrumb,
  landingFaqIntro,
  landingSkip,
  preArrivalDocuments,
  preArrivalSteps,
  pricesNote,
  sharedArrivalFaq,
} from './shared';
import type { LandingPageContent } from './types';

/**
 * /pre-arrival-sim/toronto-pearson (SEO rewrite, 23 October 2026). Primary phrase: SIM card
 * at Toronto Pearson airport; supporting: eSIM Toronto airport, YYZ SIM card, phone signal
 * when you land in Toronto. Facts from docs/LAUNCH_PLANS.md table D.
 */
export const torontoPearsonLanding: LandingPageContent = {
  path: '/pre-arrival-sim/toronto-pearson',
  title: 'Toronto Pearson (YYZ) SIM Card & eSIM Before You Land | Canadian Plans',
  description:
    'Landing at Toronto Pearson? Skip the airport SIM kiosk. Order a Rogers, Fido or Chatr eSIM before you fly and switch it on at YYZ. From $35/month, no credit check.',
  mainId: 'pearson-main',
  skip: landingSkip,
  tone: 'amber',
  breadcrumb: {
    ...landingBreadcrumb,
    items: [
      { label: 'Home', href: '/' },
      { label: 'SIM before you arrive', href: '/pre-arrival-sim' },
      { label: 'Toronto Pearson (YYZ)' },
    ],
  },
  hero: {
    eyebrow: 'Airport eSIM · Toronto Pearson (YYZ)',
    title: 'Toronto Pearson eSIM: signal before you leave the gate',
    description:
      'Order your Canadian eSIM before you fly and switch it on when you land at YYZ. No airport SIM kiosk, no line after a long flight, and no roaming charges from your home carrier.',
    action: { label: 'See eSIM plans', href: '#plans' },
    pricePrefix: 'from',
    price: '$35',
    priceSuffix: '/mo',
    photo: 'PHOTO · traveller at Pearson arrivals turning off airplane mode',
    highlights: ['No airport kiosk', 'Order from any country', 'Nothing paid online'],
  },
  byline: 'Updated 23 October 2026 · Checked by a Canadian Plans plan advisor',
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
      'Yes, if you order a Canadian eSIM before you fly. Order 1 to 3 weeks ahead, install the eSIM at home, and when you land at Pearson (YYZ) turn off airplane mode: calls, texts and data work before you reach baggage claim, with no airport WiFi or SIM kiosk needed. Plans start at $35 a month (CAD, plus tax), with no credit check and nothing paid online.',
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
    preArrivalDocuments('documents', 'What to have ready before you land', {
      title: 'Study or work permit, visa, or PR confirmation',
      body: 'The document you are travelling on.',
    }),
    {
      kind: 'article',
      id: 'guide',
      eyebrow: 'Arrival guide',
      title: 'Arriving at Toronto Pearson: your phone guide',
      sections: [
        {
          title: 'Is there free WiFi at Pearson Airport?',
          body: [
            'Yes, Pearson has free WiFi, but you have to log in and it can be slow at peak times. With your eSIM already installed you can book a ride, message family and check your transit route the moment you land.',
          ],
        },
        {
          title: 'Should I buy a SIM card at Toronto airport?',
          body: [
            'You can, but airport counters often charge more, and there can be a line after a long flight. Ordering before you fly means your number is already on your bank and college forms, and you are online the moment you switch on.',
          ],
        },
        {
          title: 'Which network works best in Toronto?',
          body: [
            'Rogers, Fido and Chatr all use the Rogers network, which covers Toronto, the GTA and the UP Express and GO Transit routes out of Pearson well. The difference between the three brands is price and extras, not signal.',
          ],
        },
        {
          title: 'Getting from Pearson into the city',
          body: [
            'The UP Express train runs from Terminal 1 to Union Station downtown; GO buses and TTC buses leave from both terminals. Having data on arrival lets you buy your ticket, check times and share your location with whoever is meeting you.',
          ],
        },
      ],
      facts: {
        title: 'Key facts',
        items: [
          { label: 'Price range', value: '$35–$50/mo, CAD + tax' },
          { label: 'Paid online', value: '$0, nothing paid upfront' },
          { label: 'When to order', value: '1–3 weeks before your flight' },
          { label: 'How you get it', value: 'eSIM by email, any country' },
          { label: 'Plan starts', value: 'When you land' },
          { label: 'Carriers', value: 'Rogers, Fido, Chatr' },
        ],
        note: 'Updated 23 October 2026',
      },
    },
  ],
  faq: {
    intro: landingFaqIntro({
      eyebrow: 'FAQ',
      title: 'Pearson arrival questions',
      description:
        'Advisors are available Monday to Saturday, 9am to 9pm Pacific (noon to midnight Eastern).',
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
          'Yes. Choose a plan and an advisor will call or email you to confirm. If you need a number right now, call us and we tell you the fastest way to get connected.',
      },
      sharedArrivalFaq.wifi,
      sharedArrivalFaq.esim,
      sharedArrivalFaq.airport,
      sharedArrivalFaq.family,
      sharedArrivalFaq.cancel,
    ],
  },
  related: {
    title: 'Keep exploring',
    groups: [
      {
        title: 'Who you are',
        links: [
          { label: 'International students', href: '/pre-arrival-sim/students' },
          { label: 'Work permit holders', href: '/pre-arrival-sim/workers' },
          { label: 'New permanent residents', href: '/pre-arrival-sim/new-immigrants' },
          { label: 'Visitors and Super Visa', href: '/pre-arrival-sim/visitors' },
        ],
      },
      {
        title: 'Moving from',
        links: [{ label: 'India', href: '/pre-arrival-sim/from-india' }],
      },
      {
        title: 'Compare and learn',
        links: [
          { label: 'All eSIM plans', href: '/pre-arrival-sim' },
          { label: 'Newcomer guides', href: '/guides' },
        ],
      },
    ],
    note: pricesNote,
  },
  cta: {
    title: 'Signal on before you clear customs',
    subtitle: 'Choose a plan in about 2 minutes. No credit check, nothing paid online.',
    primary: { label: 'See eSIM plans →', href: '#plans' },
    secondary: { label: 'Talk to an advisor ›', href: '/contact' },
    icon: 'cta-pre-arrival',
  },
};

export const torontoPearsonPlanHeading = {
  title: ['Pick your plan before you land'],
  description:
    'Every plan is an eSIM with nothing paid online, and it works the minute you land at YYZ.',
};
