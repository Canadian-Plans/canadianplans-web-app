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
 * /pre-arrival-sim/visitors (new, 23 October 2026). Primary phrase: prepaid SIM card for
 * visitors to Canada; supporting: Super Visa SIM card Canada, tourist eSIM Canada, chatr
 * prepaid plan. Facts from docs/LAUNCH_PLANS.md table D: visitor-visa and Super Visa
 * arrivals staying under 90 days are eligible for the Chatr prepaid plans.
 */
export const visitorsLanding: LandingPageContent = {
  path: '/pre-arrival-sim/visitors',
  title: 'Prepaid SIM for Visitors to Canada: Tourist & Super Visa eSIM | Canadian Plans',
  description:
    'Visiting Canada or on a Super Visa? Chatr prepaid eSIM before you fly: 50 GB $35 or 90 GB $40 per 30 days, 75 GB $75 for 90 days. No contract, nothing paid online.',
  mainId: 'visitors-main',
  skip: landingSkip,
  tone: 'amber',
  breadcrumb: {
    ...landingBreadcrumb,
    items: [
      { label: 'Home', href: '/' },
      { label: 'SIM before you arrive', href: '/pre-arrival-sim' },
      { label: 'Visitors and Super Visa' },
    ],
  },
  hero: {
    eyebrow: 'Visitors · Super Visa · Canada',
    title: 'Prepaid SIM card for visitors to Canada, active before you land',
    description:
      'Chatr prepaid eSIM plans for visitor visa and Super Visa stays of up to 90 days. Order before you fly, and your line is activated 24 hours before you arrive, with unlimited calling to Canada and the US and no contract. Nothing paid online.',
    action: { label: 'See visitor plans', href: '#plans' },
    pricePrefix: 'from',
    price: '$35',
    priceSuffix: '/30 days',
    photo: 'PHOTO · grandparents at arrivals video-calling family, phone held up',
    highlights: ['Prepaid, no contract', 'Active 24 hours before you land', 'Nothing paid online'],
  },
  byline: 'Updated 23 October 2026 · Checked by a Canadian Plans plan advisor',
  onThisPage: {
    label: 'On this page',
    links: [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Visitor plans', href: '#plans' },
      { label: 'What you need', href: '#documents' },
      { label: 'Visitor guide', href: '#guide' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  quick: {
    eyebrow: 'Quick answer',
    title: 'What is the best SIM card for a visitor to Canada?',
    answer:
      'For a visit of up to 90 days, a Chatr prepaid eSIM ordered before you fly: 50 GB for $35 or 90 GB for $40 per 30 days, or 75 GB for $75 over 90 days (CAD, plus tax), all with unlimited calls within Canada, unlimited texts and no contract. Your line is activated 24 hours before you land, so it works as soon as you turn off airplane mode. There is no credit check and nothing is paid online.',
  },
  facts: {
    label: 'Visitor plan facts',
    items: [
      { label: 'Price', value: '$35–$75', detail: 'CAD, plus tax' },
      { label: 'Term', value: '30 or 90 days', detail: 'Prepaid, no contract' },
      { label: 'Active', value: '24 h before', detail: 'Your arrival date' },
      { label: 'Eligible', value: 'Visitor visa', detail: 'Or Super Visa, under 90 days' },
    ],
  },
  blocks: [
    preArrivalSteps('Your visitor SIM in 3 steps'),
    { kind: 'slot', id: 'plans' },
    preArrivalDocuments('documents', 'What you need to order a visitor SIM', {
      title: 'Visitor visa, eTA or Super Visa',
      body: 'Whatever you are travelling on. Chatr plans are for stays under 90 days.',
    }),
    {
      kind: 'article',
      id: 'guide',
      eyebrow: 'Visitor guide',
      title: 'Phone plans for tourists and visiting family: a short guide',
      sections: [
        {
          title: 'Which Chatr plan fits my visit?',
          body: [
            'Staying up to a month: Chatr 50 GB for $35 is enough for maps, messaging and photos; Chatr 90 GB for $40 suits visitors who stream and video call every day. Both run 30 days and add a bonus 5 or 10 GB with Autopay.',
            'Staying two to three months, for example parents and grandparents on a Super Visa: Chatr 75 GB for $75 over 90 days avoids topping up every month.',
          ],
        },
        {
          title: 'Why order before you fly instead of at the airport?',
          body: [
            'Your line is activated 24 hours before your arrival date, so you can message whoever is picking you up the moment you land. Airport counters often charge more and there can be a line after a long flight. Roaming on your home SIM is usually the most expensive option of all.',
          ],
        },
        {
          title: 'Can my family in Canada order it for me?',
          body: [
            'The plan is in the traveller’s name and the eSIM QR code goes to the email address on the order. Family in Canada can help you choose and can be on the confirmation call with your advisor.',
          ],
        },
        {
          title: 'Staying longer than 90 days?',
          body: [
            'Chatr prepaid plans are for visits under 90 days. If you are arriving on a study permit, a work permit or as a permanent resident, choose a monthly Rogers or Fido plan instead. Staying longer on a Super Visa? Talk to an advisor before you order.',
          ],
        },
      ],
      facts: {
        title: 'Key facts',
        items: [
          { label: 'Price range', value: '$35–$75, CAD + tax' },
          { label: 'Term', value: '30 or 90 days, prepaid' },
          { label: 'Credit check', value: 'None' },
          { label: 'When to order', value: '1–3 weeks before your flight' },
          { label: 'Line active', value: '24 hours before you land' },
          { label: 'Carrier', value: 'Chatr, on the Rogers network' },
        ],
        note: 'Updated 23 October 2026',
      },
    },
  ],
  faq: {
    intro: landingFaqIntro({
      eyebrow: 'FAQ',
      title: 'Visitor SIM questions',
      description: advisorHours,
    }),
    items: [
      {
        id: 'visitor-supervisa',
        question: 'Is there a SIM card for parents on a Super Visa?',
        answer:
          'Yes. Chatr prepaid eSIM plans are for visitor visa and Super Visa arrivals staying under 90 days: 50 GB for $35 or 90 GB for $40 per 30 days, or 75 GB for $75 over 90 days, plus tax. For a longer Super Visa stay, talk to an advisor before you order.',
      },
      {
        id: 'visitor-active',
        question: 'When does a visitor eSIM start working?',
        answer:
          'Your Chatr line is activated 24 hours before your arrival date. Install the eSIM at home on WiFi; when you land, turn off airplane mode and you are connected.',
      },
      {
        id: 'visitor-renew',
        question: 'What happens when the 30 days are up?',
        answer:
          'The plan is prepaid, so it ends unless it is renewed. If you are staying longer, ask your advisor about topping up or about the 90-day plan before your first term ends.',
      },
      {
        id: 'visitor-us',
        question: 'Can I call the US on a visitor plan?',
        answer:
          'Yes. The 30-day Chatr plans include unlimited calling to Canada and the US and unlimited international texts. The 90-day plan includes unlimited Canada-wide calling.',
      },
      sharedArrivalFaq.pay,
      sharedArrivalFaq.esim,
      sharedArrivalFaq.family,
      sharedArrivalFaq.cancel,
    ],
  },
  related: {
    title: 'Keep exploring',
    groups: [
      {
        title: 'Staying longer?',
        links: [
          { label: 'International students', href: '/pre-arrival-sim/students' },
          { label: 'Work permit holders', href: '/pre-arrival-sim/workers' },
          { label: 'New permanent residents', href: '/pre-arrival-sim/new-immigrants' },
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
          { label: 'Newcomer guides', href: '/guides' },
        ],
      },
    ],
    note: pricesNote,
  },
  cta: {
    title: 'Connected from the moment you land',
    subtitle: 'Choose a prepaid plan in about 2 minutes. No contract, nothing paid online.',
    primary: { label: 'See visitor plans →', href: '#plans' },
    secondary: { label: 'Talk to an advisor ›', href: '/contact' },
    icon: 'cta-pre-arrival',
  },
};

export const visitorsPlanHeading = {
  title: ['Pick your prepaid visitor plan'],
  description:
    'Every plan is an eSIM with nothing paid online. “Visitor / Super Visa” is selected so you see the Chatr prepaid plans for stays under 90 days.',
};
