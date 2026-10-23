import type {
  CpCtaBandContent,
  CpFeatureCardContent,
  CpStepContent,
  FaqItemContent,
  FigmaAsset,
} from '@canadian-plans/ui/canadian-plans';

/**
 * Electric Blue homepage redesign (14 October 2026); copy rewritten for search on
 * 23 October 2026 (docs/marketing/seo-content-research-2026-10-23.md). Every price and
 * claim below traces to docs/LAUNCH_PLANS.md or docs/OPEN_INPUTS.md. Commercial values
 * remain backend-authoritative.
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

export interface HomeTestimonial {
  readonly id: string;
  readonly photo: string;
  readonly alt: string;
  readonly photoHint: string;
  readonly category: string;
  readonly tone: 'amber' | 'mint' | 'navy';
  readonly quote: string;
  readonly name: string;
  readonly meta: string;
}

/** Empty until the owner supplies real, consented customer reviews. */
const homeTestimonials: readonly HomeTestimonial[] = [];

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
      newcomer: {
        tab: "I'm moving to Canada",
        eyebrow: 'Authorized Rogers, Fido & Chatr reseller · Surrey, BC',
        title: 'Canadian SIM card and phone plans for newcomers, ready before you arrive.',
        description:
          'Order a Rogers, Fido or Chatr eSIM from any country and get your Canadian number before you fly. Add home internet when you move in. Nothing is paid online.',
        price: 'eSIM plans from $35/mo + tax',
        chips: ['✓ Nothing paid online', '✓ No credit check'],
        needs: ['A number before I arrive', 'Home internet when I move in', 'Both'],
        fieldLabel: 'Arrival date',
        fieldHint: 'e.g. Jan 15, 2027',
        cta: 'See plans for newcomers →',
        badgeTop: 'eSIM plans from',
        badgePrice: '$35',
        photo: 'PHOTO · newcomer at arrivals, phone in hand (real customer, with consent)',
      },
      resident: {
        tab: 'I already live in Canada',
        eyebrow: 'Authorized sales agent · Surrey, BC',
        title: 'Phone and home internet plans in Canada, with the real price up front.',
        description:
          'Bring your own phone and keep your number, or book home internet in BC, Alberta, Manitoba and Saskatchewan. A real advisor sets it up with you.',
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
    },
    needLabel: 'I need',
    assurances: ['No credit check on eSIM plans', 'Nothing paid until we confirm'],
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
    eyebrow: 'No contract on any plan',
    title: 'What do you need in Canada?',
    description: 'Pick a service to see every plan and its real monthly price.',
    cards: [
      {
        key: 'pre-arrival',
        title: 'SIM before you arrive',
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
    bundleLink: 'Set up a phone plan and home internet together with an advisor ›',
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
        title: 'SIM before you arrive',
        dollars: '35',
        cents: '.00',
        icon: 'column-pre-arrival',
        features: [
          'Canadian number before you land',
          'eSIM by email, no credit check',
          'Works the moment you arrive',
        ],
      },
      {
        key: 'home-internet',
        title: 'Home Internet',
        dollars: '50',
        cents: '.00',
        icon: 'column-home-internet',
        features: ['Unlimited data', 'Free professional install', 'No upfront payment'],
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
    title: 'Everything a newcomer needs to get connected in Canada.',
    navLabel: 'Service categories',
    info: {
      title: 'Who am I buying from?',
      body: 'Your plan is a real account in your name. For eSIM plans you order before you arrive, that account is with Rogers, Fido or Chatr. For home internet and mobile, your advisor confirms the provider before anything is set up. Canadian Plans is the authorized reseller or sales agent that sets it up and stays your contact. We charge you nothing for that.',
      action: 'How buying through us works',
      href: '/about',
    },
    help: {
      lead: 'Not sure which plan fits?',
      links: [
        { label: 'Find my plan ›', href: '/pre-arrival-sim#plans', finder: true },
        { label: 'Newcomer guides ›', href: '/guides' },
      ],
    },
  },
  categories: [
    {
      key: 'pre-arrival',
      nav: 'SIM before you arrive',
      tone: 'amber',
      art: 'art-pre-arrival',
      feature: {
        title: 'Land in Canada with a working phone number',
        body: 'Order a Rogers, Fido or Chatr eSIM 1 to 3 weeks before your flight. Install it at home, turn it on when you land, and skip the airport SIM kiosk and the roaming bill.',
      },
      banner: {
        eyebrow: 'Canadian SIM before you arrive',
        title: 'Canadian SIM card and eSIM, ready before you arrive.',
        action: 'See eSIM plans',
        pricePrefix: 'from',
        price: '$35',
        priceSuffix: '/mo',
        photo: 'PHOTO · eSIM QR code next to passport & boarding pass',
      },
      steps: {
        title: 'How it works',
        aside: 'Done in 3 steps',
        items: [
          {
            id: 'order',
            marker: '1',
            title: 'Order from any country',
            body: 'Pick a plan and fill in one short form. No payment and no documents to upload.',
            meta: '~2 min',
            art: 'step-pa-order',
          },
          {
            id: 'esim',
            marker: '2',
            title: 'Get your eSIM by email',
            body: 'An advisor confirms your order, then emails your QR code. Scan it at home before you fly.',
            meta: 'Before your flight',
            art: 'step-pa-esim',
          },
          {
            id: 'online',
            marker: '✓',
            title: 'Land and switch on',
            body: 'Turn off airplane mode at arrivals. Calls, texts and data work from minute one.',
            meta: 'On arrival',
            done: true,
            art: 'step-pa-online',
          },
        ],
      },
      cards: {
        title: 'Why get your Canadian number before you land',
        columns: 3,
        items: [
          {
            id: 'bank',
            title: 'Open a bank account sooner',
            body: 'Banks text a code to a Canadian number. Have one before your first appointment.',
            icon: 'why-pa-bank',
          },
          {
            id: 'forms',
            title: 'Fill in school, job and rental forms',
            body: 'Give your college, employer and landlord a real local number from day one.',
            icon: 'why-pa-forms',
          },
          {
            id: 'roaming',
            title: 'No roaming bill, no airport kiosk',
            body: 'Skip roaming fees from your home carrier and the line at the arrivals SIM counter.',
            icon: 'why-pa-roaming',
          },
        ],
      },
      cta: {
        icon: 'cta-pre-arrival',
        title: 'Ready for your Canadian number?',
        subtitle: 'Order in about 2 minutes. No credit check, nothing paid online.',
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
        title: 'Home internet with free installation and no upfront payment',
        body: 'Unlimited data and a WiFi router included, in British Columbia, Alberta, Manitoba and Saskatchewan. We book the install and stay your contact afterwards, so you are never stuck on hold.',
      },
      banner: {
        eyebrow: 'Home Internet',
        title: 'Home internet plans in BC, Alberta, Manitoba and Saskatchewan.',
        action: 'See internet plans',
        pricePrefix: 'from',
        price: '$50',
        priceSuffix: '/mo',
        photo: 'PHOTO · home internet modem in a bright living room',
      },
      cards: {
        title: 'What every internet plan includes',
        columns: 2,
        items: [
          {
            id: 'install',
            title: 'Free professional install',
            body: 'A technician sets up your modem and WiFi, usually within about 3 days of your call.',
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
            title: 'WiFi router and modem included',
            body: 'No monthly equipment rental. Speeds up to 2 Gbps, depending on your province.',
            chip: 'Up to 2 Gbps',
            icon: 'feature-hi-wifi',
          },
          {
            id: 'moving',
            title: 'Moving? It moves with you',
            body: 'Tell your advisor your new address and we check availability and book the transfer.',
            chip: 'We handle it',
            icon: 'feature-hi-moving',
          },
        ],
      },
      cta: {
        icon: 'cta-home-internet',
        title: 'Is home internet available at your address?',
        subtitle: 'Free installation, unlimited data, no contract, nothing paid up front.',
        primary: { label: 'See plans by province →', href: '/home-internet' },
        secondary: { label: 'Talk to an advisor ›', href: '/contact' },
      },
    },
    {
      key: 'mobile',
      nav: 'Mobile Plans',
      tone: 'blue',
      art: 'art-mobile',
      feature: {
        title: 'Bring your own phone, keep your number',
        body: 'Three postpaid plans with unlimited talk and text, from 100 GB Canada + US at $40 a month. We request the number transfer for you, and one advisor stays on your account.',
      },
      banner: {
        eyebrow: 'Mobile Plans',
        title: 'Bring your own phone plans with unlimited talk and text.',
        action: 'See mobile plans',
        pricePrefix: 'from',
        price: '$40',
        priceSuffix: '/mo',
        photo: 'PHOTO · advisor helping a customer compare phones',
      },
      steps: {
        title: 'Keep your number. We move it for you.',
        aside: 'Done in 3 steps',
        items: [
          {
            id: 'details',
            marker: '1',
            title: 'Share your details',
            body: 'Your current provider, account number and PIN, plus government ID for the credit check.',
            meta: '2 min',
            art: 'step-mb-details',
          },
          {
            id: 'transfer',
            marker: '2',
            title: 'We request the transfer',
            body: "Don't cancel your old plan. The transfer closes it once your number moves.",
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
            title: 'Bring your own unlocked phone',
            body: 'eSIM or a SIM card, whichever your phone supports.',
            icon: 'why-mb-phone',
          },
          {
            id: 'carriers',
            title: 'One advisor, every plan explained',
            body: 'Your advisor compares the three plans with you and confirms the price before anything changes.',
            icon: 'why-mb-carriers',
          },
          {
            id: 'credit',
            title: 'New to Canada? Start with an eSIM plan',
            body: 'These mobile plans need a credit check. Our eSIM plans for newcomers do not.',
            icon: 'why-mb-credit',
          },
        ],
      },
      cta: {
        icon: 'cta-mobile',
        title: 'Ready to switch and keep your number?',
        subtitle: 'Compare the three plans in a few minutes. Nothing paid online.',
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
            body: 'Reliable WiFi for payments, orders and guests.',
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
    title: 'How to get a phone plan or home internet through Canadian Plans',
    description:
      'Choose a plan, send one short form, and a real advisor does the rest. No contract, no store visit, and nothing is paid on this website.',
    primary: { label: 'Find my plan', href: '/pre-arrival-sim#plans' },
    secondary: { label: 'Talk to an advisor', href: '/contact' },
    stepLabel: 'Step',
    listLabel: 'How it works',
    steps: [
      {
        title: 'Choose your plan',
        body: 'Compare eSIM, mobile and home internet plans with the real monthly price, or tell us what you need and we match you.',
        overlay: 'Pick in minutes',
        photo: 'PHOTO · customer browsing plans on phone',
      },
      {
        title: 'An advisor confirms it with you',
        body: 'Usually the same day, by phone or email. They check your plan, your dates and anything the provider needs before it is set up.',
        overlay: 'We do the setup',
        photo: 'PHOTO · advisor on a call / SIM being prepared',
      },
      {
        title: 'You are connected',
        body: 'Your eSIM arrives by email, your number moves over, or your internet install is booked. The same advisor stays your contact.',
        overlay: 'You are online',
        photo: 'PHOTO · happy customer at home, connected',
      },
    ],
  },
  testimonials: {
    eyebrow: 'Customer stories',
    title: "People we've helped get connected",
    more: { label: 'Read more reviews', href: '#stories' },
    /** Real reviews used with permission only; never invent quotes. Empty hides the section. */
    items: homeTestimonials,
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Questions newcomers ask us',
    description: 'Short answers first. For anything else, a real advisor can walk you through it.',
    helpTitle: 'Still have questions?',
    helpBody:
      'Call or email us, Monday to Saturday, 9am to 9pm Pacific. Our help costs nothing extra.',
    helpAction: { label: 'Talk to an advisor', href: '/contact' },
    symbols: { expand: '+', collapse: '−' },
  },
  final: {
    eyebrow: "Let's get you connected",
    title: 'So, what do you need today?',
    description:
      "Tap what fits and we'll show you the right plans with real prices. Need a phone plan and home internet? An advisor sets up both.",
    tiles: [
      {
        key: 'pre-arrival',
        ask: "I'm moving to Canada",
        title: 'SIM before you arrive',
        icon: 'tile-pre-arrival',
      },
      {
        key: 'home-internet',
        ask: 'I need WiFi at home',
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

/**
 * Homepage FAQ. Each answer must stand on its own when quoted in a search result, so it
 * repeats the key fact instead of pointing elsewhere.
 */
export const homeRedesignFaq: readonly FaqItemContent[] = [
  {
    id: 'before',
    question: 'Can I get a Canadian phone number before I arrive in Canada?',
    answer:
      'Yes. Order a Rogers, Fido or Chatr eSIM from any country 1 to 3 weeks before your flight. An advisor confirms the order, your Canadian number is assigned, and your eSIM QR code arrives by email. Install it at home and the line starts when you land.',
  },
  {
    id: 'credit',
    question: 'Do I need a Canadian credit history or a credit check?',
    answer:
      'Not for the eSIM plans you order before you arrive: no credit check and no Canadian credit history. The bring-your-own-phone mobile plans for people already in Canada are postpaid and do need an identity and credit check.',
  },
  {
    id: 'pay',
    question: 'When do I pay, and what do I pay Canadian Plans?',
    answer:
      'Nothing is paid on this website, on any plan. After your plan is active, the provider bills you directly for the monthly price plus tax. Canadian Plans charges no SIM, activation or shipping fee, and our help costs you nothing.',
  },
  {
    id: 'carrier',
    question: 'Who will my plan actually be with?',
    answer:
      'For eSIM plans you order before you arrive, your plan is a real Rogers, Fido or Chatr account in your name. For home internet and mobile plans, your advisor confirms the provider with you before anything is set up. Canadian Plans is the authorized reseller or sales agent, not the carrier.',
  },
  {
    id: 'keep',
    question: 'Can I keep my current phone number when I switch?',
    answer:
      'Yes. Keep your old plan active, give us your account number and PIN, and we request the transfer. Your number usually moves the same day and your phone keeps working throughout.',
  },
  {
    id: 'contract',
    question: 'Is there a contract?',
    answer:
      'No. None of the plans has a contract, including home internet with a 2-year price lock in BC, Alberta and Manitoba. Your service agreement is with the provider, and your advisor explains its terms before anything is activated.',
  },
  {
    id: 'install',
    question: 'How fast can home internet be installed?',
    answer:
      'Usually within about 3 days of your call with an advisor, in British Columbia, Alberta, Manitoba and Saskatchewan. Installation is free, the WiFi router and modem are included, and nothing is paid up front.',
  },
  {
    id: 'cancel',
    question: 'Can I cancel?',
    answer:
      'Before activation, yes, at no cost: tell your advisor and we cancel the order. After activation your plan is with the provider, so you cancel with them under their terms. Because Canadian Plans takes no payment, there is nothing for us to refund.',
  },
];

export type HomeRedesign = typeof homeRedesign;
export type RedesignCategory = HomeRedesign['categories'][number];
// Re-exported for page compositions.
export type { CpCtaBandContent, CpFeatureCardContent, CpStepContent };
