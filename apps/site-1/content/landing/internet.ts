import {
  internetPlansByProvince,
  internetProvinceHref,
  internetProvinceNames,
  internetProvinces,
  type InternetProvince,
} from '../home-internet';
import { advisorHours, landingBreadcrumb, landingFaqIntro, landingSkip } from './shared';
import type { LandingBlock, LandingFaqItem, LandingPageContent } from './types';

/**
 * Home internet region pages (/home-internet/vancouver, /home-internet/ontario); copy
 * rewritten for search 23 October 2026. Primary phrases: home internet Vancouver, internet
 * for renters Vancouver; home internet Ontario. Plans and prices are the British Columbia
 * catalogue plans (content/home-internet.ts); internet is not sold in Ontario yet, so that
 * page offers the region wish list in /order.
 */
const steps = (region: string): LandingBlock => ({
  kind: 'steps',
  id: 'how-it-works',
  eyebrow: 'How it works',
  title: `How to get home internet in ${region}`,
  aside: 'Done in 3 steps',
  items: [
    {
      id: 'check',
      marker: '1',
      meta: 'Online',
      title: 'Choose your plan',
      body: 'Pick a plan and send your address and move-in date. Nothing is paid online.',
    },
    {
      id: 'call',
      marker: '2',
      meta: 'Same day',
      title: 'An advisor calls you',
      body: 'We confirm availability at your address, your exact price and your install date.',
    },
    {
      id: 'install',
      marker: '✓',
      meta: 'About 3 days',
      title: 'A technician installs it, free',
      body: 'Usually within about 3 days of your call. Your WiFi router and modem are included, and nothing is paid on install day.',
      done: true,
    },
  ],
});

const homeTypes: LandingBlock = {
  kind: 'cards',
  id: 'home-types',
  eyebrow: 'Your home',
  title: 'Internet tips for your type of home',
  columns: 2,
  items: [
    {
      id: 'apartment',
      title: 'Apartment or condo',
      body: 'Most towers are pre-wired. We check your building first so the install is quick.',
      icon: 'feature-hi-wifi',
    },
    {
      id: 'basement',
      title: 'Basement suite',
      body: 'Sharing a line with upstairs is slow and awkward. Ask your advisor about your own account and WiFi.',
      icon: 'feature-hi-moving',
    },
    {
      id: 'house',
      title: 'House',
      body: 'A professional install puts the WiFi router where it covers your home best.',
      icon: 'feature-hi-install',
    },
    {
      id: 'student',
      title: 'Student housing',
      body: 'Short lease? There is no contract, so tell your advisor your dates before you book.',
      icon: 'feature-hi-unlimited',
    },
  ],
};

const guide = (region: string, facts: { price: string; speed: string }): LandingBlock => ({
  kind: 'article',
  id: 'guide',
  eyebrow: 'Renter’s guide',
  title: `Home internet in ${region}: a renter’s guide`,
  sections: [
    {
      title: 'What internet speed do I need?',
      body: [
        'For 1 to 3 people, 500 Mbps covers streaming, video calls and working from home with room to spare. Busy shared homes, gamers and anyone uploading large files should look at 1 Gbps or more.',
      ],
    },
    {
      title: 'Do I need my landlord’s permission to get internet?',
      body: [
        'Most renters don’t, but some older buildings need building access for the technician. We check this on the call, so you can book with confidence.',
      ],
    },
    {
      title: 'Fibre or cable: what is the difference?',
      body: [
        'Fibre gives equally fast upload and download speeds and is available in many newer towers. Cable is widely available and fine for streaming. Your advisor confirms what your building supports.',
      ],
    },
    {
      title: 'Do I need a Canadian credit history?',
      body: [
        'Not always. Many newcomers sign up with a passport and permit. If the provider needs a deposit or a different plan, your advisor tells you before anything is booked.',
      ],
    },
  ],
  facts: {
    title: 'Key facts',
    items: [
      { label: 'Price range', value: facts.price },
      { label: 'Typical install', value: 'About 3 days after your call' },
      { label: 'Top speed', value: facts.speed },
      { label: 'Data', value: 'Unlimited on every plan' },
      { label: 'Equipment', value: 'WiFi router and modem included' },
      { label: 'Paid up front', value: 'Nothing' },
    ],
    note: 'Updated 23 October 2026',
  },
});

