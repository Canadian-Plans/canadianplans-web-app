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
 * /pre-arrival-sim/workers (new, 23 October 2026). Primary phrase: SIM card for work permit
 * holders in Canada; supporting: phone plan work permit Canada, Canadian number before you
 * start work. Facts from docs/LAUNCH_PLANS.md table D: work-permit arrivals staying over
 * 90 days are eligible for the monthly Rogers and Fido plans.
 */
export const workersLanding: LandingPageContent = {
  path: '/pre-arrival-sim/workers',
  title: 'SIM Card for Work Permit Holders in Canada: eSIM from $35 | Canadian Plans',
  description:
    'Arriving on a work permit? Order a Rogers or Fido eSIM before you fly and land with a Canadian number. From $35/mo, no credit check, nothing paid online.',
  mainId: 'workers-main',
  skip: landingSkip,
  tone: 'amber',
  breadcrumb: {
    ...landingBreadcrumb,
    items: [
      { label: 'Home', href: '/' },
      { label: 'SIM before you arrive', href: '/pre-arrival-sim' },
      { label: 'Work permit holders' },
    ],
  },
  hero: {
    eyebrow: 'Work permit · Canada',
    title: 'SIM card and eSIM for work permit holders, ready before your first shift',
    description:
      'Order from home with your passport and work permit or letter of introduction. Your Canadian number is ready before you fly, so your employer, bank and landlord can reach you from day one. Rogers and Fido plans from $35 a month, no credit check, nothing paid online.',
    action: { label: 'See plans for workers', href: '#plans' },
    pricePrefix: 'from',
    price: '$35',
    priceSuffix: '/mo',
    photo: 'PHOTO · new arrival on a work permit checking their phone outside the terminal',
    highlights: ['Order from any country', 'No credit check', 'Nothing paid online'],
  },
  byline: 'Updated 23 October 2026 · Checked by a Canadian Plans plan advisor',
  onThisPage: {
    label: 'On this page',
    links: [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Plans', href: '#plans' },
      { label: 'What you need', href: '#documents' },
      { label: 'Worker guide', href: '#guide' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  quick: {
    eyebrow: 'Quick answer',
    title: 'Can I get a Canadian phone plan on a work permit before I arrive?',
    answer:
      'Yes. If you are arriving on a work permit and staying more than 90 days, you can order a monthly Rogers or Fido eSIM plan from any country 1 to 3 weeks before your flight. Plans start at $35 a month for 75 GB (CAD, plus tax), with unlimited Canada-wide calling and 1,000 international minutes. There is no Canadian credit check, nothing to upload and nothing paid online. Your number is assigned before you fly and the line starts when you land.',
  },
  facts: {
    label: 'Worker plan facts',
    items: [
      { label: 'Price', value: '$35–$50/mo', detail: 'CAD, plus tax' },
      { label: 'Data', value: '75–120 GB', detail: 'Every month' },
      { label: 'Credit check', value: 'None', detail: 'No Canadian history needed' },
      { label: 'Eligible', value: 'Work permit', detail: 'Stays over 90 days' },
    ],
  },
  blocks: [
    preArrivalSteps('Get your Canadian number in 3 steps'),
    { kind: 'slot', id: 'plans' },
    preArrivalDocuments('documents', 'What you need to order on a work permit', {
      title: 'Work permit or letter of introduction',
      body: 'The port-of-entry letter is enough if your permit is issued when you land.',
    }),
    {
      kind: 'article',
      id: 'guide',
      eyebrow: 'Worker guide',
      title: 'Phone plans for people arriving in Canada to work: a short guide',
      sections: [
        {
          title: 'Why does a Canadian number matter in your first week?',
          body: [
            'Your employer needs a local number for payroll and shift messages. Your bank texts a code to it to open the account your pay goes into. Landlords and rental sites expect one too. Having the number before you land means you can set all of that up from home instead of in a queue at arrivals.',
          ],
        },
        {
          title: 'Which plan should a worker choose?',
          body: [
            'Fido 75 GB for $35 a month is enough for maps, messaging and daily video calls home. Rogers 100 GB for $40 adds a mobile hotspot, handy if you work from a laptop before your home internet is installed. Rogers 120 GB for $50 includes US calling and roaming, which suits jobs near the border or trips across it.',
            'All three are month to month with no contract, so you can change plans once you know your routine.',
          ],
        },
        {
          title: 'Do I need a Canadian credit history or a SIN?',
          body: [
            'No. These plans are ordered before you arrive, with no credit check and no SIN. You order with your name, email, arrival date and the plan you want. If the carrier needs to see your passport or permit, your advisor asks you for it.',
          ],
        },
        {
          title: 'What about home internet when you find a place?',
          body: [
            'When you have an address in British Columbia, Alberta, Manitoba or Saskatchewan, the same advisor can book home internet with free installation and no upfront payment, usually within about 3 days of your call.',
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
      title: 'Work permit SIM questions',
      description: advisorHours,
    }),
    items: [
      {
        id: 'worker-permit',
        question: 'Can I order before my work permit is issued?',
        answer:
          'Yes. Order with your passport and your letter of introduction (the port-of-entry letter). Your number is assigned before you fly, and the line starts when you land with your permit.',
      },
      {
        id: 'worker-employer',
        question: 'Can I give my employer the number before I land?',
        answer:
          'Yes. Your Canadian number is assigned as soon as an advisor confirms your order, so you can put it on payroll and HR forms before you fly. Calls and texts to it start working when you switch the line on in Canada.',
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
        title: 'Who you are',
        links: [
          { label: 'International students', href: '/pre-arrival-sim/students' },
          { label: 'New permanent residents', href: '/pre-arrival-sim/new-immigrants' },
          { label: 'Visitors and Super Visa', href: '/pre-arrival-sim/visitors' },
        ],
      },
      {
        title: 'Settling in',
        links: [
          { label: 'Home internet', href: '/home-internet' },
          { label: 'Mobile plans once you are here', href: '/mobile-plans' },
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
    title: 'Your Canadian number, ready before your first shift',
    subtitle: 'Choose a plan in about 2 minutes. No credit check, nothing paid online.',
    primary: { label: 'See plans for workers →', href: '#plans' },
    secondary: { label: 'Talk to an advisor ›', href: '/contact' },
    icon: 'cta-pre-arrival',
  },
};

export const workersPlanHeading = {
  title: ['Pick your plan for work'],
  description:
    'Every plan is an eSIM with nothing paid online, and it works the minute you land. “Worker” is selected so you see the monthly plans work permit holders are eligible for.',
};
