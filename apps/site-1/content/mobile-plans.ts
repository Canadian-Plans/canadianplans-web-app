import type { PlanCardContent, FigmaAsset } from '@canadian-plans/ui/canadian-plans';
import {
  chromeContent,
  footerContent,
  componentAssets,
  type ChromeContent,
  type FooterContent,
} from './components';

/**
 * A bring-your-own-device mobile plan as sold in /order. `id` is the catalogue productKey
 * (packages/adapters/src/static-catalogue/site-1-plans.ts); keep prices and features in step.
 */
export interface MobilePlan extends PlanCardContent {
  readonly priceCad: number;
  readonly featured: boolean;
}
export const mobileCopy = {
  title: 'Mobile Plans | Canadian Plans',
  skip: 'Skip to main content',
  breadcrumbLabel: 'Breadcrumb',
  breadcrumb: [
    {
      label: 'Home',
      href: '/',
    },
    {
      label: 'Mobile Plans',
    },
  ],
  separator: '/',
  hero: {
    description:
      'Three plans, explained in plain words. Bring your own unlocked phone and keep your number. An identity and credit check is required.',
  },
  quick: {
    eyebrow: 'Quick answer · Updated October 2026',
    title: 'Which mobile plan should I choose?',
    description:
      '5G+ Complete with 100 GB at $55/mo suits most people. For a limited time, 175 GB is $60/mo, or choose $90/mo for unlimited data with a 50 GB hotspot and Mexico. All three are postpaid with unlimited talk and text and a $10 pre-authorized payment discount included. Prices CAD, taxes extra.',
  },
  plans: {
    eyebrow: 'Mobile plans',
    title: 'All mobile plans and prices',
    date: 'Prices as of October 2026 · CAD, taxes extra',
    includesTitle: 'Every plan:',
    includes:
      'unlimited talk and text, bring your own phone, eSIM or SIM card, no connection fee and $0 to order online. We call you to confirm before we switch anything.',
    note: 'An advisor confirms your exact price, and the provider is confirmed when your order is approved.',
  },
  comparison: {
    title: 'Compare the three plans',
    description: 'Same unlimited talk and text. The difference is data and where you can use it.',
    columns: ['100 GB', '175 GB', 'Unlimited'],
    rows: [
      {
        label: 'Price',
        values: ['$55/mo', '$60/mo', '$90/mo'],
      },
      {
        label: 'Data',
        values: [
          '100 GB 5G+, up to 2 Gbps',
          '175 GB 5G+, up to 2 Gbps',
          'Unlimited, up to 2 Gbps*',
        ],
      },
      {
        label: 'Use it in',
        values: ['Canada & the US', 'Canada & the US', 'Canada, the US & Mexico'],
      },
      {
        label: 'Roaming data',
        values: ['Up to 5 GB/day in the US', 'Up to 5 GB/day in the US', 'Ask an advisor'],
      },
      {
        label: 'Mobile hotspot',
        values: ['Ask an advisor', 'Ask an advisor', '50 GB'],
      },
      {
        label: 'Price lock',
        values: ['5 years', '5 years', 'Ask an advisor'],
      },
    ],
    note: '*Speeds up to 2 Gbps. Data sharing is not included on 5G+ Complete Unlimited.',
  },
  faq: {
    eyebrow: 'FAQ',
    title: ['Mobile plan', 'questions'],
    description: 'Talk to an advisor, Monday to Saturday, 9am–9pm Pacific time.',
    items: [
      {
        id: 'mobile-faq-0',
        question: 'Can I keep my number when I switch?',
        answer:
          'Yes. Keep your current plan active, give us your account number and PIN, and we move your number to the new plan, usually the same day.',
      },
      {
        id: 'mobile-faq-1',
        question: 'When do I pay?',
        answer:
          'Nothing is paid on this website. The provider bills you directly once your plan is active.',
      },
      {
        id: 'mobile-faq-2',
        question: 'Do I need a credit check for a phone plan in Canada?',
        answer:
          'Yes, for these plans. They are postpaid, so an identity and credit check is required. You upload government ID with your order.',
      },
      {
        id: 'mobile-faq-3',
        question: 'Who provides the service?',
        answer:
          'Canadian Plans is an authorised sales agent. The provider is confirmed when your order is approved, and your service agreement is with them.',
      },
      {
        id: 'mobile-faq-4',
        question: 'Can I bring my own phone?',
        answer:
          'Yes, every plan is bring-your-own-device. Your phone must be unlocked and compatible. Choose an eSIM or a SIM card.',
      },
      {
        id: 'mobile-faq-5',
        question: 'What do I need to switch providers?',
        answer:
          'Government ID for the credit check, and your current account number and PIN if you are keeping your number. An advisor walks you through it.',
      },
      {
        id: 'mobile-faq-6',
        question: 'Can I add a family member later?',
        answer: 'Yes. Place a separate order for each line, or ask an advisor to help you choose.',
      },
    ],
  },
} as const;
export const mobilePlans: readonly MobilePlan[] = [
  {
    id: 'mobile-5g-plus-complete-100',
    priceCad: 55,
    featured: false,
    carrier: '5G+ Complete',
    allowance: '100 GB',
    amount: '$55',
    period: '/mo',
    finePrint: 'CAD · taxes extra · postpaid · includes $10 pre-authorized payment discount',
    goodFor: 'Good for: 5G+ data at speeds up to 2 Gbps, in Canada and the US.',
    features: [
      '✓ 100 GB of 5G+ data, speeds up to 2 Gbps',
      '✓ Unlimited talk & text in Canada and the US',
      '✓ US roaming data up to 5 GB/day',
      '✓ 5-year price lock',
      '✓ AI scam protection',
    ],
    buttonLabel: 'Choose 100 GB',
    selectedLabel: 'Selected',
  },
  {
    id: 'mobile-5g-plus-complete-175',
    priceCad: 60,
    featured: true,
    carrier: '5G+ Complete',
    allowance: '175 GB',
    amount: '$60',
    period: '/mo',
    finePrint: 'CAD · taxes extra · postpaid · includes $10 pre-authorized payment discount',
    goodFor: 'Good for: More data for the same speeds, in Canada and the US.',
    features: [
      '✓ 175 GB of 5G+ data, speeds up to 2 Gbps',
      '✓ Unlimited talk & text in Canada and the US',
      '✓ US roaming data up to 5 GB/day',
      '✓ 5-year price lock',
      '✓ AI scam protection',
    ],
    buttonLabel: 'Choose 175 GB',
    selectedLabel: 'Selected',
    badge: 'Limited time offer',
  },
  {
    id: 'mobile-5g-plus-complete-unlimited',
    priceCad: 90,
    featured: false,
    carrier: '5G+ Complete Unlimited',
    allowance: 'Unlimited',
    amount: '$90',
    period: '/mo',
    finePrint: 'CAD · taxes extra · postpaid · includes $10 pre-authorized payment discount',
    goodFor: 'Good for: Unlimited data at our fastest speeds, nationwide.',
    features: [
      '✓ Unlimited data, speeds up to 2 Gbps*',
      '✓ 50 GB mobile hotspot',
      '✓ Unlimited talk & text',
      '✓ Use it in Canada, the US & Mexico',
    ],
    buttonLabel: 'Choose Unlimited',
    selectedLabel: 'Selected',
  },
];
export const mobileAssets = {
  '106-65-imgEllipse': {
    src: '/design/mobile-plans/106-65-imgEllipse.svg',
    width: 14,
    height: 14,
    nodeId: '106:65',
  },
  '106-65-imgFrame': {
    src: '/design/mobile-plans/106-65-imgFrame.svg',
    width: 44,
    height: 26,
    nodeId: '106:65',
  },
  '106-65-imgFrame1': {
    src: '/design/mobile-plans/106-65-imgFrame1.svg',
    width: 36,
    height: 36,
    nodeId: '106:65',
  },
  '106-65-imgIcon': {
    src: '/design/mobile-plans/106-65-imgIcon.svg',
    width: 32,
    height: 32,
    nodeId: '106:65',
  },
  '106-65-imgIcon1': {
    src: '/design/mobile-plans/106-65-imgIcon1.svg',
    width: 32,
    height: 32,
    nodeId: '106:65',
  },
  '106-65-imgMark': {
    src: '/design/mobile-plans/106-65-imgMark.svg',
    width: 36,
    height: 36,
    nodeId: '106:65',
  },
  '106-65-imgPhotoIcon': {
    src: '/design/mobile-plans/106-65-imgPhotoIcon.svg',
    width: 22,
    height: 22,
    nodeId: '106:65',
  },
  '214-2-imgFrame': {
    src: '/design/mobile-plans/214-2-imgFrame.svg',
    width: 36,
    height: 36,
    nodeId: '214:2',
  },
  '214-2-imgIcon': {
    src: '/design/mobile-plans/214-2-imgIcon.svg',
    width: 22,
    height: 22,
    nodeId: '214:2',
  },
  '214-2-imgIcon1': {
    src: '/design/mobile-plans/214-2-imgIcon1.svg',
    width: 24,
    height: 24,
    nodeId: '214:2',
  },
  '214-2-imgIcon2': {
    src: '/design/mobile-plans/214-2-imgIcon2.svg',
    width: 32,
    height: 32,
    nodeId: '214:2',
  },
  '214-2-imgIcon3': {
    src: '/design/mobile-plans/214-2-imgIcon3.svg',
    width: 32,
    height: 32,
    nodeId: '214:2',
  },
  '214-2-imgIconChevronDown': {
    src: '/design/mobile-plans/214-2-imgIconChevronDown.svg',
    width: 20,
    height: 20,
    nodeId: '214:2',
  },
  '214-2-imgIconClose': {
    src: '/design/mobile-plans/214-2-imgIconClose.svg',
    width: 16,
    height: 16,
    nodeId: '214:2',
  },
  '214-2-imgIconSliders': {
    src: '/design/mobile-plans/214-2-imgIconSliders.svg',
    width: 20,
    height: 20,
    nodeId: '214:2',
  },
  '214-2-imgMark': {
    src: '/design/mobile-plans/214-2-imgMark.svg',
    width: 36,
    height: 36,
    nodeId: '214:2',
  },
  '214-2-imgPhoneIcon': {
    src: '/design/mobile-plans/214-2-imgPhoneIcon.svg',
    width: 16,
    height: 16,
    nodeId: '214:2',
  },
  '214-2-imgPhotoIcon': {
    src: '/design/mobile-plans/214-2-imgPhotoIcon.svg',
    width: 22,
    height: 22,
    nodeId: '214:2',
  },
  '367-2760-imgFrame': {
    src: '/design/mobile-plans/367-2760-imgFrame.svg',
    width: 44,
    height: 26,
    nodeId: '367:2760',
  },
  '367-2760-imgIcon': {
    src: '/design/mobile-plans/367-2760-imgIcon.svg',
    width: 22,
    height: 22,
    nodeId: '367:2760',
  },
  '367-2760-imgIcon1': {
    src: '/design/mobile-plans/367-2760-imgIcon1.svg',
    width: 24,
    height: 24,
    nodeId: '367:2760',
  },
  '367-2760-imgIconChevronDown': {
    src: '/design/mobile-plans/367-2760-imgIconChevronDown.svg',
    width: 20,
    height: 20,
    nodeId: '367:2760',
  },
  '367-2760-imgIconClose': {
    src: '/design/mobile-plans/367-2760-imgIconClose.svg',
    width: 16,
    height: 16,
    nodeId: '367:2760',
  },
  '367-2760-imgIconClose1': {
    src: '/design/mobile-plans/367-2760-imgIconClose1.svg',
    width: 20,
    height: 20,
    nodeId: '367:2760',
  },
  '367-2760-imgIconSliders': {
    src: '/design/mobile-plans/367-2760-imgIconSliders.svg',
    width: 20,
    height: 20,
    nodeId: '367:2760',
  },
  '367-2760-imgMark': {
    src: '/design/mobile-plans/367-2760-imgMark.svg',
    width: 36,
    height: 36,
    nodeId: '367:2760',
  },
} satisfies Record<string, FigmaAsset>;
export const mobileChrome: ChromeContent = {
  ...chromeContent,
  track: { ...chromeContent.track, href: '/track' },
  navigation: chromeContent.navigation.map((link) => ({
    ...link,
    href:
      link.label === 'Pre-arrival SIM'
        ? '/pre-arrival-sim'
        : link.label === 'Home Internet'
          ? '/home-internet'
          : link.label === 'Mobile Plans'
            ? '/mobile-plans'
            : '#faq',
  })),
  promo: 'Switching carriers? Keep your number. We handle the transfer for you.',
  promoLink: { label: 'How switching works →', href: '#mobile-steps' },
  promoMobileLabel: 'How switching works →',
  contact: { ...chromeContent.contact, href: '#contact' },
  help: { ...chromeContent.help, href: '#faq' },
};
export const mobileChromeAssets = {
  ...componentAssets,
  logo: mobileAssets['106-65-imgMark'],
  footerLogo: mobileAssets['106-65-imgFrame1'],
  search: mobileAssets['106-65-imgEllipse'],
  phone: mobileAssets['214-2-imgPhoneIcon'],
  chat: mobileAssets['214-2-imgIcon'],
  menu: mobileAssets['214-2-imgIcon1'],
};
export const mobileFooter: FooterContent = {
  ...footerContent,
  groups: footerContent.groups.map((group) => ({
    ...group,
    links: group.links.map((link) => ({
      ...link,
      href:
        group.title === 'Pre-arrival SIM'
          ? '/pre-arrival-sim'
          : group.title === 'Home Internet'
            ? '/home-internet'
            : group.title === 'Mobile Plans'
              ? '#mobile-plans'
              : link.label === 'Track order'
                ? '/track'
                : '#faq',
    })),
  })),
};
