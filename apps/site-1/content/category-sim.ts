import type {
  FigmaAsset,
  FaqItemContent,
  PlanCardContent,
  TestimonialContent,
} from '@canadian-plans/ui/canadian-plans';
import {
  chromeContent,
  footerContent,
  componentAssets,
  type ChromeContent,
  type FooterContent,
} from './components';

export type CategoryPageKey = 'students' | 'india';

export interface CategoryPlan extends PlanCardContent {
  readonly previewOnly: true;
  readonly goodForLabel: string;
}

export interface CategorySimPageContent {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly pageLabel: string;
  readonly breadcrumb: readonly { readonly label: string; readonly href?: string }[];
  readonly hero: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly primary: string;
    readonly secondary: string;
    readonly originName: string;
    readonly passenger: string;
    readonly price: string;
    readonly priceDetails: string;
    readonly retailPrice: string;
    readonly retailPriceContext: string;
    readonly features: readonly string[];
    readonly boardingPass: {
      readonly title: string;
      readonly brand: string;
      readonly tag: string;
      readonly from: string;
      readonly fromCode: string;
      readonly to: string;
      readonly toCode: string;
      readonly fromLabel: string;
      readonly toLabel: string;
      readonly passengerLabel: string;
      readonly planLabel: string;
      readonly planValue: string;
      readonly numberLabel: string;
      readonly numberValue: string;
      readonly statusLabel: string;
      readonly statusValue: string;
    };
  };
  readonly meta: {
    readonly title: string;
    readonly author: string;
    readonly authorDetail: string;
    readonly reviewer: string;
    readonly reviewerDetail: string;
    readonly updated: string;
    readonly readingTime: string;
    readonly pageLinks: readonly { readonly label: string; readonly href: string }[];
  };
  readonly quickAnswer: { readonly question: string; readonly answer: string };
  readonly skip: string;
  readonly imageLabel: string;
  readonly ui: typeof categorySimUi;
  readonly quickAnswerLabel: string;
  readonly priceSuffix: string;
  readonly sourceNote: string;
  readonly countryFacts?: readonly {
    readonly label: string;
    readonly value: string;
    readonly detail: string;
  }[];
  readonly countryFactsNote?: string;
  readonly countdown: {
    readonly eyebrow: string;
    readonly title: string;
    readonly caption: string;
    readonly steps: readonly {
      readonly number: string;
      readonly timing: string;
      readonly title: string;
      readonly description: string;
      readonly tone: 'mint' | 'sky' | 'lemon' | 'pink';
    }[];
  };
  readonly plans: {
    readonly title: string;
    readonly description: string;
    readonly priceNote: string;
    readonly popularLabel: string;
    readonly chooseLabel: string;
    readonly selectedLabel: string;
    readonly stickyTitle: string;
    readonly stickyButton: string;
    readonly stickyDetail: string;
    readonly screenReaderLabel: string;
    readonly items: readonly CategoryPlan[];
  };
  readonly requirements: {
    readonly title: string;
    readonly items: readonly { readonly title: string; readonly description: string }[];
    readonly esimTitle: string;
    readonly esimDescription: string;
    readonly iPhone: string;
    readonly android: string;
    readonly unsure: string;
    readonly imageCaption: string;
  };
  readonly callingIndia?: {
    readonly title: string;
    readonly description: string;
    readonly imageCaption: string;
    readonly options: readonly {
      readonly title: string;
      readonly description: string;
      readonly label: string;
    }[];
    readonly keepTitle: string;
    readonly keepDescription: string;
    readonly keepTips: readonly string[];
  };
  readonly guide: {
    readonly eyebrow: string;
    readonly title: string;
    readonly questions: readonly { readonly question: string; readonly answer: string }[];
    readonly factsTitle: string;
    readonly facts: readonly { readonly label: string; readonly value: string }[];
    readonly imageCaption: string;
    readonly imageTone?: 'light' | 'on-blue';
  };
  readonly reviews: {
    readonly eyebrow: string;
    readonly title: readonly string[];
    readonly score: string;
    readonly stars: string;
    readonly count: string;
    readonly items: readonly TestimonialContent[];
  };
  readonly faq: {
    readonly title: readonly string[];
    readonly description: string;
    readonly advisor: string;
    readonly openByDefault: readonly string[];
    readonly dialogTitle: string;
    readonly dialogDescription: string;
    readonly dialogClose: string;
    readonly items: readonly FaqItemContent[];
  };
  readonly explore: {
    readonly title: string;
    readonly groups: readonly {
      readonly title: string;
      readonly links: readonly { readonly label: string; readonly href: string }[];
    }[];
    readonly sourceNote: string;
  };
  readonly final: {
    readonly title: string;
    readonly description: string;
    readonly primary: string;
    readonly secondary: string;
  };
}

