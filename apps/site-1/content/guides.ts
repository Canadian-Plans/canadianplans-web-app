import type { FigmaAsset, FaqItemContent } from '@canadian-plans/ui/canadian-plans';
import { componentAssets } from './components';

export type ArticleBlock =
  | {
      readonly kind: 'section';
      readonly id: string;
      readonly title: string;
      readonly text?: string;
      readonly mobileLines?: readonly string[];
    }
  | { readonly kind: 'checklist'; readonly items: readonly string[] }
  | {
      readonly kind: 'comparison';
      readonly rows: readonly StudentComparison[];
      readonly note: string;
    }
  | {
      readonly kind: 'plan-cta';
      readonly eyebrow: string;
      readonly text: string;
      readonly label: string;
      readonly mobileLines?: readonly string[];
    }
  | { readonly kind: 'devices'; readonly items: readonly DeviceInstructions[] }
  | {
      readonly kind: 'steps';
      readonly id: string;
      readonly title: string;
      readonly items: readonly string[];
    }
  | { readonly kind: 'tip'; readonly label: string; readonly text: string }
  | {
      readonly kind: 'faq';
      readonly id: string;
      readonly title: string;
      readonly items: readonly FaqItemContent[];
    };
export interface StudentComparison {
  readonly id: string;
  readonly name: string;
  readonly data: string;
  readonly price: string;
  readonly storePrice?: string;
  readonly detail?: string;
  readonly bestFor: string;
  readonly desktopBestForLines?: readonly string[];
  readonly mobileDescription: string;
  readonly popular?: boolean;
}
export interface DeviceInstructions {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  readonly caption: string;
}
export interface GuideArticle {
  readonly previewOnly: true;
  readonly slug: string;
  readonly title: string;
  readonly breadcrumbTitle: string;
  readonly category: string;
  readonly description: string;
  readonly author: {
    readonly name: string;
    readonly label: string;
    readonly detail: string;
    readonly avatar: FigmaAsset;
  };
  readonly reviewer: {
    readonly name: string;
    readonly label: string;
    readonly detail: string;
    readonly avatar: FigmaAsset;
  };
  readonly updated: string;
  readonly updatedLabel: string;
  readonly readingLabel: string;
  readonly imageCaption: string;
  readonly quickAnswer: string;
  readonly quickMobileLines?: readonly string[];
  readonly blocks: readonly ArticleBlock[];
  readonly sources: string;
}
export const guideCopy = {
  skip: 'Skip to article',
  breadcrumb: 'Breadcrumb',
  separator: '/',
  imageLabel: 'Image',
  home: 'Home',
  guides: 'Guides',
  quick: 'Quick answer',
  contents: 'On this page',
  contentsDetail: '6 sections · jump to any part',
  pendingAnswer: 'This answer is awaiting approved content. Talk to an advisor for help.',
  symbols: { expand: '+', collapse: '−' },
  check: '✓',
  tableHeaders: ['Plan', 'Data', 'Price', 'Best for'],
  tableLabel: 'Student plan comparison',
  popular: '★ Most popular',
  popularStar: ' ★',
  inStore: ' in store',
  promotion: {
    title: 'Get your number before you fly',
    from: 'from',
    price: '$35',
    unit: '/mo + tax',
    button: 'See student plans',
    detail: 'No credit check · Pay $0 today',
  },
  share: {
    title: 'Share this guide',
    whatsapp: 'WhatsApp',
    copy: 'Copy link',
    copied: 'Link copied',
    failed: 'Copy failed. Select and copy the address from your browser.',
  },
  helpful: {
    label: 'Was this guide helpful?',
    yes: 'Yes',
    no: 'No',
    feedback: 'Thanks for your feedback. Your choice stays in this preview.',
  },
  relatedTitle: 'Keep reading',
  final: {
    title: 'Your number, ready before your flight.',
    description: 'Choose a plan in 2 minutes. An advisor confirms it the same day.',
    primary: 'See student plans →',
    secondary: 'Talk to an advisor',
    note: 'Plans from $35/mo + tax · Pay $0 today',
  },
  destinations: {
    plans: '/pre-arrival-sim#plans',
    advisor: '/contact#message-us',
    contact: '/contact#contact-options',
  },
} as const;
export const studentIndiaGuide: GuideArticle = {
  previewOnly: true,
  slug: 'best-sim-for-students-from-india',
  title: 'Best SIM for students from India (2026)',
  breadcrumbTitle: 'Best SIM for students from India',
  category: 'Phones & SIMs',
  description:
    'Which plan to pick, how much data you really need, and how to get your Canadian number before you leave home — in plain words.',
  author: {
    name: 'Ananya R.',
    label: 'Written by Ananya R.',
    detail: 'Student · moved Pune → Toronto in 2023',
    avatar: { src: '/design/guides/0-imgEllipse1.svg', width: 44, height: 44, nodeId: '133:47' },
  },
  reviewer: {
    name: 'Priya',
    label: 'Reviewed by Priya',
    detail: 'Plan advisor, Canadian Plans',
    avatar: { src: '/design/guides/0-imgEllipse2.svg', width: 44, height: 44, nodeId: '133:52' },
  },
  updated: '2026-10-05',
  updatedLabel: 'Updated 5 Oct 2026',
  readingLabel: '8 min read · Prices as of October 2026',
  imageCaption: 'Student from India at airport arrivals, phone in hand (real photo, with consent)',
  quickAnswer:
    "Most students from India do well with 75 to 100 GB of data a month. Order 1 to 3 weeks before your flight so your Canadian number is ready for your bank and college forms. Plans start at $35 a month (CAD, plus tax), and you don't need a Canadian credit history.",
  quickMobileLines: [
    'Most students from India do well',
    'with 75 to 100 GB of data a',
    'month. Order 1 to 3 weeks before',
    'your flight so your Canadian',
    'number is ready for your bank and',
    'college forms. Plans start at $35 a',
    'month (CAD, plus tax), and you',
    "don't need a Canadian credit",
    'history.',
  ],
  blocks: [
    {
      kind: 'section',
      id: 'needs',
      title: 'What students really need',
      text: 'In your first month you’ll give your phone number to your bank, your college portal, landlords and part-time employers. That’s why the number matters more than the data on day one.',
    },
    {
      kind: 'checklist',
      items: [
        'A Canadian number before you fly',
        '75–100 GB of data for maps, WhatsApp and video calls home',
        'International texting to India',
        'No Canadian credit history needed',
        'eSIM support, if your phone is unlocked',
      ],
    },
    {
      kind: 'section',
      id: 'compare',
      title: 'Compare student plans',
      text: 'Every plan includes 1,000 international minutes, and there’s nothing to pay upfront.',
    },
    {
      kind: 'comparison',
      rows: [
        {
          id: 'fido',
          name: 'Fido',
          data: '75 GB',
          price: '$35/mo',
          storePrice: '$60',
          bestFor: 'Everyday use',
          mobileDescription: '75 GB · Best for everyday use',
        },
        {
          id: 'rogers-plus',
          name: 'Rogers',
          data: '100 GB',
          price: '$40/mo',
          storePrice: '$80',
          bestFor: 'Video calls home',
          desktopBestForLines: ['Video calls', 'home'],
          mobileDescription: '100 GB · Best for video calls home',
          popular: true,
        },
        {
          id: 'rogers-unlimited',
          name: 'Rogers Canada + USA',
          data: '120 GB',
          price: '$50/mo',
          detail: 'USA roaming incl.',
          bestFor: 'Heavy streaming and USA trips',
          desktopBestForLines: ['Heavy', 'streaming and', 'USA trips'],
          mobileDescription: '120 GB · Best for heavy streaming and USA trips',
        },
      ],
      note: 'Prices in CAD, before tax, as of October 2026. Crossed-out prices are what the same plan costs in a Canadian store. ★ Most popular with students.',
    },
    {
      kind: 'plan-cta',
      eyebrow: 'Most students pick',
      text: 'Rogers · 100 GB · $40/mo + tax',
      mobileLines: ['Rogers · 100 GB', '$40/mo + tax'],
      label: 'See this plan →',
    },
    {
      kind: 'section',
      id: 'esim',
      title: 'Is your phone eSIM-ready?',
      text: 'Pre-arrival plans are eSIM only — nothing to ship and nothing to wait for. Your phone needs to be unlocked and support eSIM; most recent iPhone, Samsung Galaxy and Google Pixel models do. Here’s how to check.',
      mobileLines: [
        'Pre-arrival plans are eSIM only — nothing to',
        'ship and nothing to wait for. Your phone',
        'needs to be unlocked and support eSIM;',
        'most recent iPhone, Samsung Galaxy and',
        'Google Pixel models do. Here’s how to',
        'check.',
      ],
    },
    {
      kind: 'devices',
      items: [
        {
          id: 'iphone',
          title: 'iPhone',
          text: 'Settings → General → About → look for “EID” or “Digital SIM”.',
          caption: 'Screenshot: iPhone Settings › General › About, with the EID row highlighted',
        },
        {
          id: 'android',
          title: 'Android',
          text: 'Settings → Connections → SIM manager → look for “Add eSIM”.',
          caption: 'Screenshot: Android Settings › SIM manager, with “Add eSIM” highlighted',
        },
      ],
    },
    {
      kind: 'steps',
      id: 'order',
      title: 'How to order from India',
      items: [
        'Pick your plan on our pre-arrival page.',
        'Add your passport, study permit or visa, and arrival date.',
        'An advisor calls or messages you on WhatsApp to confirm. You don’t pay anything online.',
        'Land, switch on, and you’re online before baggage claim.',
      ],
    },
    {
      kind: 'tip',
      label: 'Tip',
      text: 'Keep your Indian SIM active on a cheap plan — Indian banks and UPI still send OTPs to it.',
    },
    {
      kind: 'faq',
      id: 'guide-faq',
      title: 'FAQ',
      items: [
        {
          id: 'bank',
          question: 'Can I open a Canadian bank account with a pre-arrival number?',
          answer:
            'Yes — most banks only need a Canadian number to send you a verification code. Your pre-arrival number works for this before you land.',
        },
        {
          id: 'sin',
          question: 'Do I need a SIN to get a phone plan?',
          answer:
            'No. To order you need your passport, your study permit or letter of introduction, your arrival date and city, and an email address.',
        },
        {
          id: 'switch',
          question: 'Can I switch plans after I arrive?',
          answer:
            'Yes. You can change your plan after the first month if you use more or less data than expected.',
        },
        {
          id: 'phone',
          question: 'Will my Indian phone work in Canada?',
          answer:
            'It will if your phone is unlocked and supports eSIM. Check the phone settings or send us the model before ordering.',
        },
        {
          id: 'id',
          question: 'What ID do I need to order?',
          answer:
            'Your Indian passport and your study permit, letter of introduction, visa or COPR. A clear photo or PDF of each is enough.',
        },
        {
          id: 'pay',
          question: 'When do I pay?',
          answer:
            'Nothing is paid online. Once your number is active, your first bill comes from Rogers or Fido, and an advisor walks you through the date before anything is billed.',
        },
      ],
    },
  ],
  sources: 'Sources: Rogers, Fido and Chatr plan pages, checked 5 October 2026.',
};
/** Only supplied complete articles resolve; unknown slugs must return 404. */
export const guideArticles: readonly GuideArticle[] = [studentIndiaGuide];
export const guideAssets = {
  ...componentAssets,
  phone: { src: '/design/guides/1-imgPhoneIcon.svg', width: 16, height: 16, nodeId: '364:2467' },
  list: { src: '/design/guides/1-imgIconList.svg', width: 22, height: 22, nodeId: '314:1505' },
  chevron: {
    src: '/design/guides/1-imgChevronDown.svg',
    width: 22,
    height: 22,
    nodeId: '314:1515',
  },
};
export type GuideTopic = 'all' | 'moving' | 'phones' | 'internet' | 'credit';
export interface GuideListEntry {
  readonly id: string;
  readonly previewOnly: true;
  readonly topic: Exclude<GuideTopic, 'all'>;
  readonly category: string;
  readonly title: string;
  readonly detail: string;
  readonly caption: string;
  readonly href: string;
  readonly featured?: boolean;
  readonly description?: string;
  readonly keywords?: readonly string[];
}
/**
 * Index entries (15 October 2026): every card opens real content — the full guide article or
 * one of the Electric Blue landing pages, which are written as guides. The old cards for
 * guides that did not exist (first-week checklist, Brampton internet, calling home…) were
 * pointing at unrelated pages and are gone until those articles are written.
 */