const priceLockAnswer = (province: string) =>
  `No. There is no contract. In ${province} your monthly price is locked for 2 years, your first bill comes 15 days after installation, and you have a 15-day trial if the service is not right for you.`;
const twoMonthsAnswer =
  'No. There is no contract. In Saskatchewan your first two months are free once service is active, and billing starts in month three at the agreed price. Taxes and government fees are extra.';

const faq = (
  region: string,
  installAnswer: string,
  contractAnswer: string = priceLockAnswer('British Columbia'),
): readonly LandingFaqItem[] => [
  {
    id: 'installation',
    question: `How fast can you install internet in ${region}?`,
    answer: installAnswer,
  },
  {
    id: 'credit',
    question: 'Do I need a Canadian credit history for home internet?',
    answer:
      'Not always. Many newcomers sign up with a passport and permit. If a deposit or a different plan is needed, your advisor tells you before anything is booked.',
  },
  {
    id: 'contract',
    question: 'Is there a contract?',
    answer: contractAnswer,
  },
  {
    id: 'fibre',
    question: 'Is fibre available in my building?',
    answer:
      'It depends on the exact building. Your advisor confirms what is available at your address on the call.',
  },
  {
    id: 'move',
    question: 'What happens if I move?',
    answer:
      'Talk to an advisor before you move. They check whether service is available at your new address and what it costs there, then book the transfer.',
  },
];

const related = (other: { label: string; href: string }) => ({
  title: 'Keep exploring',
  groups: [
    {
      title: 'Other regions',
      links: [other],
    },
    {
      title: 'Internet',
      links: [
        { label: 'All home internet plans by province', href: '/home-internet' },
        { label: 'Business internet', href: '/business-internet' },
      ],
    },
    {
      title: 'New to Canada',
      links: [
        { label: 'eSIM plans before you arrive', href: '/pre-arrival-sim' },
        { label: 'Newcomer guides', href: '/guides' },
      ],
    },
  ],
  note: 'Prices in Canadian dollars, before tax, as of October 2026. Availability depends on your exact address; your advisor confirms it before installation.',
});

const highlights = ['Free professional install', 'Unlimited data', 'Nothing paid up front'];

