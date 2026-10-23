import { componentAssets } from './components';
import type { FigmaAsset } from '@canadian-plans/ui/canadian-plans';
export const systemCopy = {
  skip: 'Skip to main content',
  arrow: '→',
  accessibilityLabel: 'Accessibility',
} as const;
export const missingCopy = {
  eyebrow: 'ERROR 404',
  title: 'This page lost its signal.',
  intro:
    'The link may be old, or the page has moved. Try searching, or pick where you want to go below.',
  help: 'Still stuck? Call or email us and we’ll find it for you.',
  helpButton: 'Contact an advisor',
  cards: [
    {
      title: 'Pre-arrival SIM',
      description: 'From $35/mo, before you fly',
      icon: 'plane',
      href: '/pre-arrival-sim',
    },
    {
      title: 'Mobile plans',
      description: 'From $55/mo, for your phone',
      icon: 'mobile',
      href: '/mobile-plans',
    },
    {
      title: 'Home internet',
      description: 'From $50/mo, Wi-Fi at home',
      icon: 'wifi',
      href: '/home-internet',
    },
    {
      title: 'Track my order',
      description: 'See your order status',
      icon: 'pin',
      href: '/track',
    },
  ],
} as const;
export const searchCopy = {
  initialQuery: 'student sim card',
  label: 'Search plans, guides, help or cities',
  placeholder: 'Search plans or cities',
  submit: 'Search',
  pending: 'Searching preview…',
  error: 'Search with 2–80 characters. Do not enter contact details.',
  failed: 'The preview could not be searched. Please try again.',
  results: 'results for',
  openQuote: '“',
  closeQuote: '”',
  empty: 'No matching results',
  filtersLabel: 'Filter search results',
  helpTitle: 'Didn’t find what you need?',
  helpDescription:
    'Try fewer words, like “eSIM” or “internet Toronto”, or call or email an advisor.',
  helpButton: 'Contact an advisor',
  featured: {
    label: 'PLAN · MOST POPULAR WITH STUDENTS',
    title: 'Rogers · 100 GB eSIM',
    description:
      'Unlimited Canada calls & texts · 1,000 international minutes · ready the moment you land',
    price: '$40',
    period: '/mo · $0 today',
    button: 'Choose plan',
  },
  categories: [
    {
      id: 'all',
      label: 'All',
    },
    {
      id: 'plans',
      label: 'Plans',
    },
    {
      id: 'guides',
      label: 'Guides',
    },
    {
      id: 'help',
      label: 'Help',
    },
    {
      id: 'cities',
      label: 'Cities',
    },
  ],
} as const;
export type SearchCategory = 'all' | 'plans' | 'guides' | 'help' | 'cities';
export interface SearchItem {
  readonly id: string;
  readonly category: Exclude<SearchCategory, 'all'>;
  readonly featured: boolean;
  readonly previewOnly: true;
  readonly title: string;
  readonly description: string;
  readonly label: string;
  readonly crumb: string;
  readonly href: string;
  readonly keywords: readonly string[];
}
export const searchItems: readonly SearchItem[] = [
  {
    id: 'preview-rogers-plus',
    category: 'plans',
    featured: true,
    previewOnly: true,
    title: 'Rogers · 100 GB eSIM',
    description:
      'Unlimited Canada calls & texts · 1,000 international minutes · ready the moment you land',
    label: 'PLAN · MOST POPULAR WITH STUDENTS',
    crumb: '',
    href: '/order?plan=prearrival-rogers-plus-100&category=sim',
    keywords: ['student sim card', 'esim', 'rogers', 'plan', 'international', '100 gb'],
  },
  {
    id: 'source-result-0',
    category: 'guides',
    featured: false,
    previewOnly: true,
    label: 'GUIDE',
    crumb: 'canadianplans.com › guides › best-sim-students-india',
    title: 'Best SIM for students from India (2026)',
    description:
      'Which plan to pick, how much data you really need, and how to get your Canadian number before you leave home.',
    href: '/guides/best-sim-for-students-from-india',
    keywords: ['student sim card', 'india', 'student', 'guide'],
  },
  {
    id: 'source-result-1',
    category: 'plans',
    featured: false,
    previewOnly: true,
    label: 'PAGE',
    crumb: 'canadianplans.com › pre-arrival-sim › students',
    title: 'Student SIM card & eSIM plans',
    description:
      'Order your eSIM from home, get your Canadian number right away, and switch it on\nwhen you land.',
    href: '/pre-arrival-sim/students',
    keywords: ['student sim card', 'student', 'sim', 'esim', 'plan'],
  },
  {
    id: 'source-result-2',
    category: 'help',
    featured: false,
    previewOnly: true,
    label: 'HELP',
    crumb: 'canadianplans.com › faq',
    title: 'How do I know if my phone supports eSIM?',
    description:
      'Most recent iPhone, Samsung Galaxy and Google Pixel phones support eSIM. Here is how to check in 30 seconds.',
    href: '/faq#faq-plans-sim',
    keywords: ['student sim card', 'phone', 'supports', 'esim', 'help'],
  },
  {
    id: 'source-result-3',
    category: 'guides',
    featured: false,
    previewOnly: true,
    label: 'GUIDE',
    crumb: 'canadianplans.com › guides › esim-vs-sim',
    title: 'eSIM vs physical SIM: which should you get?',
    description:
      'An eSIM can be ordered from any country and installed by QR code. A physical SIM needs to be shipped or picked up.',
    href: '/guides/best-sim-for-students-from-india#esim',
    keywords: ['student sim card', 'esim', 'sim', 'physical', 'guide'],
  },
  {
    id: 'source-result-4',
    category: 'cities',
    featured: false,
    previewOnly: true,
    label: 'CITY',
    crumb: 'canadianplans.com › internet › vancouver',
    title: 'Home internet in Vancouver',
    description: 'Home internet for apartments and student housing, installed in about 3 days.',
    href: '/home-internet/vancouver',
    keywords: ['student sim card', 'internet', 'vancouver', 'housing'],
  },
];
export const accessibilityCopy = {
  eyebrow: 'ACCESSIBILITY',
  title: 'Accessibility at Canadian Plans',
  intro:
    'Our website should be easy for everyone to use. Here is what we do, what we are still working on, and how to reach us if something gets in your way.',
  reviewed: 'Last reviewed: October 2026',
  commitmentTitle: 'Our commitment',
  commitment:
    'We want everyone to be able to compare\nplans, order and get help on this website,\nincluding people who use screen readers,\nkeyboard navigation, magnification or voice\ncontrol. We aim to meet the Web Content\nAccessibility Guidelines (WCAG) 2.1, Level\nAA.',
  practicesTitle: 'What we do',
  practices: [
    'Every page works with a keyboard, with a visible focus outline.',
    'Text and buttons have strong colour contrast.',
    'Images have text descriptions, and forms have clear labels and error\nmessages.',
    'We write in plain English and explain any technical words.',
    'The site works when you zoom in up to 200%.',
  ],
  issuesTitle: 'Known issues',
  issues:
    'Some older PDF documents from carriers may not be fully accessible. If you need one in another format, ask us and we’ll send the information in a way that works for you.',
  waysTitle: 'Other ways to order',
  ways: 'You never have to use the website to get a plan. Order by phone or email, and an advisor will walk you through everything, at your pace.',
  caption: 'Advisor with a headset helping a customer by phone at the Surrey\noffice',
  imageLabel: 'IMAGE',
  contacts: [
    {
      title: 'Call us',
      description: '+1 778-682-3771',
      icon: 'call',
      href: 'tel:+17786823771',
    },
    {
      title: 'Email',
      description: 'info@canadianplans.com',
      icon: 'email',
      href: 'mailto:info@canadianplans.com',
    },
  ],
  problemTitle: 'Tell us about a problem',
  problem:
    'If something on this site is hard to use, please let us know. Tell us the page and what happened. We reply within 2 business days and fix issues as quickly as we can.',
  contactTitle: 'Report an accessibility problem',
  contactEmail: 'info@canadianplans.com',
  contactPhone: '+1 778-682-3771',
  contactButton: 'Email us',
} as const;
export const cookieCopy = {
  title: 'We use cookies',
  description:
    'Some cookies keep the site working. With your OK, we also use them to count visits and measure our ads. We never sell your data.',
  privacy: 'Read our Privacy Policy',
  accept: 'Accept all',
  reject: 'Reject non-essential',
  choose: 'Choose settings',
  settings: 'Cookie settings',
  close: 'Close cookie settings',
  cross: '×',
  intro:
    'Choose which cookies we can use. You can change this anytime from the link in the footer.',
  always: 'ALWAYS ON',
  save: 'Save my choices',
  saved: 'Cookie choices saved.',
  sessionSaved: 'Cookie choices apply for this visit. Browser storage is unavailable.',
  categories: [
    {
      id: 'essential',
      label: 'Essential',
      description:
        'Keeps the site secure and remembers your order form while you fill it in. These can’t be turned\noff.',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      description:
        'Helps us see which pages are useful so we can improve them. No personal details are shared.',
    },
    {
      id: 'marketing',
      label: 'Marketing',
      description: 'Lets us measure our ads on Google and Meta and show you relevant\noffers.',
    },
  ],
} as const;
export const systemAssets = {
  ...componentAssets,
  logo: {
    src: '/design/components/364-2163-imgMark.svg',
    width: 36,
    height: 36,
    nodeId: '306:17',
  } satisfies FigmaAsset,
  search: {
    src: '/design/legal/0-imgSearchIcon.svg',
    width: 18,
    height: 18,
    nodeId: '361:1004',
  } satisfies FigmaAsset,
  phone: {
    src: '/design/system/1-imgPhoneIcon.svg',
    width: 16,
    height: 16,
    nodeId: '364:2155',
  } satisfies FigmaAsset,
  signalDesktop: {
    src: '/design/system/0-imgFrame.svg',
    width: 56,
    height: 56,
    nodeId: '306:33',
  } satisfies FigmaAsset,
  signalMobile: {
    src: '/design/system/1-imgFrame1.svg',
    width: 44,
    height: 44,
    nodeId: '306:139',
  } satisfies FigmaAsset,
  searchBody: {
    src: '/design/system/0-imgFrame1.svg',
    width: 20,
    height: 20,
    nodeId: '306:39',
  } satisfies FigmaAsset,
  plane: {
    src: '/design/system/0-imgFrame2.svg',
    width: 22,
    height: 22,
    nodeId: '306:49',
  } satisfies FigmaAsset,
  mobile: {
    src: '/design/system/0-imgFrame3.svg',
    width: 22,
    height: 22,
    nodeId: '306:58',
  } satisfies FigmaAsset,
  wifi: {
    src: '/design/system/0-imgFrame4.svg',
    width: 22,
    height: 22,
    nodeId: '306:69',
  } satisfies FigmaAsset,
  pin: {
    src: '/design/system/0-imgFrame5.svg',
    width: 22,
    height: 22,
    nodeId: '306:78',
  } satisfies FigmaAsset,
  chat: {
    src: '/design/system/0-imgIcon.svg',
    width: 20,
    height: 20,
    nodeId: '359:1078',
  } satisfies FigmaAsset,
  check: {
    src: '/design/system/4-imgIcon.svg',
    width: 22,
    height: 26,
    nodeId: '359:1124',
  } satisfies FigmaAsset,
  call: {
    src: '/design/system/4-imgIcon1.svg',
    width: 22,
    height: 22,
    nodeId: '359:1152',
  } satisfies FigmaAsset,
  whatsapp: {
    src: '/design/system/4-imgIcon2.svg',
    width: 22,
    height: 22,
    nodeId: '359:1162',
  } satisfies FigmaAsset,
  email: {
    src: '/design/system/4-imgIcon3.svg',
    width: 22,
    height: 22,
    nodeId: '359:1172',
  } satisfies FigmaAsset,
  image: {
    src: '/design/components/312-2-imgIcon.svg',
    width: 32,
    height: 32,
    nodeId: 'I359:1180;312:3',
  } satisfies FigmaAsset,
  toggleOn: {
    src: '/design/system/8-imgToggleOn.svg',
    width: 48,
    height: 28,
    nodeId: '307:205',
  } satisfies FigmaAsset,
  toggleOff: {
    src: '/design/system/8-imgToggleOff.svg',
    width: 48,
    height: 28,
    nodeId: '307:212',
  } satisfies FigmaAsset,
};
