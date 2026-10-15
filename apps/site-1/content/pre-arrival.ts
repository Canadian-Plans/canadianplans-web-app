import type {
  PlanCardContent,
  FigmaAsset,
} from '@canadian-plans/ui/canadian-plans';
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
  { id: 'visitor', label: 'Visitor' },
];

/** Source copy is a design preview, not approved commercial facts. */
export const arrivalCopy = {
  title: 'Pre-arrival SIM & eSIM | Canadian Plans',
  skip: 'Skip to main content',
  breadcrumbLabel: 'Breadcrumb',
  separator: '/',
  breadcrumb: [
    {
      label: 'Home',
      href: '/',
    },
    {
      label: 'Pre-arrival SIM',
    },
  ],
  hero: {
    description:
      'Get a Rogers or Fido number before you leave home, ready for bank, school and job forms. It works the minute you land. For students, workers, families and visitors.',
  },
  quick: {
    eyebrow: 'Quick answer · Updated October 2026',
    title: 'Can I get a Canadian phone number before I arrive?',
    description:
      "Yes. Order a pre-arrival eSIM on Rogers or Fido 1 to 3 weeks before your flight. You get your number right away, and your plan starts when you land. Plans start at $35 a month (CAD, plus tax). You don't need a Canadian credit history, just your passport and your visa or permit.",
  },
  picker: {
    step: 'Step 1 of 2',
    heading: {
      title: ['Choose your plan.'],
      description:
        'Tell us who you are — we show the plans that fit. All pre-arrival plans are eSIM. Exact prices, no contract.',
    },
    audienceLabel: 'I am a…',
    audiences: audienceOptions,
    phoneLabel: 'Your phone',
    phone: 'eSIM',
    compatibility: 'Is my phone eSIM-ready? →',
    includesTitle: 'Every plan includes',
    includes: [
      '✓ Canadian number before you fly',
      '✓ eSIM by email in minutes',
      '✓ Activation help on WhatsApp',
      '✓ Pay nothing until we confirm',
    ],
    yourPlan: 'Your plan',
    continue: 'Continue to step 2 →',
    note: 'Prices in Canadian dollars, before tax. Updated October 2026.',
    empty: 'No preview plans match this audience. Try another audience.',
    regionLabel: 'Pre-arrival plans',
    selectedAnnouncement: 'Selected plan',
    filterAnnouncement: 'plans shown for',
    period: '/mo',
    due: '$0 due today',
    stepTwoTitle: 'Step 2 preview',
    stepTwoDescription:
      'Your chosen plan is ready for the next step. Arrival details and checkout will be connected separately. This preview creates no order.',
    close: 'Back to plans',
  },
  comparison: {
    heading: {
      eyebrow: 'Compare your options',
      title: ['Pre-arrival SIM vs. buying after you land'],
    },
    label: 'Pre-arrival SIM comparison',
    featureLabel: 'Feature',
    columns: ['Canadian Plans (pre-arrival)', 'Airport kiosk', 'Carrier store after you land'],
    rows: [
      {
        feature: 'Canadian number before you fly',
        values: ['✓ Yes', '✗ No', '✗ No'],
      },
      {
        feature: 'Exact price shown before you order',
        values: ['✓ Yes, with date', 'Varies', '✓ Yes'],
      },
      {
        feature: 'Help on WhatsApp in plain English',
        values: ['✓ Yes', '✗ No', 'In store only'],
      },
      {
        feature: 'Time to get online after landing',
        values: ['Minutes', 'Queue at arrivals', 'Days (find a store)'],
      },
      {
        feature: 'Credit check',
        values: ['None needed', 'None', 'Often, for postpaid'],
      },
    ],
    note: 'VERIFY before publishing: kiosk and carrier-store claims must be checked against current airport and store offers (YVR, YYZ, YUL, YYC).',
  },
  faq: {
    heading: {
      eyebrow: 'FAQ',
      title: ['Pre-arrival SIM', 'questions'],
      description: 'Talk to an advisor, Monday to Saturday, 9am–9pm Pacific time.',
    },
    items: [
      {
        id: 'arrival-faq-0',
        question: 'When should I order my pre-arrival SIM?',
        answer:
          'Order 1–3 weeks before your flight. Your eSIM arrives by email minutes after we confirm, so your number is ready for bank and college forms right away.',
      },
      {
        id: 'arrival-faq-1',
        question: 'How do I know if my phone supports eSIM?',
        answer: 'This answer is awaiting approved content. Talk to an advisor for current details.',
      },
      {
        id: 'arrival-faq-2',
        question: 'Does my phone need to be unlocked?',
        answer: 'This answer is awaiting approved content. Talk to an advisor for current details.',
      },
      {
        id: 'arrival-faq-3',
        question: 'Can I order from any country?',
        answer: 'This answer is awaiting approved content. Talk to an advisor for current details.',
      },
      {
        id: 'arrival-faq-4',
        question: 'When will I be charged for my plan?',
        answer: 'This answer is awaiting approved content. Talk to an advisor for current details.',
      },
      {
        id: 'arrival-faq-5',
        question: 'Can I switch to a postpaid plan later?',
        answer: 'This answer is awaiting approved content. Talk to an advisor for current details.',
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
      'Check your device’s settings for an eSIM or “Add eSIM” option, and confirm support with its manufacturer. An advisor can help confirm compatibility before an order.',
  },
};
export type ArrivalAudience = 'student' | 'worker' | 'resident' | 'visitor';
export interface ArrivalPlan extends PlanCardContent {
  readonly previewOnly: true;
  readonly audiences: readonly ArrivalAudience[];
  readonly summaryName: string;
  readonly popular: boolean;
}
/** Audience mapping is for UI demonstration; backend eligibility is not inferred. */
export const arrivalPlans: readonly ArrivalPlan[] = [
  {
    id: 'preview-fido-essential',
    originalPrice: '$60/mo',
    finePrint: 'in store · $0 due today',
    audiences: ['student', 'resident', 'visitor'],
    summaryName: 'Fido Essential',
    previewOnly: true,
    popular: false,
    carrier: 'Fido · Essential',
    allowance: '75 GB',
    amount: '$35',
    period: '/mo + tax',
    goodFor: 'Good for: Everyday use at a lower monthly cost.',
    features: [
      '✓ Unlimited Canada talk & text',
      '✓ 1,000 international minutes',
      '✓ 5G network · no contract',
    ],
    buttonLabel: 'Choose this plan',
    selectedLabel: 'Selected ✓',
  },
  {
    id: 'preview-rogers-plus',
    originalPrice: '$80/mo',
    finePrint: 'in store · $0 due today',
    audiences: ['student', 'worker', 'resident'],
    summaryName: 'Rogers Plus',
    previewOnly: true,
    popular: true,
    carrier: 'Rogers · Plus',
    allowance: '100 GB',
    amount: '$40',
    period: '/mo + tax',
    goodFor: 'Good for: Heavy data users who want room to spare.',
    features: [
      '✓ Unlimited Canada talk & text',
      '✓ 1,000 international minutes',
      '✓ 5G network · works the moment you land',
    ],
    buttonLabel: 'Choose this plan',
    selectedLabel: 'Selected ✓',
    badge: 'Most popular',
  },
  {
    id: 'preview-rogers-unlimited',
    finePrint: 'Pre-arrival price · $0 due today',
    audiences: ['student', 'worker', 'resident'],
    summaryName: 'Rogers Unlimited',
    previewOnly: true,
    popular: false,
    carrier: 'Rogers · Unlimited',
    allowance: '120 GB',
    amount: '$50',
    period: '/mo + tax',
    goodFor: 'Good for: Trips to the USA and heavy data use.',
    features: [
      '✓ Unlimited Canada–US talk & text',
      '✓ USA & Canada roaming included',
      '✓ 1,000 international minutes',
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
  promo: 'Moving in? Add home internet from $55/mo.',
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
