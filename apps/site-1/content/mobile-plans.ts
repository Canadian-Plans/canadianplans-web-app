import type {
  PlanCardContent,
  FigmaAsset,
  TestimonialContent,
} from '@canadian-plans/ui/canadian-plans';
import {
  chromeContent,
  footerContent,
  componentAssets,
  type ChromeContent,
  type FooterContent,
} from './components';
export type MobileBrand = 'chatr' | 'fido' | 'rogers';
export type MobilePayType = 'prepaid' | 'postpaid';
export type MobileDataBand = 'any' | 'under20' | '20to60' | 'over60';
export type MobileSort = 'recommended' | 'price-low' | 'price-high' | 'data-high';
export interface MobilePlan extends PlanCardContent {
  readonly previewOnly: true;
  readonly brand: MobileBrand;
  readonly dataGb: number;
  readonly priceCad: number;
  readonly payType: MobilePayType;
  readonly bringOwnPhone: boolean;
  readonly tone: 'lemon' | 'mint' | 'sky';
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
    eyebrow: 'Mobile plans · Already in Canada',
    title: 'Compare Rogers, Fido & Chatr phone plans.',
    pricePrefix: 'Plans from',
    price: '$29/mo',
    priceSuffix: '+ tax · No contract',
    description:
      "See every plan side by side, explained in plain words. Keep your number and bring your own phone. Prepaid plans don't need a Canadian credit history.",
    primary: 'Compare plans ↓',
    secondary: 'Help me choose',
    features: [
      '✓ Authorized Rogers, Fido & Chatr dealer',
      '✓ Pay $0 to order. We call you to confirm.',
      '★★★★★ 4.8 on Google · 1,200+ reviews',
    ],
    carriers: [
      {
        id: 'chatr',
        name: 'Chatr',
        description: 'Lowest price · prepaid',
        amount: '$29',
        tone: 'lemon',
      },
      {
        id: 'fido',
        name: 'Fido',
        description: 'Best value · 5G',
        amount: '$45',
        tone: 'mint',
      },
      {
        id: 'rogers',
        name: 'Rogers',
        description: 'Premium · 5G+ & US roaming',
        amount: '$55',
        tone: 'sky',
      },
    ],
    from: 'from',
    period: '/mo',
    network: 'All three run on the Rogers network.',
  },
  quick: {
    eyebrow: 'Quick answer · Updated October 2026',
    title: 'Rogers, Fido or Chatr: which should I choose?',
    description:
      'All three are owned by Rogers and use its network. Chatr is the cheapest (prepaid, from $29/mo, no credit check). Fido is the middle option with 5G and good value (from $45/mo). Rogers is premium, with 5G+ and Canada–US plans (from $55/mo). Prices CAD, taxes extra.',
  },
  plans: {
    eyebrow: 'Mobile plans',
    title: 'All mobile plans and prices',
    date: 'Prices as of October 2026 · CAD, taxes extra',
    includesTitle: 'Every plan:',
    includes:
      'keep your number, no contract and $0 to order online. We call you to confirm before we switch anything.',
    note: 'PLACEHOLDER plans and prices. Replace with current Rogers, Fido and Chatr offers before launch.',
  },
  filters: {
    brand: 'Brand',
    pay: 'Pay',
    payType: 'Pay type',
    data: 'Data',
    phone: 'Bring my own phone',
    title: 'Filters',
    clear: 'Clear all',
    close: 'Close filters',
    sort: 'Sort',
    active: 'Active filters',
    remove: 'Remove',
    sheetDescription: 'Filter preview plans by brand, pay type, data and phone support.',
    showPrefix: 'Show',
    plural: 'plans',
    singular: 'plan',
    results: 'plans shown',
    empty: 'No preview plans match these filters.',
    emptyHelp: 'Clear the filters to see all four plans.',
    brandOptions: [
      {
        id: 'all',
        label: 'All',
      },
      {
        id: 'chatr',
        label: 'Chatr',
      },
      {
        id: 'fido',
        label: 'Fido',
      },
      {
        id: 'rogers',
        label: 'Rogers',
      },
    ],
    payOptions: [
      {
        id: 'any',
        label: 'Any',
      },
      {
        id: 'prepaid',
        label: 'Prepaid',
      },
      {
        id: 'postpaid',
        label: 'Postpaid',
      },
    ],
    dataOptions: [
      {
        id: 'any',
        label: 'Any',
      },
      {
        id: 'under20',
        label: 'Under 20 GB',
      },
      {
        id: '20to60',
        label: '20–60 GB',
      },
      {
        id: 'over60',
        label: '60 GB+',
      },
    ],
    sortOptions: [
      {
        id: 'recommended',
        label: 'Most popular',
      },
      {
        id: 'price-low',
        label: 'Price: low to high',
      },
      {
        id: 'price-high',
        label: 'Price: high to low',
      },
      {
        id: 'data-high',
        label: 'Data: high to low',
      },
    ],
  },
  comparison: {
    title: 'Which brand fits you?',
    description: 'Same network, different prices and perks. Here is the difference in plain words.',
    brands: ['Chatr', 'Fido', 'Rogers'],
    rows: [
      {
        label: 'Best for',
        values: ['Lowest monthly price', 'Best value for most people', 'Fastest speeds & travel'],
      },
      {
        label: 'How you pay',
        values: ['Prepaid', 'Prepaid or postpaid', 'Postpaid'],
      },
      {
        label: 'Credit check',
        values: ['No', 'Postpaid only', 'Yes (or deposit)'],
      },
      {
        label: 'Builds Canadian credit',
        values: ['No', 'With postpaid', 'Yes'],
      },
      {
        label: 'Network',
        values: ['Rogers', 'Rogers · 5G', 'Rogers · 5G+'],
      },
      {
        label: 'US & travel',
        values: ['Add-ons', 'Roam add-ons', 'Canada–US plans'],
      },
      {
        label: 'Plans from',
        values: ['$29/mo', '$45/mo', '$55/mo'],
      },
    ],
    note: 'VERIFY before publishing: network features (5G/5G+), credit checks and roaming options per brand.',
  },
  payment: {
    eyebrow: 'No credit history yet?',
    title: 'Prepaid or postpaid: what’s the difference?',
    cards: [
      {
        tone: 'lemon',
        title: 'Prepaid',
        subtitle: 'Pay before the month starts',
        features: [
          '✓ No credit check, just a passport',
          '✓ No surprise bills: you top up',
          '✓ Switch or stop anytime',
          '✓ Doesn’t build Canadian credit',
        ],
      },
      {
        tone: 'sky',
        title: 'Postpaid',
        subtitle: 'Pay after the month ends',
        features: [
          '✓ Builds your Canadian credit history',
          '✓ Phone financing available',
          '✓ Usually more data per dollar',
          '✓ Needs a credit check or deposit',
        ],
      },
    ],
    tipTitle: 'Newcomer tip',
    tip: "Many newcomers start with prepaid. After a few months they move to postpaid to start building a Canadian credit history. We'll tell you when the switch makes sense for you.",
    caption: 'Newcomer holding a passport and a Chatr prepaid SIM card at the store counter',
  },
  switching: {
    title: 'Keep your number. We do the switching.',
    caption: 'Advisor moving a customer’s number onto a new phone at the Surrey store counter',
    steps: [
      {
        number: '1',
        title: 'Don’t cancel your old plan',
        description:
          'If you cancel first, you could lose your number. Keep your old plan active until the switch is done.',
        tone: 'mint',
      },
      {
        number: '2',
        title: 'Tell us your number & account',
        description: 'Find your account number and PIN on your current carrier’s bill or app.',
        tone: 'sky',
      },
      {
        number: '3',
        title: 'We transfer your number',
        description: 'Your number moves to the new plan, usually the same day.',
        tone: 'lemon',
      },
      {
        number: '4',
        title: 'Check your phone',
        description: 'Unlocked? Insert the new SIM or eSIM. Locked? We’ll show you how to unlock.',
        tone: 'pink',
      },
    ],
    button: 'Switch my number',
    note: 'VERIFY: number transfer timing (“usually the same day”) with Rogers before publishing.',
  },
  explore: {
    title: 'Explore by need',
    links: [
      'Rogers plans →',
      'Fido plans →',
      'Chatr plans →',
      'Unlimited data →',
      'No credit check →',
      'Students →',
      'Seniors →',
      'Rogers vs Fido →',
      'Fido vs Chatr →',
      'eSIM vs physical SIM →',
    ],
  },
  reviews: {
    eyebrow: 'REVIEWS',
    title: ['Customers', 'recommend us.'],
    score: '4.8',
    stars: '★★★★★',
    count: '1,200+ Google reviews',
  },
  faq: {
    eyebrow: 'FAQ',
    title: ['Mobile plan', 'questions'],
    description: 'Talk to an advisor, Monday to Saturday, 9am–9pm Pacific time.',
    button: 'WhatsApp us',
    caption: 'Canadian Plans advisor answering a customer’s WhatsApp message at the Surrey store',
    expand: '+',
    collapse: '−',
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
        answer: 'This answer is awaiting approved content for the design preview.',
      },
      {
        id: 'mobile-faq-2',
        question: 'Do I need a credit check for a phone plan in Canada?',
        answer: 'This answer is awaiting approved content for the design preview.',
      },
      {
        id: 'mobile-faq-3',
        question: 'Are these official Rogers, Fido and Chatr plans?',
        answer: 'This answer is awaiting approved content for the design preview.',
      },
      {
        id: 'mobile-faq-4',
        question: 'Can I bring my own phone?',
        answer: 'This answer is awaiting approved content for the design preview.',
      },
      {
        id: 'mobile-faq-5',
        question: 'What do I need to switch providers?',
        answer: 'This answer is awaiting approved content for the design preview.',
      },
      {
        id: 'mobile-faq-6',
        question: 'Can I add a family member later?',
        answer: 'This answer is awaiting approved content for the design preview.',
      },
    ],
  },
  final: {
    title: 'Keep your number. Lower your bill.',
    description:
      "Compare plans in 2 minutes. An advisor sets everything up, and you pay nothing until it's confirmed.",
    primary: 'Compare plans →',
    secondary: 'Talk to an advisor',
    caption:
      'Two Canadian Plans advisors smiling at the Surrey store counter, phones and SIM cards on display',
  },
  preview: {
    title: 'Mobile plan preview',
    description:
      'This is a design preview. No order, number transfer or contact request has been created.',
    advisorTitle: 'Advisor preview',
    advisorDescription:
      'Advisor contact will be connected separately. This preview sends no message.',
    close: 'Back to plans',
    selected: 'Selected',
    image: 'IMAGE',
    ratingLabel: '5 out of 5 stars',
    unavailableNeed:
      'This need is not tagged in the preview plan data. Use the filters to compare plans, or ask an advisor when the service is connected.',
  },
} as const;
export const mobilePlans: readonly MobilePlan[] = [
  {
    id: 'preview-mobile-chatr-20',
    previewOnly: true,
    brand: 'chatr',
    dataGb: 20,
    priceCad: 29,
    payType: 'prepaid',
    bringOwnPhone: true,
    tone: 'lemon',
    featured: false,
    carrier: 'Chatr',
    allowance: '20 GB',
    amount: '$29',
    period: '/mo',
    finePrint: 'CAD · taxes extra · no contract',
    goodFor: 'Good for: Light use, lowest price, no credit check.',
    features: [
      '✓ Unlimited Canada talk & text',
      '✓ Int’l texting',
      '✓ No contract · top up monthly',
    ],
    buttonLabel: 'Choose 20 GB',
    selectedLabel: 'Selected',
  },
  {
    id: 'preview-mobile-fido-60',
    previewOnly: true,
    brand: 'fido',
    dataGb: 60,
    priceCad: 45,
    payType: 'prepaid',
    bringOwnPhone: true,
    tone: 'mint',
    featured: true,
    carrier: 'Fido',
    allowance: '60 GB',
    amount: '$45',
    period: '/mo',
    finePrint: 'CAD · taxes extra · no contract',
    goodFor: 'Good for: Streaming and video calls home.',
    features: [
      '✓ Unlimited Canada talk & text',
      '✓ 5G speeds',
      '✓ Int’l texting to 200+ countries',
    ],
    buttonLabel: 'Choose 60 GB',
    selectedLabel: 'Selected',
    badge: 'Most popular',
  },
  {
    id: 'preview-mobile-rogers-100',
    previewOnly: true,
    brand: 'rogers',
    dataGb: 100,
    priceCad: 55,
    payType: 'postpaid',
    bringOwnPhone: true,
    tone: 'sky',
    featured: false,
    carrier: 'Rogers',
    allowance: '100 GB',
    amount: '$55',
    period: '/mo',
    finePrint: 'CAD · taxes extra · no contract',
    goodFor: 'Good for: Heavy data and US trips.',
    features: [
      '✓ Unlimited Canada–US talk & text',
      '✓ 5G+ priority network',
      '✓ Builds Canadian credit',
    ],
    buttonLabel: 'Choose 100 GB',
    selectedLabel: 'Selected',
  },
  {
    id: 'preview-mobile-rogers-150',
    previewOnly: true,
    brand: 'rogers',
    dataGb: 150,
    priceCad: 75,
    payType: 'postpaid',
    bringOwnPhone: true,
    tone: 'sky',
    featured: false,
    carrier: 'Rogers',
    allowance: '150 GB',
    amount: '$75',
    period: '/mo',
    finePrint: 'CAD · taxes extra · no contract',
    goodFor: 'Good for: Power users, hotspot for work.',
    features: [
      '✓ Unlimited Canada–US talk & text',
      '✓ 5G+ priority network',
      '✓ Roam Like Home eligible',
    ],
    buttonLabel: 'Choose 150 GB',
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
export const mobileReviews: readonly TestimonialContent[] = [
  {
    id: 'mobile-review-0',
    stars: '★★★★★',
    ratingLabel: '5 out of 5 stars',
    quote:
      '“I was with Bell and didn’t want to lose my number. The advisor called to confirm everything first, then moved it over for me.”',
    name: 'Daniel R.',
    detail: 'Teacher · Calgary',
    avatar: {
      src: '/design/mobile-plans/106-65-imgPhotoIcon.svg',
      width: 22,
      height: 22,
      nodeId: '106:65',
    },
    avatarTone: 'sky',
  },
  {
    id: 'mobile-review-1',
    stars: '★★★★★',
    ratingLabel: '5 out of 5 stars',
    quote:
      '“Internet was installed in our Brampton apartment three days after we moved in. Someone actually called back when they said.”',
    name: 'Maria L.',
    detail: 'Nurse · Manila → Brampton',
    avatar: {
      src: '/design/mobile-plans/106-65-imgPhotoIcon.svg',
      width: 22,
      height: 22,
      nodeId: '106:65',
    },
    avatarTone: 'mint',
  },
  {
    id: 'mobile-review-2',
    stars: '★★★★★',
    ratingLabel: '5 out of 5 stars',
    quote:
      '“Clear prices, no surprises on the first bill. The advisor explained Fido vs Rogers in plain words.”',
    name: 'Tanvir H.',
    detail: 'PR · Dhaka → Calgary',
    avatar: {
      src: '/design/mobile-plans/106-65-imgPhotoIcon.svg',
      width: 22,
      height: 22,
      nodeId: '106:65',
    },
    avatarTone: 'pink',
  },
];
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
  promoLink: { label: 'How switching works →', href: '#switching' },
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
