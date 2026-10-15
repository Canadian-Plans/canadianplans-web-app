import { mobileChrome, mobileCopy } from '../mobile-plans';
import { landingBreadcrumb, landingFaqIntro, landingSkip } from './shared';
import type { LandingPageContent } from './types';

/**
 * /mobile-plans/rogers — primary keywords: Rogers plans for newcomers, Rogers mobile plans,
 * Rogers credit check, switch to Rogers and keep your number.
 * Prices and the brand comparison come from the /mobile-plans preview data so both pages
 * agree; the old page's placeholder $45–$55 plan names and 4.2 editorial score are gone.
 */
const brands = mobileCopy.comparison;

export const rogersLanding: LandingPageContent = {
  path: '/mobile-plans/rogers',
  title: 'Rogers Plans for Newcomers: Prices, Credit Check & Switching | Canadian Plans',
  description:
    'Compare Rogers mobile plans for newcomers: 5G+, Canada–US talk and text, credit check rules and how to switch to Rogers and keep your number.',
  mainId: 'rogers-main',
  skip: landingSkip,
  tone: 'blue',
  breadcrumb: {
    ...landingBreadcrumb,
    items: [
      { label: 'Home', href: '/' },
      { label: 'Mobile Plans', href: '/mobile-plans' },
      { label: 'Rogers' },
    ],
  },
  hero: {
    eyebrow: 'Mobile plans · Rogers',
    title: 'Rogers plans for newcomers, explained in plain words',
    description:
      'Premium 5G+ plans with Canada–US talk and text. See every Rogers plan we offer with exact prices, and get a real person to set it up.',
    action: { label: 'See Rogers plans', href: '#mobile-plans' },
    pricePrefix: 'from',
    price: '$55',
    priceSuffix: '/mo',
    photo: 'PHOTO · newcomer setting up a new phone at a kitchen table, Rogers SIM kit beside it',
    highlights: ['Keep your number', 'Canada–US plans', 'Nothing to pay until we call'],
  },
  byline: 'Updated 5 October 2026 · Reviewed by a Canadian Plans plan advisor',
  onThisPage: {
    label: 'On this page',
    links: [
      { label: 'Plans', href: '#mobile-plans' },
      { label: 'Pros and cons', href: '#pros-cons' },
      { label: 'Rogers vs Fido vs Chatr', href: '#compare' },
      { label: 'How to switch', href: '#switch' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  quick: {
    eyebrow: 'Quick answer',
    title: 'Is Rogers worth it for newcomers?',
    answer:
      'Rogers is the premium choice: 5G+ speeds, Canada–US talk and text, and postpaid plans that help build Canadian credit. If price matters most, Fido and Chatr use the same network for less. Rogers plans with us start at $55 a month (CAD, plus tax).',
  },
  facts: {
    label: 'Rogers facts',
    items: [
      { label: 'Network', value: '5G+', detail: 'Rogers network' },
      { label: 'Payment', value: 'Postpaid', detail: 'Monthly bill' },
      { label: 'Credit check', value: 'Yes', detail: 'Or a security deposit' },
      { label: 'US use', value: 'Canada–US', detail: 'On many plans' },
    ],
  },
  blocks: [
    { kind: 'slot', id: 'plans' },
    {
      kind: 'proscons',
      id: 'pros-cons',
      eyebrow: 'Our take',
      title: 'Rogers pros and cons for newcomers',
      pros: {
        title: 'What we like',
        mark: '✓',
        items: [
          'Fastest 5G+ speeds in most cities',
          'Canada–US talk, text and data on many plans',
          'Postpaid helps build Canadian credit',
          'Family and multi-line savings',
        ],
      },
      cons: {
        title: 'Watch out for',
        mark: '!',
        items: [
          'Higher monthly price than Fido or Chatr',
          'Credit check or deposit for newcomers',
          'Phone financing can mean a 24-month commitment',
          'Some perks only on top plans',
        ],
      },
    },
    {
      kind: 'table',
      id: 'compare',
      eyebrow: 'Compare',
      title: 'Rogers vs Fido vs Chatr',
      description: 'All three run on the Rogers network. Here is how they differ for newcomers.',
      caption: 'Rogers, Fido and Chatr compared for newcomers',
      columns: ['Feature', 'Rogers', 'Fido', 'Chatr'],
      highlight: 1,
      rows: brands.rows.map((row) => ({
        label: row.label,
        // /mobile-plans lists Chatr, Fido, Rogers; this page leads with Rogers.
        values: [row.values[2], row.values[1], row.values[0]],
      })),
      note: 'Check network features (5G/5G+), credit checks and roaming options with each brand before you sign.',
    },
    {
      kind: 'steps',
      id: 'switch',
      eyebrow: 'Switching',
      title: 'Switch to Rogers and keep your number',
      aside: 'Done in 3 steps',
      items: [
        {
          id: 'details',
          marker: '1',
          meta: 'Before you switch',
          title: 'Keep your old plan and send its details',
          body: 'Don’t cancel first, or you can lose the number. Send us the account number and PIN from your current carrier’s bill or app.',
          art: 'step-mb-details',
        },
        {
          id: 'transfer',
          marker: '2',
          meta: 'We do this',
          title: 'We transfer your number',
          body: 'We submit the transfer to Rogers and tell you when it is done.',
          art: 'step-mb-transfer',
        },
        {
          id: 'done',
          marker: '✓',
          meta: 'Done',
          title: 'Switch on',
          body: 'Unlocked phone? You are ready. Locked? We help you unlock it.',
          art: 'step-mb-done',
          done: true,
        },
      ],
    },
    {
      kind: 'article',
      id: 'guide',
      eyebrow: 'Newcomer guide',
      title: 'Rogers for newcomers: what to know before you sign',
      sections: [
        {
          title: 'Can I get Rogers without a Canadian credit history?',
          body: [
            'Usually yes, with a security deposit, or by starting on a prepaid brand first. We explain the deposit on the call before anything is set up.',
          ],
        },
        {
          title: 'Is Rogers better than Fido or Chatr?',
          body: [
            'Not on coverage: all three use the Rogers network. Rogers adds 5G+ priority, Canada–US plans and bigger perks, while Fido and Chatr cost less.',
          ],
        },
        {
          title: 'Should I finance a phone with Rogers?',
          body: [
            'You can bring your own phone or finance one over 24 months. Financing lowers the upfront cost but ties you to the plan, so ask us to compare the total cost first.',
          ],
        },
      ],
      facts: {
        title: 'Key facts',
        items: [
          { label: 'Plans from', value: '$55/mo, CAD + tax' },
          { label: 'Payment', value: 'Postpaid' },
          { label: 'Credit check', value: 'Yes, or a deposit' },
          { label: 'Network', value: 'Rogers 5G+' },
          { label: 'US use', value: 'Canada–US plans available' },
          { label: 'Keep your number', value: 'Yes' },
        ],
        note: 'Updated 5 October 2026',
      },
    },
  ],
  faq: {
    intro: landingFaqIntro({
      eyebrow: 'FAQ',
      title: 'Rogers plan questions',
      description: 'Advisors are available Monday to Saturday, 9am–9pm Pacific time.',
    }),
    items: [
      {
        id: 'credit',
        question: 'Do I need a credit check for Rogers?',
        answer:
          'Rogers postpaid plans usually need a credit check or a deposit. If you are new to Canada, we explain your options on the call or suggest a prepaid brand to start.',
      },
      {
        id: 'number',
        question: 'Can I keep my number when I switch to Rogers?',
        answer:
          'Yes. Keep your current service active until the transfer is complete. We need your account number and can help submit the transfer request.',
      },
      {
        id: 'us',
        question: 'Does Rogers include US roaming?',
        answer:
          'Some plans include Canada–US use; others need an add-on. Check the plan details and current terms before choosing.',
      },
      {
        id: 'phone',
        question: 'Can I bring my own phone to Rogers?',
        answer:
          'Usually, if it is unlocked and works on the Rogers network. We can help you check before the switch.',
      },
      {
        id: 'family',
        question: 'Can I add family lines later?',
        answer:
          'Many Rogers plans support extra lines. Availability and pricing depend on the offer when you sign up.',
      },
      {
        id: 'term',
        question: 'What happens after 24 months of phone financing?',
        answer:
          'Check your financing agreement for any remaining balance or device return terms. Your wireless plan may continue under its current terms.',
      },
    ],
  },
  related: {
    title: 'Keep exploring',
    groups: [
      {
        title: 'Other brands',
        links: [
          { label: 'Fido and Chatr plans', href: '/mobile-plans#mobile-plans' },
          { label: 'All mobile plans', href: '/mobile-plans' },
        ],
      },
      {
        title: 'Compare',
        links: [
          { label: 'Rogers vs Fido', href: '/compare/rogers-vs-fido' },
          { label: 'Fido vs Chatr', href: '/mobile-plans#brand-comparison' },
        ],
      },
      {
        title: 'New to Canada',
        links: [
          { label: 'Student SIM for Canada', href: '/pre-arrival-sim/students' },
          { label: 'Pre-arrival SIM plans', href: '/pre-arrival-sim' },
        ],
      },
    ],
    note: 'Sources: Rogers plan pages and the Rogers Wireless Service Agreement, checked 5 October 2026. Prices are in CAD before tax and change often.',
  },
  cta: {
    title: 'Switch to Rogers. Keep your number.',
    subtitle: 'Choose a plan in about 2 minutes. An advisor confirms it the same day.',
    primary: { label: 'See Rogers plans →', href: '#mobile-plans' },
    secondary: { label: 'Talk to an advisor ›', href: '/contact' },
    icon: 'cta-mobile',
  },
};

export const rogersPlansHeading = {
  eyebrow: 'Rogers plans',
  title: 'Every Rogers plan we offer',
  note: 'Showing Rogers. Clear the brand filter to compare Fido and Chatr.',
};

/** Mobile chrome with the promo pointing at this page's switching steps. */
export const rogersChrome = {
  ...mobileChrome,
  promoLink: { ...mobileChrome.promoLink, href: '#switch' },
};
