import type { PlanCardContent, FigmaAsset } from '@canadian-plans/ui/canadian-plans';
import {
  chromeContent,
  footerContent,
  componentAssets,
  type ChromeContent,
  type FooterContent,
} from './components';
/**
 * Copy for /home-internet (SEO rewrite, 23 October 2026). Primary phrase: home internet
 * plans in BC, Alberta, Manitoba and Saskatchewan. Plan prices come from
 * internetPlansByProvince below, which mirrors the static catalogue.
 */
export const internetCopy = {
  title: 'Home Internet Plans in BC, Alberta, Manitoba & Saskatchewan | Canadian Plans',
  skip: 'Skip to main content',
  breadcrumbLabel: 'Breadcrumb',
  separator: '/',
  breadcrumb: [
    {
      label: 'Home',
      href: '/',
    },
    {
      label: 'Home Internet',
    },
  ],
  hero: {
    eyebrow: 'Home internet & TV · British Columbia, Alberta, Manitoba, Saskatchewan',
    title: 'Unlimited home internet, installed free, from move-in day.',
    description:
      'Speeds up to 2 Gbps depending on your province. Unlimited data, a WiFi router and modem included, free professional installation and nothing to pay up front. Most homes are online within about 3 days of your call.',
    price: 'From $50/mo',
    priceNote: 'CAD, plus tax. Nothing paid online.',
    features: [
      '✓ Authorized sales agent based in Surrey, BC',
      '✓ WiFi router and modem included, no rental fee',
      '✓ New to Canada? Your advisor explains your options',
    ],
  },
  quick: {
    eyebrow: 'Quick answer · Updated October 2026',
    title: 'How much is home internet in Canada?',
    description:
      'Through Canadian Plans, unlimited home internet starts at $50 a month in Saskatchewan, $70 in British Columbia and Alberta, and $90 in Manitoba (CAD, taxes extra). Every plan includes unlimited data, a WiFi router and modem, free professional installation and no upfront payment. Saskatchewan plans come with the first two months free; BC, Alberta and Manitoba plans have a 2-year price lock and a 15-day trial, with the first bill 15 days after installation. Internet + TV bundles start at $90.',
  },
  plans: {
    heading: {
      eyebrow: 'Internet plans',
      title: ['Home internet plans and prices by province'],
    },
    date: 'Prices as of October 2026 · CAD, taxes extra',
    includesTitle: 'Every plan includes',
    includes: [
      '✓ Unlimited data, no overage',
      '✓ WiFi router and modem, no rental fee',
      '✓ Free professional installation',
      '✓ No upfront payment',
    ],
  },
  comparison: {
    heading: {
      title: ['What each internet speed feels like'],
      description:
        "Real examples instead of tech terms. Times are based on each plan's top speed. WiFi inside your home may be a bit slower.",
    },
    label: 'Internet speed comparison',
    featureLabel: 'Usage',
    columns: ['500 Mbps', '1 Gbps', '2 Gbps'],
    rows: [
      {
        label: '4K streams at once',
        values: ['3', '6', '8+'],
      },
      {
        label: 'HD video calls at once',
        values: ['6', '10+', '15+'],
      },
      {
        label: 'Download a 50 GB game',
        values: ['≈ 14 min', '≈ 7 min', '≈ 3 min'],
      },
      {
        label: 'Devices online comfortably',
        values: ['15', '30', '40+'],
      },
      {
        label: 'Best for',
        values: ['1–3 people', '4+ people', 'Big households and heavy users'],
      },
    ],
    note: 'Download times are theoretical at full plan speed (50 GB = 400 gigabits). Device and stream counts are guidance, not guarantees.',
  },
  tv: {
    eyebrow: 'Add TV & streaming',
    title: 'Internet and TV on one bill.',
    description:
      'Add TV with 120+ live channels and a PVR box to any plan, or in BC and Alberta choose StreamSaver TV with 70+ channels on the app plus Netflix, Disney+ and Apple TV. Your advisor explains the packages in plain words when you talk.',
    caption: 'Family on the sofa watching a hockey game on the living-room TV',
    button: 'See TV bundles →',
  },
  faq: {
    heading: {
      eyebrow: 'FAQ',
      title: ['Home internet', 'questions'],
      description: 'Talk to an advisor, Monday to Saturday, 9am to 9pm Pacific time.',
    },
    items: [
      {
        id: 'install',
        question: 'How fast can you install home internet?',
        answer:
          'Most installs happen within about 3 days of your call with an advisor. Tell us your move-in date and we book the first slot after you get the keys. Installation is free and a technician sets up the modem and WiFi.',
      },
      {
        id: 'cost',
        question: 'What does home internet cost each month?',
        answer:
          'From $50 a month in Saskatchewan, $70 in British Columbia and Alberta, and $90 in Manitoba, plus tax. Internet + TV bundles start at $90 in Saskatchewan, $115 in BC and Alberta and $150 in Manitoba. There is no upfront payment and no equipment rental fee.',
      },
      {
        id: 'credit',
        question: 'Do I need a Canadian credit history for home internet?',
        answer:
          'Not always. Many newcomers sign up with a passport and permit. If the provider needs a deposit or a different plan, your advisor tells you before anything is booked, so there are no surprises on install day.',
      },
      {
        id: 'internet-faq-0',
        question: 'Is there a contract?',
        answer:
          'Yes. Home internet comes with a service agreement with the provider, including the 2-year price lock in Manitoba, British Columbia and Alberta. Your advisor explains its length and terms before anything is booked.',
      },
      {
        id: 'promo',
        question: 'What promotions are included?',
        answer:
          'In Saskatchewan your first two months are free and billing starts in month three. In BC, Alberta and Manitoba there is no deposit or activation fee, your first bill comes 15 days after installation, your price is locked for 2 years, and you have a 15-day trial if the service is not right for you.',
      },
      {
        id: 'internet-faq-1',
        question: 'Can I book my internet install before I move in?',
        answer:
          'Yes. Add your move-in date to your order and an advisor books the first install slot after you get the keys.',
      },
      {
        id: 'internet-faq-2',
        question: 'Is the WiFi modem included?',
        answer:
          'Yes. A WiFi router and modem are included on every plan, with no monthly equipment rental fee.',
      },
      {
        id: 'provinces',
        question: 'Which provinces do you serve?',
        answer:
          'British Columbia, Alberta, Manitoba and Saskatchewan today, priced by province rather than by city. If you live somewhere else, join the wish list on the order page and we email you when your province opens. Mobile plans are available in every province.',
      },
      {
        id: 'internet-faq-3',
        question: 'What happens to my internet if I move again?',
        answer:
          'Talk to an advisor before you move. They check whether service is available at your new address and what it costs there, then book the transfer.',
      },
    ],
  },
};
export type InternetProvince = 'SK' | 'MB' | 'BC' | 'AB';
/**
 * An internet or internet + TV plan as sold in /order. `id` is the catalogue productKey
 * (packages/adapters/src/static-catalogue/site-1-plans.ts); keep prices in step with it.
 */