const basePlans: readonly CategoryPlan[] = [
  {
    id: 'preview-fido-essential',
    previewOnly: true,
    carrier: 'Fido · Essential',
    allowance: '75 GB',
    amount: '$35',
    period: '/mo + tax',
    originalPrice: '$60',
    finePrint: 'in stores',
    goodForLabel: 'Good for',
    goodFor: 'Everyday use at a lower monthly cost',
    features: ['Unlimited Canada talk & text', '1,000 international minutes · eSIM'],
    buttonLabel: 'Choose this plan',
    selectedLabel: 'Selected',
  },
  {
    id: 'preview-rogers-plus',
    previewOnly: true,
    carrier: 'Rogers · Plus',
    allowance: '100 GB',
    badge: 'Most popular',
    amount: '$40',
    period: '/mo + tax',
    originalPrice: '$80',
    finePrint: 'in stores',
    goodForLabel: 'Good for',
    goodFor: 'Streaming and video calls home',
    features: ['Unlimited Canada talk & text', '1,000 international minutes · 5G'],
    buttonLabel: 'Choose this plan',
    selectedLabel: 'Selected',
  },
  {
    id: 'preview-rogers-unlimited',
    previewOnly: true,
    carrier: 'Rogers · Unlimited',
    allowance: '120 GB',
    amount: '$50',
    period: '/mo + tax',
    finePrint: '',
    goodForLabel: 'Good for',
    goodFor: 'Heavy data and trips to the USA',
    features: ['Unlimited Canada–US talk & text', 'USA roaming · 1,000 international minutes'],
    buttonLabel: 'Choose this plan',
    selectedLabel: 'Selected',
  },
];

const reviews: readonly TestimonialContent[] = [
  {
    id: 'aarav',
    stars: '★★★★★',
    ratingLabel: 'Five out of five stars',
    quote:
      '“Had my Canadian number two weeks before my flight. Used it to open my bank account online. Landed at Pearson and it just worked.”',
    name: 'Aarav S.',
    detail: 'Student · Delhi → Toronto',
    avatar: componentAssets.aarav,
  },
  {
    id: 'maria',
    stars: '★★★★★',
    ratingLabel: 'Five out of five stars',
    quote:
      '“The advisor called back the same day and stayed on the line while I set up the eSIM on my phone.”',
    name: 'Maria L.',
    detail: 'Student · Manila → Toronto',
    avatar: componentAssets.maria,
  },
  {
    id: 'tanvir',
    stars: '★★★★★',
    ratingLabel: 'Five out of five stars',
    quote:
      '“Clear prices, no surprises on the first bill. The advisor explained Fido vs Rogers in plain words.”',
    name: 'Tanvir H.',
    detail: 'Newcomer · Dhaka → Calgary',
    avatar: componentAssets.tanvir,
  },
];

const sharedSteps = [
  {
    number: '1',
    timing: '3 weeks before',
    title: 'Order your eSIM',
    description: '2 minutes online from any country. No payment.',
    tone: 'mint',
  },
  {
    number: '2',
    timing: '2 weeks before',
    title: 'Get your number',
    description:
      'We confirm on WhatsApp and assign your Canadian number — use it on bank and college forms.',
    tone: 'sky',
  },
  {
    number: '3',
    timing: 'Before you fly',
    title: 'Install at home',
    description: 'Scan the QR code on WiFi. It stays off until you land.',
    tone: 'lemon',
  },
  {
    number: '4',
    timing: 'Day 1',
    title: 'Land & switch on',
    description: 'Online at arrivals — message family before baggage claim.',
    tone: 'pink',
  },
] as const;