export const vancouverInternetLanding: LandingPageContent = {
  path: '/home-internet/vancouver',
  title: 'Home Internet in Vancouver: Unlimited from $70, Free Install | Canadian Plans',
  description:
    'Home internet in Vancouver for apartments, condos and basement suites. Unlimited data, router included, free install in about 3 days, from $70/month.',
  mainId: 'vancouver-main',
  skip: landingSkip,
  tone: 'mint',
  breadcrumb: {
    ...landingBreadcrumb,
    items: [
      { label: 'Home', href: '/' },
      { label: 'Home Internet', href: '/home-internet' },
      { label: 'Vancouver' },
    ],
  },
  hero: {
    eyebrow: 'Home internet · Vancouver, BC',
    title: 'Home internet in Vancouver, installed free in about 3 days',
    description:
      'Unlimited internet for apartments, condos, basement suites and houses across Metro Vancouver. WiFi router and modem included, free professional install, a 2-year price lock and nothing paid up front.',
    action: { label: 'See BC plans', href: '#plans' },
    pricePrefix: 'from',
    price: '$70',
    priceSuffix: '/mo',
    photo: 'PHOTO · technician connecting a WiFi modem in a Vancouver apartment',
    highlights,
  },
  byline: 'Updated 23 October 2026 · Checked by a Canadian Plans plan advisor',
  onThisPage: {
    label: 'On this page',
    links: [
      { label: 'Plans', href: '#plans' },
      { label: 'Renter’s guide', href: '#guide' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  quick: {
    eyebrow: 'Quick answer',
    title: 'How much is home internet in Vancouver?',
    answer:
      'Through Canadian Plans, home internet in British Columbia starts at $70 a month for 500 Mbps or $80 for 1 Gbps (CAD, plus tax), with unlimited data, a WiFi router and modem included, free professional installation and a 2-year price lock. Internet + StreamSaver TV is $115 and Internet + TV with 120+ channels is $140. Nothing is paid up front, and most Vancouver homes are installed within about 3 days of your call.',
  },
  facts: {
    label: 'Vancouver internet facts',
    items: [
      { label: 'Typical install', value: '3 days', detail: 'After your call' },
      { label: 'Top speed', value: '1 Gbps', detail: 'British Columbia plans' },
      { label: 'Starting price', value: '$70/mo', detail: 'CAD, plus tax' },
      { label: 'Price lock', value: '2 years', detail: 'Nothing paid up front' },
    ],
  },
  blocks: [
    steps('Vancouver'),
    { kind: 'slot', id: 'plans' },
    homeTypes,
    guide('Vancouver', { price: '$70–$140/mo, CAD + tax', speed: 'Up to 1 Gbps' }),
  ],
  faq: {
    intro: landingFaqIntro({
      eyebrow: 'FAQ',
      title: 'Vancouver internet questions',
      description: advisorHours,
    }),
    items: faq(
      'Vancouver',
      'Most Vancouver installs happen within about 3 days of your call. Tell us your move-in date and we book the first slot after you get the keys. Installation is free.',
    ),
  },
  related: related({
    label: 'All British Columbia plans',
    href: '/home-internet/british-columbia',
  }),
  cta: {
    title: 'Online on move-in day in Vancouver',
    subtitle: 'Choose a plan and send your details. An advisor confirms it the same day.',
    primary: { label: 'See BC plans →', href: '#plans' },
    secondary: { label: 'Talk to an advisor ›', href: '/contact' },
    icon: 'cta-home-internet',
  },
};

export const ontarioInternetLanding: LandingPageContent = {
  path: '/home-internet/ontario',
  title: 'Home Internet in Ontario: Join the Wish List | Canadian Plans',
  description:
    'Canadian Plans does not sell home internet in Ontario yet. Leave your email and we tell you when Ontario opens. Mobile plans and eSIMs work in Ontario today.',
  mainId: 'ontario-main',
  skip: landingSkip,
  tone: 'mint',
  breadcrumb: {
    ...landingBreadcrumb,
    items: [
      { label: 'Home', href: '/' },
      { label: 'Home Internet', href: '/home-internet' },
      { label: 'Ontario' },
    ],
  },
  hero: {
    eyebrow: 'Home internet · Ontario',
    title: 'Home internet in Ontario is coming soon',
    description:
      'We sell home internet in British Columbia, Alberta, Manitoba and Saskatchewan today. Join the wish list and we email you once when Ontario plans and prices open. Our mobile plans and eSIMs already work in Ontario.',
    action: { label: 'Join the wish list', href: '/order?category=internet&province=ON' },
    photo: 'PHOTO · technician connecting a WiFi modem in a Toronto condo',
    highlights: ['One email when Ontario opens', 'No payment', 'No spam'],
  },
  byline: 'Updated 23 October 2026',
  onThisPage: {
    label: 'On this page',
    links: [
      { label: 'Wish list', href: '#plans' },
      { label: 'Renter’s guide', href: '#guide' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  quick: {
    eyebrow: 'Quick answer',
    title: 'Can I get home internet from Canadian Plans in Ontario?',
    answer:
      'Not yet. Home internet is sold in British Columbia, Alberta, Manitoba and Saskatchewan today, from $50 a month. Join the wish list and we email you when Ontario plans and prices are available. Mobile plans and the eSIMs you order before arriving work in Ontario now.',
  },
  blocks: [
    { kind: 'slot', id: 'plans' },
    homeTypes,
    guide('Ontario', { price: 'Not sold in Ontario yet', speed: 'Announced when Ontario opens' }),
  ],
  faq: {
    intro: landingFaqIntro({
      eyebrow: 'FAQ',
      title: 'Ontario internet questions',
      description:
        'Advisors are available Monday to Saturday, 9am to 9pm Pacific (noon to midnight Eastern).',
    }),
    items: [
      {
        id: 'when',
        question: 'When will home internet be available in Ontario?',
        answer:
          'We have no date yet. Join the wish list and we email you as soon as Ontario plans open.',
      },
      {
        id: 'mobile',
        question: 'Can I get a mobile plan in Ontario?',
        answer:
          'Yes. Our bring-your-own-phone mobile plans are sold in every province, and the eSIM plans you order before you arrive work anywhere in Canada, including Toronto and Ottawa.',
      },
      {
        id: 'elsewhere',
        question: 'Which provinces have home internet today?',
        answer:
          'British Columbia, Alberta, Manitoba and Saskatchewan, priced by province, from $50 a month with unlimited data and free installation.',
      },
    ],
  },
  related: related({ label: 'Home internet in Vancouver', href: '/home-internet/vancouver' }),
  cta: {
    title: 'Be first to know when Ontario opens',
    subtitle: 'One short form. No payment and no spam.',
    primary: { label: 'Join the wish list →', href: '/order?category=internet&province=ON' },
    secondary: { label: 'See mobile plans ›', href: '/mobile-plans' },
    icon: 'cta-home-internet',
  },
};

/** Plan section copy shared by the region pages. */
export const internetLandingPlans = {
  eyebrow: 'Internet plans',
  date: 'Prices as of October 2026 · CAD, taxes extra',
  priceNote: 'CAD, plus tax. Nothing paid online.',
  ontario: {
    title: 'Not available in Ontario yet',
    body: 'Leave your email on the order page and we tell you when Ontario plans open.',
    action: 'Join the wish list →',
    href: '/order?category=internet&province=ON',
  },
};

/** The plan block on a province page: every plan sold there, from the catalogue list. */
export function provinceInternetPlans(province: InternetProvince) {
  const plans = internetPlansByProvince[province];
  const from = Math.min(...plans.map((plan) => plan.priceCad));
  const name = internetProvinceNames[province];
  return { province, name, title: `${name} plans and prices`, price: `From $${from}/mo` };
}

interface ProvinceFacts {
  readonly entry: string;
  readonly upper: string;
  readonly tv: string;
  readonly promo: 'lock' | 'free';
  readonly cities: string;
  readonly titleHook: string;
}

const provinceFacts: Record<InternetProvince, ProvinceFacts> = {
  BC: {
    entry: '$70 a month for 500 Mbps',
    upper: '$80 for 1 Gbps',
    tv: 'Internet + StreamSaver TV is $115 and Internet + TV with 120+ channels is $140',
    promo: 'lock',
    cities: 'Vancouver, Surrey, Burnaby, Richmond, Kelowna and Victoria',
    titleHook: 'Unlimited from $70, Free Install',
  },
  AB: {
    entry: '$70 a month for 500 Mbps',
    upper: '$80 for 1 Gbps',
    tv: 'Internet + StreamSaver TV is $115 and Internet + TV with 120+ channels is $140',
    promo: 'lock',
    cities: 'Calgary, Edmonton, Red Deer and Lethbridge',
    titleHook: 'Unlimited from $70, Free Install',
  },
  SK: {
    entry: '$50 a month for 1 Gbps',
    upper: '$60 for 2 Gbps',
    tv: 'Internet + TV with 120+ channels is $90',
    promo: 'free',
    cities: 'Saskatoon, Regina, Prince Albert and Moose Jaw',
    titleHook: '2 Months Free, from $50/mo',
  },
  MB: {
    entry: '$90 a month for 500 Mbps',
    upper: '$100 for 2 Gbps',
    tv: 'Internet + TV with 120+ channels is $150',
    promo: 'lock',
    cities: 'Winnipeg, Brandon and Steinbach',
    titleHook: 'Unlimited from $90, 2-Year Price Lock',
  },
};

/**
 * One landing page per province that sells internet (owner request, 23 October 2026).
 * Primary phrase: home internet <province>; prices come from the same plan list as /order.
 */
export function provinceInternetLanding(province: InternetProvince): LandingPageContent {
  const name = internetProvinceNames[province];
  const facts = provinceFacts[province];
  const plans = internetPlansByProvince[province];
  const from = Math.min(...plans.map((plan) => plan.priceCad));
  const top = plans.reduce((best, plan) => (plan.mbps > best.mbps ? plan : best));
  const maxPrice = Math.max(...plans.map((plan) => plan.priceCad));
  const promoLine =
    facts.promo === 'free'
      ? 'your first two months free'
      : 'a 2-year price lock and a 15-day trial';
  const others = internetProvinces
    .filter((code) => code !== province)
    .map((code) => ({
      label: `Home internet in ${internetProvinceNames[code]}`,
      href: internetProvinceHref(code),
    }));
  return {
    path: internetProvinceHref(province),
    title: `Home Internet in ${name}: ${facts.titleHook} | Canadian Plans`,
    description: `Home internet plans in ${name} from $${from}/month: unlimited data, WiFi router included, free professional install and nothing paid up front. Every plan and price, with ${promoLine}.`,
    mainId: `${province.toLowerCase()}-main`,
    skip: landingSkip,
    tone: 'mint',
    breadcrumb: {
      ...landingBreadcrumb,
      items: [
        { label: 'Home', href: '/' },
        { label: 'Home Internet', href: '/home-internet' },
        { label: name },
      ],
    },
    hero: {
      eyebrow: `Home internet · ${name}`,
      title: `Home internet in ${name}, installed free, from $${from} a month`,
      description: `Unlimited internet for apartments, condos, basement suites and houses in ${facts.cities}. WiFi router and modem included, free professional install, ${promoLine}, and nothing paid up front.`,
      action: { label: `See ${name} plans`, href: '#plans' },
      pricePrefix: 'from',
      price: `$${from}`,
      priceSuffix: '/mo',
      photo: `PHOTO · technician connecting a WiFi modem in a ${name} home`,
      highlights,
    },
    byline: 'Updated 23 October 2026 · Checked against the Canada Wide plan pages',
    onThisPage: {
      label: 'On this page',
      links: [
        { label: 'How it works', href: '#how-it-works' },
        { label: 'Plans and prices', href: '#plans' },
        { label: 'Renter’s guide', href: '#guide' },
        { label: 'FAQ', href: '#faq' },
      ],
    },
    quick: {
      eyebrow: 'Quick answer',
      title: `How much is home internet in ${name}?`,
      answer: `Through Canadian Plans, unlimited home internet in ${name} starts at ${facts.entry} or ${facts.upper} (CAD, plus tax), with a WiFi router and modem included, free professional installation and nothing paid up front. ${facts.tv}. ${
        facts.promo === 'free'
          ? 'Your first two months are free and billing starts in month three.'
          : 'Your price is locked for 2 years and you have a 15-day trial after installation.'
      } Installs can happen within about 3 days of your call.`,
    },
    facts: {
      label: `${name} internet facts`,
      items: [
        { label: 'Starting price', value: `$${from}/mo`, detail: 'CAD, plus tax' },
        { label: 'Top speed', value: top.allowance, detail: 'Unlimited data' },
        {
          label: facts.promo === 'free' ? 'Promotion' : 'Price lock',
          value: facts.promo === 'free' ? '2 months free' : '2 years',
          detail: facts.promo === 'free' ? 'Billing starts month 3' : '15-day trial',
        },
        { label: 'Install', value: '3 days', detail: 'About, after your call' },
      ],
    },
    blocks: [
      steps(name),
      { kind: 'slot', id: 'plans' },
      homeTypes,
      guide(name, {
        price: `$${from}–$${maxPrice}/mo, CAD + tax`,
        speed: `Up to ${top.allowance}`,
      }),
    ],
    faq: {
      intro: landingFaqIntro({
        eyebrow: 'FAQ',
        title: `${name} internet questions`,
        description: advisorHours,
      }),
      items: [
        ...faq(
          name,
          `Installs in ${name} can happen within about 3 days of your call. Tell us your move-in date and we book the first slot after you get the keys. Installation is free.`,
          facts.promo === 'free' ? twoMonthsAnswer : priceLockAnswer(name),
        ),
        {
          id: 'tv',
          question: `Can I add TV in ${name}?`,
          answer: `Yes. ${facts.tv} (CAD, plus tax). Your advisor explains the channel packages when you talk.`,
        },
      ],
    },
    related: {
      title: 'Keep exploring',
      groups: [
        { title: 'Other provinces', links: others },
        {
          title: 'Internet',
          links: [
            { label: 'All home internet plans by province', href: '/home-internet' },
            {
              label: 'How much does home internet cost in Canada?',
              href: '/guides/home-internet-cost-canada-by-province',
            },
          ],
        },
        {
          title: 'New to Canada',
          links: [
            { label: 'eSIM plans before you arrive', href: '/pre-arrival-sim' },
            { label: 'Newcomer guides', href: '/guides' },
          ],
        },
      ],
      note: 'Prices in Canadian dollars, before tax, as of October 2026. Availability depends on your exact address; your advisor confirms it before installation.',
    },
    cta: {
      title: `Online on move-in day in ${name}`,
      subtitle:
        'Choose a plan and send your details. An advisor confirms it, usually the same day.',
      primary: { label: `See ${name} plans →`, href: '#plans' },
      secondary: { label: 'Talk to an advisor ›', href: '/contact' },
      icon: 'cta-home-internet',
    },
  };
}
