import type {
  BreadcrumbItem,
  CpButtonTone,
  FaqItemContent,
  FigmaAsset,
  PlanCardContent,
  SectionHeadingContent,
  TestimonialContent,
  StickyCtaContent,
} from '@canadian-plans/ui/canadian-plans';

export interface PreviewLink {
  readonly label: string;
  readonly href: string;
}

export interface ChromeContent {
  readonly brand: string;
  /** Utility bar line (final homepage design, 16 October 2026). */
  readonly dealer: string;
  readonly moving: string;
  readonly living: string;
  readonly phone: PreviewLink;
  readonly track: PreviewLink;
  readonly contact: PreviewLink;
  readonly help: PreviewLink;
  readonly navigation: readonly PreviewLink[];
  readonly navigationLabel: string;
  readonly mobileNavigationLabel: string;
  readonly menuLabel: string;
  readonly closeLabel: string;
  readonly contactLabel: string;
  readonly finderLabel: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly searchError: string;
  readonly searchResult: string;
  readonly searchPending: string;
  readonly promo: string;
  readonly promoLink: PreviewLink;
  readonly promoMobileLabel: string;
}

export const componentAssets = {
  logo: { src: '/design/components/60-13-imgMark.svg', width: 36, height: 36, nodeId: '60:16' },
  footerLogo: {
    src: '/design/components/68-50-imgFrame.svg',
    width: 36,
    height: 36,
    nodeId: '68:54',
  },
  phone: {
    src: '/design/components/364-2153-imgPhoneIcon.svg',
    width: 16,
    height: 16,
    nodeId: '364:2155',
  },
  chat: {
    src: '/design/components/364-2163-imgIcon.svg',
    width: 22,
    height: 22,
    nodeId: '364:2170',
  },
  menu: {
    src: '/design/components/364-2163-imgIcon1.svg',
    width: 24,
    height: 24,
    nodeId: '364:2173',
  },
  search: {
    src: '/design/components/60-13-imgEllipse.svg',
    width: 14,
    height: 14,
    nodeId: '60:27',
  },
  imageLight: {
    src: '/design/components/312-2-imgIcon.svg',
    width: 32,
    height: 32,
    nodeId: '312:3',
  },
  imageBlue: {
    src: '/design/components/312-9-imgIcon.svg',
    width: 32,
    height: 32,
    nodeId: '312:10',
  },
  aarav: { src: '/design/components/66-43-imgEllipse.svg', width: 40, height: 40, nodeId: '66:47' },
  maria: { src: '/design/components/66-51-imgEllipse.svg', width: 40, height: 40, nodeId: '66:55' },
  tanvir: {
    src: '/design/components/66-59-imgEllipse.svg',
    width: 40,
    height: 40,
    nodeId: '66:63',
  },
} satisfies Record<string, FigmaAsset>;

/** Figma examples only. The dev route keeps every link/action inside the showcase. */
export const chromeContent: ChromeContent = {
  brand: 'Canadian Plans',
  dealer: 'Authorized Rogers, Fido & Chatr dealer · Surrey, BC',
  moving: "I'm moving to Canada",
  living: 'I already live here',
  phone: { label: '+1 778-682-3771', href: '#contact' },
  track: { label: 'Track order', href: '#breadcrumb' },
  contact: { label: 'Contact', href: '#contact' },
  help: { label: 'Help', href: '#faq' },
  navigation: [
    { label: 'Pre-arrival SIM', href: '#plans' },
    { label: 'Home Internet', href: '#plans' },
    { label: 'Mobile Plans', href: '#plans' },
    { label: 'Guides', href: '#heading' },
  ],
  navigationLabel: 'Main navigation preview',
  mobileNavigationLabel: 'Menu preview',
  menuLabel: 'Open menu',
  closeLabel: 'Close',
  contactLabel: 'WhatsApp us',
  finderLabel: 'Find my plan',
  searchLabel: 'Search plans or cities',
  searchPlaceholder: 'Search plans or cities',
  searchError: 'Enter 2 to 80 characters.',
  searchResult: 'Search preview complete. No live search or order was created.',
  searchPending: 'Checking…',
  promo:
    'Order your Canadian eSIM before you fly. It works from any country and is ready in minutes.',
  promoLink: { label: 'See SIM plans', href: '#plans' },
  promoMobileLabel: 'See SIM plans →',
};

export interface FooterNewsletterContent {
  readonly title: string;
  readonly body: string;
  readonly label: string;
  readonly placeholder: string;
  readonly action: string;
  readonly invalid: string;
  readonly preview: string;
}

export interface FooterLink extends PreviewLink {
  /** Opens the global plan finder instead of following the link (href is the fallback). */
  readonly finder?: true;
}

