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
  title: 'Bring Your Own Phone Plans in Canada: 100 GB from $40/mo | Canadian Plans',
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
      'Three postpaid plans, explained in plain words. Bring your own unlocked phone, keep your number, and pay nothing online. An identity and credit check is required, and an advisor confirms your price before anything changes.',
  },
  quick: {
    eyebrow: 'Quick answer · Updated October 2026',
    title: 'Which bring-your-own-phone plan should I choose in Canada?',
    description:
      'For most people, the 100 GB Canada + US plan at $40 a month is enough: unlimited talk and text, 5G data, and up to 5 GB a day of roaming in the US. Choose 150 GB at $65 if you travel to Mexico or share a lot of video, or the unlimited 5G+ plan at $90 for the fastest speeds and a 50 GB hotspot. All three are postpaid with no contract and no connection fee. Prices are CAD, taxes extra.',
  },
  plans: {
    eyebrow: 'Mobile plans',
    title: 'All three plans and prices',
    date: 'Prices as of October 2026 · CAD, taxes extra',
    includesTitle: 'Every plan:',
    includes:
      'unlimited talk and text, bring your own unlocked phone, eSIM or SIM card, no connection fee and nothing paid online. An advisor calls to confirm before anything is switched.',
    note: 'An advisor confirms your exact price, and the provider is confirmed when your order is approved.',
  },
  comparison: {
    title: 'Compare the three plans',
    description:
      'Same unlimited talk and text. The difference is how much data you get and where you can use it.',
    columns: ['Canada + US', 'Canada + US + Mexico', '5G+ Complete Unlimited'],
    rows: [
      {
        label: 'Price',
        values: ['$40/mo', '$65/mo', '$90/mo'],
      },
      {
        label: 'Data',
        values: ['100 GB 5G', '150 GB 5G', 'Unlimited, up to 2 Gbps*'],
      },
      {
        label: 'Use it in',
        values: ['Canada & the US', 'Canada, the US & Mexico', 'Canada, the US & Mexico'],
      },
      {
        label: 'Roaming data',
        values: ['Up to 5 GB/day', 'Up to 5 GB/day', 'Ask an advisor'],
      },
      {
        label: 'Mobile hotspot',
        values: ['Ask an advisor', 'Ask an advisor', '50 GB'],
      },
    ],
    note: '*Speeds up to 2 Gbps. Data sharing is not included on 5G+ Complete Unlimited.',
  },
  faq: {
    eyebrow: 'FAQ',
    title: ['Mobile plan', 'questions'],
    description: 'Talk to an advisor, Monday to Saturday, 9am to 9pm Pacific time.',
    items: [
      {
        id: 'mobile-faq-0',
        question: 'Can I keep my phone number when I switch?',
        answer:
          'Yes. Keep your current plan active, give us your account number and transfer PIN, and we request the move to the new plan. It usually completes the same day, and your old plan closes once the number has moved.',
      },
      {
        id: 'mobile-faq-2',
        question: 'Do I need a credit check for a phone plan in Canada?',
        answer:
          'For these three plans, yes. They are postpaid, so the provider runs an identity and credit check, and you upload a government ID with your order. If you are new to Canada and have no credit history yet, start with one of our eSIM plans for newcomers instead: they have no credit check.',
      },
      {
        id: 'mobile-faq-1',
        question: 'When do I pay?',
        answer:
          'Nothing is paid on this website. The provider bills you directly, monthly, once your plan is active. There is no connection fee, and Canadian Plans charges nothing for setting it up.',
      },
      {
        id: 'mobile-faq-4',
        question: 'Can I bring my own phone?',
        answer:
          'Yes. Every plan is bring-your-own-device. Your phone must be unlocked and work on Canadian 5G or LTE bands. Choose an eSIM or a physical SIM card when you order.',
      },
      {
        id: 'mobile-faq-5',
        question: 'What do I need to switch providers?',
        answer:
          'A government ID for the credit check, and your current account number and transfer PIN if you are keeping your number. Do not cancel your old plan first. An advisor walks you through it.',
      },
      {
        id: 'mobile-faq-3',
        question: 'Who provides the service?',
        answer:
          'Canadian Plans is an authorized sales agent. The provider is confirmed when your order is approved, your account is in your name, and your service agreement is with that provider.',
      },
      {
        id: 'mobile-faq-7',
        question: 'Is there a contract?',
        answer:
          'No. All three plans are month to month with no contract. You can change plans later if you use more or less data than expected.',
      },
      {
        id: 'mobile-faq-6',
        question: 'Can I add a family member later?',
        answer:
          'Yes. Place a separate order for each line, or ask an advisor to set up several lines at once.',
      },
    ],
  },
} as const;
export const mobilePlans: readonly MobilePlan[] = [
  {
    id: 'mobile-can-us-100',
    priceCad: 40,
    featured: true,
    carrier: 'Canada + US',
    allowance: '100 GB',
    amount: '$40',
    period: '/mo',
    finePrint: 'CAD · taxes extra · postpaid',
    goodFor: 'Good for: Talk, text and 5G data in Canada and the US.',
    features: [
      '✓ 100 GB of high-speed 5G data',
      '✓ Unlimited talk & text',
      '✓ Use it in Canada & the US',
      '✓ Roaming data up to 5 GB/day',
    ],
    buttonLabel: 'Choose 100 GB',
    selectedLabel: 'Selected',
    badge: 'Limited time offer',
  },
  {
    id: 'mobile-can-us-mex-150',
    priceCad: 65,
    featured: false,
    carrier: 'Canada + US + Mexico',
    allowance: '150 GB',
    amount: '$65',
    period: '/mo',
    finePrint: 'CAD · taxes extra · postpaid',
    goodFor: 'Good for: More data, plus Mexico for travel and family calls.',
    features: [
      '✓ 150 GB of high-speed 5G data',
      '✓ Unlimited talk & text',
      '✓ Use it in Canada, the US & Mexico',
      '✓ Roaming data up to 5 GB/day',
    ],
    buttonLabel: 'Choose 150 GB',
    selectedLabel: 'Selected',
  },
  {
    id: 'mobile-5g-plus-complete-unlimited',
    priceCad: 90,
    featured: false,
    carrier: '5G+ Complete Unlimited',
    allowance: 'Unlimited',
    amount: '$90',
    period: '/mo',
    finePrint: 'CAD · taxes extra · postpaid',
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
