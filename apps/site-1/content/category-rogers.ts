import type { FaqItemContent, FigmaAsset } from '@canadian-plans/ui/canadian-plans';
import { categorySimChrome } from './category-sim';

export const categoryRogers = {
  previewOnly: true,
  path: '/mobile-plans/rogers',
  title: 'Rogers mobile plans for newcomers | Canadian Plans',
  description:
    'Compare Rogers 5G+ plans, Canada–US options, prices and setup details in plain words.',
  previewNotice:
    'Design preview · Plan names, prices, coverage claims, reviews and contact details are illustrative fixtures pending owner approval.',
  promo: 'Switching to Rogers? Keep your number — we handle the transfer.',
  promoAction: 'How switching works',
  promoMobileAction: 'How switching works →',
  breadcrumb: ['Home', 'Mobile Plans', 'Rogers'],
  eyebrow: 'Mobile plans · Rogers',
  headline: 'Rogers plans, explained in plain words.',
  intro:
    'Premium 5G+ plans with Canada–US options. Compare every Rogers plan we offer with exact prices — and a real person to set it up.',
  from: '$45/mo',
  primaryAction: 'See Rogers plans  ↓',
  compareAction: 'Compare with Fido & Chatr',
  benefits: ['Keep your number', 'Canada–US plans', '$0 until we call'],
  specTitle: 'Spec sheet',
  specs: [
    ['Network', 'Rogers · 5G+'],
    ['How you pay', 'Postpaid'],
    ['Credit check', 'Yes, or a deposit'],
    ['US & travel', 'Canada–US plans available'],
    ['Builds credit', 'Yes'],
    ['Plans with us', 'From $45/mo · CAD + tax'],
  ],
  byline: {
    author: 'Marco D.',
    authorNote: 'Written by · switched carriers 3 times since 2019',
    reviewer: 'Priya',
    reviewerNote: 'Reviewed by · plan advisor',
    updated: 'Updated 5 Oct 2026 · 8 min read',
  },
  tocLabel: 'On this page:',
  toc: ['At a glance', 'Plans', 'Pros & cons', 'Rogers vs Fido vs Chatr', 'FAQ'],
  quick: {
    eyebrow: 'Quick answer',
    title: 'Is Rogers worth it for newcomers?',
    body: 'Rogers is the premium choice: 5G+ speeds, Canada–US talk and text, and postpaid plans that help build Canadian credit. If price matters most, Fido or Chatr use the same network for less. Rogers plans with us start at $45/mo (CAD, taxes extra).',
    action: 'Read our rating method →',
  },
  glance: {
    title: 'Rogers at a glance',
    score: '4.2',
    scoreLabel: '/ 5',
    note: 'Our editorial rating for newcomers. Not paid by any carrier.',
    action: 'How we rate →',
    ratings: [
      ['Network speed', '5G+ priority in most cities', 5],
      ['Travel & US', 'Canada–US plans available', 5],
      ['Perks', 'Streaming add-ons, family plans', 4],
      ['Value for money', 'Higher price than Fido or Chatr', 3],
      ['Newcomer-friendly', 'Credit check or deposit needed', 3],
    ],
  },
  plans: {
    title: 'Every Rogers plan we offer',
    sort: 'Sort by',
    options: ['Price', 'Data'],
    headers: ['Plan', 'Data', 'Talk & text', 'Network', 'US use', 'Price'],
    footnote:
      'PLACEHOLDER plan names and prices · CAD, taxes extra · Prices as of Oct 2026. Replace with current Rogers offers before publishing.',
    choose: 'Choose plan',
    selected: 'Selected preview',
    popularLabel: 'Most popular',
    items: [
      {
        id: 'essentials',
        name: 'Rogers Essentials',
        data: 50,
        dataLabel: '50 GB',
        talk: 'Unlimited Canada',
        network: '5G',
        us: 'Add-on',
        price: 45,
        priceLabel: '$45/mo',
      },
      {
        id: 'popular',
        name: 'Rogers Popular',
        data: 75,
        dataLabel: '75 GB',
        talk: 'Unlimited Canada–US',
        network: '5G+',
        us: 'Included',
        price: 50,
        priceLabel: '$50/mo',
        badge: 'Most popular',
      },
      {
        id: 'plus',
        name: 'Rogers Plus',
        data: 100,
        dataLabel: '100 GB',
        talk: 'Unlimited Canada–US',
        network: '5G+',
        us: 'Included',
        price: 55,
        priceLabel: '$55/mo',
      },
      {
        id: 'ultimate',
        name: 'Rogers Ultimate',
        data: 150,
        dataLabel: '150 GB',
        talk: 'Unlimited Canada–US',
        network: '5G+',
        us: 'Included',
        price: 75,
        priceLabel: '$75/mo',
      },
    ],
  },
  pros: {
    title: 'What we like',
    items: [
      'Fastest 5G+ speeds in most cities',
      'Canada–US talk, text and data on many plans',
      'Postpaid helps build Canadian credit',
      'Family and multi-line savings',
    ],
  },
  cons: {
    title: 'Watch out for',
    items: [
      'Higher monthly price than Fido or Chatr',
      'Credit check or deposit for newcomers',
      'Phone financing can mean a 24-month commitment',
      'Some perks only on top plans',
    ],
  },
  comparison: {
    title: 'Rogers vs Fido vs Chatr',
    description: 'All three run on the Rogers network. Here is how they differ for newcomers.',
    headings: ['Feature', 'Rogers', 'Fido', 'Chatr'],
    rows: [
      ['Best for', 'Speed & travel', 'Best value', 'Lowest price'],
      ['Pay', 'Postpaid', 'Prepaid or postpaid', 'Prepaid'],
      ['Credit check', 'Yes / deposit', 'Postpaid only', 'No'],
      ['5G', '5G+', '5G', 'VERIFY'],
      ['US use', 'Canada–US plans', 'Add-ons', 'Add-ons'],
      ['Plans from', '$45/mo', '$45/mo', '$29/mo'],
    ],
    active: 'You’re here',
    brandLinks: ['See Fido plans →', 'See Chatr plans →'],
  },
  steps: {
    title: 'Switch to Rogers in 4 steps — keep your number',
    imageCaption: "Advisor at our Surrey counter moving a customer's number onto a new Rogers SIM",
    items: [
      ['1', 'Keep your old plan active', 'Cancelling first can release your number.'],
      ['2', 'Send us your account number & PIN', 'From your current carrier’s bill or app.'],
      ['3', 'We transfer your number', 'Usually the same day.* (VERIFY)'],
      ['4', 'Switch on', 'Unlocked phone? You’re done. Locked? We help you unlock.'],
    ],
  },
  guide: {
    eyebrow: 'Newcomer guide',
    title: 'Rogers for newcomers: what to know before you sign',
    alt: 'Newcomer at a kitchen table setting up a new phone, Rogers SIM kit and welcome letter beside it',
    questions: [
      [
        'Can I get Rogers without a credit history?',
        'Usually yes — with a security deposit, or by starting on a prepaid brand first. We explain the deposit on the call before anything is set up.',
      ],
      [
        'Is Rogers better than Fido or Chatr?',
        'Not better network-wise — all three use the Rogers network. Rogers adds 5G+ priority, Canada–US plans and bigger perks; Fido and Chatr cost less.',
      ],
      [
        'What about phone financing?',
        'You can bring your own phone or finance one over 24 months. Financing lowers the upfront cost but ties you to the plan — ask us to compare the total cost.',
      ],
    ],
    factsTitle: 'Key facts',
    facts: [
      ['Plans from', '$45/mo · CAD + tax'],
      ['Payment', 'Postpaid'],
      ['Credit check', 'Yes, or a deposit'],
      ['Network', 'Rogers · 5G+'],
      ['US use', 'Canada–US plans available'],
      ['Keep your number', 'Yes, free transfer'],
      ['', 'Updated 5 Oct 2026'],
    ],
  },
  reviews: {
    eyebrow: 'REVIEWS',
    title: ['Newcomers', 'recommend us.'],
    score: '4.8',
    stars: '★★★★★',
    count: '1,200+ Google reviews',
    items: [
      [
        'Had my Canadian number two weeks before my flight. Used it to open my bank account online — landed at YVR and it just worked.',
        'Aarav S.',
        'Student · Delhi → Vancouver',
      ],
      [
        'Internet was installed in our Brampton apartment three days after we moved in. Someone actually called back when they said.',
        'Maria L.',
        'Nurse · Manila → Brampton',
      ],
      [
        'Clear prices, no surprises on the first bill. The advisor explained Fido vs Rogers in plain words.',
        'Tanvir H.',
        'PR · Dhaka → Calgary',
      ],
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Rogers plan questions',
    intro: 'Talk to an advisor, Monday to Saturday, 9am–9pm Pacific time.',
    advisor: 'WhatsApp us',
    advisorAlt:
      'Advisor at our Surrey office answering a customer’s WhatsApp message on the work phone',
    items: [
      {
        id: 'credit',
        question: 'Do I need a credit check for Rogers?',
        answer:
          'Rogers postpaid plans usually need a credit check or a deposit. If you’re new to Canada, we explain your options on the call — or suggest a prepaid brand to start.',
      },
      {
        id: 'number',
        question: 'Can I keep my number when I switch to Rogers?',
        answer:
          'Yes. Keep your current service active until the transfer is complete. We need your account number and can help submit the port request.',
      },
      {
        id: 'us',
        question: 'Does Rogers include US roaming?',
        answer:
          'Some plans include Canada–US use; other plans need an add-on. Check the plan details and current terms before choosing.',
      },
      {
        id: 'phone',
        question: 'Can I bring my own phone?',
        answer:
          'Usually, if it is unlocked and compatible with Rogers. We can help you check before the switch.',
      },
      {
        id: 'family',
        question: 'Can I add family lines later?',
        answer:
          'Many Rogers plans support additional lines. Availability and pricing depend on the offer at signup.',
      },
      {
        id: 'term',
        question: 'What happens after 24 months?',
        answer:
          'If you financed a device, check the financing agreement for the remaining balance or device return requirements. Your wireless plan may continue under its current terms.',
      },
    ] satisfies readonly FaqItemContent[],
  },
  exploreTitle: 'Explore more',
  exploreGroups: [
    {
      title: 'Other brands',
      links: [
        ['Fido plans →', '/mobile-plans#mobile-plans'],
        ['Chatr plans →', '/mobile-plans#mobile-plans'],
      ],
    },
    {
      title: 'By need',
      desktopLink: ['Seniors →', '/mobile-plans'],
      links: [
        ['Unlimited data →', '/mobile-plans'],
        ['No credit check →', '/mobile-plans#mobile-plans'],
        ['Students →', '/pre-arrival-sim/students'],
      ],
    },
    {
      title: 'Compare',
      links: [
        ['Rogers vs Fido →', '/compare/rogers-vs-fido'],
        ['Fido vs Chatr →', '/mobile-plans#brand-comparison'],
        ['Prepaid vs postpaid →', '/mobile-plans'],
      ],
    },
  ],
  source:
    'Sources: Rogers.com plan pages and Rogers Wireless Service Agreement, checked 5 Oct 2026. Ratings are our own editorial view.',
  final: {
    title: 'Switch to Rogers. Keep your number.',
    description: 'Choose a plan in 2 minutes. An advisor confirms it the same day.',
    primary: 'See Rogers plans →',
    secondary: 'Talk to an advisor',
    alt: 'Two Canadian Plans advisors at the Surrey store counter, smiling at the camera',
  },
  ui: {
    imageLabel: 'IMAGE',
    imageGenericAlt: 'Photo slot awaiting an approved Canadian Plans image',
    sortLabel: 'Sort Rogers plans',
    previewTitle: 'Plan preview only',
    previewBody: 'This plan is a design fixture. It will not begin checkout or place an order.',
    close: 'Close preview',
    breadcrumb: 'Breadcrumb',
    toc: 'On this page',
    comparisonLabel: 'Rogers plan comparison',
    ratingLabel: 'Editorial newcomer rating',
    faqLabel: 'Frequently asked questions',
    previewAction: 'Plan preview',
    previewOnly: 'Preview only',
    logo: 'Rogers logo',
    includedPlans: 'Canada–US plans available',
    includedValue: 'Yes',
    from: 'From',
    perMonth: '/mo',
    tax: ' + tax',
    networkSuffix: ' network',
    usUse: 'US use ',
    talkSuffix: ' talk & text',
    reviewRating: '5 out of 5 stars',
    advisorTitle: 'Talk to an advisor',
    advisorDescription: 'This is a design preview. No message or callback request has been sent.',
    advisorClose: 'Close preview',
    selectedPlanLabel: 'Selected preview',
    checkMark: '✓',
    warningMark: '!',
    company: 'Canadian Plans',
    taxUntilCall: ' + tax · Pay $0 today',
    ratingOutOf: ' / 5',
    ratingSuffix: '/5',
  },
} as const;

export type RogersPlan = (typeof categoryRogers.plans.items)[number];

export const categoryRogersChrome = {
  ...categorySimChrome,
  navigation: categorySimChrome.navigation.map((link) => ({
    ...link,
    href:
      link.label === 'Mobile Plans'
        ? '/mobile-plans'
        : link.label === 'Home Internet'
          ? '/home-internet'
          : link.href,
  })),
};

export const categoryRogersAssets = {
  author: {
    src: '/design/category-rogers/desktop-imgEllipse1.svg',
    width: 36,
    height: 36,
    nodeId: '158:79',
  },
  reviewer: {
    src: '/design/category-rogers/desktop-imgEllipse2.svg',
    width: 36,
    height: 36,
    nodeId: '158:84',
  },
  aarav: {
    src: '/design/category-rogers/desktop-imgEllipse3.svg',
    width: 40,
    height: 40,
    nodeId: '160:45',
  },
  maria: {
    src: '/design/category-rogers/desktop-imgEllipse4.svg',
    width: 40,
    height: 40,
    nodeId: '160:53',
  },
  tanvir: {
    src: '/design/category-rogers/desktop-imgEllipse5.svg',
    width: 40,
    height: 40,
    nodeId: '160:61',
  },
  check: {
    src: '/design/category-rogers/mobile-imgIconCheck.svg',
    width: 18,
    height: 18,
    nodeId: '314:245',
  },
} satisfies Record<string, FigmaAsset>;