export interface FooterContent {
  readonly description: string;
  readonly address: string;
  readonly contactLine: string;
  /** Final homepage design: phone, email and address on separate lines. */
  readonly contactLines?: readonly string[];
  /** Small round social links; only real destinations are listed. */
  readonly social?: readonly {
    readonly label: string;
    readonly short: string;
    readonly href: string;
  }[];
  readonly newsletter?: FooterNewsletterContent;
  readonly groups: readonly { readonly title: string; readonly links: readonly FooterLink[] }[];
  readonly copyright: string;
  readonly legalLabel: string;
  readonly legalSeparator: string;
  readonly legal: readonly PreviewLink[];
}

export const footerContent: FooterContent = {
  description:
    'Canadian Plans is an authorized Rogers, Fido and Chatr dealer in Surrey, BC. We help newcomers and Canadians set up SIM cards, phone plans and home internet.',
  address: '9981 Whalley Blvd, Surrey, BC',
  contactLine: '+1 778-682-3771 · info@canadianplans.com',
  groups: [
    {
      title: 'Pre-arrival SIM',
      links: ['All SIM plans', 'eSIM', 'Students', 'Workers', 'From India'].map((label) => ({
        label,
        href: '#plans',
      })),
    },
    {
      title: 'Home Internet',
      links: ['All plans', 'TV bundles', 'Vancouver', 'Surrey', 'Toronto'].map((label) => ({
        label,
        href: '#plans',
      })),
    },
    {
      title: 'Mobile Plans',
      links: ['Rogers', 'Fido', 'Chatr', 'No credit check'].map((label) => ({
        label,
        href: '#plans',
      })),
    },
    {
      title: 'Help',
      links: ['Guides', 'Compare', 'Track order', 'Contact'].map((label) => ({
        label,
        href: '#contact',
      })),
    },
  ],
  copyright:
    '© 2026 Canadian Plans · Rogers, Fido and Chatr are trademarks of Rogers Communications.',
  legalLabel: 'Legal links preview',
  legalSeparator: '·',
  legal: ['Privacy', 'Terms', 'Accessibility', 'Cookie settings'].map((label) => ({
    label,
    href: '#contact',
  })),
};

/** Presentation fixtures only; commercial WebsiteOffer data remains backend-authoritative. */
export const planExamples: readonly (PlanCardContent & { readonly previewOnly: true })[] = [
  {
    previewOnly: true,
    id: 'test-fido-75',
    carrier: 'FIDO · Essential',
    allowance: '75 GB',
    amount: '$35',
    period: '/mo',
    finePrint: 'CAD · taxes extra · no contract',
    features: [
      '✓  Unlimited Canada talk & text',
      '✓  Get your number before you fly',
      '✓  eSIM by email in minutes',
    ],
    buttonLabel: 'Choose 75 GB',
    selectedLabel: 'Selected ✓',
  },
  {
    previewOnly: true,
    id: 'test-rogers-100',
    carrier: 'ROGERS · Plus',
    allowance: '100 GB',
    amount: '$40',
    period: '/mo',
    finePrint: 'CAD · taxes extra · no contract',
    features: [
      '✓  Unlimited Canada talk & text',
      '✓  1,000 international minutes',
      '✓  5G network · eSIM ready',
    ],
    buttonLabel: 'Choose 100 GB',
    selectedLabel: 'Selected ✓',
    badge: 'Most popular',
  },
  {
    previewOnly: true,
    id: 'test-rogers-120',
    carrier: 'ROGERS · Unlimited',
    allowance: '120 GB',
    amount: '$50',
    period: '/mo',
    finePrint: 'CAD · taxes extra · no contract',
    features: [
      '✓  Unlimited Canada–US talk & text',
      '✓  USA & Canada roaming included',
      '✓  1,000 international minutes',
    ],
    buttonLabel: 'Choose 120 GB',
    selectedLabel: 'Selected ✓',
  },
];

export const sectionHeading: SectionHeadingContent = {
  eyebrow: 'POPULAR PLANS',
  title: ['Canadian SIM plans,', 'with real prices.'],
  description:
    'Order before you fly and pay less. The 100 GB plan is normally $80 in Canada, and the 75 GB plan is $60.',
};

const closedFaqs: readonly (readonly [string, string])[] = [
  ['phone', 'Will my phone work with an eSIM?'],
  ['payment', 'Do I have to pay when I order?'],
  ['carrier', 'Are these real Rogers, Fido and Chatr plans?'],
  ['internet', 'How soon can I get home internet after I move in?'],
  ['documents', 'What documents do I need to get a phone plan in Canada?'],
  ['switch', 'Can I keep my phone number if I switch providers?'],
];

export const faqExamples: readonly FaqItemContent[] = [
  {
    id: 'arrival',
    question: 'Can I get a Canadian phone number before I arrive?',
    answer:
      'Yes. Order a pre-arrival eSIM 1 to 3 weeks before your flight. You get your number right away, and the plan starts when you land in Canada.',
  },
  ...closedFaqs.map(([id, question]) => ({
    id,
    question,
    answer:
      'This is a component preview answer. Approved page content will be supplied during implementation.',
  })),
];

