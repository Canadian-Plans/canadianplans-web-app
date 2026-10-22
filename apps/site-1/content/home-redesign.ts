import type {
  CpCtaBandContent,
  CpFeatureCardContent,
  CpStepContent,
  FaqItemContent,
  FigmaAsset,
} from '@canadian-plans/ui/canadian-plans';

/**
 * Electric Blue homepage redesign (14 October 2026).
 * Source: Claude Design canvas "Canadian Plans — Homepage Redesign" (Home.dc.html).
 * Design-preview copy: prices, timelines and claims in [brackets] or marked below
 * still need business confirmation. Commercial values remain backend-authoritative.
 */

/** Illustrations exported from the canvas into /public/design/redesign. */
export const redesignAssets = {
  'art-business': {
    src: '/design/redesign/art-business.svg',
    width: 640,
    height: 460,
    nodeId: 'canvas:art-business',
  },
  'art-home-internet': {
    src: '/design/redesign/art-home-internet.svg',
    width: 640,
    height: 460,
    nodeId: 'canvas:art-home-internet',
  },
  'art-mobile': {
    src: '/design/redesign/art-mobile.svg',
    width: 640,
    height: 460,
    nodeId: 'canvas:art-mobile',
  },
  'art-pre-arrival': {
    src: '/design/redesign/art-pre-arrival.svg',
    width: 640,
    height: 460,
    nodeId: 'canvas:art-pre-arrival',
  },
  'column-business': {
    src: '/design/redesign/column-business.svg',
    width: 72,
    height: 64,
    nodeId: 'canvas:column-business',
  },
  'column-home-internet': {
    src: '/design/redesign/column-home-internet.svg',
    width: 72,
    height: 64,
    nodeId: 'canvas:column-home-internet',
  },
  'column-mobile': {
    src: '/design/redesign/column-mobile.svg',
    width: 72,
    height: 64,
    nodeId: 'canvas:column-mobile',
  },
  'column-pre-arrival': {
    src: '/design/redesign/column-pre-arrival.svg',
    width: 72,
    height: 64,
    nodeId: 'canvas:column-pre-arrival',
  },
  'cta-business': {
    src: '/design/redesign/cta-business.svg',
    width: 24,
    height: 24,
    nodeId: 'canvas:cta-business',
  },
  'cta-home-internet': {
    src: '/design/redesign/cta-home-internet.svg',
    width: 24,
    height: 24,
    nodeId: 'canvas:cta-home-internet',
  },
  'cta-mobile': {
    src: '/design/redesign/cta-mobile.svg',
    width: 24,
    height: 24,
    nodeId: 'canvas:cta-mobile',
  },
  'cta-pre-arrival': {
    src: '/design/redesign/cta-pre-arrival.svg',
    width: 24,
    height: 24,
    nodeId: 'canvas:cta-pre-arrival',
  },
  'feature-hi-install': {
    src: '/design/redesign/feature-hi-install.svg',
    width: 96,
    height: 80,
    nodeId: 'canvas:feature-hi-install',
  },
  'feature-hi-moving': {
    src: '/design/redesign/feature-hi-moving.svg',
    width: 96,
    height: 80,
    nodeId: 'canvas:feature-hi-moving',
  },
  'feature-hi-unlimited': {
    src: '/design/redesign/feature-hi-unlimited.svg',
    width: 96,
    height: 80,
    nodeId: 'canvas:feature-hi-unlimited',
  },
  'feature-hi-wifi': {
    src: '/design/redesign/feature-hi-wifi.svg',
    width: 96,
    height: 80,
    nodeId: 'canvas:feature-hi-wifi',
  },
  'gets-bz-bill': {
    src: '/design/redesign/gets-bz-bill.svg',
    width: 64,
    height: 64,
    nodeId: 'canvas:gets-bz-bill',
  },
  'gets-bz-hours': {
    src: '/design/redesign/gets-bz-hours.svg',
    width: 64,
    height: 64,
    nodeId: 'canvas:gets-bz-hours',
  },
  'gets-bz-ip': {
    src: '/design/redesign/gets-bz-ip.svg',
    width: 64,
    height: 64,
    nodeId: 'canvas:gets-bz-ip',
  },
  'gets-bz-support': {
    src: '/design/redesign/gets-bz-support.svg',
    width: 64,
    height: 64,
    nodeId: 'canvas:gets-bz-support',
  },
  'picker-business': {
    src: '/design/redesign/picker-business.svg',
    width: 120,
    height: 100,
    nodeId: 'canvas:picker-business',
  },
  'picker-home-internet': {
    src: '/design/redesign/picker-home-internet.svg',
    width: 120,
    height: 100,
    nodeId: 'canvas:picker-home-internet',
  },
  'picker-mobile': {
    src: '/design/redesign/picker-mobile.svg',
    width: 90,
    height: 110,
    nodeId: 'canvas:picker-mobile',
  },
  'picker-pre-arrival': {
    src: '/design/redesign/picker-pre-arrival.svg',
    width: 120,
    height: 100,
    nodeId: 'canvas:picker-pre-arrival',
  },
  'step-mb-details': {
    src: '/design/redesign/step-mb-details.svg',
    width: 88,
    height: 88,
    nodeId: 'canvas:step-mb-details',
  },
  'step-mb-done': {
    src: '/design/redesign/step-mb-done.svg',
    width: 88,
    height: 88,
    nodeId: 'canvas:step-mb-done',
  },
  'step-mb-transfer': {
    src: '/design/redesign/step-mb-transfer.svg',
    width: 88,
    height: 88,
    nodeId: 'canvas:step-mb-transfer',
  },
  'step-pa-esim': {
    src: '/design/redesign/step-pa-esim.svg',
    width: 88,
    height: 88,
    nodeId: 'canvas:step-pa-esim',
  },
  'step-pa-online': {
    src: '/design/redesign/step-pa-online.svg',
    width: 88,
    height: 88,
    nodeId: 'canvas:step-pa-online',
  },
  'step-pa-order': {
    src: '/design/redesign/step-pa-order.svg',
    width: 88,
    height: 88,
    nodeId: 'canvas:step-pa-order',
  },
  'tile-business': {
    src: '/design/redesign/tile-business.svg',
    width: 24,
    height: 24,
    nodeId: 'canvas:tile-business',
  },
  'tile-home-internet': {
    src: '/design/redesign/tile-home-internet.svg',
    width: 24,
    height: 24,
    nodeId: 'canvas:tile-home-internet',
  },
  'tile-mobile': {
    src: '/design/redesign/tile-mobile.svg',
    width: 24,
    height: 24,
    nodeId: 'canvas:tile-mobile',
  },
  'tile-pre-arrival': {
    src: '/design/redesign/tile-pre-arrival.svg',
    width: 24,
    height: 24,
    nodeId: 'canvas:tile-pre-arrival',
  },
  'who-bz-home': {
    src: '/design/redesign/who-bz-home.svg',
    width: 24,
    height: 24,
    nodeId: 'canvas:who-bz-home',
  },
  'who-bz-offices': {
    src: '/design/redesign/who-bz-offices.svg',
    width: 24,
    height: 24,
    nodeId: 'canvas:who-bz-offices',
  },
  'who-bz-shops': {
    src: '/design/redesign/who-bz-shops.svg',
    width: 24,
    height: 24,
    nodeId: 'canvas:who-bz-shops',
  },
  'why-mb-carriers': {
    src: '/design/redesign/why-mb-carriers.svg',
    width: 64,
    height: 64,
    nodeId: 'canvas:why-mb-carriers',
  },
  'why-mb-credit': {
    src: '/design/redesign/why-mb-credit.svg',
    width: 64,
    height: 64,
    nodeId: 'canvas:why-mb-credit',
  },
  'why-mb-phone': {
    src: '/design/redesign/why-mb-phone.svg',
    width: 64,
    height: 64,
    nodeId: 'canvas:why-mb-phone',
  },
  'why-pa-bank': {
    src: '/design/redesign/why-pa-bank.svg',
    width: 64,
    height: 64,
    nodeId: 'canvas:why-pa-bank',
  },
  'why-pa-forms': {
    src: '/design/redesign/why-pa-forms.svg',
    width: 64,
    height: 64,
    nodeId: 'canvas:why-pa-forms',
  },
  'why-pa-roaming': {
    src: '/design/redesign/why-pa-roaming.svg',
    width: 64,
    height: 64,
    nodeId: 'canvas:why-pa-roaming',
  },
} satisfies Record<string, FigmaAsset>;
export type RedesignAssetKey = keyof typeof redesignAssets;