export interface InternetPlan extends PlanCardContent {
  readonly province: InternetProvince;
  readonly priceCad: number;
  readonly mbps: number;
}
export const internetProvinceNames: Record<InternetProvince, string> = {
  SK: 'Saskatchewan',
  MB: 'Manitoba',
  BC: 'British Columbia',
  AB: 'Alberta',
};
export const internetPromotions: Record<InternetProvince, string> = {
  SK: 'Up to 2 months free',
  MB: '2-year price lock',
  BC: '2-year price lock',
  AB: '2-year price lock',
};
const internetPlan = (
  province: InternetProvince,
  id: string,
  title: string,
  speed: string,
  mbps: number,
  priceCad: number,
  extra: readonly string[] = [],
  badge?: string,
): InternetPlan => ({
  id,
  province,
  priceCad,
  mbps,
  carrier: title,
  allowance: speed,
  amount: `$${priceCad}`,
  period: '/mo',
  finePrint: 'CAD · taxes extra · unlimited data',
  goodFor: `${internetPromotions[province]} · ${internetProvinceNames[province]}`,
  features: [`✓ Unlimited data up to ${speed}`, ...extra, '✓ Free WiFi router & modem'],
  buttonLabel: `Choose ${speed}`,
  selectedLabel: 'Selected ✓',
  ...(badge ? { badge } : {}),
});
const tv = ['✓ TV with 120+ channels', '✓ 1 PVR box'];
const streamSaver = ['✓ 70+ channels on the app', '✓ Netflix, Disney+ and Apple TV'];
const westernPlans = (province: 'BC' | 'AB'): InternetPlan[] => {
  const key = province.toLowerCase();
  return [
    internetPlan(province, `internet-${key}-500`, 'High Speed Unlimited', '500 Mbps', 500, 70),
    internetPlan(
      province,
      `internet-${key}-1000`,
      'High Speed Unlimited',
      '1 Gbps',
      1000,
      80,
      [],
      'Popular',
    ),
    internetPlan(
      province,
      `internet-streamsaver-${key}-1000`,
      'Internet + StreamSaver TV',
      '1 Gbps',
      1000,
      115,
      streamSaver,
    ),
    internetPlan(
      province,
      `internet-tv-${key}-1000`,
      'Internet + TV Bundle',
      '1 Gbps',
      1000,
      140,
      tv,
    ),
  ];
};
/** Every internet plan by province, exactly as /order sells it. */
export const internetPlansByProvince: Record<InternetProvince, readonly InternetPlan[]> = {
  SK: [
    internetPlan('SK', 'internet-sk-1000', 'High Speed Unlimited', '1 Gbps', 1000, 50),
    internetPlan(
      'SK',
      'internet-sk-2000',
      'High Speed Unlimited',
      '2 Gbps',
      2000,
      60,
      [],
      'Popular',
    ),
    internetPlan('SK', 'internet-tv-sk-1000', 'Internet + TV Bundle', '1 Gbps', 1000, 90, tv),
  ],
  MB: [
    internetPlan('MB', 'internet-mb-500', 'High Speed Unlimited', '500 Mbps', 500, 90),
    internetPlan(
      'MB',
      'internet-mb-2000',
      'High Speed Unlimited',
      '2 Gbps',
      2000,
      100,
      [],
      'Popular',
    ),
    internetPlan('MB', 'internet-tv-mb-2000', 'Internet + TV Bundle', '2 Gbps', 2000, 150, tv),
  ],
  BC: westernPlans('BC'),
  AB: westernPlans('AB'),
};
export const internetProvinces = [
  'SK',
  'MB',
  'BC',
  'AB',
] as const satisfies readonly InternetProvince[];
/** The order form link for one plan, or for a province's plan list. */
export const internetOrderHref = (province: string, plan?: InternetPlan) =>
  plan
    ? `/order?plan=${plan.id}&category=internet&province=${plan.province}`
    : `/order?category=internet&province=${province}`;
