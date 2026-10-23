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
 * /pre-arrival-sim/new-immigrants (new, 23 October 2026). Primary phrase: SIM card for new
 * immigrants to Canada; supporting: phone plan for new permanent residents, COPR, landing in
 * Canada phone number. Facts from docs/LAUNCH_PLANS.md table D: permanent-resident arrivals
 * staying over 90 days are eligible for the monthly Rogers and Fido plans.
 */
export const newImmigrantsLanding: LandingPageContent = {
  path: '/pre-arrival-sim/new-immigrants',
  title: 'SIM Card for New Immigrants to Canada: eSIM Before You Land | Canadian Plans',
  description:
    'New permanent resident? Order a Rogers or Fido eSIM before you fly and land with a Canadian number for your bank and SIN appointment. From $35/mo, no credit check.',
  mainId: 'immigrants-main',
  skip: landingSkip,
  tone: 'amber',
  breadcrumb: {
    ...landingBreadcrumb,
    items: [
      { label: 'Home', href: '/' },
      { label: 'SIM before you arrive', href: '/pre-arrival-sim' },
      { label: 'New permanent residents' },
    ],
  },
  hero: {
    eyebrow: 'New permanent residents · Canada',
    title: 'SIM card and eSIM for new immigrants to Canada, ready before you land',
    description:
      'Order from home with your passport and confirmation of permanent residence (COPR). Your Canadian number is ready before you fly, for your bank, your SIN appointment and your rental search. Rogers and Fido plans from $35 a month, no credit check, nothing paid online.',
    action: { label: 'See plans for new residents', href: '#plans' },
    pricePrefix: 'from',
    price: '$35',
    priceSuffix: '/mo',
    photo: 'PHOTO · family with suitcases at arrivals, one of them on the phone',
    highlights: ['Order from any country', 'No credit check', 'Nothing paid online'],
  },
  byline: 'Updated 23 October 2026 · Checked by a Canadian Plans plan advisor',
  onThisPage: {
    label: 'On this page',
    links: [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Plans', href: '#plans' },
      { label: 'What you need', href: '#documents' },
      { label: 'First-week guide', href: '#guide' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  quick: {
    eyebrow: 'Quick answer',
    title: 'How do new immigrants get a Canadian phone number before landing?',
    answer:
      'Order a monthly Rogers or Fido eSIM plan online 1 to 3 weeks before your flight, from any country, with your passport and your confirmation of permanent residence or PR visa. An advisor confirms the order, your Canadian number is assigned, and your eSIM QR code arrives by email. Plans start at $35 a month for 75 GB (CAD, plus tax). There is no Canadian credit check, nothing to upload and nothing paid online; the carrier bills you after the line is active.',
  },
  facts: {
    label: 'New resident plan facts',
    items: [
      { label: 'Price', value: '$35–$50/mo', detail: 'CAD, plus tax' },
      { label: 'Data', value: '75–120 GB', detail: 'Every month' },
      { label: 'Credit check', value: 'None', detail: 'No Canadian history needed' },
      { label: 'Eligible', value: 'PR arrivals', detail: 'Stays over 90 days' },
    ],
  },
  blocks: [
    preArrivalSteps('Your Canadian number in 3 steps'),
    { kind: 'slot', id: 'plans' },
    preArrivalDocuments('documents', 'What you need to order as a new permanent resident', {
      title: 'Confirmation of permanent residence (COPR) or PR visa',
      body: 'The document you are landing with. A PR card is not needed to order.',
    }),
    {
      kind: 'article',
      id: 'guide',
      eyebrow: 'First-week guide',
      title: 'Your phone in your first week as a permanent resident',
      sections: [
        {
          title: 'What needs a Canadian number right after landing?',
          body: [
            'Almost everything on the settlement checklist: opening a bank account, booking your Social Insurance Number appointment, applying for a provincial health card, signing a lease and setting up utilities. Most of these text a code to your number. Having it assigned before you fly means you can start several of them from home.',
          ],
        },
        {
          title: 'Which plan do new permanent residents choose?',
          body: [
            'Families usually take Rogers 100 GB at $40 a month per line: enough for maps, school portals and video calls home, with a hotspot for a laptop before home internet is installed. Fido 75 GB at $35 is the lowest monthly price. Rogers 120 GB at $50 includes US calling and roaming.',
            'Every line is in its own name, so order one plan per adult. All three plans are month to month with no contract.',
          ],
        },
        {
          title: 'Do I need a credit history, a SIN or a Canadian address?',
          body: [
            'No. These plans are ordered before you arrive with no credit check, no SIN and no Canadian address. You order with your name, email, arrival date and the plan you want. If the carrier needs to see your passport or COPR, your advisor asks you for it.',
          ],
        },
        {
          title: 'Home internet once you have an address',
          body: [
            'If you settle in British Columbia, Alberta, Manitoba or Saskatchewan, the same advisor can book home internet with unlimited data, a free professional install and nothing paid up front, usually within about 3 days of your call. Internet + TV bundles are available in all four provinces.',
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
          { label: 'Carriers', value: 'Rogers, Fido' },
        ],
        note: 'Updated 23 October 2026',
      },
    },
  ],
  faq: {
    intro: landingFaqIntro({
      eyebrow: 'FAQ',
      title: 'New immigrant SIM questions',
      description: advisorHours,
    }),
    items: [
      {
        id: 'pr-copr',
        question: 'Can I order with my COPR before I have a PR card?',
        answer:
          'Yes. Your confirmation of permanent residence or PR visa is enough. A PR card is not needed to order, and nothing is uploaded; your advisor asks for the document only if the carrier needs it.',
      },
      {
        id: 'pr-family',
        question: 'Can I order for my spouse and children?',
        answer:
          'Yes. Place one order per person so each line is in the right name, or ask an advisor to set up the whole family in one call. Each adult needs their own passport and PR document.',
      },
      {
        id: 'pr-switch',
        question: 'Can I switch to a different plan once I am settled?',
        answer:
          'Yes. The plans are month to month. After the first month you can move to a bigger or smaller plan, or to one of the bring-your-own-phone mobile plans once you have Canadian ID for a credit check.',
      },
      sharedArrivalFaq.pay,
      sharedArrivalFaq.esim,
      sharedArrivalFaq.airport,
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
          { label: 'Visitors and Super Visa', href: '/pre-arrival-sim/visitors' },
        ],
      },
      {
        title: 'Settling in',
        links: [
          { label: 'Home internet', href: '/home-internet' },
          { label: 'Home internet in Vancouver', href: '/home-internet/vancouver' },
        ],
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
    title: 'Land in Canada with your number already working',
    subtitle: 'Choose a plan in about 2 minutes. No credit check, nothing paid online.',
    primary: { label: 'See plans for new residents →', href: '#plans' },
    secondary: { label: 'Talk to an advisor ›', href: '/contact' },
    icon: 'cta-pre-arrival',
  },
};

export const newImmigrantsPlanHeading = {
  title: ['Pick your plan for landing'],
  description:
    'Every plan is an eSIM with nothing paid online, and it works the minute you land. “Permanent resident” is selected so you see the monthly plans new residents are eligible for.',
};