export type CategoryKey = 'pre-arrival' | 'home-internet' | 'mobile' | 'business';

export const categoryHrefs: Readonly<Record<CategoryKey, string>> = {
  'pre-arrival': '/pre-arrival-sim',
  'home-internet': '/home-internet',
  mobile: '/mobile-plans',
  business: '/business-internet',
};

export const homeRedesign = {
  hero: {
    toggleLabel: 'Who is this for',
    audiences: {
      resident: {
        tab: 'I already live in Canada',
        eyebrow: 'Authorized Rogers, Fido & Chatr dealer',
        title: 'Canadian phone & internet plans, with real prices.',
        description:
          'Bring your own phone, keep your number, and get set up by a real person. Home internet in BC, Alberta, Manitoba and Saskatchewan.',
        price: 'Mobile from $40/mo + tax',
        chips: ['✓ No contract', '✓ Keep your number'],
        needs: ['A mobile plan', 'Home internet', 'Mobile + internet bundle', 'Business internet'],
        fieldLabel: 'Postal code',
        fieldHint: 'e.g. V3T 1Z2',
        cta: 'Show my plans →',
        badgeTop: 'Mobile from',
        badgePrice: '$40',
        photo: 'PHOTO · customer at home, phone in hand, router behind (with consent)',
      },
      newcomer: {
        tab: "I'm moving to Canada",
        eyebrow: 'Authorized Rogers, Fido & Chatr dealer',
        title: 'Canadian SIM & internet plans for newcomers.',
        description:
          'Get your Canadian phone number before you fly, then set up home internet when you move in.',
        price: 'From $35/mo + tax',
        chips: ['✓ Pay $0 today', '✓ Save up to $40/mo vs in-store'],
        needs: ['A number before I arrive', 'Home internet when I move in', 'Both'],
        fieldLabel: 'Arrival date',
        fieldHint: 'e.g. Jan 15, 2027',
        cta: 'See pre-arrival plans →',
        badgeTop: 'SIM plans from',
        badgePrice: '$35',
        photo: 'PHOTO · newcomer at arrivals, phone in hand (real customer, with consent)',
      },
    },
    needLabel: 'I need',
    stars: '★★★★★',
    ratingScore: '4.8',
    ratingText: '· 1,200+ Google reviews',
    assurances: ['No credit check options', 'Pay $0 until we confirm'],
    carousel: { previous: 'Previous slide', next: 'Next slide', slide: 'Show slide' },
    badgeSuffix: '/mo · CAD',
    sticker: 'No contract',
    plan: {
      label: 'Your plan',
      status: '● Active',
      title: 'Rogers 100 GB',
      renewal: '$40/mo · renews Nov 12',
      usage: '12.4 of 100 GB used',
    },
  },
  picker: {
    eyebrow: 'No contract on anything',
    title: 'What are you looking for?',
    description: 'Pick a service to see plans and real prices.',
    cards: [
      {
        key: 'pre-arrival',
        title: 'Pre-arrival Plans',
        price: 'From $35/mo',
        icon: 'picker-pre-arrival',
      },
      {
        key: 'home-internet',
        title: 'Home Internet',
        price: 'From $50/mo',
        icon: 'picker-home-internet',
      },
      { key: 'mobile', title: 'Mobile Plans', price: 'From $40/mo', icon: 'picker-mobile' },
      {
        key: 'business',
        title: 'Business Internet',
        price: 'Get a quote',
        icon: 'picker-business',
      },
    ],
    more: 'See plans →',
    bundleLead: 'Need more than one?',
    bundleLink: 'Bundle and save with an advisor ›',
  },
  columns: {
    label: 'Plan categories',
    hint: 'Swipe to see all →',
    from: 'From',
    currency: '$',
    period: '/month',
    action: 'See plans',
    items: [
      {
        key: 'pre-arrival',
        title: 'Pre-arrival Plans',
        dollars: '35',
        cents: '.00',
        icon: 'column-pre-arrival',
        features: [
          'Canadian number before you land',
          'eSIM or physical SIM',
          'Works the moment you arrive',
        ],
      },
      {
        key: 'home-internet',
        title: 'Home Internet',
        dollars: '50',
        cents: '.00',
        icon: 'column-home-internet',
        features: ['Unlimited data', 'Free installation', 'No contract'],
      },
      {
        key: 'mobile',
        title: 'Mobile Plans',
        dollars: '40',
        cents: '.00',
        icon: 'column-mobile',
        features: ['Keep your current number', 'Bring your own phone', 'eSIM or SIM card'],
      },
      {
        key: 'business',
        title: 'Business Internet',
        quote: 'Get a quote',
        icon: 'column-business',
        features: ['Business-grade support', 'One dedicated advisor', 'Flexible terms'],
      },
    ],
  },
  explorer: {
    title: 'Discover everything we offer.',
    navLabel: 'Service categories',
    info: {
      title: 'Who am I buying from?',
      body: "Your plan is a real Rogers, Fido or Chatr account in your name. We're the authorized dealer that sets it up and helps you afterwards. Our help costs nothing extra.",
      action: 'Learn more',
      href: '/about',
    },
    help: {
      lead: 'Not sure which plan fits?',
      links: [
        { label: 'Find my plan ›', href: '/pre-arrival-sim#plans', finder: true },
        { label: 'Guides ›', href: '/guides' },
      ],
    },
  },
  categories: [
    {
      key: 'pre-arrival',
      nav: 'Pre-arrival Plans',
      tone: 'amber',
      art: 'art-pre-arrival',
      feature: {
        title: 'Land in Canada already connected',
        body: "Get your number before you fly, as an eSIM or physical SIM. Turn on your phone when you land and you're online: no airport kiosk, no line-up.",
      },
      banner: {
        eyebrow: 'Pre-arrival Plan',
        title: 'Arrive with a Canadian number.',
        action: 'See pre-arrival plans',
        pricePrefix: 'from',
        price: '$35',
        priceSuffix: '/mo',
        photo: 'PHOTO · eSIM QR code next to passport & boarding pass',
      },
      steps: {
        title: 'How it works',
        aside: 'Done in 3 easy steps',
        items: [
          {
            id: 'order',
            marker: '1',
            title: 'Order from anywhere',
            body: 'Pick a plan and fill in one short form, from any country.',
            meta: '~2 min',
            art: 'step-pa-order',
          },
          {
            id: 'esim',
            marker: '2',
            title: 'Get your eSIM by email',
            body: 'Scan the QR code before you fly. Your number is ready.',
            meta: 'Before your flight',
            art: 'step-pa-esim',
          },
          {
            id: 'online',
            marker: '✓',
            title: "Land and you're online",
            body: 'Switch on at the airport. Calls, data and maps from minute one.',
            meta: 'On arrival',
            done: true,
            art: 'step-pa-online',
          },
        ],
      },
      cards: {
        title: 'Why get it before you land',
        columns: 3,
        items: [
          {
            id: 'bank',
            title: 'Open a bank account early',
            body: 'Banks ask for a Canadian number. Have one before your first appointment.',
            icon: 'why-pa-bank',
          },
          {
            id: 'forms',
            title: 'Fill in school & job forms',
            body: 'Give employers and your college a real local number from day one.',
            icon: 'why-pa-forms',
          },
          {
            id: 'roaming',
            title: 'No roaming bill',
            body: 'Skip roaming fees from home and pricey airport SIM kiosks.',
            icon: 'why-pa-roaming',
          },
        ],
      },
      cta: {
        icon: 'cta-pre-arrival',
        title: 'Ready for your Canadian number?',
        subtitle: 'Order in about 2 minutes. No credit history needed.',
        primary: { label: 'Get my Canadian number →', href: '/pre-arrival-sim' },
        secondary: { label: 'Talk to an advisor ›', href: '/contact' },
      },
    },
    {
      key: 'home-internet',
      nav: 'Home Internet',
      tone: 'mint',
      art: 'art-home-internet',
      feature: {
        title: 'Fast internet in every room',
        body: 'Unlimited data, free installation and no contract. We book the install and stay your contact afterwards, so you are never stuck on hold.',
      },
      banner: {
        eyebrow: 'Home Internet',
        title: 'Fast home internet, installed free.',
        action: 'See internet plans',
        pricePrefix: 'from',
        price: '$50',
        priceSuffix: '/mo',
        photo: 'PHOTO · Rogers modem in a bright living room',
      },
      cards: {
        title: 'What you get',
        columns: 2,
        items: [
          {
            id: 'install',
            title: 'Free professional install',
            body: "A technician sets up your modem and Wi-Fi. You don't touch a cable.",
            chip: '$0 install',
            icon: 'feature-hi-install',
          },
          {
            id: 'unlimited',
            title: 'Unlimited data, no overage',
            body: 'Stream, game and work from home without watching a meter.',
            chip: 'No data caps',
            icon: 'feature-hi-unlimited',
          },
          {
            id: 'wifi',
            title: 'Wi-Fi in every room',
            body: 'Strong, steady Wi-Fi for the whole family, room to room.',
            chip: 'Up to 2 Gbps',
            icon: 'feature-hi-wifi',
          },
          {
            id: 'moving',
            title: 'Moving? It moves with you',
            body: 'Tell your advisor your new address and we book the transfer for you.',
            chip: 'We handle it',
            icon: 'feature-hi-moving',
          },
        ],
      },
      cta: {
        icon: 'cta-home-internet',
        title: 'Is fast internet available at your address?',
        subtitle: 'Free installation, unlimited data, no contract.',
        primary: { label: 'Check my address →', href: '/home-internet' },
        secondary: { label: 'Talk to an advisor ›', href: '/contact' },
      },
    },
    {
      key: 'mobile',
      nav: 'Mobile Plans',
      tone: 'blue',
      art: 'art-mobile',
      feature: {
        title: 'Switch your plan, keep your number',
        body: 'Three simple plans with unlimited talk and text. Bring your own phone and we move your number for you, with one advisor if you ever want to change.',
      },
      banner: {
        eyebrow: 'Mobile Plans',
        title: 'Switch to a plan that fits.',
        action: 'See mobile plans',
        pricePrefix: 'from',
        price: '$40',
        priceSuffix: '/mo',
        photo: 'PHOTO · advisor helping a customer compare phones',
      },
      steps: {
        title: 'Keep your number. We move it for you.',
        aside: 'Done in 3 easy steps',
        items: [
          {
            id: 'details',
            marker: '1',
            title: 'Share your details',
            body: 'Your current provider and account number.',
            meta: '2 min',
            art: 'step-mb-details',
          },
          {
            id: 'transfer',
            marker: '2',
            title: 'We request the transfer',
            body: "Don't cancel your old plan. We handle it.",
            meta: 'Usually same day',
            art: 'step-mb-transfer',
          },
          {
            id: 'done',
            marker: '✓',
            title: 'Your number moves over',
            body: 'Your phone keeps working the whole time.',
            meta: 'Done',
            done: true,
            art: 'step-mb-done',
          },
        ],
      },
      cards: {
        title: 'Why switch with us',
        columns: 3,
        items: [
          {
            id: 'phone',
            title: 'Bring your phone or upgrade',
            body: 'Unlocked phones work as-is, or pick a new one.',
            icon: 'why-mb-phone',
          },
          {
            id: 'carriers',
            title: '3 carriers, one advisor',
            body: 'Rogers, Fido and Chatr compared side by side.',
            icon: 'why-mb-carriers',
          },
          {
            id: 'credit',
            title: 'No credit check options',
            body: 'New to Canada or rebuilding credit? We have plans for you.',
            icon: 'why-mb-credit',
          },
        ],
      },
      cta: {
        icon: 'cta-mobile',
        title: 'Ready to switch and keep your number?',
        subtitle: 'Compare Rogers, Fido and Chatr in a few minutes.',
        primary: { label: 'Compare mobile plans →', href: '/mobile-plans' },
        secondary: { label: 'Talk to an advisor ›', href: '/contact' },
      },
    },
    {
      key: 'business',
      nav: 'Business Internet',
      tone: 'navy',
      art: 'art-business',
      feature: {
        title: "Built for days you can't go offline",
        body: 'Business-grade connections for shops, offices and home businesses, with one dedicated advisor who knows your account.',
      },
      banner: {
        eyebrow: 'Business Internet',
        title: 'Internet that keeps your business open.',
        action: 'Get a business quote',
        pricePrefix: '',
        price: 'Quote',
        priceSuffix: ' for your business',
        photo: 'PHOTO · small shop or office owner at the counter, laptop open',
      },
      who: {
        title: "Who it's for",
        items: [
          {
            id: 'shops',
            title: 'Shops & restaurants',
            body: 'Reliable Wi-Fi for payments, orders and guests.',
            icon: 'who-bz-shops',
          },
          {
            id: 'offices',
            title: 'Offices & clinics',
            body: 'Fast, stable speeds for the whole team.',
            icon: 'who-bz-offices',
          },
          {
            id: 'home',
            title: 'Home-based business',
            body: 'Business support without changing your setup.',
            icon: 'who-bz-home',
          },
        ],
      },
      cards: {
        title: 'What your business gets',
        aside: { label: 'Talk to a business advisor ›', href: '/contact' },
        columns: 2,
        items: [
          {
            id: 'support',
            title: 'Priority support line',
            body: 'Skip the general queue when something breaks.',
            icon: 'gets-bz-support',
          },
          {
            id: 'ip',
            title: 'Static IP options',
            body: 'For POS systems, cameras and remote access.',
            icon: 'gets-bz-ip',
          },
          {
            id: 'hours',
            title: 'Install around your hours',
            body: "Book a time that doesn't close your doors.",
            icon: 'gets-bz-hours',
          },
          {
            id: 'bill',
            title: 'One bill, one advisor',
            body: 'Internet and team phones handled together.',
            icon: 'gets-bz-bill',
          },
        ],
      },
      cta: {
        icon: 'cta-business',
        title: 'Get a quote for your business',
        subtitle: 'One advisor, set up around your hours.',
        primary: { label: 'Get a business quote →', href: '/business-internet#quote' },
        secondary: { label: 'Talk to an advisor ›', href: '/contact' },
      },
    },
  ],
  how: {
    title: 'Getting connected is easy',
    description:
      'Tell us what you need, pick a plan, and we take care of the rest. No contract, no store visit.',
    primary: { label: 'Find my plan', href: '/pre-arrival-sim#plans' },
    secondary: { label: 'Talk to an advisor', href: '/contact' },
    stepLabel: 'Step',
    listLabel: 'How it works',
    steps: [
      {
        title: 'Choose your plan',
        body: 'Compare mobile, home internet and pre-arrival plans side by side, or tell us what you need and we will match you.',
        overlay: 'Pick in minutes',
        photo: 'PHOTO · customer browsing plans on phone',
      },
      {
        title: 'We handle the setup',
        body: 'An advisor confirms your order, books any install and sorts out your number transfer for you.',
        overlay: 'We do the setup',
        photo: 'PHOTO · advisor on a call / SIM being prepared',
      },
      {
        title: 'You are connected',
        body: 'Your SIM, eSIM or internet is ready to go, with the same advisor on hand if you need anything later.',
        overlay: 'You are online',
        photo: 'PHOTO · happy customer at home, connected',
      },
    ],
  },
  testimonials: {
    eyebrow: 'Customer stories',
    title: "People we've helped get connected",
    more: { label: 'Read more reviews', href: '#stories' },
    /** Placeholders only. Replace with real reviews used with permission; never invent quotes. */
    items: [
      {
        id: 't1',
        photo: '',
        alt: 'Customer photo',
        photoHint: 'PHOTO · customer (with consent)',
        category: 'Pre-arrival Plan',
        tone: 'amber',
        quote:
          'Real customer quote goes here. One or two sentences about their experience, used with permission.',
        name: 'Customer name',
        meta: 'City · Customer since 20XX',
      },
      {
        id: 't2',
        photo: '',
        alt: 'Customer photo',
        photoHint: 'PHOTO · customer at home (with consent)',
        category: 'Home Internet',
        tone: 'mint',
        quote:
          'Real customer quote goes here. One or two sentences about their experience, used with permission.',
        name: 'Customer name',
        meta: 'City · Customer since 20XX',
      },
      {
        id: 't3',
        photo: '',
        alt: 'Customer photo',
        photoHint: 'PHOTO · business owner in store (with consent)',
        category: 'Business Internet',
        tone: 'navy',
        quote:
          'Real customer quote goes here. One or two sentences about their experience, used with permission.',
        name: 'Customer name',
        meta: 'Business name · City',
      },
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Questions, answered',
    description: "Can't find what you're looking for? An advisor can walk you through it.",
    helpTitle: 'Still have questions?',
    helpBody: 'Chat with us or book a quick call. Our help costs nothing extra.',
    helpAction: { label: 'Talk to an advisor', href: '/contact' },
    symbols: { expand: '+', collapse: '−' },
  },
  final: {
    eyebrow: "Let's get you connected",
    title: 'So, what do you need today?',
    description:
      "Tap what fits and we'll show you the right plans. Need more than one? We can bundle them.",
    tiles: [
      {
        key: 'pre-arrival',
        ask: "I'm moving to Canada",
        title: 'Pre-arrival Plans',
        icon: 'tile-pre-arrival',
      },
      {
        key: 'home-internet',
        ask: 'I need Wi-Fi at home',
        title: 'Home Internet',
        icon: 'tile-home-internet',
      },
      {
        key: 'mobile',
        ask: 'I want a better phone plan',
        title: 'Mobile Plans',
        icon: 'tile-mobile',
      },
      {
        key: 'business',
        ask: 'I run a business',
        title: 'Business Internet',
        icon: 'tile-business',
      },
    ],
    unsure: 'Not sure yet?',
    advisor: { label: "Talk to an advisor, it's free ›", href: '/contact' },
  },
} as const;

export const homeRedesignFaq: readonly FaqItemContent[] = [
  {
    id: 'carrier',
    question: 'Who will my plan actually be with?',
    answer:
      'Your plan is a real Rogers, Fido or Chatr account in your name. We are an authorized dealer: we help you choose, set everything up and stay your contact afterwards.',
  },
  {
    id: 'cost',
    question: 'Does it cost more to buy through you?',
    answer: 'No. You pay the carrier price, and our help costs nothing extra.',
  },
  {
    id: 'before',
    question: 'Can I get a Canadian number before I arrive?',
    answer:
      'Yes. With a pre-arrival plan you can order from abroad and get your Canadian number ready before you fly. [Confirm how far ahead people can order.]',
  },
  {
    id: 'keep',
    question: 'Can I keep my current phone number?',
    answer: 'Yes. When you switch mobile plans we handle the number transfer for you.',
  },
  {
    id: 'contract',
    question: 'Is there a contract?',
    answer:
      'No contract on any of our plans. [Confirm any device financing terms if you sell phones.]',
  },
  {
    id: 'install',
    question: 'How fast can I get home internet installed?',
    answer:
      '[Add your typical install timeline.] We book the install for you and keep you updated.',
  },
];

export type HomeRedesign = typeof homeRedesign;
export type RedesignCategory = HomeRedesign['categories'][number];
// Re-exported for page compositions.
export type { CpCtaBandContent, CpFeatureCardContent, CpStepContent };
