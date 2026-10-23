import {
  advisorHours,
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
 * /pre-arrival-sim/from-india (SEO rewrite, 23 October 2026). Primary phrase: Canadian SIM
 * card in India; supporting: Canada eSIM from India, SIM for Indians moving to Canada, keep
 * Indian number for OTP in Canada. Facts from docs/LAUNCH_PLANS.md table D.
 */
export const fromIndiaLanding: LandingPageContent = {
  path: '/pre-arrival-sim/from-india',
  title: 'Canadian SIM Card in India: Get Your Canada eSIM Before You Fly | Canadian Plans',
  description:
    'Moving from India to Canada? Order a Rogers, Fido or Chatr eSIM from India, get your number before you fly and keep your Indian SIM for OTPs. From $35/month.',
  mainId: 'india-main',
  skip: landingSkip,
  tone: 'amber',
  breadcrumb: {
    ...landingBreadcrumb,
    items: [
      { label: 'Home', href: '/' },
      { label: 'SIM before you arrive', href: '/pre-arrival-sim' },
      { label: 'From India' },
    ],
  },
  hero: {
    eyebrow: 'Canada eSIM · Moving from India',
    title: 'Canadian SIM card for Indians moving to Canada',
    description:
      'Get your Canadian number while you are still in India, ready for bank, college and job forms. Rogers, Fido and Chatr eSIM plans with 1,000 minutes to India, no Canadian credit check and nothing paid online.',
    action: { label: 'See plans for India', href: '#plans' },
    pricePrefix: 'from',
    price: '$35',
    priceSuffix: '/mo',
    photo: 'PHOTO · newcomer from India at Toronto Pearson arrivals, phone in hand',
    highlights: ['Order from India', 'No credit check', 'Keep your Indian number'],
  },
  byline: 'Updated 23 October 2026 · Checked by a Canadian Plans plan advisor',
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
      'Order a Canadian eSIM online from India 1 to 3 weeks before your flight. An advisor confirms by phone or email, your Canadian number is assigned right away, and your eSIM QR code arrives by email. Install it at home and it switches on when you land. Monthly Rogers and Fido plans start at $35 (CAD, plus tax) and include 1,000 minutes to India. There is no Canadian credit check and nothing is paid online.',
  },
  facts: {
    label: 'Plan facts for India',
    items: [
      { label: 'How to order', value: 'Online, 2 min', detail: 'Nothing paid online' },
      { label: 'eSIM delivery', value: 'By email', detail: 'Install at home in India' },
      { label: 'Support in IST', value: '9:30pm–9:30am', detail: 'Mon–Sat (9am–9pm PT)*' },
      { label: 'Calls to India', value: '1,000 min', detail: 'On every monthly plan' },
    ],
    note: '*IST times are for Pacific Daylight Time and move one hour later when clocks change in November.',
  },
  blocks: [
    preArrivalSteps('Your Canadian SIM from India in 3 steps'),
    { kind: 'slot', id: 'plans' },
    preArrivalDocuments('documents', 'What you need to order from India', {
      title: 'Study or work permit, visa or COPR',
      body: 'The document you are travelling on. Students can use the letter of introduction.',
    }),
    {
      kind: 'cards',
      id: 'calling-india',
      eyebrow: 'Stay in touch',
      title: 'How to call India from Canada',
      description:
        'Every monthly plan includes 1,000 minutes to India. Here are the three ways families usually keep in touch.',
      columns: 3,
      items: [
        {
          id: 'included',
          chip: 'Included',
          title: '1,000 international minutes',
          body: 'Rogers and Fido monthly plans include 1,000 minutes a month to India, plus unlimited international texts.',
        },
        {
          id: 'whatsapp',
          chip: 'Free',
          title: 'WhatsApp and video calls',
          body: 'Free over WiFi or your plan’s data. Most families use this every day.',
        },
        {
          id: 'add-on',
          chip: 'Ask an advisor',
          title: 'Need more minutes?',
          body: 'If you call landlines in India a lot, ask your advisor about add-ons once your plan is active.',
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
            'Yes, if it is unlocked and supports eSIM. Most recent iPhones and many Samsung, OnePlus and Pixel phones do.',
            'Phones bought on an Indian carrier contract or from some online bundles may be locked, so check the settings or send us the model before you order.',
          ],
        },
        {
          title: 'Should I keep my Indian SIM?',
          body: [
            'Yes, for at least the first few months. Indian banks, UPI and Aadhaar still send one-time passwords to your Indian number, so keep it on a low-cost plan.',
            'A dual-SIM phone lets you run both lines: your Indian SIM and your Canadian eSIM. Turn off data roaming on the Indian SIM to avoid charges, and use WiFi calling where your Indian carrier supports it.',
          ],
        },
        {
          title: 'Which plan do newcomers from India choose?',
          body: [
            'Students and workers staying over 90 days choose a monthly plan: Fido 75 GB at $35 or Rogers 100 GB at $40. Parents visiting on a visitor visa or Super Visa for under 90 days choose a Chatr prepaid plan, from $35 for 30 days or $75 for 90 days.',
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
          { label: 'Carriers', value: 'Rogers, Fido, Chatr' },
        ],
        note: 'Updated 23 October 2026',
      },
    },
  ],
  faq: {
    intro: landingFaqIntro({
      eyebrow: 'FAQ',
      title: 'India to Canada SIM questions',
      description: advisorHours,
    }),
    items: [
      {
        id: 'india-buy',
        question: 'Can I buy a Canadian SIM card in India?',
        answer:
          'Yes, as an eSIM. Order online from India, confirm by phone or email and we email your eSIM QR code. There is nothing to pay online; your plan starts when you land in Canada.',
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
          'Yes. Keep it for one-time passwords from your bank, UPI and Aadhaar. Use a dual-SIM phone and turn off data roaming on the Indian SIM.',
      },
      {
        id: 'india-parents-visit',
        question: 'What plan should my parents get for a Super Visa visit?',
        answer:
          'A Chatr prepaid plan: 50 GB for $35 or 90 GB for $40 per 30 days, or 75 GB for $75 over 90 days (CAD, plus tax). Chatr plans are for visitor and Super Visa stays under 90 days and are activated 24 hours before arrival.',
      },
      sharedArrivalFaq.pay,
      sharedArrivalFaq.cancel,
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
        title: 'Who you are',
        links: [
          { label: 'International students', href: '/pre-arrival-sim/students' },
          { label: 'Work permit holders', href: '/pre-arrival-sim/workers' },
          { label: 'Visitors and Super Visa', href: '/pre-arrival-sim/visitors' },
        ],
      },
      {
        title: 'Arriving at',
        links: [{ label: 'Toronto Pearson (YYZ)', href: '/pre-arrival-sim/toronto-pearson' }],
      },
      {
        title: 'Compare and learn',
        links: [
          { label: 'All eSIM plans', href: '/pre-arrival-sim' },
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
    subtitle: 'Choose a plan in about 2 minutes. No credit check, nothing paid online.',
    primary: { label: 'See plans for India →', href: '#plans' },
    secondary: { label: 'Talk to an advisor ›', href: '/contact' },
    icon: 'cta-pre-arrival',
  },
};

export const fromIndiaPlanHeading = {
  title: ['Plans newcomers from India choose'],
  description:
    'Every plan is an eSIM with nothing paid online. Pick how you are travelling to see the plans you are eligible for.',
};
