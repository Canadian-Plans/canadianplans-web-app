import type { FigmaAsset } from '@canadian-plans/ui/canadian-plans';

/** Figma design-preview copy. Not approved commercial or operational facts. */
export const homeCopy = {
  title: 'Canadian SIM & internet plans for newcomers.',
  skip: 'Skip to main content',
  hero: {
    eyebrow: 'AUTHORIZED ROGERS, FIDO & CHATR DEALER',
    title: 'Canadian SIM',
    subtitle: '& internet plans',
    highlight: 'for newcomers.',
    price: 'From $35/mo + tax',
    due: '· Pay $0 today',
    description:
      'Get your Canadian phone number before you fly, then set up home internet when you move in.',
    primary: 'See pre-arrival plans  →',
    secondary: 'Check my address',
    rating: '★★★★★  4.8 on Google · 1,200+ reviews',
    photo: ['PHOTO SLOT', 'Newcomer at arrivals, phone in hand', '(real customer, with consent)'],
    planLabel: 'YOUR PLAN',
    planTitle: 'Rogers 100 GB',
    renewal: '$40/mo · renews Nov 12',
    usage: '12.4 of 100 GB used',
    circleLabel: 'SIM plans from',
    circleAmount: '$35',
    circleSuffix: '/mo · CAD',
    sticker: 'eSIM in 5 minutes',
  },
  trust: [
    {
      title: 'Authorized dealer',
      detail: 'ROGERS · FIDO · CHATR (logo slots)',
    },
    {
      title: '4.8 ★',
      detail: 'Google · 1,200+ reviews',
    },
    {
      title: '< 2 hrs',
      detail: 'to confirm your order',
    },
    {
      title: 'eSIM',
      detail: 'order from any country',
    },
    {
      title: 'Surrey, BC',
      detail: 'real Canadian office',
    },
  ],
  categories: {
    title: 'Get connected, your way.',
    description:
      'Choose where you are in your move. Every plan runs on the Rogers network, and every price is shown up front.',
    cards: [
      {
        id: 'arrival',
        tone: 'mint',
        caption: 'eSIM QR code on a phone screen next to a passport and boarding pass',
        tag: 'PRE-ARRIVAL SIM',
        title: 'Arrive',
        subtitle: 'with a Canadian number',
        features: [
          '✓  Get your number before you fly',
          '✓  Instant eSIM, nothing to ship',
          '✓  Works the minute you land',
        ],
        price: '$35',
        href: '#popular-plans',
      },
      {
        id: 'internet',
        tone: 'sky',
        caption: 'Rogers modem on a shelf in a newly furnished living room',
        tag: 'HOME INTERNET & TV',
        title: 'Settle',
        subtitle: 'with fast home internet',
        features: [
          '✓  Up to 1.5 Gbps, unlimited data',
          '✓  Free professional install',
          '✓  Add TV & streaming anytime',
        ],
        price: '$55',
        href: '/home-internet',
      },
      {
        id: 'mobile',
        tone: 'lemon',
        caption: 'Advisor at the Surrey store helping a customer compare two phones',
        tag: 'MOBILE PLANS',
        title: 'Switch',
        subtitle: 'to a plan that fits',
        features: [
          '✓  Rogers, Fido & Chatr side by side',
          '✓  Bring your phone or upgrade',
          '✓  Keep your number',
        ],
        price: '$29',
        href: '#popular-plans',
      },
    ],
  },
  plans: {
    heading: {
      eyebrow: 'POPULAR PLANS',
      title: ['Canadian SIM plans,', 'with real prices.'],
      description:
        'Order before you fly and pay less. The 100 GB plan is normally $80 in Canada, and the 75 GB plan is $60.',
    },
    tabs: [
      {
        id: 'arrival',
        label: 'Pre-arrival SIM',
      },
      {
        id: 'internet',
        label: 'Home Internet',
      },
      {
        id: 'mobile',
        label: 'Mobile',
      },
    ],
    includesTitle: 'Every plan includes',
    includes: [
      '✓  No Canadian credit history needed',
      '✓  No contract',
      '✓  Activation help on WhatsApp',
      '✓  Pay nothing until we confirm',
    ],
    note: 'Prices in Canadian dollars, before tax. Updated October 2026.',
    internetMessage:
      'Home internet and TV are planned for a later launch. Explore the address-check preview below.',
    internetButton: 'Try postal code preview',
    mobileMessage:
      'Compare the sample mobile plans. Offers and checkout will be connected after approval.',
    selectedTitle: 'Plan preview',
    selectedDescription:
      'This sample selection creates no order. Approved offers will be connected separately.',
    close: 'Close preview',
  },
  esim: {
    caption: 'Phone screen with an eSIM QR code being scanned, boarding pass beside it',
    title: "What's an eSIM?",
    description:
      "It's a SIM that's built into your phone. We email you a QR code, you scan it, and your Canadian number is ready. No card to ship.",
    support:
      "Most iPhones from the XS on and many newer Android phones support eSIM. Send us your phone model and we'll check before you order.",
    button: 'Check my phone',
  },
  how: {
    eyebrow: 'HOW IT WORKS',
    title: 'How to get a Canadian phone plan with us',
    description: 'Four simple steps. Most people finish in under 5 minutes.',
    steps: [
      {
        number: '01',
        title: 'Choose your plan',
        description:
          'Compare Rogers, Fido and Chatr plans with real prices, or answer 4 quick questions in Find my plan.',
        asset: '0-imgFrame',
        tone: 'blue',
      },
      {
        number: '02',
        title: 'Fill in one short form',
        description:
          'Your name, email and arrival date. No payment and no credit card at this step.',
        asset: '0-imgFrame1',
        tone: 'warm',
      },
      {
        number: '03',
        title: 'We call to confirm',
        description: 'An advisor checks your plan and documents with you, usually within 2 hours.',
        asset: '0-imgFrame2',
        tone: 'violet',
      },
      {
        number: '04',
        title: 'Get connected',
        description: 'Your eSIM arrives by email, or we book your home internet install. Done.',
        asset: '0-imgFrame3',
        tone: 'mint',
      },
    ],
    disclosureTitle: 'Who am I buying from?',
    disclosure:
      'Your plan is a real Rogers, Fido or Chatr account in your name. Canadian Plans is the authorized dealer that sets it up and helps you afterwards. Our help costs you nothing extra.',
  },
  journey: {
    eyebrow: 'THE NEWCOMER PATH',
    title: ['Your first 30 days', 'in Canada, already sorted.'],
    description:
      'In your first month most newcomers deal with three different companies. We set it all up for you, with one order and one person to call.',
    button: 'Find my plan  →',
    previous: 'Previous journey step',
    next: 'Next journey step',
    label: 'Newcomer journey',
    stepLabel: 'Show journey step',
    cards: [
      {
        id: 'journey-1',
        tone: 'mint',
        caption:
          'Student at home scanning an eSIM QR code on her phone, packed suitcase behind her',
        tag: '1 · BEFORE YOU FLY',
        title: 'Order your eSIM',
        description: "You'll have a Canadian number for your bank, school and job forms.",
        detail: 'Pre-arrival SIM · from $35',
      },
      {
        id: 'journey-2',
        tone: 'sky',
        caption:
          'Traveller at YVR arrivals switching on their phone, Canadian signal bars on screen',
        tag: '2 · DAY 1',
        title: 'Land & switch on',
        description:
          "Install the eSIM before you leave. Turn it on when you land, and you're online before you reach baggage claim.",
        detail: 'Included · no activation fee',
      },
      {
        id: 'journey-3',
        tone: 'lemon',
        caption: 'Technician setting up a Rogers modem in a newly rented apartment',
        tag: '3 · WEEK 1',
        title: 'Book home internet',
        description: 'We check speeds and book a free pro install, often in 3 days.',
        detail: 'Home internet · from $55',
      },
      {
        id: 'journey-4',
        tone: 'pink',
        caption: 'Couple at a kitchen table comparing phone plans on a laptop',
        tag: '4 · MONTH 1',
        title: 'Upgrade or add lines',
        description: 'Add a partner’s line, pick a bigger plan, or bundle TV.',
        detail: 'Mobile plans · from $29',
      },
    ],
  },
  internet: {
    title: 'Add home internet.',
    description:
      'Up to 1.5 Gbps on the Rogers network, unlimited data and a free pro install, often within 3 days of moving in.',
    circleLabel: 'starting at',
    circleAmount: '$55',
    circleSuffix: '/mo · CAD',
    heading: ['See what’s available', 'at your new address.'],
    intro:
      'Enter your postal code and see real speeds and prices for your building in seconds. No sign-up.',
    label: 'Postal code',
    placeholder: 'e.g. V3T 1Z2',
    button: 'Check availability',
    initial: 'Address-check preview · home internet launches later',
    serving: 'Serving',
    provinces: ['BC', 'ON', 'AB', 'MB', 'SK'],
    invalid: 'Enter a valid Canadian postal code, for example V3T 1Z2.',
    pending: 'Checking preview…',
    result: 'Postal code format accepted. This is a UI preview; availability has not been checked.',
  },
  benefits: {
    mobileTitle: ['The Rogers network,', 'without the', 'call-centre maze.'],
    eyebrow: 'WHY CANADIAN PLANS',
    title: ['The Rogers network,', 'without the call-centre maze.'],
    cards: [
      {
        id: 'advisor',
        tone: 'sky',
        title: 'A real person confirms every order.',
        description:
          "Fill in one short form. An advisor calls or messages you on WhatsApp within a few hours, and you don't pay anything until everything is confirmed.",
        advisor: 'Priya · plan advisor',
        chat: 'Your eSIM is ready to install. Want me to book internet for your Surrey apartment too?',
      },
      {
        id: 'network',
        tone: 'mint',
        title: 'Same network. More help.',
        description:
          'Real Rogers, Fido and Chatr plans, and a contact person long after you sign up.',
        caption: 'Canadian Plans advisor at the Surrey office on a WhatsApp call with a customer',
      },
      {
        id: 'credit',
        tone: 'lemon',
        title: 'No credit history? No problem.',
        description:
          'To order before you arrive, you only need your passport and your study or work permit.',
        caption:
          'Passport and study permit on a desk next to a phone showing an order confirmation',
      },
      {
        id: 'newcomers',
        tone: 'pink',
        title: 'Built for newcomers.',
        description:
          'Simple guides for students, workers and families, written by people who made the same move.',
        caption: 'Family unpacking boxes in their first Canadian apartment',
      },
    ],
  },
  reviews: {
    eyebrow: 'REVIEWS',
    title: ['Newcomers', 'recommend us.'],
    score: '4.8',
    stars: '★★★★★',
    count: '1,200+ Google reviews',
    label: 'Newcomer reviews',
    show: 'Show review',
  },
  faq: {
    eyebrow: 'FAQ',
    title: ['Common', 'questions'],
    description: 'Talk to an advisor, Monday to Saturday, 9am–9pm Pacific time.',
    button: 'WhatsApp us',
    caption: 'Canadian Plans advisor smiling at a desk in the Surrey office, headset on',
  },
  final: {
    title: 'Ready when you land.',
    description: 'Choose a plan in 2 minutes. An advisor confirms it the same day.',
    primary: 'Find my plan  →',
    secondary: 'Talk to an advisor',
  },
  controls: {
    arrow: '→',
    back: '←',
    image: 'IMAGE',
    from: 'from',
    period: '/mo',
    contactTitle: 'Talk to an advisor',
    contactDescription:
      'Advisor contact is a design preview. No message or callback request has been sent.',
    menuDescription: 'Browse Canadian Plans sections.',
    searchPlaceholder: 'Search plans or cities',
    searchLabel: 'Search plans or cities',
    searchError: 'Enter 2 to 80 characters.',
    searchResult: 'Search preview complete. No live search was performed.',
    searchPending: 'Checking…',
  },
};
export const homeAssets = {
  '0-imgMark': {
    src: '/design/home/0-imgMark.svg',
    width: 36,
    height: 36,
    nodeId: '60:16',
  },
  '0-imgEllipse': {
    src: '/design/home/0-imgEllipse.svg',
    width: 14,
    height: 14,
    nodeId: '60:27',
  },
  '0-imgIcon': {
    src: '/design/home/0-imgIcon.svg',
    width: 32,
    height: 32,
    nodeId: 'I316:723;312:3',
  },
  '0-imgFrame': {
    src: '/design/home/0-imgFrame.svg',
    width: 28,
    height: 28,
    nodeId: '295:11',
  },
  '0-imgFrame1': {
    src: '/design/home/0-imgFrame1.svg',
    width: 28,
    height: 28,
    nodeId: '295:20',
  },
  '0-imgFrame2': {
    src: '/design/home/0-imgFrame2.svg',
    width: 28,
    height: 28,
    nodeId: '295:29',
  },
  '0-imgFrame3': {
    src: '/design/home/0-imgFrame3.svg',
    width: 28,
    height: 28,
    nodeId: '295:37',
  },
  '0-imgPolygon': {
    src: '/design/home/0-imgPolygon.svg',
    width: 167.639,
    height: 79.1435,
    nodeId: '64:9',
  },
  '0-imgEllipse1': {
    src: '/design/home/0-imgEllipse1.svg',
    width: 35.6403,
    height: 12.1914,
    nodeId: '64:12',
  },
  '0-imgEllipse2': {
    src: '/design/home/0-imgEllipse2.svg',
    width: 67.7165,
    height: 23.1636,
    nodeId: '64:13',
  },
  '0-imgEllipse3': {
    src: '/design/home/0-imgEllipse3.svg',
    width: 99.7927,
    height: 34.1358,
    nodeId: '64:14',
  },
  '0-imgEllipse4': {
    src: '/design/home/0-imgEllipse4.svg',
    width: 28,
    height: 28,
    nodeId: '66:13',
  },
  '0-imgEllipse5': {
    src: '/design/home/0-imgEllipse5.svg',
    width: 40,
    height: 40,
    nodeId: '66:47',
  },
  '0-imgEllipse6': {
    src: '/design/home/0-imgEllipse6.svg',
    width: 40,
    height: 40,
    nodeId: '66:55',
  },
  '0-imgEllipse7': {
    src: '/design/home/0-imgEllipse7.svg',
    width: 40,
    height: 40,
    nodeId: '66:63',
  },
  '0-imgFrame4': {
    src: '/design/home/0-imgFrame4.svg',
    width: 36,
    height: 36,
    nodeId: '68:54',
  },
  '1-imgFrame': {
    src: '/design/home/1-imgFrame.svg',
    width: 36,
    height: 36,
    nodeId: '363:956',
  },
  '1-imgMark': {
    src: '/design/home/1-imgMark.svg',
    width: 36,
    height: 36,
    nodeId: '364:2165',
  },
  '1-imgIcon': {
    src: '/design/home/1-imgIcon.svg',
    width: 22,
    height: 22,
    nodeId: '364:2170',
  },
  '1-imgIcon1': {
    src: '/design/home/1-imgIcon1.svg',
    width: 24,
    height: 24,
    nodeId: '364:2173',
  },
  '1-imgPhoneIcon': {
    src: '/design/home/1-imgPhoneIcon.svg',
    width: 16,
    height: 16,
    nodeId: '364:2155',
  },
  '1-imgIcon2': {
    src: '/design/home/1-imgIcon2.svg',
    width: 32,
    height: 32,
    nodeId: 'I321:811;312:3',
  },
  '1-imgFrame1': {
    src: '/design/home/1-imgFrame1.svg',
    width: 28,
    height: 28,
    nodeId: '295:57',
  },
  '1-imgFrame2': {
    src: '/design/home/1-imgFrame2.svg',
    width: 28,
    height: 28,
    nodeId: '295:66',
  },
  '1-imgFrame3': {
    src: '/design/home/1-imgFrame3.svg',
    width: 28,
    height: 28,
    nodeId: '295:75',
  },
  '1-imgFrame4': {
    src: '/design/home/1-imgFrame4.svg',
    width: 28,
    height: 28,
    nodeId: '295:83',
  },
  '1-imgPolygon': {
    src: '/design/home/1-imgPolygon.svg',
    width: 100.584,
    height: 47.4861,
    nodeId: '196:123',
  },
  '1-imgEllipse': {
    src: '/design/home/1-imgEllipse.svg',
    width: 21.3842,
    height: 7.31482,
    nodeId: '196:126',
  },
  '1-imgEllipse1': {
    src: '/design/home/1-imgEllipse1.svg',
    width: 40.6299,
    height: 13.8982,
    nodeId: '196:127',
  },
  '1-imgEllipse2': {
    src: '/design/home/1-imgEllipse2.svg',
    width: 59.8756,
    height: 20.4815,
    nodeId: '196:128',
  },
  '1-imgEllipse3': {
    src: '/design/home/1-imgEllipse3.svg',
    width: 28,
    height: 28,
    nodeId: '316:837',
  },
  '1-imgEllipse4': {
    src: '/design/home/1-imgEllipse4.svg',
    width: 40,
    height: 40,
    nodeId: '196:203',
  },
  '1-imgEllipse5': {
    src: '/design/home/1-imgEllipse5.svg',
    width: 40,
    height: 40,
    nodeId: '196:211',
  },
  '1-imgEllipse6': {
    src: '/design/home/1-imgEllipse6.svg',
    width: 40,
    height: 40,
    nodeId: '196:219',
  },
} satisfies Record<string, FigmaAsset>;
export type HomeCopy = typeof homeCopy;
