import { mobileCopy, mobilePlans } from '../mobile-plans';
import { landingBreadcrumb, landingFaqIntro, landingSkip } from './shared';
import type { LandingPageContent } from './types';

/**
 * /compare/rogers-vs-fido — primary keywords: Rogers vs Fido, Fido vs Rogers, is Fido the
 * same as Rogers, Rogers or Fido for newcomers.
 * Uses the /mobile-plans preview data (Fido from $45, Rogers from $55) so every page quotes
 * the same plans; the old page's separate $29/$34 prepaid examples are gone.
 */
const cheapest = (brand: 'fido' | 'rogers') => {
  const plan = mobilePlans
    .filter((item) => item.brand === brand)
    .reduce((low, item) => (item.priceCad < low.priceCad ? item : low));
  return plan;
};
const fido = cheapest('fido');
const rogers = cheapest('rogers');
const brandRow = (label: string) =>
  mobileCopy.comparison.rows.find((row) => row.label === label)?.values ?? ['', '', ''];
// /mobile-plans orders brands Chatr, Fido, Rogers; the side-by-side table is Fido, Rogers.
const pair = (label: string) => {
  const values = brandRow(label);
  return [values[1], values[2]] as const;
};

export const rogersVsFidoLanding: LandingPageContent = {
  path: '/compare/rogers-vs-fido',
  title: 'Rogers vs Fido (2026): Price, Data, Coverage & Credit Check | Canadian Plans',
  description:
    'Rogers vs Fido compared for newcomers: same Rogers network, different prices. See data, 5G, US use and credit check rules side by side, then switch and keep your number.',
  mainId: 'compare-main',
  skip: landingSkip,
  tone: 'blue',
  breadcrumb: {
    ...landingBreadcrumb,
    items: [
      { label: 'Home', href: '/' },
      { label: 'Mobile Plans', href: '/mobile-plans' },
      { label: 'Rogers vs Fido' },
    ],
  },
  hero: {
    eyebrow: 'Compare · Rogers vs Fido',
    title: 'Rogers vs Fido: which plan is better for you?',
    description:
      'Same towers, different price. See both brands side by side, so you know exactly what the extra money buys.',
    action: { label: 'See the comparison', href: '#compare' },
    pricePrefix: 'Fido from',
    price: fido.amount,
    priceSuffix: fido.period,
    photo: 'PHOTO · phone showing Rogers and Fido plans side by side',
    highlights: ['Unbiased comparison', 'Same Rogers network', 'Free help to switch'],
  },
  byline: 'Updated 5 October 2026 · Reviewed by a Canadian Plans plan advisor',
  onThisPage: {
    label: 'On this page',
    links: [
      { label: 'Side by side', href: '#compare' },
      { label: 'Which to choose', href: '#choose' },
      { label: 'Plus Chatr', href: '#three-brands' },
      { label: 'Switching', href: '#switch' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  quick: {
    eyebrow: 'Quick answer',
    title: 'Rogers or Fido: which should you pick?',
    answer: `Fido is the better value for most people: ${fido.allowance} for ${fido.amount} a month with no contract. Rogers costs more (from ${rogers.amount} for ${rogers.allowance}) but adds 5G+ priority, Canada–US talk and text, and postpaid billing that builds Canadian credit. Both run on the same Rogers network.`,
  },
  facts: {
    label: 'Rogers vs Fido at a glance',
    items: [
      { label: 'Network', value: 'Same', detail: 'Both use Rogers towers' },
      { label: 'Fido from', value: `${fido.amount}/mo`, detail: `${fido.allowance}, prepaid` },
      {
        label: 'Rogers from',
        value: `${rogers.amount}/mo`,
        detail: `${rogers.allowance}, postpaid`,
      },
      { label: 'Our pick', value: 'Fido', detail: 'Best value for most people' },
    ],
  },
  blocks: [
    {
      kind: 'table',
      id: 'compare',
      eyebrow: 'Side by side',
      title: 'Rogers vs Fido compared',
      description: 'The lowest-priced plan from each brand, and how the brands differ.',
      caption: 'Rogers and Fido plans compared',
      columns: ['Feature', 'Fido', 'Rogers'],
      highlight: 1,
      rows: [
        { label: 'Plans from', values: [`${fido.amount}/mo`, `${rogers.amount}/mo`] },
        { label: 'Data on that plan', values: [fido.allowance, rogers.allowance] },
        { label: 'How you pay', values: pair('How you pay') },
        { label: 'Credit check', values: pair('Credit check') },
        { label: 'Builds Canadian credit', values: pair('Builds Canadian credit') },
        { label: 'Network', values: pair('Network') },
        { label: 'US and travel', values: pair('US & travel') },
        { label: 'Best for', values: pair('Best for') },
      ],
      note: 'Preview plans in CAD, before tax. Check current prices and roaming terms with each brand before you sign.',
    },
    {
      kind: 'proscons',
      id: 'choose',
      eyebrow: 'Our take',
      title: 'Should you choose Fido or Rogers?',
      pros: {
        title: 'Choose Fido if…',
        mark: '✓',
        items: [
          'You want a lower monthly bill',
          `${fido.allowance} covers your usual month`,
          'You don’t travel to the US often',
          'You want Rogers coverage for less, with no contract',
        ],
      },
      cons: {
        title: 'Choose Rogers if…',
        mark: '✓',
        items: [
          'You use a lot of data, streaming or maps on the go',
          'You travel to the US and want Canada–US talk and text',
          'You want postpaid billing that builds Canadian credit',
          'The higher monthly price fits your budget',
        ],
      },
    },
    {
      kind: 'table',
      id: 'three-brands',
      eyebrow: 'Three options',
      title: 'Rogers vs Fido vs Chatr',
      description: mobileCopy.comparison.description,
      caption: 'Rogers, Fido and Chatr compared',
      columns: ['Feature', 'Rogers', 'Fido', 'Chatr'],
      rows: mobileCopy.comparison.rows.map((row) => ({
        label: row.label,
        values: [row.values[2], row.values[1], row.values[0]],
      })),
    },
    {
      kind: 'steps',
      id: 'switch',
      eyebrow: 'Keep your number',
      title: 'Switch to Rogers or Fido and keep your number',
      aside: 'Done in 3 steps',
      items: [
        {
          id: 'choose',
          marker: '1',
          meta: 'First',
          title: 'Choose your plan, keep the old one',
          body: 'Pick the plan that fits. Don’t cancel your current plan: your old provider must still approve the number transfer.',
          art: 'step-mb-details',
        },
        {
          id: 'transfer',
          marker: '2',
          meta: 'We help',
          title: 'Request the transfer',
          body: 'Send your account details and we help submit the request. Follow the carrier’s confirmation message.',
          art: 'step-mb-transfer',
        },
        {
          id: 'check',
          marker: '✓',
          meta: 'Done',
          title: 'Check your new service',
          body: 'When your old SIM stops working, test calls, texts and data on the new one.',
          art: 'step-mb-done',
          done: true,
        },
      ],
    },
    {
      kind: 'article',
      id: 'guide',
      eyebrow: 'Rogers or Fido',
      title: 'How to choose between Rogers and Fido',
      sections: [
        {
          title: 'Do Rogers and Fido use the same network?',
          body: [
            'Yes. Fido is owned by Rogers and uses the same network. Coverage and speed still depend on where you are, your phone and your plan.',
          ],
        },
        {
          title: 'Is Rogers worth the extra money?',
          body: [
            `Rogers starts at ${rogers.amount} a month for ${rogers.allowance}, against ${fido.amount} for ${fido.allowance} on Fido. You get more data, 5G+ priority and Canada–US talk and text. If you rarely travel to the US and use under ${fido.allowance}, Fido is usually the better deal.`,
          ],
        },
        {
          title: 'Which is better for newcomers without credit history?',
          body: [
            'Fido prepaid needs no credit check, so it is the easier start. Rogers postpaid usually needs a credit check or a deposit, but it helps build Canadian credit over time.',
          ],
        },
      ],
      facts: {
        title: 'Key facts',
        items: [
          { label: 'Fido from', value: `${fido.amount}/mo, ${fido.allowance}` },
          { label: 'Rogers from', value: `${rogers.amount}/mo, ${rogers.allowance}` },
          { label: 'Network', value: 'Rogers, for both' },
          { label: 'Tax', value: 'Extra' },
          { label: 'Keep your number', value: 'Yes, either way' },
        ],
        note: 'Updated 5 October 2026',
      },
    },
  ],
  faq: {
    intro: landingFaqIntro({
      eyebrow: 'FAQ',
      title: 'Rogers vs Fido questions',
      description: 'Still deciding? Advisors are available Monday to Saturday, 9am–9pm Pacific.',
    }),
    items: [
      {
        id: 'network',
        question: 'Is Fido coverage the same as Rogers?',
        answer:
          'Fido uses the Rogers network. Actual coverage and speed depend on where you use your phone, your device and your plan.',
      },
      {
        id: 'price',
        question: 'Why is Fido cheaper than Rogers?',
        answer:
          'The two brands price plans differently and include different data and extras, such as 5G+ priority and Canada–US use on Rogers.',
      },
      {
        id: 'switch',
        question: 'Can I keep my phone number when I switch?',
        answer:
          'In most cases, yes. Keep your current service active while the new provider processes the transfer.',
      },
      {
        id: 'credit',
        question: 'Do Rogers and Fido need a credit check?',
        answer:
          'Fido prepaid does not. Fido postpaid and Rogers postpaid usually need a credit check or a deposit.',
      },
      {
        id: 'usa',
        question: 'Can I use Rogers or Fido in the United States?',
        answer:
          'Many Rogers plans include Canada–US use. Fido offers roaming add-ons. Confirm the current roaming terms before you travel.',
      },
      {
        id: 'tax',
        question: 'Are taxes included in the prices?',
        answer: 'No. Prices on this page are monthly, in Canadian dollars, before tax.',
      },
    ],
  },
  related: {
    title: 'Keep exploring',
    groups: [
      {
        title: 'Plans by brand',
        links: [
          { label: 'Rogers plans', href: '/mobile-plans/rogers' },
          { label: 'Fido and Chatr plans', href: '/mobile-plans#mobile-plans' },
        ],
      },
      {
        title: 'More comparisons',
        links: [{ label: 'Fido vs Chatr', href: '/mobile-plans#brand-comparison' }],
      },
      {
        title: 'New to Canada',
        links: [
          { label: 'Pre-arrival SIM plans', href: '/pre-arrival-sim' },
          { label: 'Newcomer guides', href: '/guides' },
        ],
      },
    ],
    note: 'Rogers, Fido and Chatr are trademarks of Rogers Communications. Plan details are preview examples pending current product verification.',
  },
  cta: {
    title: 'Pick the right plan. Keep your number.',
    subtitle: 'Compare plans with an advisor before you switch. Nothing to pay today.',
    primary: { label: 'See all mobile plans →', href: '/mobile-plans#mobile-plans' },
    secondary: { label: 'Talk to an advisor ›', href: '/contact' },
    icon: 'cta-mobile',
  },
};