function requiredAsset(name: keyof typeof componentAssets): FigmaAsset {
  return componentAssets[name];
}

export const reviewExamples: readonly TestimonialContent[] = [
  {
    id: 'aarav',
    stars: '★★★★★',
    ratingLabel: 'Five out of five stars',
    quote:
      '“Had my Canadian number two weeks before my flight. Used it to open my bank account online. Landed at YVR and it just worked.”',
    name: 'Aarav S.',
    detail: 'Student · Delhi → Vancouver',
    avatar: requiredAsset('aarav'),
  },
  {
    id: 'maria',
    stars: '★★★★★',
    ratingLabel: 'Five out of five stars',
    quote:
      '“Internet was installed in our Brampton apartment three days after we moved in. Someone actually called back when they said.”',
    name: 'Maria L.',
    detail: 'Nurse · Manila → Brampton',
    avatar: requiredAsset('maria'),
  },
  {
    id: 'tanvir',
    stars: '★★★★★',
    ratingLabel: 'Five out of five stars',
    quote:
      '“Clear prices, no surprises on the first bill. The advisor explained Fido vs Rogers in plain words.”',
    name: 'Tanvir H.',
    detail: 'PR · Dhaka → Calgary',
    avatar: requiredAsset('tanvir'),
  },
];

export const buttonExamples: readonly { readonly tone: CpButtonTone; readonly label: string }[] = [
  { tone: 'primary', label: 'Choose 100 GB' },
  { tone: 'ink', label: 'Find my plan' },
  { tone: 'sun', label: 'See pre-arrival plans →' },
  { tone: 'outline', label: 'Choose 75 GB' },
  { tone: 'outline-brand', label: 'Pre-arrival SIM' },
  { tone: 'outline-inverse', label: 'Check my address' },
  { tone: 'ghost', label: 'Guides' },
];

export const breadcrumbExamples: readonly BreadcrumbItem[] = [
  { label: 'Home', href: '#components' },
  { label: 'Pre-arrival SIM' },
];

export const componentCopy = {
  title: 'Canadian Plans components',
  previewNotice:
    'DESIGN PREVIEW — Figma sample copy, prices, reviews and contact details. No live services or orders.',
  intro:
    'Responsive shared pieces from the Website design. Use the controls to inspect local UI states.',
  groups: {
    buttons: 'Button variants',
    chips: 'Chip, Badge and Link pill',
    plans: 'PlanCard',
    heading: 'SectionHeading',
    faq: 'FaqAccordion',
    reviews: 'ReviewCard',
    price: 'PriceCircle',
    breadcrumb: 'Breadcrumb',
    images: 'Image slot',
    sticky: 'Mobile Sticky CTA bar',
  },
  disabled: 'Disabled',
  chipLabel: 'Choose an audience preview',
  chips: ['Student', 'Worker', 'Permanent resident', 'Visitor'],
  badgeLabels: ['Most popular', 'eSIM ready', 'No contract', 'Preview'],
  linkLabels: [
    'Pre-arrival SIM',
    'eSIM in minutes',
    'Home Internet',
    'Mobile plans',
    'For students',
    'No credit check',
  ],
  plus: '+',
  minus: '−',
  breadcrumbLabel: 'Breadcrumb preview',
  breadcrumbSeparator: '/',
  imageLabel: 'IMAGE',
  imageCaption: 'Describe the photo here',
  priceLabel: 'SIM plans from',
  priceAmount: '$35',
  priceSuffix: '/mo · CAD',
  dialogTitle: 'Component preview',
  dialogDescription:
    'This control is a UI demonstration. No call, WhatsApp message, recommendation or order is created.',
  dialogClose: 'Close preview',
  selectedPrefix: 'Preview selected:',
  selectedEmpty: 'Choose a sample plan to inspect its selected state.',
  stickyBrowsing: {
    title: 'Plans from $35/mo',
    detail: 'Pay $0 today · Rogers & Fido',
    button: 'See plans',
  },
  stickySelected: {
    title: 'Rogers · 100 GB',
    detail: '$40/mo + tax · $0 due today',
    button: 'Continue →',
  },
  stickyToggle: 'Show floating mobile CTA',
  stickyDemoButton: 'Main page action preview',
  stickyNote:
    'The floating version appears when its main action scrolls away. It hides while a menu/dialog or keyboard is open.',
  reviewScrollLabel: 'Sample testimonials',
  skipLink: 'Skip to components',
};

export type ComponentCopy = typeof componentCopy;
export type ComponentAssets = typeof componentAssets;

export function selectedStickyContent(plan: PlanCardContent): StickyCtaContent {
  return {
    title: `${plan.carrier} · ${plan.allowance}`,
    detail: `${plan.amount}${plan.period} + tax · $0 due today`,
    button: componentCopy.stickySelected.button,
  };
}