const studentItems = [
  { title: 'Passport', description: 'Photo page, name matching your permit.' },
  { title: 'Study permit or letter of introduction', description: 'A clear photo or PDF.' },
  { title: 'Arrival date & city', description: 'So your plan starts the day you land.' },
  { title: 'Email address', description: 'We send your eSIM QR code here.' },
] as const;
const indiaItems = [
  { title: 'Indian passport', description: 'Photo page, name matching your permit.' },
  { title: 'Study/work permit, visa or COPR', description: 'A clear photo or PDF.' },
  { title: 'Arrival date & city', description: 'So your plan starts the day you land.' },
  { title: 'Email address', description: 'We send your eSIM QR code here.' },
] as const;

const pageLinks = (label: string, names: readonly string[]) =>
  names.map((name) => ({
    label: name,
    href:
      name === 'Plans'
        ? '#plans'
        : name === 'FAQ'
          ? '#faq'
          : name === 'Calling India'
            ? '#calling-india'
            : name === 'Countdown'
              ? '#countdown'
              : name === 'Documents'
                ? '#documents'
                : '#guide',
  }));

const studentFaq: readonly FaqItemContent[] = [
  {
    id: 'student-0',
    question: 'Can I order before I get my study permit?',
    answer:
      'Yes. Order with your passport and letter of introduction; we activate once you land with your permit.',
  },
  {
    id: 'student-1',
    question: 'Is there a student discount?',
    answer: 'This answer is awaiting approved content. Ask an advisor to confirm current offers.',
  },
  {
    id: 'student-2',
    question: 'How do I know if my phone supports eSIM?',
    answer:
      'Check your phone settings for an EID or an Add eSIM option. Device compatibility should be confirmed before ordering.',
  },
  {
    id: 'student-3',
    question: 'What if my flight changes?',
    answer:
      'This answer is awaiting approved content. Ask an advisor about your dates before ordering.',
  },
  {
    id: 'student-4',
    question: 'Can my parents pay for my plan?',
    answer: 'This answer is awaiting approved content. Ask an advisor about payment options.',
  },
  {
    id: 'student-5',
    question: 'When do I pay for my plan?',
    answer:
      'Nothing today. Once your number is active, your first bill comes from Rogers or Fido. An advisor walks you through the date before anything is billed.',
  },
];
const indiaFaq: readonly FaqItemContent[] = [
  {
    id: 'india-0',
    question: 'Can I buy a Canadian SIM card in India?',
    answer:
      'Yes — as an eSIM. Order online from India, confirm on WhatsApp, and email your eSIM QR code. There is nothing to pay online; your plan starts when you land.',
  },
  {
    id: 'india-1',
    question: 'Will my Indian phone work in Canada?',
    answer:
      'It will if your phone is unlocked and supports eSIM. Check the phone settings or confirm the model before ordering.',
  },
  {
    id: 'india-2',
    question: 'Can my parents in India order for me?',
    answer:
      'This answer is awaiting approved content. Ask an advisor to confirm the details for your situation.',
  },
  {
    id: 'india-3',
    question: 'Should I keep my Indian SIM active?',
    answer:
      'Keep it for one-time codes from your bank and other services. Use a dual-SIM phone and check your carrier’s roaming settings.',
  },
  {
    id: 'india-4',
    question: 'Can I get a number before my visa is approved?',
    answer:
      'This answer is awaiting approved content. Ask an advisor to confirm what documents are needed.',
  },
  {
    id: 'india-5',
    question: 'Do you offer support in Hindi or Punjabi?',
    answer:
      'This answer is awaiting approved content. Ask an advisor which languages are available.',
  },
];