/** URL slug for each province page, e.g. /home-internet/british-columbia. */
export const internetProvinceSlugs: Record<InternetProvince, string> = {
  SK: 'saskatchewan',
  MB: 'manitoba',
  BC: 'british-columbia',
  AB: 'alberta',
};
export const internetProvinceHref = (province: InternetProvince) =>
  `/home-internet/${internetProvinceSlugs[province]}`;
export const internetProvinceFromSlug = (slug: string): InternetProvince | undefined =>
  internetProvinces.find((province) => internetProvinceSlugs[province] === slug);

export interface InternetProvinceSummary {
  readonly province: InternetProvince;
  readonly name: string;
  readonly href: string;
  /** Lowest monthly price in the province, in dollars. */
  readonly fromCad: number;
  readonly topSpeed: string;
  readonly highlights: readonly string[];
}
/**
 * One summary card per province for /home-internet (owner request, 23 October 2026): the
 * lowest price, the headline facts, and a link to that province's own page. Derived from the
 * plan list so it can never disagree with it.
 */
export const internetProvinceSummaries: readonly InternetProvinceSummary[] = internetProvinces.map(
  (province) => {
    const plans = internetPlansByProvince[province];
    const from = Math.min(...plans.map((plan) => plan.priceCad));
    const top = plans.reduce((best, plan) => (plan.mbps > best.mbps ? plan : best));
    const tv = plans.some((plan) => plan.id.includes('streamsaver'))
      ? 'Optional TV or StreamSaver bundle'
      : 'Optional TV bundle, 120+ channels';
    return {
      province,
      name: internetProvinceNames[province],
      href: internetProvinceHref(province),
      fromCad: from,
      topSpeed: top.allowance,
      highlights: [
        `Up to ${top.allowance}`,
        internetPromotions[province],
        'Unlimited data',
        'Free WiFi router & modem',
        tv,
      ],
    };
  },
);
export const internetProvinceCardCopy = {
  from: 'From',
  period: '/mo',
  action: 'View plans & offers',
  arrow: '→',
  label: 'Home internet by province',
} as const;
export const internetAssets = {
  '106-34-imgEllipse': {
    src: '/design/home-internet/106-34-imgEllipse.svg',
    width: 14,
    height: 14,
    nodeId: '106-34-imgEllipse',
  },
  '106-34-imgEllipse1': {
    src: '/design/home-internet/106-34-imgEllipse1.svg',
    width: 16,
    height: 16,
    nodeId: '106-34-imgEllipse1',
  },
  '106-34-imgEllipse2': {
    src: '/design/home-internet/106-34-imgEllipse2.svg',
    width: 16,
    height: 16,
    nodeId: '106-34-imgEllipse2',
  },
  '106-34-imgEllipse3': {
    src: '/design/home-internet/106-34-imgEllipse3.svg',
    width: 40,
    height: 40,
    nodeId: '106-34-imgEllipse3',
  },
  '106-34-imgEllipse4': {
    src: '/design/home-internet/106-34-imgEllipse4.svg',
    width: 40,
    height: 40,
    nodeId: '106-34-imgEllipse4',
  },
  '106-34-imgEllipse5': {
    src: '/design/home-internet/106-34-imgEllipse5.svg',
    width: 40,
    height: 40,
    nodeId: '106-34-imgEllipse5',
  },
  '106-34-imgFrame': {
    src: '/design/home-internet/106-34-imgFrame.svg',
    width: 36,
    height: 36,
    nodeId: '106-34-imgFrame',
  },
  '106-34-imgIcon': {
    src: '/design/home-internet/106-34-imgIcon.svg',
    width: 32,
    height: 32,
    nodeId: '106-34-imgIcon',
  },
  '106-34-imgIcon1': {
    src: '/design/home-internet/106-34-imgIcon1.svg',
    width: 32,
    height: 32,
    nodeId: '106-34-imgIcon1',
  },
  '106-34-imgIconRouter': {
    src: '/design/home-internet/106-34-imgIconRouter.svg',
    width: 28,
    height: 28,
    nodeId: '106-34-imgIconRouter',
  },
  '106-34-imgIconWifi': {
    src: '/design/home-internet/106-34-imgIconWifi.svg',
    width: 28,
    height: 28,
    nodeId: '106-34-imgIconWifi',
  },
  '106-34-imgIconWrench': {
    src: '/design/home-internet/106-34-imgIconWrench.svg',
    width: 28,
    height: 28,
    nodeId: '106-34-imgIconWrench',
  },
  '106-34-imgMark': {
    src: '/design/home-internet/106-34-imgMark.svg',
    width: 36,
    height: 36,
    nodeId: '106-34-imgMark',
  },
  '212-51-imgEllipse': {
    src: '/design/home-internet/212-51-imgEllipse.svg',
    width: 16,
    height: 16,
    nodeId: '212-51-imgEllipse',
  },
  '212-51-imgEllipse1': {
    src: '/design/home-internet/212-51-imgEllipse1.svg',
    width: 16,
    height: 16,
    nodeId: '212-51-imgEllipse1',
  },
  '212-51-imgEllipse2': {
    src: '/design/home-internet/212-51-imgEllipse2.svg',
    width: 40,
    height: 40,
    nodeId: '212-51-imgEllipse2',
  },
  '212-51-imgEllipse3': {
    src: '/design/home-internet/212-51-imgEllipse3.svg',
    width: 40,
    height: 40,
    nodeId: '212-51-imgEllipse3',
  },
  '212-51-imgEllipse4': {
    src: '/design/home-internet/212-51-imgEllipse4.svg',
    width: 40,
    height: 40,
    nodeId: '212-51-imgEllipse4',
  },
  '212-51-imgFrame': {
    src: '/design/home-internet/212-51-imgFrame.svg',
    width: 36,
    height: 36,
    nodeId: '212-51-imgFrame',
  },
  '212-51-imgIcon': {
    src: '/design/home-internet/212-51-imgIcon.svg',
    width: 22,
    height: 22,
    nodeId: '212-51-imgIcon',
  },
  '212-51-imgIcon1': {
    src: '/design/home-internet/212-51-imgIcon1.svg',
    width: 24,
    height: 24,
    nodeId: '212-51-imgIcon1',
  },
  '212-51-imgIcon2': {
    src: '/design/home-internet/212-51-imgIcon2.svg',
    width: 32,
    height: 32,
    nodeId: '212-51-imgIcon2',
  },
  '212-51-imgIcon3': {
    src: '/design/home-internet/212-51-imgIcon3.svg',
    width: 32,
    height: 32,
    nodeId: '212-51-imgIcon3',
  },
  '212-51-imgIconRouter': {
    src: '/design/home-internet/212-51-imgIconRouter.svg',
    width: 28,
    height: 28,
    nodeId: '212-51-imgIconRouter',
  },
  '212-51-imgIconWifi': {
    src: '/design/home-internet/212-51-imgIconWifi.svg',
    width: 28,
    height: 28,
    nodeId: '212-51-imgIconWifi',
  },
  '212-51-imgIconWrench': {
    src: '/design/home-internet/212-51-imgIconWrench.svg',
    width: 28,
    height: 28,
    nodeId: '212-51-imgIconWrench',
  },
  '212-51-imgMark': {
    src: '/design/home-internet/212-51-imgMark.svg',
    width: 36,
    height: 36,
    nodeId: '212-51-imgMark',
  },
  '212-51-imgPhoneIcon': {
    src: '/design/home-internet/212-51-imgPhoneIcon.svg',
    width: 16,
    height: 16,
    nodeId: '212-51-imgPhoneIcon',
  },
  '308-108-imgFrame': {
    src: '/design/home-internet/308-108-imgFrame.svg',
    width: 22,
    height: 22,
    nodeId: '308-108-imgFrame',
  },
  '308-108-imgIcon': {
    src: '/design/home-internet/308-108-imgIcon.svg',
    width: 20,
    height: 20,
    nodeId: '308-108-imgIcon',
  },
  '308-108-imgIcon1': {
    src: '/design/home-internet/308-108-imgIcon1.svg',
    width: 20,
    height: 20,
    nodeId: '308-108-imgIcon1',
  },
  '308-108-imgIcon2': {
    src: '/design/home-internet/308-108-imgIcon2.svg',
    width: 20,
    height: 20,
    nodeId: '308-108-imgIcon2',
  },
  '308-129-imgFrame': {
    src: '/design/home-internet/308-129-imgFrame.svg',
    width: 16,
    height: 16,
    nodeId: '308-129-imgFrame',
  },
  '308-3-imgFrame': {
    src: '/design/home-internet/308-3-imgFrame.svg',
    width: 22,
    height: 22,
    nodeId: '308-3-imgFrame',
  },
  '308-38-imgFrame': {
    src: '/design/home-internet/308-38-imgFrame.svg',
    width: 22,
    height: 22,
    nodeId: '308-38-imgFrame',
  },
  '308-38-imgIcon': {
    src: '/design/home-internet/308-38-imgIcon.svg',
    width: 20,
    height: 20,
    nodeId: '308-38-imgIcon',
  },
  '308-38-imgIcon1': {
    src: '/design/home-internet/308-38-imgIcon1.svg',
    width: 20,
    height: 20,
    nodeId: '308-38-imgIcon1',
  },
  '308-38-imgIcon2': {
    src: '/design/home-internet/308-38-imgIcon2.svg',
    width: 20,
    height: 20,
    nodeId: '308-38-imgIcon2',
  },
  '308-59-imgFrame': {
    src: '/design/home-internet/308-59-imgFrame.svg',
    width: 16,
    height: 16,
    nodeId: '308-59-imgFrame',
  },
  '308-73-imgFrame': {
    src: '/design/home-internet/308-73-imgFrame.svg',
    width: 22,
    height: 22,
    nodeId: '308-73-imgFrame',
  },
} satisfies Record<string, FigmaAsset>;
export const internetChrome: ChromeContent = {
  ...chromeContent,
  promo: 'Moving in soon? Book your install date now and be online on move-in day.',
  promoLink: { label: 'See plans for my province', href: '#internet-plans' },
  promoMobileLabel: 'Check my address →',
  navigationLabel: 'Main navigation',
  mobileNavigationLabel: 'Canadian Plans menu',
  navigation: [
    { label: 'Pre-arrival SIM', href: '/pre-arrival-sim' },
    { label: 'Home Internet', href: '/home-internet' },
    { label: 'Mobile Plans', href: '/plans' },
    { label: 'Guides', href: '/guides' },
  ],
  phone: { ...chromeContent.phone, href: '#contact' },
  track: { ...chromeContent.track, href: '/track' },
  help: { ...chromeContent.help, href: '#faq' },
};
export const internetFooter: FooterContent = {
  ...footerContent,
  groups: footerContent.groups.map((group) => ({
    ...group,
    links: group.links.map((link) => ({
      ...link,
      href:
        link.label === 'Track order'
          ? '/track'
          : group.title === 'Home Internet'
            ? '#internet-plans'
            : group.title === 'Help'
              ? '#faq'
              : '/pre-arrival-sim',
    })),
  })),
  legalLabel: 'Legal links',
  legal: footerContent.legal.map((link) => ({
    ...link,
    href: link.label === 'Privacy' ? '/privacy' : link.label === 'Terms' ? '/terms' : '#contact',
  })),
};
export const internetChromeAssets = {
  ...componentAssets,
  logo: internetAssets['106-34-imgMark'],
  search: internetAssets['106-34-imgEllipse'],
  phone: internetAssets['212-51-imgPhoneIcon'],
  chat: internetAssets['212-51-imgIcon'],
  menu: internetAssets['212-51-imgIcon1'],
  footerLogo: internetAssets['106-34-imgFrame'],
};
