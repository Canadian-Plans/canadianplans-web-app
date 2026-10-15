import type { PlanCardContent, FigmaAsset } from '@canadian-plans/ui/canadian-plans';
import {
  chromeContent,
  footerContent,
  componentAssets,
  type ChromeContent,
  type FooterContent,
} from './components';
/** Figma source examples; no live offers or coverage. */
export const internetCopy = {
  title: 'Home Internet | Canadian Plans',
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
    eyebrow: 'Home Internet & TV · BC, ON, AB, MB, SK',
    title: 'Fast home internet from move-in day.',
    description:
      'Up to 1.5 Gbps on the Rogers network. Unlimited data, a free install, and most homes are online within 3 days.',
    price: 'From $55/mo',
    priceNote: 'CAD, plus tax. Pay $0 to order.',
    features: [
      '✓ Authorized Rogers dealer in Surrey, BC',
      '✓ WiFi modem included',
      "✓ No Canadian credit history? We'll explain your options",
    ],
  },
  form: {
    title: 'Check your address',
    description: 'Real speeds and prices for your building in seconds. No sign-up.',
    postalLabel: 'Postal code',
    postalPlaceholder: 'e.g. V3T 1Z2',
    dateLabel: 'Move-in date (optional)',
    datePlaceholder: 'DD / MM / YYYY',
    submit: 'Check availability',
    note: 'We never share your address. You pay nothing until we call to confirm.',
    pending: 'Checking preview…',
    invalidPostal: 'That postal code looks incomplete. Canadian postal codes look like A1A 1A1.',
    invalidDate: 'Enter a valid move-in date in DD / MM / YYYY format.',
    retry: 'Try again',
    mockNotice: 'Mock preview only. No live availability has been checked.',
  },
  quick: {
    eyebrow: 'Quick answer · Updated October 2026',
    title: 'How much is home internet in Canada?',
    description:
      'With us, Rogers-network home internet starts at $55/mo for 150 Mbps (CAD, taxes extra), with unlimited data, a WiFi modem and free professional installation. Most homes in BC, Ontario, Alberta, Manitoba and Saskatchewan can be installed within about 3 days.',
  },
  finder: {
    heading: {
      eyebrow: 'Not sure what speed you need?',
      title: ['Find your speed in 30 seconds.'],
    },
    peopleQuestion: '1. How many people live with you?',
    people: ['Just me', '2–3', '4 or more'],
    activityQuestion: '2. What do you do online?',
    activities: ['Browsing & email', 'Streaming & video calls', 'Gaming & 4K', 'Working from home'],
    tvQuestion: '3. Want TV too?',
    tv: ['No, internet only', 'Yes, add TV'],
    recommend: 'We recommend',
    period: '/mo · CAD',
    recommendation: 'Enough for 2–3 people streaming in 4K and on video calls at the same time.',
    descriptions: [
      'For everyday browsing and HD streaming.',
      'For streaming and video calls across several devices.',
      'For a busy household, gaming and large downloads.',
      'For creators and households with demanding downloads.',
    ],
    tvNotice: 'TV is a future-service preview. An advisor would explain the available packages.',
  },
  plans: {
    heading: {
      eyebrow: 'Internet plans',
      title: ['Pick your internet speed.'],
    },
    date: 'Prices as of October 2026 · CAD, taxes extra',
    includesTitle: 'Every plan includes',
    includes: [
      '✓ Unlimited data',
      '✓ WiFi modem',
      '✓ Free professional install',
      '✓ Pay nothing until we confirm',
    ],
  },
  comparison: {
    heading: {
      title: ['What each speed feels like'],
      description:
        "Real examples instead of tech terms. Times are based on each plan's top speed. Wi-Fi inside your home may be a bit slower.",
    },
    label: 'Internet speed comparison',
    featureLabel: 'Usage',
    columns: ['150 Mbps', '500 Mbps', '1 Gbps', '1.5 Gbps'],
    rows: [
      {
        label: '4K streams at once',
        values: ['1', '3', '6', '8+'],
      },
      {
        label: 'HD video calls at once',
        values: ['2', '6', '10+', '15+'],
      },
      {
        label: 'Download a 50 GB game',
        values: ['≈ 45 min', '≈ 14 min', '≈ 7 min', '≈ 5 min'],
      },
      {
        label: 'Devices online comfortably',
        values: ['5', '15', '30', '40+'],
      },
      {
        label: 'Best for',
        values: ['1–2 people', '2–4 people', '4+ people', 'Power users'],
      },
    ],
    note: 'Download times are theoretical at full plan speed (50 GB = 400 gigabits). Device and stream counts are guidance, not guarantees.',
  },
  tv: {
    eyebrow: 'Add TV & streaming',
    title: 'Your shows from home, on one bill.',
    description:
      'Add Rogers TV with live channels and streaming apps to any internet plan. We’ll explain the packages in plain words when we call.',
    caption: 'Family on the sofa watching a hockey game on the living-room TV',
    button: 'See TV bundles →',
  },
  faq: {
    heading: {
      eyebrow: 'FAQ',
      title: ['Home internet', 'questions'],
      description: 'Talk to an advisor, Monday to Saturday, 9am–9pm Pacific time.',
    },
    items: [
      {
        id: 'install',
        question: 'How fast can you install home internet?',
        answer:
          'Most installs happen within about 3 days of your call with us. Tell us your move-in date and we’ll book the first slot after you get the keys.',
      },
      {
        id: 'credit',
        question: 'Do I need a Canadian credit history?',
        answer:
          'Not always. Many newcomers sign up with a passport and permit. If a deposit or a different plan is needed, your advisor tells you before anything is booked.',
      },
      {
        id: 'internet-faq-0',
        question: 'Is there a contract?',
        answer: 'This answer is awaiting approved content. Talk to an advisor for current details.',
      },
      {
        id: 'internet-faq-1',
        question: 'Can I book my internet install before I move in?',
        answer: 'This answer is awaiting approved content. Talk to an advisor for current details.',
      },
      {
        id: 'internet-faq-2',
        question: 'Is the WiFi modem included?',
        answer: 'This answer is awaiting approved content. Talk to an advisor for current details.',
      },
      {
        id: 'internet-faq-3',
        question: 'What happens to my internet if I move again?',
        answer: 'This answer is awaiting approved content. Talk to an advisor for current details.',
      },
    ],
  },
  result: {
    title: 'Check your address',
    availableTitle: 'Great news, internet is available here!',
    address: '12-3456 King George Blvd, Surrey, BC',
    popular: 'POPULAR',
    earliestInstall: 'Earliest install: Thursday, Oct 15. You pay nothing until we confirm.',
    unavailableTitle: 'We can’t install at this address yet',
    unavailableDescription:
      'Our partner network doesn’t reach this area today. We may still be able to help.',
    alternativesHeading: 'Here’s what you can do',
    alternatives: [
      'Get a mobile plan with a hotspot, it works anywhere with Rogers coverage',
      'Join the waitlist and we’ll email you as soon as your area is covered',
      'Talk to an advisor about other options near you',
    ],
    waitlist: 'Join the waitlist',
    advisor: 'Talk to an advisor',
    close: 'Close address preview',
    closeSymbol: '×',
    speedsLabel: 'Choose an available preview speed',
    error: 'No mock result is configured for that postal code. Try V3T 1Z2 or T0L 1A0.',
    lookupFailed: 'We couldn’t check your address. Your details are still here. Please try again.',
    continuationTitle: 'Internet plan preview',
    continuationDescription:
      'Your sample plan is selected. Checkout and installation booking will be connected separately. No order has been created.',
    waitlistTitle: 'Waitlist preview',
    waitlistDescription:
      'Waitlist registration is a future integration. No email or notification request has been saved.',
    advisorTitle: 'Talk to an advisor',
    advisorDescription:
      'Advisor contact is a design preview. No message or callback request has been sent.',
    tvTitle: 'TV bundle preview',
    tvDescription:
      'Internet and TV are planned for a later launch. This preview creates no booking or order.',
    back: 'Back to address results',
    dismiss: 'Close preview',
  },
};
export interface InternetPlan extends PlanCardContent {
  readonly previewOnly: true;
  readonly mbps: number;
  readonly resultLabel: string;
  readonly resultPrice: string;
  readonly continueLabel: string;
}
export const internetPlans: readonly InternetPlan[] = [
  {
    id: 'preview-internet-150',
    mbps: 150,
    resultLabel: 'Up to 150 Mbps',
    resultPrice: '$55/mo',
    previewOnly: true,
    carrier: '',
    allowance: '150',
    unit: 'Mbps',
    amount: '$55',
    period: '/mo',
    finePrint: 'CAD · taxes extra · unlimited data',
    goodFor: 'Good for: 1–2 people · browsing & HD streaming',
    buttonLabel: 'Choose 150 Mbps',
    selectedLabel: 'Selected ✓',
    features: [],
    continueLabel: 'Continue with 150 Mbps →',
  },
  {
    id: 'preview-internet-500',
    mbps: 500,
    resultLabel: 'Up to 500 Mbps',
    resultPrice: '$75/mo',
    badge: 'Most popular',
    previewOnly: true,
    carrier: '',
    allowance: '500',
    unit: 'Mbps',
    amount: '$75',
    period: '/mo',
    finePrint: 'CAD · taxes extra · unlimited data',
    goodFor: 'Good for: 2–4 people · 4K & video calls',
    buttonLabel: 'Choose 500 Mbps',
    selectedLabel: 'Selected ✓',
    features: [],
    continueLabel: 'Continue with 500 Mbps →',
  },
  {
    id: 'preview-internet-1000',
    mbps: 1000,
    resultLabel: 'Up to 1 Gbps',
    resultPrice: '$90/mo',
    previewOnly: true,
    carrier: '',
    allowance: '1',
    unit: 'Gbps',
    amount: '$90',
    period: '/mo',
    finePrint: 'CAD · taxes extra · unlimited data',
    goodFor: 'Good for: 4+ people · gaming & big downloads',
    buttonLabel: 'Choose 1 Gbps',
    selectedLabel: 'Selected ✓',
    features: [],
    continueLabel: 'Continue with 1 Gbps →',
  },
  {
    id: 'preview-internet-1500',
    mbps: 1500,
    resultLabel: 'Up to 1.5 Gbps',
    resultPrice: '$105/mo',
    previewOnly: true,
    carrier: '',
    allowance: '1.5',
    unit: 'Gbps',
    amount: '$105',
    period: '/mo',
    finePrint: 'CAD · taxes extra · unlimited data',
    goodFor: 'Good for: Creators & power users',
    buttonLabel: 'Choose 1.5 Gbps',
    selectedLabel: 'Selected ✓',
    features: [],
    continueLabel: 'Continue with 1.5 Gbps →',
  },
];
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
  promoLink: { label: 'Check my address', href: '#address-check' },
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
            ? '#address-check'
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
export const internetLookupFixtures = {
  availablePostalCode: 'V3T 1Z2',
  unavailablePostalCode: 'T0L 1A0',
};