const categorySimUi = {
  breadcrumbLabel: 'Breadcrumb',
  breadcrumbSeparator: '/',
  priceCircleLabel: 'Student plans',
  priceCircleAmount: '$35',
  priceDetails: '+ tax',
  retailPrice: '$60',
  retailPriceContext: 'in stores',
  passStub: 'Order 1–3 weeks before departure. Your number works for forms right away.',
  routeFromLabel: 'From',
  routeToLabel: 'To',
  routeArrow: '– → –',
  countryFactsLabel: 'Plan details for India',
  phoneLabels: ['iPhone', 'Samsung / Android', 'Not sure?'] as const,
  reviewSectionLabel: 'Customer reviews',
  starRatingLabel: 'Five out of five stars',
  faqEyebrow: 'FAQ',
  faqExpand: '+',
  faqCollapse: '−',
  exploreArrow: '→',
};

const commonPlanCopy = {
  description: 'Every plan is an eSIM with no upfront payment, and it works the minute you land.',
  priceNote: 'Prices as of Oct 2026 · CAD, taxes extra',
  chooseLabel: 'Choose this plan',
  selectedLabel: 'Selected',
  stickyTitle: 'Your selected plan',
  stickyButton: 'Continue to step 2 →',
  stickyDetail: '$0 due today · preview only',
  screenReaderLabel: 'Choose a preview plan',
};

