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
 * /pre-arrival-sim/from-india — primary keywords: Canadian SIM card in India, Canada eSIM
 * from India, SIM for Indians moving to Canada, keep Indian number in Canada.
 * Facts carried over from the 5 Oct 2026 page; nothing new is claimed.
 */
export const fromIndiaLanding: LandingPageContent = {
  path: '/pre-arrival-sim/from-india',
  title: 'Canadian SIM Card in India: Get a Canada eSIM Before You Fly | Canadian Plans',
  description:
    'Moving from India to Canada? Order a Canadian eSIM from India, get your number before you fly and keep your Indian SIM for OTPs. Plans from $35/month.',
  mainId: 'india-main',
  skip: landingSkip,
  tone: 'amber',
  breadcrumb: {
    ...landingBreadcrumb,
    items: [
      { label: 'Home', href: '/' },
      { label: 'Pre-arrival SIM', href: '/pre-arrival-sim' },
      { label: 'From India' },
    ],
  },
  hero: {
    eyebrow: 'Canada eSIM · Moving from India',
    title: 'Canadian SIM card for Indians moving to Canada',
    description:
      'Get your Canadian number while you are still in India, ready for bank, college and job forms. Rogers, Fido and Chatr eSIM plans with no Canadian credit history and nothing paid online.',
    action: { label: 'See plans for India', href: '#plans' },
    pricePrefix: 'from',
    price: '$35',
    priceSuffix: '/mo',
    photo: 'PHOTO · newcomer from India at Toronto Pearson arrivals, phone in hand',
    highlights: ['Order from India', 'No credit check', 'Keep your Indian number'],
  },
  byline: 'Updated 5 October 2026 · Reviewed by a Canadian Plans plan advisor',
  onThisPage: {
    label: 'On this page',
    links: [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Plans', href: '#plans' },
      { label: 'What you need', href: '#documents' },
      { label: 'Calling India', href: '#calling-india' },
      { label: 'India guide', href: '#guide' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  quick: {
    eyebrow: 'Quick answer',
    title: 'How do I get a Canadian SIM card in India?',
    answer:
      'Order a Canadian eSIM online from India 1 to 3 weeks before your flight. We confirm on WhatsApp, assign your Canadian number right away and email your eSIM QR code. Install it at home and it switches on when you land. Plans start at $35 a month (CAD, plus tax) and you don’t need a Canadian credit history.',
  },
  facts: {
    label: 'Plan facts for India',
    items: [
      { label: 'How to order', value: 'Online, 2 min', detail: 'Nothing paid online' },
      { label: 'eSIM delivery', value: 'Minutes', detail: 'By email, install at home' },
      { label: 'Support in IST', value: '9:30pm–9:30am', detail: 'Mon–Sat (9am–9pm PT)*' },
      { label: 'Most chosen', value: 'Rogers 100 GB', detail: '$40/mo, CAD + tax' },
    ],
    note: '*IST times are for Pacific Daylight Time and move one hour later when clocks change in November.',
  },
  blocks: [
    preArrivalSteps('Your Canadian SIM from India in 3 steps'),
    { kind: 'slot', id: 'plans' },
    {
      kind: 'checklist',
      id: 'documents',
      eyebrow: 'Before you order',
      title: 'What you need to order from India',
      description:
        'You do not upload anything to order. Have these ready in case your advisor asks for them.',
      mark: '✓',
      items: [
        { title: 'Indian passport', body: 'The photo page. Your name should match your permit.' },
        {
          title: 'Study or work permit, visa or COPR',
          body: 'The document you are travelling on.',
        },
        { title: 'Arrival date and city', body: 'So your plan starts the day you land.' },
        { title: 'Email address', body: 'We send your eSIM QR code here.' },
      ],
      aside: eSimCheck,
    },
    {
      kind: 'cards',
      id: 'calling-india',
      eyebrow: 'Stay in touch',
      title: 'How to call India from Canada',
      description: 'Three ways to keep talking to family, from free to unlimited.',
      columns: 3,
      items: [
        {
          id: 'whatsapp',
          chip: 'Free',
          title: 'WhatsApp and video calls',
          body: 'Free over WiFi or your plan’s data. Most families use this every day.',
        },
        {
          id: 'add-on',
          chip: 'Paid add-on',
          title: 'International calling add-on',
          body: 'Unlimited calls to India on top of your Canadian plan.',
        },
        {
          id: 'per-minute',
          chip: 'Per minute',
          title: 'Pay per minute',
          body: 'Good if you only call landlines in India now and then.',
        },
      ],
    },
    {
      kind: 'article',
      id: 'guide',
      eyebrow: 'India guide',
      title: 'Moving from India: setting up your phone for Canada',
      sections: [
        {
          title: 'Will my Indian phone work with a Canadian eSIM?',
          body: [
            'Yes, if it is unlocked and supports eSIM. Most recent iPhones and many Samsung and Pixel phones do.',
            'Phones bought on an Indian carrier contract may be locked, so check before you order.',
          ],
        },
        {
          title: 'Should I keep my Indian SIM?',
          body: [
            'Yes, for at least the first few months. Indian banks, UPI and Aadhaar still send one-time codes (OTPs) to your Indian number, so keep it on a low-cost plan.',
            'A dual-SIM phone lets you keep both lines: your Indian SIM and your Canadian eSIM. Turn off roaming on the Indian SIM to avoid charges, and receive OTPs over WiFi calling where your Indian carrier supports it.',
          ],
        },
        {
          title: 'What is the cheapest way to call India from Canada?',
          body: [
            'WhatsApp calls are free on WiFi or data. If your family uses landlines, add an international calling add-on to your Canadian plan.',
          ],
        },
      ],
      facts: {
        title: 'Key facts',
        items: [
          { label: 'Price range', value: '$35–$50/mo, CAD + tax' },
          { label: 'Credit check', value: 'None needed' },
          { label: 'When to order', value: '1–3 weeks before your flight' },
          { label: 'How you get it', value: 'eSIM by email, ordered from India' },
          { label: 'Support in IST', value: '9:30pm–9:30am, Mon–Sat' },
          { label: 'Networks', value: 'Rogers, Fido, Chatr' },
        ],
        note: 'Updated 5 October 2026',
      },
    },
  ],
  faq: {
    intro: landingFaqIntro({
      eyebrow: 'FAQ',
      title: 'India to Canada SIM questions',
      description: 'Advisors are available Monday to Saturday, 9am–9pm Pacific time.',
    }),
    items: [
      {
        id: 'india-buy',
        question: 'Can I buy a Canadian SIM card in India?',
        answer:
          'Yes, as an eSIM. Order online from India, confirm on WhatsApp and we email your eSIM QR code. There is nothing to pay online; your plan starts when you land.',
      },
      {
        id: 'india-phone',
        question: 'Will my Indian phone work in Canada?',
        answer:
          'It will if your phone is unlocked and supports eSIM. Check the phone settings or send us the model before ordering.',
      },
      {
        id: 'india-keep',
        question: 'Should I keep my Indian SIM active?',
        answer:
          'Keep it for one-time codes from your bank and other services. Use a dual-SIM phone and check your Indian carrier’s roaming settings.',
      },
      {
        id: 'india-parents',
        question: 'Can my parents in India order for me?',
        answer:
          'This answer is awaiting approved content. Ask an advisor to confirm the details for your situation.',
        pending: true,
      },
      {
        id: 'india-visa',
        question: 'Can I get a Canadian number before my visa is approved?',
        answer:
          'This answer is awaiting approved content. Ask an advisor to confirm what documents are needed.',
        pending: true,
      },
      {
        id: 'india-language',
        question: 'Do you offer support in Hindi or Punjabi?',
        answer:
          'This answer is awaiting approved content. Ask an advisor which languages are available.',
        pending: true,
      },
    ],
  },
  related: {
    title: 'Keep exploring',
    groups: [
      {
        title: 'For students',
        links: [{ label: 'Student SIM for Canada', href: '/pre-arrival-sim/students' }],
      },
      {
        title: 'Arriving at',
        links: [{ label: 'Toronto Pearson (YYZ)', href: '/pre-arrival-sim/toronto-pearson' }],
      },
      {
        title: 'Compare and learn',
        links: [
          { label: 'All pre-arrival plans', href: '/pre-arrival-sim' },
          {
            label: 'Best SIM for students from India',
            href: '/guides/best-sim-for-students-from-india',
          },
        ],
      },
    ],
    note: pricesNote,
  },
  cta: {
    title: 'From India to online in Canada',
    subtitle: 'Choose a plan in about 2 minutes. Nothing to pay today.',
    primary: { label: 'See plans for India →', href: '#plans' },
    secondary: { label: 'Talk to an advisor ›', href: '/contact' },
    icon: 'cta-pre-arrival',
  },
};

export const fromIndiaPlanHeading = {
  title: ['Plans newcomers from India choose'],
  description:
    'Every plan is an eSIM with nothing to pay upfront. Pick who you are travelling as to see the plans that fit.',
};
