import type { PlanCardContent, FigmaAsset } from '@canadian-plans/ui/canadian-plans';
import {
  chromeContent,
  footerContent,
  componentAssets,
  type ChromeContent,
  type FooterContent,
} from './components';

const audienceOptions: readonly { readonly id: ArrivalAudience; readonly label: string }[] = [
  { id: 'student', label: 'Student' },
  { id: 'worker', label: 'Worker' },
  { id: 'resident', label: 'Permanent resident' },
  { id: 'visitor', label: 'Visitor / Super Visa' },
];

/**
 * /pre-arrival-sim copy (SEO rewrite, 23 October 2026). Primary phrase: Canadian SIM card
 * before you arrive. Every plan fact comes from docs/LAUNCH_PLANS.md table D and the static
 * catalogue; nothing here is a commercial value the backend does not already hold.
 */
export const arrivalCopy = {
  title: 'Canadian SIM Card & eSIM Before You Arrive: Plans from $35 | Canadian Plans',
  skip: 'Skip to main content',
  breadcrumbLabel: 'Breadcrumb',
  separator: '/',
  breadcrumb: [
    {
      label: 'Home',
      href: '/',
    },
    {
      label: 'SIM before you arrive',
    },
  ],
  hero: {
    description:
      'Order a Rogers, Fido or Chatr eSIM from any country and get your Canadian phone number before you fly. Monthly plans from $35 for students, workers and new permanent residents; prepaid plans for visitors. No credit check, nothing paid online.',
  },
  quick: {
    eyebrow: 'Quick answer · Updated October 2026',
    title: 'Can I get a Canadian SIM card before I arrive in Canada?',
    description:
      'Yes. Order a Canadian eSIM online 1 to 3 weeks before your flight. An advisor confirms your order, your Canadian number is assigned, and your eSIM QR code arrives by email. Students, workers and permanent residents staying over 90 days get monthly Rogers or Fido plans from $35 a month; visitors and Super Visa holders get Chatr prepaid plans from $35 for 30 days (CAD, plus tax). There is no credit check, nothing to upload and nothing paid online. Your line starts when you land.',
  },
  picker: {
    step: 'Step 1 of 2',
    heading: {
      title: ['Choose your eSIM plan.'],
      description:
        'Tell us how you are arriving and we show the plans you are eligible for. Every plan is an eSIM for your own unlocked phone, with the exact monthly price and no contract.',
    },
    audienceLabel: 'I am arriving as a…',
    audiences: audienceOptions,
    phoneLabel: 'Your phone',
    phone: 'eSIM',
    compatibility: 'Is my phone eSIM-ready? →',
    includesTitle: 'Every plan includes',
    includes: [
      '✓ Canadian number before you fly',
      '✓ eSIM by email, nothing to ship',
      '✓ No credit check, no Canadian credit history',
      '✓ Nothing paid online; the carrier bills you after activation',
    ],
    yourPlan: 'Your plan',
    continue: 'Continue to step 2 →',
    note: 'Prices in Canadian dollars, before tax. Checked October 2026.',
    empty: 'No plans match this audience. Try another audience.',
    regionLabel: 'eSIM plans you can order before you arrive',
    selectedAnnouncement: 'Selected plan',
    filterAnnouncement: 'plans shown for',
    due: '$0 due today',
    stepTwoTitle: 'Step 2 preview',
    stepTwoDescription:
      'Your chosen plan is ready for the next step. Arrival details and checkout will be connected separately. This preview creates no order.',
    close: 'Back to plans',
  },
  comparison: {
    heading: {
      eyebrow: 'Compare your options',
      title: ['Ordering before you fly vs. buying a SIM after you land'],
    },
    label: 'Pre-arrival SIM comparison',
    featureLabel: 'Feature',
    columns: [
      'Canadian Plans (before you fly)',
      'Airport SIM kiosk',
      'Carrier store after you land',
    ],
    rows: [
      {
        feature: 'Canadian number before you fly',
        values: ['✓ Yes', '✗ No', '✗ No'],
      },
      {
        feature: 'Exact monthly price shown before you order',
        values: ['✓ Yes', 'Varies', '✓ Yes'],
      },
      {
        feature: 'Help by phone or email, in plain English',
        values: ['✓ Yes', '✗ No', 'In store only'],
      },
      {
        feature: 'Time to get online after landing',
        values: ['Minutes', 'Queue at arrivals', 'Days (find a store)'],
      },
      {
        feature: 'Credit check',
        values: ['None', 'None', 'Often, for postpaid'],
      },
      {
        feature: 'Paid online when you order',
        values: ['$0', 'Pay at the counter', 'Pay in store'],
      },
    ],
    note: 'Airport kiosk and carrier-store details are general observations, checked October 2026. Prices and availability vary by location.',
  },
  faq: {
    heading: {
      eyebrow: 'FAQ',
      title: ['Questions about getting a SIM', 'before you arrive'],
      description: 'Talk to an advisor, Monday to Saturday, 9am to 9pm Pacific time.',
    },
    items: [
      {
        id: 'arrival-faq-0',
        question: 'When should I order my Canadian SIM?',
        answer:
          'Order 1 to 3 weeks before your flight. Your eSIM QR code arrives by email once an advisor confirms the order, so your Canadian number is ready for bank, college and job forms before you leave home.',
      },
      {
        id: 'arrival-faq-5',
        question: 'Which plan am I eligible for?',
        answer:
          'If you are arriving on a study permit, a work permit or as a permanent resident and staying more than 90 days, choose a monthly Rogers or Fido plan. If you are visiting on a visitor visa or a Super Visa for under 90 days, choose a Chatr prepaid plan. Pick your situation above and only the plans that fit are shown.',
      },
      {
        id: 'arrival-faq-1',
        question: 'How do I know if my phone supports eSIM?',
        answer:
          'On an iPhone, go to Settings, General, About and look for “EID” or “Digital SIM”. On Samsung and other Android phones, go to Settings, Connections, SIM manager and look for “Add eSIM”. Not sure? Send us your phone model and we will check.',
      },
      {
        id: 'arrival-faq-2',
        question: 'Does my phone need to be unlocked?',
        answer:
          'Yes. Your phone must be unlocked and support eSIM. If it is locked to a carrier at home, ask that carrier to unlock it before you order.',
      },
      {
        id: 'arrival-faq-3',
        question: 'Can I order from any country?',
        answer:
          'Yes. Order online from any country 1 to 3 weeks before your flight. We confirm your order by phone or email, then email your eSIM QR code. Install it at home and it switches on when you land.',
      },
      {
        id: 'arrival-faq-6',
        question: 'Do I need to upload documents or a SIN to order?',
        answer:
          'No. You order with your name, email, arrival date and the plan you want. There is no SIN, no credit check and nothing to upload. If the carrier needs to see your passport or permit, your advisor asks you for it.',
      },
      {
        id: 'arrival-faq-4',
        question: 'When will I be charged for my plan?',
        answer:
          'Nothing is paid on this website. Your first bill comes from Rogers, Fido or Chatr once your number is active, for the monthly price plus tax. Your advisor explains the billing date before anything is charged. Canadian Plans charges no SIM, activation or shipping fee.',
      },
      {
        id: 'arrival-faq-7',
        question: 'What happens if I cancel or my plans change?',
        answer:
          'Before activation you can cancel at no cost: just tell your advisor. After activation the plan is with the carrier, so you cancel with them under their terms. Because nothing was paid to Canadian Plans, there is nothing for us to refund.',
      },
    ],
  },
  controls: {
    contactTitle: 'Talk to an advisor',
    contactDescription:
      'Advisor contact is a design preview. No message or callback request has been sent.',
    close: 'Close preview',
    compatibilityTitle: 'Is my phone eSIM-ready?',
    compatibilityDescription:
      'Check your phone’s settings for an eSIM or “Add eSIM” option, and confirm support with its manufacturer. An advisor can help confirm compatibility before an order.',
  },
};
export type ArrivalAudience = 'student' | 'worker' | 'resident' | 'visitor';
export interface ArrivalPlan extends PlanCardContent {
  readonly previewOnly: true;
  readonly audiences: readonly ArrivalAudience[];
  readonly summaryName: string;
  readonly popular: boolean;
  /** Billing term shown after the price, e.g. "/mo" (postpaid) or "/30 days" (prepaid). */
  readonly term: string;
}
const longTerm: readonly ArrivalAudience[] = ['student', 'worker', 'resident'];
const internationalMinutes = '✓ 1,000 min to India, China, Bangladesh, Mexico & UK';
/**
 * Pre-arrival eSIM plans, as confirmed by the owner in docs/LAUNCH_PLANS.md table D
 * (20 October 2026). Students, workers and PRs get monthly postpaid Rogers/Fido plans;
 * visitors (tourist, Super Visa) get Chatr prepaid. Audience mapping is for the UI only;
 * backend eligibility is not inferred.
 */