export const categorySimPages: Readonly<Record<CategoryPageKey, CategorySimPageContent>> = {
  students: {
    path: '/pre-arrival-sim/students',
    quickAnswerLabel: 'Quick answer',
    title: 'Student SIM & eSIM for Canada | Canadian Plans',
    description:
      'Get a Canadian number before your first class. Compare student eSIM plans and learn what to prepare before you arrive.',
    pageLabel: 'Students',
    breadcrumb: [
      { label: 'Home', href: '/' },
      { label: 'Pre-arrival SIM', href: '/pre-arrival-sim' },
      { label: 'Students' },
    ],
    hero: {
      eyebrow: 'Pre-arrival eSIM · For international students',
      title: 'Your Canadian number before your first class.',
      description:
        'Order your eSIM from home, get your Canadian number right away, and switch it on when you land. Rogers, Fido and Chatr plans from an authorized dealer, with no Canadian credit history needed.',
      primary: 'See student plans ↓',
      secondary: 'Is my phone eSIM-ready?',
      originName: 'New Delhi',
      passenger: 'International student',
      price: 'From $35/mo',
      priceDetails: '+ tax',
      retailPrice: '$60',
      retailPriceContext: 'in stores',
      features: ['Order from any country', 'No credit check', '$0 until we call'],
      boardingPass: {
        title: 'Canadian Plans pre-arrival pass',
        brand: 'Canadian Plans',
        tag: 'Pre-arrival pass',
        from: 'New Delhi',
        fromCode: 'DEL',
        to: 'Toronto',
        toCode: 'YYZ',
        fromLabel: 'From',
        toLabel: 'To',
        passengerLabel: 'Passenger',
        planLabel: 'Plan',
        planValue: 'Fido 75 GB · eSIM',
        numberLabel: 'Canadian number',
        numberValue: '+1 (604) ··· ··42',
        statusLabel: 'Status',
        statusValue: 'Ready before you fly',
      },
    },
    skip: 'Skip to main content',
    imageLabel: 'IMAGE',
    ui: { ...categorySimUi, priceCircleLabel: 'Student plans' },
    priceSuffix: '/mo · CAD',
    sourceNote:
      'Sources: Rogers, Fido and Chatr plan pages, checked 5 Oct 2026. Prices change often — see plans for today’s details.',
    meta: {
      title: 'On this page:',
      author: 'Ananya R.',
      authorDetail: 'Written by · student, Pune → Toronto',
      reviewer: 'Priya',
      reviewerDetail: 'Reviewed by · plan advisor',
      updated: 'Updated 5 Oct 2026',
      readingTime: '6 min read',
      pageLinks: pageLinks('Students', ['Countdown', 'Plans', 'Documents', 'Student guide', 'FAQ']),
    },
    quickAnswer: {
      question: 'What is the best SIM for international students in Canada?',
      answer:
        'Most international students do well with 75 to 100 GB a month on an eSIM. Order it 1 to 3 weeks before your flight, from any country, and your Canadian number is ready for bank and college forms before you land. Plans start at $35 a month (CAD, plus tax), and you don’t need a Canadian credit history.',
    },
    countdown: {
      eyebrow: 'Your countdown to Canada',
      title: 'From your home to your first class.',
      caption: 'Student checking her new Canadian number at the Toronto Pearson arrivals hall',
      steps: sharedSteps,
    },
    plans: {
      ...commonPlanCopy,
      title: 'Pick your student plan',
      popularLabel: 'Most popular',
      items: basePlans,
    },
    requirements: {
      title: 'What you’ll need',
      items: studentItems,
      esimTitle: 'Is my phone eSIM-ready?',
      esimDescription: 'Your phone must be unlocked and support eSIM. Check in 30 seconds:',
      iPhone: 'Settings → General → About → look for “EID” or “Digital SIM”.',
      android: 'Settings → Connections → SIM manager → look for “Add eSIM”.',
      unsure: 'Send us your phone model on WhatsApp — we’ll check for you.',
      imageCaption: 'Close-up of a phone on the Settings > Add eSIM screen, held over a desk',
    },
    guide: {
      eyebrow: 'Student guide',
      title: 'Student eSIM in Canada: the complete guide',
      questions: [
        {
          question: 'How much data do international students need?',
          answer:
            'Campus WiFi covers most classes and libraries, so many students get by on 15–30 GB a month. Our plans start at 75 GB, so you have room for daily video calls home and streaming on the bus. You can change plans after the first month.',
        },
        {
          question: 'Prepaid or postpaid as a student?',
          answer:
            'Postpaid plans bought in a Canadian store usually need a credit check or a deposit. Our pre-arrival plans are postpaid but skip that: no Canadian credit history needed and nothing to pay upfront. Prepaid also works from day one if you’d rather top up each month.',
        },
        {
          question: 'Which carrier works best on campus?',
          answer:
            'Rogers, Fido and Chatr all run on the Rogers network, so coverage on campus is the same. The difference is price and perks: Chatr is cheapest, Fido is best value, Rogers adds 5G+ and US roaming.',
        },
      ],
      factsTitle: 'Key facts',
      facts: [
        { label: 'Price range', value: '$35–$50/mo · CAD + tax' },
        { label: 'Credit check', value: 'None needed' },
        { label: 'When to order', value: '1–3 weeks before your flight' },
        { label: 'How you get it', value: 'eSIM by email, any country' },
        { label: 'Plan starts', value: 'When you land' },
        { label: 'Networks', value: 'Rogers · Fido · Chatr' },
      ],
      imageCaption:
        'International student on a video call home at a campus library table, laptop open',
    },
    reviews: {
      eyebrow: 'REVIEWS',
      title: ['Newcomers', 'recommend us.'],
      score: '4.8',
      stars: '★★★★★',
      count: '1,200+ Google reviews',
      items: reviews,
    },
    faq: {
      title: ['Student SIM', 'questions'],
      description: 'Talk to an advisor, Monday to Saturday, 9am–9pm Pacific time.',
      advisor: 'WhatsApp us',
      openByDefault: ['student-0', 'student-5'],
      dialogTitle: 'Talk to an advisor',
      dialogDescription: 'This is a design preview. No message or callback request has been sent.',
      dialogClose: 'Close preview',
      items: studentFaq,
    },
    explore: {
      title: 'Explore more',
      groups: [
        {
          title: 'Other audiences',
          links: ['Workers', 'Permanent residents', 'Visitors'].map((label) => ({
            label,
            href: '#plans',
          })),
        },
        {
          title: 'Popular countries',
          links: ['India', 'Bangladesh', 'Philippines', 'Nigeria', 'Pakistan', 'Nepal'].map(
            (label) => ({
              label,
              href: label === 'India' ? '/pre-arrival-sim/from-india' : '#plans',
            }),
          ),
        },
        {
          title: 'Student guides',
          links: [
            'Best SIM for students from India',
            'Is my phone eSIM-ready?',
            'First-week checklist',
          ].map((label) => ({
            label,
            href: label.includes('India') ? '/pre-arrival-sim/from-india' : '#documents',
          })),
        },
      ],
      sourceNote:
        'Sources: Rogers, Fido and Chatr plan pages, checked 5 Oct 2026. Prices change often — see plans for today’s details.',
    },
    final: {
      title: 'Your number, ready before your first class.',
      description:
        'Choose a plan in 2 minutes and pay nothing today. An advisor confirms it the same day.',
      primary: 'See student plans →',
      secondary: 'Talk to an advisor',
    },
  },
  india: {
    path: '/pre-arrival-sim/from-india',
    quickAnswerLabel: 'Quick answer',
    title: 'Canadian SIM for Indians moving to Canada | Canadian Plans',
    description:
      'Order a Canadian eSIM from India before your flight. Compare plans, keep your Indian number for OTPs and prepare for your first week in Canada.',
    pageLabel: 'From India',
    breadcrumb: [
      { label: 'Home', href: '/' },
      { label: 'Pre-arrival SIM', href: '/pre-arrival-sim' },
      { label: 'From India' },
    ],
    hero: {
      eyebrow: 'Pre-arrival eSIM · Moving from India',
      title: 'Canadian SIM for Indians moving to Canada (2026)',
      description:
        'Get your Canadian number while you’re still in India, ready for your bank, college or job forms. Rogers, Fido and Chatr eSIM plans from an authorized dealer. No Canadian credit history needed, nothing paid online.',
      primary: 'See plans for India ↓',
      secondary: 'Is my phone eSIM-ready?',
      originName: 'New Delhi',
      passenger: 'Newcomer from India',
      price: 'From $35/mo',
      priceDetails: '+ tax',
      retailPrice: '$60',
      retailPriceContext: 'in stores',
      features: ['Order from India', 'No credit check', '$0 until we call'],
      boardingPass: {
        title: 'Canadian Plans pre-arrival pass',
        brand: 'Canadian Plans',
        tag: 'Pre-arrival pass',
        from: 'New Delhi',
        fromCode: 'DEL',
        to: 'Toronto',
        toCode: 'YYZ',
        fromLabel: 'From',
        toLabel: 'To',
        passengerLabel: 'Passenger',
        planLabel: 'Plan',
        planValue: 'Rogers 100 GB · eSIM',
        numberLabel: 'Canadian number',
        numberValue: '+1 (604) ··· ··42',
        statusLabel: 'Status',
        statusValue: 'Ready before you fly',
      },
    },
    skip: 'Skip to main content',
    imageLabel: 'IMAGE',
    ui: { ...categorySimUi, priceCircleLabel: 'Plans from' },
    priceSuffix: '/mo · CAD',
    sourceNote:
      'Sources: Rogers, Fido and Chatr plan pages, checked 5 Oct 2026. Prices change often — see plans for today’s details.',
    meta: {
      title: 'On this page:',
      author: 'Ananya R.',
      authorDetail: 'Written by · student, Pune → Toronto',
      reviewer: 'Priya',
      reviewerDetail: 'Reviewed by · plan advisor',
      updated: 'Updated 5 Oct 2026',
      readingTime: '7 min read',
      pageLinks: pageLinks('India', ['Countdown', 'Plans', 'Calling India', 'India guide', 'FAQ']),
    },
    quickAnswer: {
      question: 'How do I get a Canadian SIM card in India?',
      answer:
        'Order a Canadian eSIM online from India 1–3 weeks before your flight. We confirm on WhatsApp, assign your Canadian number right away, and email your eSIM QR code — install it at home and it switches on when you land. Plans from $35/mo (CAD, taxes extra), no Canadian credit history needed.',
    },
    countryFacts: [
      { label: 'How to order', value: 'Online, 2 min', detail: 'No payment online' },
      { label: 'eSIM delivery', value: 'Minutes', detail: 'By email, install at home' },
      { label: 'Support in IST', value: '9:30pm–9:30am', detail: 'Mon–Sat (9am–9pm PT)*' },
      { label: 'Most chosen', value: 'Rogers 100 GB', detail: '$40/mo · CAD' },
    ],
    countryFactsNote:
      '*IST times shown for Pacific Daylight Time; they shift by one hour when clocks change in November.',
    countdown: {
      eyebrow: 'Your countdown to Canada',
      title: 'From India to your first week in Canada.',
      caption:
        'Newcomer from India at Toronto Pearson arrivals, phone in hand next to a luggage trolley',
      steps: sharedSteps,
    },
    plans: {
      ...commonPlanCopy,
      title: 'Plans newcomers from India choose',
      popularLabel: 'Most popular from India',
      items: basePlans,
    },
    requirements: {
      title: 'What you’ll need',
      items: indiaItems,
      esimTitle: 'Is my phone eSIM-ready?',
      esimDescription: 'Your phone must be unlocked and support eSIM. Check in 30 seconds:',
      iPhone: 'Settings → General → About → look for “EID” or “Digital SIM”.',
      android: 'Settings → Connections → SIM manager → look for “Add eSIM”.',
      unsure: 'Send us your phone model on WhatsApp — we’ll check for you.',
      imageCaption: 'Close-up of a phone on the Settings > Add eSIM screen, held over a desk',
    },
    callingIndia: {
      title: 'Calling India from Canada',
      description: 'Three ways to stay in touch with family — from free to fully unlimited.',
      imageCaption:
        'Student on a WhatsApp video call with parents in India, phone propped on a desk',
      options: [
        {
          title: 'WhatsApp & video calls',
          description: 'Free over WiFi or your data. Most families use this every day.',
          label: 'Free',
        },
        {
          title: 'International calling add-on',
          description: 'Unlimited calls to India on top of your plan.',
          label: 'Paid add-on',
        },
        {
          title: 'Pay per minute',
          description: 'Good if you only call landlines now and then.',
          label: 'Per minute',
        },
      ],
      keepTitle: 'Keep your Indian number',
      keepDescription:
        'Indian banks, UPI and Aadhaar still send one-time codes to your Indian number. Keep it on a low-cost plan.',
      keepTips: [
        'Use a dual-SIM phone: Indian SIM + Canadian eSIM',
        'Turn off roaming on the Indian SIM to avoid charges',
        'Receive OTPs on WiFi calling where your Indian carrier supports it.',
      ],
    },
    guide: {
      eyebrow: 'India guide',
      title: 'Moving from India: your Canadian phone setup',
      questions: [
        {
          question: 'Will my Indian phone work with a Canadian eSIM?',
          answer:
            'Yes, if it is unlocked and supports eSIM. Most recent iPhones and many Samsung and Pixel phones do. Phones bought on an Indian carrier contract may be locked — check before you order.',
        },
        {
          question: 'Should I keep my Indian SIM?',
          answer:
            'Yes, for at least the first few months. Banks, UPI and government services send one-time codes to it. A dual-SIM phone lets you keep both numbers active.',
        },
        {
          question: 'How do I call India cheaply from Canada?',
          answer:
            'WhatsApp calls are free on WiFi or data. If your family uses landlines, add an international calling add-on to your Canadian plan.',
        },
      ],
      factsTitle: 'Key facts',
      facts: [
        { label: 'Price range', value: '$35–$50/mo · CAD + tax' },
        { label: 'Credit check', value: 'None needed' },
        { label: 'When to order', value: '1–3 weeks before your flight' },
        { label: 'How you get it', value: 'eSIM by email — order from India' },
        { label: 'Support in IST', value: '9:30pm–9:30am, Mon–Sat' },
        { label: 'Networks', value: 'Rogers · Fido · Chatr' },
      ],
      imageCaption:
        'Phone settings screen showing an Indian SIM and a Canadian eSIM, both switched on',
    },
    reviews: {
      eyebrow: 'REVIEWS',
      title: ['Newcomers', 'recommend us.'],
      score: '4.8',
      stars: '★★★★★',
      count: '1,200+ Google reviews',
      items: reviews,
    },
    faq: {
      title: ['India to', 'Canada SIM questions'],
      description: 'Talk to an advisor, Monday to Saturday, 9am–9pm Pacific time.',
      advisor: 'WhatsApp us',
      openByDefault: ['india-0'],
      dialogTitle: 'Talk to an advisor',
      dialogDescription: 'This is a design preview. No message or callback request has been sent.',
      dialogClose: 'Close preview',
      items: indiaFaq,
    },
    explore: {
      title: 'Explore more',
      groups: [
        {
          title: 'By residence',
          links: ['Students', 'Workers', 'Permanent residents', 'Visitors'].map((label) => ({
            label,
            href: label === 'Students' ? '/pre-arrival-sim/students' : '#plans',
          })),
        },
        {
          title: 'Popular countries',
          links: ['Bangladesh', 'Philippines', 'Nigeria', 'Pakistan', 'Nepal', 'Sri Lanka'].map(
            (label) => ({ label, href: '#plans' }),
          ),
        },
        {
          title: 'India guides',
          links: [
            'Best SIM for students from India',
            'Calling India from Canada',
            'First-week checklist',
          ].map((label) => ({
            label,
            href: label.includes('students') ? '/pre-arrival-sim/students' : '#calling-india',
          })),
        },
      ],
      sourceNote:
        'Sources: Rogers, Fido and Chatr plan pages, checked 5 Oct 2026. Prices change often — see plans for today’s details.',
    },
    final: {
      title: 'From India to online in Canada.',
      description:
        'Choose a plan in 2 minutes and pay nothing today. An advisor confirms it the same day.',
      primary: 'See plans for India →',
      secondary: 'Talk to an advisor',
    },
  },
};