export const guideList: readonly GuideListEntry[] = [
  {
    id: studentIndiaGuide.slug,
    previewOnly: true,
    topic: 'phones',
    category: studentIndiaGuide.category,
    title: studentIndiaGuide.title,
    detail: '8 min read · Updated October 2026',
    caption: 'Student checking her phone at airport arrivals',
    href: `/guides/${studentIndiaGuide.slug}`,
    featured: true,
    description:
      'Which plan Indian students choose, how to order before you fly, and how to keep your Indian number for OTPs.',
    keywords: ['eSIM', 'student', 'India'],
  },
  {
    id: 'student-sim',
    previewOnly: true,
    topic: 'phones',
    category: 'Phones & SIMs',
    title: 'Student SIM and eSIM for Canada',
    detail: 'Guide · Updated Oct 2026',
    caption: 'Student checking a new Canadian number at arrivals',
    href: '/pre-arrival-sim/students',
    keywords: ['student', 'esim', 'study permit', 'device', 'compatibility'],
  },
  {
    id: 'from-india',
    previewOnly: true,
    topic: 'moving',
    category: 'Moving to Canada',
    title: 'Canadian SIM card for Indians moving to Canada',
    detail: 'Guide · Updated Oct 2026',
    caption: 'Newcomer from India at Toronto Pearson arrivals',
    href: '/pre-arrival-sim/from-india',
    keywords: ['india', 'otp', 'calling home', 'whatsapp'],
  },
  {
    id: 'toronto-pearson',
    previewOnly: true,
    topic: 'moving',
    category: 'Moving to Canada',
    title: 'Toronto Pearson (YYZ) eSIM: online when you land',
    detail: 'Guide · Updated Oct 2026',
    caption: 'Traveller at Pearson arrivals turning off airplane mode',
    href: '/pre-arrival-sim/toronto-pearson',
    keywords: ['airport', 'yyz', 'toronto', 'esim'],
  },
  {
    id: 'vancouver-internet',
    previewOnly: true,
    topic: 'internet',
    category: 'Home internet',
    title: 'Home internet in Vancouver: a renter’s guide',
    detail: 'Guide · Updated Oct 2026',
    caption: 'Technician connecting a WiFi modem in a Vancouver apartment',
    href: '/home-internet/vancouver',
    keywords: ['wifi', 'wi-fi', 'installation', 'bc', 'renter'],
  },
  {
    id: 'ontario-internet',
    previewOnly: true,
    topic: 'internet',
    category: 'Home internet',
    title: 'Home internet in Ontario, city by city',
    detail: 'Guide · Updated Oct 2026',
    caption: 'Technician connecting a WiFi modem in a Toronto condo',
    href: '/home-internet/ontario',
    keywords: ['wifi', 'wi-fi', 'installation', 'toronto', 'ottawa', 'renter'],
  },
];
export const guidesIndexCopy = {
  title: 'Newcomer Guides: Phones, SIM Cards & Internet in Canada | Canadian Plans',
  skip: 'Skip to guides',
  eyebrow: 'Newcomer guides',
  heading: 'Plain answers for your move to Canada',
  description:
    'Guides to Canadian SIM cards, eSIM, phone plans and home internet for newcomers, written in plain English by people who made the same move.',
  searchLabel: 'Search guides',
  searchPlaceholder: 'Search guides, e.g. eSIM',
  searchButton: 'Search',
  topicsLabel: 'Guide topics',
  topics: [
    { id: 'all', label: 'All guides' },
    { id: 'moving', label: 'Moving to Canada' },
    { id: 'phones', label: 'Phones & SIMs' },
    { id: 'internet', label: 'Home internet' },
    { id: 'credit', label: 'Money & credit' },
  ] satisfies readonly { id: GuideTopic; label: string }[],
  featuredPrefix: 'Featured · ',
  listLabel: 'Guides',
  more: 'Show more guides',
  initialCount: 6,
  pageSize: 6,
  emptyTitle: 'No matching guides',
  emptyDescription: 'Try another topic or search term.',
  clear: 'Clear filters',
  results: (count: number) => `${count} ${count === 1 ? 'guide' : 'guides'} found`,
  peopleHeading: 'People also ask',
  arrow: '→',
  imageLabel: 'Image',
  questions: [
    {
      id: 'pre-arrival',
      text: 'Can I get a Canadian number before I arrive?',
      href: `/guides/${studentIndiaGuide.slug}#guide-faq`,
    },
    { id: 'sin', text: 'Do I need a SIN to get a phone plan?', href: '/faq#faq-eligibility' },
    {
      id: 'credit',
      text: 'Do I need a credit check for a phone plan?',
      href: '/mobile-plans#faq',
    },
    {
      id: 'install',
      text: 'How long does internet installation take?',
      href: '/home-internet/vancouver#how-it-works',
    },
    {
      id: 'number',
      text: 'Can I keep my number if I change carriers?',
      href: '/mobile-plans#faq',
    },
  ],
  final: {
    title: 'Ready when you land',
    subtitle: 'Choose a plan in about 2 minutes. An advisor confirms it the same day.',
    primary: { label: 'See pre-arrival plans →', href: '/pre-arrival-sim#plans' },
    secondary: { label: 'Talk to an advisor ›', href: '/contact' },
  },
  breadcrumb: {
    label: 'Breadcrumb',
    separator: '/',
    items: [{ label: 'Home', href: '/' }, { label: 'Guides' }],
  },
} as const;
export const guidesIndexAssets = {
  ...componentAssets,
  phone: {
    src: '/design/guides-index/1-imgPhoneIcon.svg',
    width: 16,
    height: 16,
    nodeId: '364:2275',
  },
  featured: {
    src: '/design/components/312-9-imgIcon.svg',
    width: 32,
    height: 32,
    nodeId: '312:12',
  },
};
