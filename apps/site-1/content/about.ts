import { landingBreadcrumb, landingFaqIntro, landingSkip } from './landing/shared';
import type { LandingPageContent } from './landing/types';

/**
 * /about on the Electric Blue landing kit (15 October 2026). Primary keywords: Canadian
 * Plans, authorized Rogers Fido Chatr dealer Surrey BC, phone plans for newcomers.
 * Owner-supplied claims from the 12 Oct design copy; location and hours remain preview
 * fixtures until confirmed.
 */
export const aboutPage: LandingPageContent = {
  path: '/about',
  title: 'About Canadian Plans: Authorized Rogers, Fido & Chatr Dealer in Surrey, BC',
  description:
    'Canadian Plans is an authorized Rogers, Fido and Chatr dealer in Surrey, BC. We help newcomers get a phone or internet plan in plain English, with no Canadian credit history needed.',
  mainId: 'about-main',
  skip: landingSkip,
  tone: 'navy',
  breadcrumb: {
    ...landingBreadcrumb,
    items: [{ label: 'Home', href: '/' }, { label: 'About us' }],
  },
  hero: {
    eyebrow: 'About Canadian Plans',
    title: 'Canadian phone and internet plans, explained by humans',
    description:
      'We are an authorized Rogers, Fido and Chatr dealer in Surrey, BC. We help newcomers get a phone or internet plan in plain English, with no Canadian credit history needed.',
    action: { label: 'Talk to an advisor', href: '/contact' },
    photo: 'PHOTO · the Canadian Plans team at the Surrey shop counter',
    highlights: ['Authorized dealer', 'Real people, no bots', 'Nothing to pay today'],
  },
  quick: {
    eyebrow: 'Our story',
    title: 'We started because a phone plan shouldn’t need a credit history',
    answer:
      'Too many newcomers were turned away for not having a SIN, a credit score or a local address, or were sold plans they didn’t need. So we became an authorized Rogers, Fido and Chatr dealer for people arriving in Canada: students, workers, permanent residents and visitors.',
  },
  facts: {
    label: 'Canadian Plans at a glance',
    items: [
      { label: 'Location', value: 'Surrey, BC', detail: 'Visit us in person' },
      { label: 'Carriers', value: '3', detail: 'Rogers, Fido, Chatr' },
      { label: 'Hours', value: 'Mon–Sat', detail: '9am–9pm Pacific' },
      { label: 'To order', value: '$0', detail: 'Nothing due today' },
    ],
  },
  blocks: [
    {
      kind: 'cards',
      id: 'why-us',
      eyebrow: 'Why us',
      title: 'Why newcomers choose Canadian Plans',
      columns: 2,
      items: [
        {
          id: 'credit',
          title: 'No credit history needed',
          body: 'No Canadian credit history? No problem. We work with newcomers every day.',
          icon: 'why-mb-credit',
        },
        {
          id: 'humans',
          title: 'Real humans',
          body: 'A real advisor calls to confirm every order. No bots, no phone menus.',
          icon: 'gets-bz-support',
        },
        {
          id: 'anywhere',
          title: 'Order from anywhere',
          body: 'Start before you land. Order your eSIM from your home country.',
          icon: 'why-pa-roaming',
        },
        {
          id: 'dealer',
          title: 'Carrier prices, no markup',
          body: 'Rogers, Fido and Chatr plans at the carriers’ own prices.',
          icon: 'why-mb-carriers',
        },
      ],
    },
    {
      kind: 'cards',
      id: 'carriers',
      eyebrow: 'Authorized dealer',
      title: 'Rogers, Fido and Chatr, under one roof',
      description:
        'We are an independent authorized dealer, not the carrier. All three brands run on the Rogers network; we help you pick the one that fits.',
      columns: 3,
      items: [
        {
          id: 'rogers',
          chip: 'Premium',
          title: 'Rogers',
          body: 'Fastest 5G+ speeds and Canada–US plans. Postpaid, builds Canadian credit.',
        },
        {
          id: 'fido',
          chip: 'Best value',
          title: 'Fido',
          body: 'The same network for less, with prepaid or postpaid plans.',
        },
        {
          id: 'chatr',
          chip: 'Lowest price',
          title: 'Chatr',
          body: 'Simple prepaid plans with no credit check.',
        },
      ],
    },
  ],
  faq: {
    intro: landingFaqIntro({
      eyebrow: 'FAQ',
      title: 'About Canadian Plans',
      description: 'Advisors are available Monday to Saturday, 9am–9pm Pacific time.',
    }),
    items: [
      {
        id: 'carrier',
        question: 'Is Canadian Plans a phone carrier?',
        answer:
          'No. We are an independent authorized dealer for Rogers, Fido and Chatr. Your plan and bill come from the carrier you choose.',
      },
      {
        id: 'markup',
        question: 'Do you charge more than the carrier?',
        answer: 'No. You pay the carriers’ own prices, with no markup.',
      },
      {
        id: 'where',
        question: 'Where are you located?',
        answer:
          'Our shop is in Surrey, BC, and we help customers online from anywhere, including before they arrive in Canada.',
      },
      {
        id: 'credit',
        question: 'Can you help if I have no Canadian credit history?',
        answer:
          'Yes. We work with newcomers every day and explain the options that do not need a Canadian credit history.',
      },
    ],
  },
  related: {
    title: 'Find your plan',
    groups: [
      {
        title: 'Moving to Canada',
        links: [
          { label: 'Pre-arrival SIM plans', href: '/pre-arrival-sim' },
          { label: 'Student SIM', href: '/pre-arrival-sim/students' },
        ],
      },
      {
        title: 'Already here',
        links: [
          { label: 'Mobile plans', href: '/mobile-plans' },
          { label: 'Home internet', href: '/home-internet' },
        ],
      },
      {
        title: 'Help',
        links: [
          { label: 'FAQ', href: '/faq' },
          { label: 'Contact us', href: '/contact' },
        ],
      },
    ],
  },
  cta: {
    title: 'Ready to get connected?',
    subtitle: 'Talk to a real advisor. No bots, no pressure, nothing to pay today.',
    primary: { label: 'See plans →', href: '/mobile-plans' },
    secondary: { label: 'Talk to an advisor ›', href: '/contact' },
    icon: 'cta-mobile',
  },
};