export const categorySimChrome: ChromeContent = {
  ...chromeContent,
  phone: { ...chromeContent.phone, href: '#contact' },
  track: { ...chromeContent.track, href: '/track' },
  contact: { ...chromeContent.contact, href: '#contact' },
  help: { ...chromeContent.help, href: '#faq' },
  navigationLabel: 'Main navigation',
  mobileNavigationLabel: 'Canadian Plans menu',
  navigation: [
    { label: 'Pre-arrival SIM', href: '/pre-arrival-sim' },
    { label: 'Home Internet', href: '/#internet' },
    { label: 'Mobile Plans', href: '/plans' },
    { label: 'Guides', href: '/guides' },
  ],
  promo:
    'Order your Canadian eSIM before you fly. It works from any country and is ready in minutes.',
  promoLink: { label: 'See SIM plans', href: '#plans' },
  promoMobileLabel: 'See SIM plans →',
};

export const categorySimFooter: FooterContent = {
  ...footerContent,
  legalLabel: 'Legal links',
  legal: footerContent.legal.map((item) => ({
    ...item,
    href: item.label === 'Privacy' ? '/privacy' : item.label === 'Terms' ? '/terms' : '#contact',
  })),
};

export const categorySimAssets = {
  ...componentAssets,
  logo: { src: '/design/components/60-13-imgMark.svg', width: 36, height: 36, nodeId: '60:16' },
  footerLogo: {
    src: '/design/components/68-50-imgFrame.svg',
    width: 36,
    height: 36,
    nodeId: '68:54',
  },
  phone: {
    src: '/design/pre-arrival/364-2201-imgPhoneIcon.svg',
    width: 16,
    height: 16,
    nodeId: '364:2201',
  },
  chat: {
    src: '/design/pre-arrival/364-2211-imgIcon.svg',
    width: 22,
    height: 22,
    nodeId: '364:2211',
  },
  menu: {
    src: '/design/pre-arrival/364-2211-imgIcon1.svg',
    width: 24,
    height: 24,
    nodeId: '364:2211-menu',
  },
  search: componentAssets.search,
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
  passPerforation: {
    src: '/design/category-sim/students-desktop-imgEllipse1.svg',
    width: 28,
    height: 28,
    nodeId: '151:88',
  },
  authorAvatar: {
    src: '/design/category-sim/students-desktop-imgEllipse2.svg',
    width: 36,
    height: 36,
    nodeId: '151:128',
  },
  reviewerAvatar: {
    src: '/design/category-sim/students-desktop-imgEllipse3.svg',
    width: 36,
    height: 36,
    nodeId: '151:133',
  },
} satisfies Record<string, FigmaAsset>;