export const arrivalPlans: readonly ArrivalPlan[] = [
  {
    id: 'preview-fido-essential',
    finePrint: 'Pre-arrival price · $0 due today',
    audiences: longTerm,
    summaryName: 'Fido',
    previewOnly: true,
    popular: false,
    carrier: 'Fido · 5G',
    payType: 'Postpaid',
    allowance: '75 GB',
    amount: '$35',
    term: '/mo',
    period: '/mo + tax',
    goodFor: 'Good for: Everyday use at the lowest monthly price.',
    features: [
      '✓ 75 GB of 5G data',
      '✓ Unlimited Canada-wide calling',
      '✓ Unlimited local & international texts',
      internationalMinutes,
      '✓ No contract · hotspot not included',
    ],
    buttonLabel: 'Choose this plan',
    selectedLabel: 'Selected ✓',
  },
  {
    id: 'preview-rogers-plus',
    finePrint: 'Pre-arrival price · $0 due today',
    audiences: longTerm,
    summaryName: 'Rogers',
    previewOnly: true,
    popular: true,
    carrier: 'Rogers · 5G',
    payType: 'Postpaid',
    allowance: '100 GB',
    amount: '$40',
    term: '/mo',
    period: '/mo + tax',
    goodFor: 'Good for: Heavy data users who want room to spare.',
    features: [
      '✓ 100 GB at up to 1 Gbps, then unlimited at reduced speed',
      '✓ Unlimited Canada-wide calling',
      '✓ Unlimited local & international texts',
      internationalMinutes,
      '✓ No contract · hotspot included',
    ],
    buttonLabel: 'Choose this plan',
    selectedLabel: 'Selected ✓',
    badge: 'Most popular',
  },
  {
    id: 'preview-rogers-unlimited',
    finePrint: 'Pre-arrival price · $0 due today',
    audiences: longTerm,
    summaryName: 'Rogers Canada + USA',
    previewOnly: true,
    popular: false,
    carrier: 'Rogers · 5G',
    payType: 'Postpaid',
    allowance: '120 GB',
    amount: '$50',
    term: '/mo',
    period: '/mo + tax',
    goodFor: 'Good for: Trips to the USA and heavy data use.',
    features: [
      '✓ 120 GB at up to 1 Gbps, then unlimited at reduced speed',
      '✓ USA & Canada roaming included',
      '✓ Unlimited USA & Canada-wide calling',
      '✓ Unlimited local & international texts',
      internationalMinutes,
      '✓ No contract · hotspot included',
    ],
    buttonLabel: 'Choose this plan',
    selectedLabel: 'Selected ✓',
  },
  {
    id: 'preview-chatr-50',
    finePrint: 'Pre-arrival price · $0 due today',
    audiences: ['visitor'],
    summaryName: 'Chatr 30-day',
    previewOnly: true,
    popular: false,
    carrier: 'Chatr · 4G LTE',
    payType: 'Prepaid',
    allowance: '50 GB',
    amount: '$35',
    term: '/30 days',
    period: '/30 days + tax',
    goodFor: 'Good for: Short visits of up to a month.',
    features: [
      '✓ 50 GB of 4G LTE data, then slower speed',
      '✓ 5 GB bonus with Autopay',
      '✓ Unlimited Canada & US calling',
      '✓ Unlimited Canada, US & international texts',
      '✓ eSIM activated 24 hours before you land',
    ],
    buttonLabel: 'Choose this plan',
    selectedLabel: 'Selected ✓',
  },
  {
    id: 'preview-chatr-90',
    finePrint: 'Pre-arrival price · $0 due today',
    audiences: ['visitor'],
    summaryName: 'Chatr 30-day',
    previewOnly: true,
    popular: true,
    carrier: 'Chatr · 4G LTE',
    payType: 'Prepaid',
    allowance: '90 GB',
    amount: '$40',
    term: '/30 days',
    period: '/30 days + tax',
    goodFor: 'Good for: Visitors who stream, video call and use maps a lot.',
    features: [
      '✓ 90 GB of 4G LTE data, then slower speed',
      '✓ 10 GB bonus with Autopay',
      '✓ Unlimited Canada & US calling',
      '✓ Unlimited Canada, US & international texts',
      '✓ eSIM activated 24 hours before you land',
    ],
    buttonLabel: 'Choose this plan',
    selectedLabel: 'Selected ✓',
    badge: 'Popular with visitors',
  },
  {
    id: 'preview-chatr-90-day',
    finePrint: 'Pre-arrival price · $0 due today',
    audiences: ['visitor'],
    summaryName: 'Chatr 90-day',
    previewOnly: true,
    popular: false,
    carrier: 'Chatr · 4G LTE',
    payType: 'Prepaid',
    allowance: '75 GB',
    amount: '$75',
    term: '/90 days',
    period: '/90 days + tax',
    goodFor: 'Good for: Super Visa and longer stays of up to 3 months.',
    features: [
      '✓ 75 GB of 4G LTE data over 90 days, then slower speed',
      '✓ Unlimited Canada-wide calling',
      '✓ Unlimited Canada, US & international texts',
      '✓ eSIM activated 24 hours before you land',
    ],
    buttonLabel: 'Choose this plan',
    selectedLabel: 'Selected ✓',
  },
];
export const arrivalAssets = {
  '106-13-imgEllipse': {
    src: '/design/pre-arrival/106-13-imgEllipse.svg',
    width: 14,
    height: 14,
    nodeId: '106-13-imgEllipse',
  },
  '106-13-imgMark': {
    src: '/design/pre-arrival/106-13-imgMark.svg',
    width: 36,
    height: 36,
    nodeId: '106-13-imgMark',
  },
  '108-112-imgIcon': {
    src: '/design/pre-arrival/108-112-imgIcon.svg',
    width: 32,
    height: 32,
    nodeId: '108-112-imgIcon',
  },
  '109-135-imgIcon': {
    src: '/design/pre-arrival/109-135-imgIcon.svg',
    width: 32,
    height: 32,
    nodeId: '109-135-imgIcon',
  },
  '109-183-imgFrame': {
    src: '/design/pre-arrival/109-183-imgFrame.svg',
    width: 36,
    height: 36,
    nodeId: '109-183-imgFrame',
  },
  '109-40-imgIcon': {
    src: '/design/pre-arrival/109-40-imgIcon.svg',
    width: 32,
    height: 32,
    nodeId: '109-40-imgIcon',
  },
  '208-118-imgIcon': {
    src: '/design/pre-arrival/208-118-imgIcon.svg',
    width: 32,
    height: 32,
    nodeId: '208-118-imgIcon',
  },
  '209-90-imgIcon': {
    src: '/design/pre-arrival/209-90-imgIcon.svg',
    width: 32,
    height: 32,
    nodeId: '209-90-imgIcon',
  },
  '211-34-imgIcon': {
    src: '/design/pre-arrival/211-34-imgIcon.svg',
    width: 32,
    height: 32,
    nodeId: '211-34-imgIcon',
  },
  '363-1052-imgFrame': {
    src: '/design/pre-arrival/363-1052-imgFrame.svg',
    width: 36,
    height: 36,
    nodeId: '363-1052-imgFrame',
  },
  '364-2201-imgPhoneIcon': {
    src: '/design/pre-arrival/364-2201-imgPhoneIcon.svg',
    width: 16,
    height: 16,
    nodeId: '364-2201-imgPhoneIcon',
  },
  '364-2211-imgIcon': {
    src: '/design/pre-arrival/364-2211-imgIcon.svg',
    width: 22,
    height: 22,
    nodeId: '364-2211-imgIcon',
  },
  '364-2211-imgIcon1': {
    src: '/design/pre-arrival/364-2211-imgIcon1.svg',
    width: 24,
    height: 24,
    nodeId: '364-2211-imgIcon1',
  },
  '364-2211-imgMark': {
    src: '/design/pre-arrival/364-2211-imgMark.svg',
    width: 36,
    height: 36,
    nodeId: '364-2211-imgMark',
  },
} satisfies Record<string, FigmaAsset>;
export const arrivalChrome: ChromeContent = {
  ...chromeContent,
  promo: 'Moving in? Add home internet from $50/mo.',
  promoLink: { label: 'See home internet', href: '/#internet' },
  promoMobileLabel: 'See home internet →',
  navigationLabel: 'Main navigation',
  mobileNavigationLabel: 'Canadian Plans menu',
  navigation: [
    { label: 'Pre-arrival SIM', href: '#plans' },
    { label: 'Home Internet', href: '/home-internet' },
    { label: 'Mobile Plans', href: '/plans' },
    { label: 'Guides', href: '/guides' },
  ],
  phone: { ...chromeContent.phone, href: '#contact' },
  track: { ...chromeContent.track, href: '/track' },
  help: { ...chromeContent.help, href: '#faq' },
};
export const arrivalFooter: FooterContent = {
  ...footerContent,
  groups: footerContent.groups.map((group) => ({
    ...group,
    links: group.links.map((link) => ({
      ...link,
      href:
        link.label === 'Track order'
          ? '/track'
          : group.title === 'Home Internet'
            ? '/#internet'
            : group.title === 'Help'
              ? '#faq'
              : '#plans',
    })),
  })),
  legalLabel: 'Legal links',
  legal: footerContent.legal.map((link) => ({
    ...link,
    href: link.label === 'Privacy' ? '/privacy' : link.label === 'Terms' ? '/terms' : '#contact',
  })),
};
export const arrivalChromeAssets = {
  ...componentAssets,
  logo: arrivalAssets['106-13-imgMark'],
  search: arrivalAssets['106-13-imgEllipse'],
  phone: arrivalAssets['364-2201-imgPhoneIcon'],
  chat: arrivalAssets['364-2211-imgIcon'],
  menu: arrivalAssets['364-2211-imgIcon1'],
  footerLogo: arrivalAssets['109-183-imgFrame'],
};

/** Catalogue productKey for each pre-arrival card, so "Continue" opens that plan in /order. */
export const preArrivalProductKeys: Readonly<Record<string, string>> = {
  'preview-fido-essential': 'prearrival-fido-essential-75',
  'preview-rogers-plus': 'prearrival-rogers-plus-100',
  'preview-rogers-unlimited': 'prearrival-rogers-unlimited-120',
  'preview-chatr-50': 'prearrival-chatr-50',
  'preview-chatr-90': 'prearrival-chatr-90',
  'preview-chatr-90-day': 'prearrival-chatr-75-90-day',
};
