import { landingBreadcrumb, landingFaqIntro, landingSkip } from './landing/shared';
import type { LandingPageContent } from './landing/types';

/**
 * /about on the Electric Blue landing kit (15 October 2026; copy rewritten 23 October 2026).
 * Primary phrase: Canadian Plans, authorised Rogers, Fido and chatr reseller in Surrey, BC.
 * Canadian Plans is an online business: it has a Surrey address and helps customers by
 * phone and email, so the page no longer invites in-person visits.
 */
export const aboutPage: LandingPageContent = {
  path: '/about',
  title: 'About Canadian Plans: Authorized Rogers, Fido & Chatr Reseller in Surrey, BC',
  description:
    'Canadian Plans is an authorised Rogers, Fido and chatr reseller in Surrey, BC, helping newcomers get a Canadian phone plan or home internet. Nothing paid online.',
  mainId: 'about-main',
  skip: landingSkip,
  tone: 'navy',
  breadcrumb: {
    ...landingBreadcrumb,
    items: [{ label: 'Home', href: '/' }, { label: 'About us' }],
  },
  hero: {
    eyebrow: 'About Canadian Plans',
    title: 'Canadian phone and internet plans, explained by a real person',
    description:
      'We are an authorized Rogers, Fido and Chatr reseller for the eSIM plans you order before you arrive in Canada, and an authorized sales agent for home internet and mobile plans. Based in Surrey, BC, we help newcomers by phone and email, in plain English, with nothing paid on the website.',
    action: { label: 'Talk to an advisor', href: '/contact' },
    photo: 'PHOTO · a Canadian Plans advisor on a call, Surrey, BC',
    highlights: ['Authorized reseller', 'Real people, no bots', 'Nothing paid online'],
  },
  quick: {
    eyebrow: 'Why we exist',
    title: 'A phone plan should not depend on a credit history you cannot have yet',
    answer:
      'Newcomers get turned away for not having a SIN, a credit score or a Canadian address, or get sold more plan than they need. Canadian Plans sells carrier plans at the carrier’s own price, explains who the contract is with, and lets you order before you land with no credit check and nothing paid online.',
  },
  facts: {
    label: 'Canadian Plans at a glance',
    items: [
      { label: 'Based in', value: 'Surrey, BC', detail: 'Help by phone and email' },
      { label: 'eSIM carriers', value: '3', detail: 'Rogers, Fido, Chatr' },
      { label: 'Hours', value: 'Mon–Sat', detail: '9am–9pm Pacific' },
      { label: 'Paid online', value: '$0', detail: 'On every plan' },
    ],
  },
  blocks: [
    {
      kind: 'cards',
      id: 'why-us',
      eyebrow: 'Why us',
      title: 'Why newcomers order through Canadian Plans',
      columns: 2,
      items: [
        {
          id: 'credit',
          title: 'No credit check on eSIM plans',
          body: 'Order a Rogers, Fido or Chatr plan before you arrive with no Canadian credit history and nothing to upload.',
          icon: 'why-mb-credit',
        },
        {
          id: 'humans',
          title: 'A real advisor confirms every order',
          body: 'By phone or email, usually the same day. No bots and no phone menus.',
          icon: 'gets-bz-support',
        },
        {
          id: 'anywhere',
          title: 'Order from any country',
          body: 'Your Canadian number is ready before you fly, and your eSIM arrives by email.',
          icon: 'why-pa-roaming',
        },
        {
          id: 'dealer',
          title: 'Carrier prices, no markup',
          body: 'You pay the carrier’s own monthly price plus tax. We charge no SIM, activation or service fee.',
          icon: 'why-mb-carriers',
        },
      ],
    },
    {
      kind: 'cards',
      id: 'carriers',
      eyebrow: 'Who you buy from',
      title: 'Rogers, Fido and Chatr plans, with the contract in your name',
      description:
        'For eSIM plans ordered before you arrive we are an independent authorized reseller, not the carrier: your account is with Rogers, Fido or Chatr and they bill you after activation. For home internet and mobile plans we are an authorized sales agent, and your advisor confirms the provider before anything is set up. All three carrier brands run on the Rogers network.',
      columns: 3,
      items: [
        {
          id: 'rogers',
          chip: 'Most data',
          title: 'Rogers',
          body: '100 GB for $40 or 120 GB with Canada + US calling and roaming for $50 a month. Postpaid, hotspot included.',
        },
        {
          id: 'fido',
          chip: 'Lowest monthly price',
          title: 'Fido',
          body: '75 GB for $35 a month on the same network. Postpaid, for stays over 90 days.',
        },
        {
          id: 'chatr',
          chip: 'Prepaid for visitors',
          title: 'Chatr',
          body: 'Prepaid plans from $35 for 30 days, for visitor and Super Visa stays under 90 days.',
        },
      ],
    },
  ],
  faq: {
    intro: landingFaqIntro({
      eyebrow: 'FAQ',
      title: 'About Canadian Plans',
      description: 'Advisors are available Monday to Saturday, 9am to 9pm Pacific time.',
    }),
    items: [
      {
        id: 'carrier',
        question: 'Is Canadian Plans a phone carrier?',
        answer:
          'No. We are an independent authorized reseller of Rogers, Fido and Chatr for eSIM plans ordered before you arrive, and an authorized sales agent for home internet and mobile providers. Your plan and your bill come from the provider, not from us.',
      },
      {
        id: 'markup',
        question: 'Do you charge more than the carrier?',
        answer:
          'No. You pay the carrier’s own monthly price plus tax, billed by the carrier after activation. Canadian Plans charges no SIM, activation, shipping or service fee.',
      },
      {
        id: 'where',
        question: 'Where are you located?',
        answer:
          'Canadian Plans is based at 9981 Whalley Blvd, Surrey, British Columbia. We help customers by phone and email from anywhere in the world, including before they arrive in Canada.',
      },
      {
        id: 'credit',
        question: 'Can you help if I have no Canadian credit history?',
        answer:
          'Yes. The eSIM plans you order before you arrive need no credit check. For home internet, many newcomers sign up with a passport and permit; your advisor tells you if a deposit is needed before anything is booked.',
      },
    ],
  },
  related: {
    title: 'Find your plan',
    groups: [
      {
        title: 'Moving to Canada',
        links: [
          { label: 'eSIM plans before you arrive', href: '/pre-arrival-sim' },
          { label: 'International students', href: '/pre-arrival-sim/students' },
          { label: 'Work permit holders', href: '/pre-arrival-sim/workers' },
          { label: 'New permanent residents', href: '/pre-arrival-sim/new-immigrants' },
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
    title: 'Ready to get connected in Canada?',
    subtitle: 'Talk to a real advisor. No bots, no pressure, nothing paid online.',
    primary: { label: 'See eSIM plans →', href: '/pre-arrival-sim#plans' },
    secondary: { label: 'Talk to an advisor ›', href: '/contact' },
    icon: 'cta-mobile',
  },
};
