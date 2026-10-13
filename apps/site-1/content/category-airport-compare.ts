import type { ChromeContent, FooterContent } from '@content/components';
import type { FigmaAsset } from '@canadian-plans/ui/canadian-plans';
import { chromeContent, componentAssets, footerContent } from '@content/components';

export const categoryChrome: ChromeContent = {
  ...chromeContent,
  phone: { ...chromeContent.phone, href: '#faq' },
  track: { ...chromeContent.track, href: '/track' },
  contact: { ...chromeContent.contact, href: '#faq' },
  help: { ...chromeContent.help, href: '#faq' },
  navigation: [
    { label: 'Pre-arrival SIM', href: '/pre-arrival-sim#plans' },
    { label: 'Home Internet', href: '/home-internet' },
    { label: 'Mobile Plans', href: '/mobile-plans' },
    { label: 'Guides', href: '/guides' },
  ],
  promo:
    'Order your Canadian eSIM before you fly. It works from any country and is ready in minutes.',
  promoLink: { label: 'See SIM plans', href: '/pre-arrival-sim#plans' },
  promoMobileLabel: 'See SIM plans →',
};

export const categoryAssets = {
  ...componentAssets,
  phone: {
    src: '/design/category-airport-compare/airport-mobile-imgPhoneIcon.svg',
    width: 16,
    height: 16,
    nodeId: '256:1041',
  },
  airportPerforation: {
    src: '/design/category-airport-compare/airport-desktop-imgEllipse1.svg',
    width: 28,
    height: 28,
    nodeId: '186:595',
  },
  planCheck: {
    src: '/design/category-rogers/mobile-imgIconCheck.svg',
    width: 18,
    height: 18,
    nodeId: '316:686',
  },
} satisfies typeof componentAssets & {
  airportPerforation: FigmaAsset;
  planCheck: FigmaAsset;
};
export const categoryFooter: FooterContent = footerContent;

export const airportCopy = {
  metaTitle: 'Toronto Pearson (YYZ) eSIM arrival guide | Canadian Plans',
  previewNotice: 'Design preview · sample content and prices require approval before publication.',
  skip: 'Skip to Pearson arrival guide',
  breadcrumbLabel: 'Breadcrumb',
  breadcrumbSeparator: '/',
  breadcrumb: [
    { label: 'Home', href: '/' },
    { label: 'Pre-arrival SIM', href: '/pre-arrival-sim' },
    { label: 'Toronto Pearson (YYZ)' },
  ],
  hero: {
    eyebrow: 'Pre-arrival eSIM · Toronto Pearson (YYZ)',
    title: 'Landing at Pearson? Get signal before you leave the gate.',
    description:
      'Order your eSIM before you fly and switch it on when your plane touches down at YYZ. No airport kiosk, no roaming charges.',
    price: 'From $35/mo + tax',
    saving: {
      lead: 'Normally',
      amount: '$60/mo',
      detail: 'if you buy it in Canada.',
      emphasis: 'Pay $0 today.',
    },
    primary: 'See eSIM plans ↓',
    secondary: 'Is my phone eSIM-ready?',
    landedLead: 'Already landed?',
    landedText: 'Order now and an advisor confirms it the same day.',
    landedLink: 'Need a number now? Talk to a person →',
    features: [
      'Authorized Rogers, Fido & Chatr dealer',
      'Order from any country',
      'No airport kiosk needed',
    ],
    boardingPass: {
      ariaLabel: 'YYZ eSIM arrival pass preview',
      priceDetailsLabel: 'Arrival pass price details',
      brand: 'Canadian Plans',
      terminal: 'Arrivals · T1 & T3',
      fromLabel: 'From',
      from: 'ANY',
      fromDetail: 'Your home country',
      toLabel: 'To',
      to: 'YYZ',
      toDetail: 'Toronto Pearson',
      passengerLabel: 'Traveller',
      passenger: 'Arriving at YYZ',
      planLabel: 'Plan',
      plan: 'Fido 75 GB eSIM',
      numberLabel: 'Canadian number',
      number: '+1 (416) ··· ··17',
      statusLabel: 'Status',
      status: 'Ready to activate',
      instruction:
        'Order 1–3 weeks before departure. Activates in seconds on arrival, no Wi-Fi needed.',
      amountLabel: 'YYZ eSIM',
      amount: '$35',
      period: '/mo · CAD',
      perforation: categoryAssets.airportPerforation,
    },
  },
  article: {
    label: 'Article details',
    authorInitial: 'AR',
    author: 'Ananya R.',
    authorDetail: 'Written by · student, Pune → Toronto',
    reviewerInitial: 'P',
    reviewer: 'Priya',
    reviewerDetail: 'Reviewed by · plan advisor',
    updated: 'Updated 5 Oct 2026 · 6 min read',
    contentsLabel: 'On this page:',
    navLabel: 'On this page',
    contents: [
      { label: 'Plans', href: '#plans' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Documents', href: '#documents' },
      { label: 'Arrival guide', href: '#arrival-guide' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  quick: {
    eyebrow: 'Quick answer',
    title: 'Can I use my phone as soon as I land at Toronto Pearson?',
    answer:
      "Yes. Order a Canadian eSIM 1 to 3 weeks before your flight and install it at home. When you land at Pearson (YYZ), turn off airplane mode and you're connected. No airport Wi-Fi or SIM kiosk needed. Plans start at $35 a month (CAD, plus tax).",
  },
  plans: {
    eyebrow: 'SIM PLANS',
    heading: 'Pick your plan before you land',
    description: 'Every plan is an eSIM with no upfront payment, and it works the minute you land.',
    priceNote: 'Prices as of Oct 2026 · CAD, taxes extra',
    choose: 'Choose this plan',
    selected: 'Plan selected',
    empty: 'Choose a sample plan to continue to the design-preview checkout.',
    featuresLabel: 'Plan features',
    continue: 'Continue to preview checkout',
    plans: [
      {
        id: 'preview-fido-essential',
        previewOnly: true as const,
        carrier: 'Fido · Essential',
        allowance: '75 GB',
        amount: '$35',
        period: '/mo',
        goodForLabel: 'Good for',
        goodFor: 'Everyday use at a lower monthly cost',
        features: 'Unlimited Canada talk & text · 1,000 int’l minutes · eSIM',
        previous: 'Normally $60/mo in Canada',
        badge: '',
        mobileRank: 2,
      },
      {
        id: 'preview-rogers-plus',
        previewOnly: true as const,
        carrier: 'Rogers · Plus',
        allowance: '100 GB',
        amount: '$40',
        period: '/mo',
        goodForLabel: 'Good for',
        goodFor: 'Streaming and video calls home',
        features: 'Unlimited Canada talk & text · 1,000 int’l minutes · 5G',
        previous: 'Normally $80/mo in Canada',
        badge: 'Most popular',
        mobileRank: 1,
      },
      {
        id: 'preview-rogers-unlimited',
        previewOnly: true as const,
        carrier: 'Rogers · Unlimited',
        allowance: '120 GB',
        amount: '$50',
        period: '/mo',
        goodForLabel: 'Good for',
        goodFor: 'Heavy data and trips to the USA',
        features: 'Unlimited Canada–US talk & text · USA roaming · 1,000 int’l minutes',
        previous: '',
        badge: '',
        mobileRank: 3,
      },
    ],
  },
  how: {
    eyebrow: 'Your arrival at YYZ, step by step',
    heading: ['From touchdown to texting home.'],
    subheading: [],
    imageLabel: 'IMAGE',
    imageAlt: 'Traveller scanning the eSIM QR code on their phone at home',
    steps: [
      {
        number: '1',
        when: '3 weeks before',
        title: 'Order your eSIM',
        description: '2 minutes online from any country. No payment.',
      },
      {
        number: '2',
        when: '2 weeks before',
        title: 'Get your number',
        description:
          'We confirm on WhatsApp and give you your Canadian number. Use it on bank, school and work forms.',
      },
      {
        number: '3',
        when: 'Before you fly',
        title: 'Install at home',
        description: 'Scan the QR code on Wi-Fi at home. It stays off until you land.',
      },
      {
        number: '4',
        when: 'Day 1',
        title: 'Land & switch on',
        description: 'Online at arrivals. Message family before baggage claim.',
      },
    ],
  },
  documents: {
    eyebrow: 'Before you land',
    heading: 'Before you land, have ready',
    imageLabel: 'IMAGE',
    imageAlt: 'Passport, permit papers and a phone laid out on a table',
    items: [
      { title: 'Passport', description: 'Photo page, the one with your name and photo' },
      {
        title: 'Your study or work permit, or PR confirmation',
        description: 'A clear photo or PDF',
      },
      { title: 'Arrival date & city', description: 'So your plan starts the day you land' },
      { title: 'Email address', description: 'We send your eSIM QR code here' },
    ],
    phoneTitle: 'Is my phone eSIM-ready?',
    phoneIntro: 'Your phone must be unlocked and support eSIM. Check in 30 seconds:',
    devices: [
      { name: 'iPhone', detail: 'Settings → General → About → look for “EID” or “Digital SIM”.' },
      {
        name: 'Samsung / Android',
        detail: 'Settings → Connections → SIM manager → look for “Add eSIM”.',
      },
    ],
    notSure: 'Not sure?',
    help: 'Send us your phone model on WhatsApp and we’ll check for you.',
  },
  guide: {
    eyebrow: 'Arrival guide',
    heading: 'Arriving at Toronto Pearson: your phone guide',
    imageLabel: 'IMAGE',
    imageAlt:
      'Traveller booking a ride on their phone at the Pearson ground transportation pickup area',
    questions: [
      {
        question: 'Is there free Wi-Fi at Pearson Airport?',
        answer:
          'Yes, Pearson has free Wi-Fi, but you have to log in and it can be busy at peak times. With your eSIM already installed, you can book a ride or message family right away.',
      },
      {
        question: 'Should I just buy a SIM at the airport?',
        answer:
          "You can, but airport prices are often higher, and after a long flight there may be a line. Ordering before you fly means your number is ready for forms, and you're online the moment you land.",
      },
      {
        question: 'Which network works best in Toronto?',
        answer:
          'Rogers, Fido and Chatr all use the Rogers network, which covers Toronto and the GTA well. The difference between them is price and extras, not signal.',
      },
    ],
    factsTitle: 'Key facts',
    facts: [
      ['Price range', '$35–$50/mo · CAD + tax'],
      ['Payment today', '$0, no upfront payment'],
      ['When to order', '1–3 weeks before your flight'],
      ['How you get it', 'eSIM by email, any country'],
      ['Plan starts', 'When you land'],
      ['Networks', 'Rogers · Fido · Chatr'],
      ['Updated', '5 Oct 2026'],
    ] as const,
  },
  reviews: {
    eyebrow: 'REVIEWS',
    title: ['Newcomers', 'recommend us.'],
    score: '4.8',
    stars: '★★★★★',
    count: '1,200+ Google reviews',
    ratingLabel: 'Five out of five stars',
    items: [
      {
        stars: '★★★★★',
        quote:
          '“Had my Canadian number two weeks before my flight. Used it to open my bank account online. Landed at Pearson and it just worked.”',
        name: 'Aarav S.',
        detail: 'Student · Delhi → Toronto',
      },
      {
        stars: '★★★★★',
        quote:
          '“Set up the eSIM at home in Manila. I turned off airplane mode at Pearson and had signal before baggage claim.”',
        name: 'Maria L.',
        detail: 'Nurse · Manila → Brampton',
      },
      {
        stars: '★★★★★',
        quote:
          '“Clear prices, no surprises on the first bill. The advisor explained Fido vs Rogers in plain words.”',
        name: 'Tanvir H.',
        detail: 'PR · Dhaka → Calgary',
      },
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    title: ['Pearson arrival', 'questions'],
    description:
      'Talk to an advisor, Monday to Saturday, 9am–9pm Pacific (noon to midnight Eastern).',
    button: 'WhatsApp us',
    expand: '+',
    collapse: '−',
    items: [
      {
        id: 'arrival',
        question: 'Will my eSIM work the moment I land at YYZ?',
        answer:
          'Yes. If you install it at home before your flight, it connects as soon as you turn off airplane mode at Pearson.',
      },
      {
        id: 'landed',
        question: 'I’ve already landed. Can I still order?',
        answer:
          'Yes. Choose a plan and an advisor will call you to confirm. If you need a number right now, message us on WhatsApp and we’ll tell you the fastest way to get connected.',
      },
      {
        id: 'wifi',
        question: 'Do I need Wi-Fi at the airport to turn it on?',
        answer: 'This answer is awaiting approved content. Talk to an advisor for current details.',
      },
      {
        id: 'device',
        question: 'How do I know if my phone supports eSIM?',
        answer: 'This answer is awaiting approved content. Talk to an advisor for current details.',
      },
      {
        id: 'flight',
        question: 'What if my flight changes?',
        answer: 'This answer is awaiting approved content. Talk to an advisor for current details.',
      },
      {
        id: 'family',
        question: 'Can I order eSIMs for my whole family?',
        answer: 'This answer is awaiting approved content. Talk to an advisor for current details.',
      },
      {
        id: 'airport',
        question: 'What if I land at a different airport?',
        answer: 'This answer is awaiting approved content. Talk to an advisor for current details.',
      },
    ],
  },
  explore: {
    title: 'Explore more',
    groups: [
      {
        title: 'Other audiences',
        links: [
          { label: 'Workers →', href: '/pre-arrival-sim#plans' },
          { label: 'Permanent residents →', href: '/pre-arrival-sim#plans' },
          { label: 'Visitors →', href: '/pre-arrival-sim#plans' },
        ],
      },
      {
        title: 'Popular countries',
        links: [
          'India →',
          'Bangladesh →',
          'Philippines →',
          'Nigeria →',
          'Pakistan →',
          'Nepal →',
        ].map((label) => ({ label, href: '/pre-arrival-sim#plans' })),
      },
      {
        title: 'Student guides',
        links: [
          { label: 'Best SIM for students from India →', href: '/guides' },
          { label: 'Is my phone eSIM-ready? →', href: '#documents' },
          { label: 'First-week checklist →', href: '/guides' },
        ],
      },
    ],
    sourceNote:
      'Sources: Rogers.com, Fido.ca and Chatr.com plan pages, checked 5 Oct 2026. Prices change often, so we update this page monthly.',
  },
  final: {
    title: 'Signal on, before you clear customs.',
    description: 'Choose a plan in 2 minutes. Pay $0 today. An advisor confirms it the same day.',
    primary: 'See eSIM plans →',
    secondary: 'Talk to an advisor',
  },
} as const;

export const compareCopy = {
  metaTitle: 'Rogers vs Fido prepaid plans: compare price, data & features | Canadian Plans',
  previewNotice: 'Design preview · sample plan details require approval before publication.',
  skip: 'Skip to Rogers vs Fido comparison',
  breadcrumbLabel: 'Breadcrumb',
  breadcrumbSeparator: '/',
  breadcrumb: [
    { label: 'Home', href: '/' },
    { label: 'Compare', href: '/mobile-plans' },
    { label: 'Rogers vs Fido' },
  ],
  promo: 'Switching to Rogers or Fido? Keep your number — we handle the transfer.',
  promoLink: { label: 'How switching works', href: '#switching' },
  promoMobileLabel: 'How switching works →',
  hero: {
    eyebrow: 'Compare · Prepaid plans',
    title: 'Rogers vs Fido: which prepaid plan is better?',
    description:
      'Same towers, different price. Here are both prepaid plans side by side, so you can see what you get for the money.',
    price: [
      { carrier: 'Fido', amount: '$29/mo' },
      { carrier: 'Rogers', amount: '$34/mo' },
    ],
    tax: '+ tax',
    primary: 'See the full comparison ↓',
    secondary: 'Talk to an advisor',
    notes: ['Unbiased comparison', '$0 until we call', 'Switch either way, free help'],
    specsTitle: 'At a glance',
    carrierLabels: ['Rogers', 'Fido'],
    specs: [
      ['Network', 'Rogers 5G+', 'Rogers towers'],
      ['Price', '$34/mo', '$29/mo'],
      ['Data', '25GB', '20GB'],
      ['Overage', 'Slows, no overage', 'Slows, no overage'],
      ['US roaming', '5GB included', 'Not included'],
      ['Best for', 'Heavy data users', 'Budget shoppers'],
    ],
  },
  article: {
    label: 'Article details',
    authorInitial: 'AR',
    author: 'Ananya R.',
    authorDetail: 'Written by · Canadian Plans',
    reviewerInitial: 'P',
    reviewer: 'Priya',
    reviewerDetail: 'Reviewed by · plan advisor',
    updated: 'Updated 5 Oct 2026 · 7 min read',
    contentsLabel: 'On this page:',
    navLabel: 'On this page',
    contents: [
      { label: 'Plans', href: '#plans' },
      { label: 'Recommendations', href: '#recommendations' },
      { label: 'Switching', href: '#switching' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  quick: {
    eyebrow: 'Quick answer',
    title: 'Rogers vs Fido: what should you pick?',
    answer:
      'Fido is the lower-price pick at $29/mo for 20 GB in this preview. Rogers adds 5 GB for $5 more. Both use Rogers coverage, so compare the included features and your monthly budget. Prices and plan details are sample content pending approval.',
  },
  scorecard: {
    title: 'Rogers vs Fido at a glance',
    pick: 'Fido',
    pickLabel: 'Best value for most people',
    summary:
      'Our pick for most newcomers. Choose Rogers if you need more data or US roaming. Not paid by any carrier.',
    rows: [
      { label: 'Coverage', detail: 'Same Rogers towers for both', winner: 'Tie' },
      { label: 'US roaming', detail: 'Rogers: 5GB included. Fido: none', winner: 'Rogers' },
      { label: 'Monthly price', detail: 'Fido $29 vs Rogers $34', winner: 'Fido' },
      { label: 'Data', detail: 'Rogers 25GB vs Fido 20GB', winner: 'Rogers' },
      { label: 'Newcomer-friendly', detail: 'Both prepaid, no credit check', winner: 'Tie' },
    ],
  },
  plans: {
    eyebrow: 'SIDE-BY-SIDE',
    title: 'Rogers and Fido plans compared',
    description: 'Compare the monthly price, data and included features before you switch.',
    sortLabel: 'Sort by',
    sortOptions: [
      { label: 'Price', value: 'price' as const },
      { label: 'Data', value: 'data' as const },
    ],
    columns: ['Feature', 'Fido prepaid', 'Rogers prepaid'],
    dataHeading: 'Data',
    compareTableLabel: 'Rogers and Fido plan feature comparison',
    threeCarrierTableLabel: 'Rogers, Fido, and Chatr comparison',
    cards: [
      {
        id: 'fido',
        name: 'Fido prepaid',
        price: 29,
        priceLabel: '$29',
        data: 20,
        dataLabel: '20 GB',
        periodLabel: '/mo + tax',
        features: ['Unlimited Canada-wide talk & text', '5G network', 'No US roaming included'],
        href: '/mobile-plans#mobile-plans',
        cta: 'See Fido plans',
        previewOnly: true,
      },
      {
        id: 'rogers',
        name: 'Rogers prepaid',
        price: 34,
        priceLabel: '$34',
        data: 25,
        dataLabel: '25 GB',
        periodLabel: '/mo + tax',
        features: [
          'Unlimited Canada-wide talk & text',
          '5G+ network',
          '5GB Canada–US roaming included',
        ],
        href: '/mobile-plans/rogers#plans',
        cta: 'See Rogers plans',
        previewOnly: true,
      },
    ],
    rows: [
      ['Monthly price', '$29/mo', '$34/mo'],
      ['Data', '20 GB', '25 GB'],
      ['Network', 'Rogers towers', 'Rogers 5G+'],
      ['Talk & text', 'Unlimited Canada-wide', 'Unlimited Canada-wide'],
      ['Overage', 'Data pauses at limit', 'Data pauses at limit'],
      ['US use', 'Not included', 'Pay per use'],
    ],
    fidoLink: '/mobile-plans#mobile-plans',
    rogersLink: '/mobile-plans/rogers#plans',
    fidoCta: 'See Fido plans',
    rogersCta: 'See Rogers plans',
    disclosure:
      'Preview only: $29 Fido and $34 Rogers prepaid examples are not connected to a live offer or checkout. Confirm current pricing, taxes, data and terms with the carrier.',
  },
  recommendations: {
    eyebrow: 'OUR TAKE',
    title: 'Which prepaid plan fits you?',
    fidoTitle: 'Choose Fido if…',
    rogersTitle: 'Choose Rogers if…',
    fido: [
      'You want a lower monthly bill.',
      '20 GB is enough for your usual month.',
      'You do not need US roaming.',
      'You want to stay on Rogers coverage and spend less.',
    ],
    rogers: [
      'You want 5 GB more data.',
      'You regularly stream or use maps on the go.',
      'You prefer the Rogers brand and 5G+ label.',
      'The extra $5 per month fits your budget.',
    ],
  },
  carrierCompare: {
    eyebrow: 'THREE OPTIONS',
    title: 'Rogers vs Fido vs Chatr',
    columns: ['What matters', 'Rogers', 'Fido', 'Chatr'],
    rows: [
      ['Network', 'Rogers', 'Rogers', 'Rogers'],
      ['Price point', 'Higher', 'Lower', 'Value-focused'],
      ['Plan style', 'Prepaid & postpaid', 'Prepaid & postpaid', 'Prepaid'],
      ['Best for', 'More plan choice', 'Lower monthly price', 'Simple prepaid'],
    ],
    note: 'Carrier features and prices change. This comparison is a design preview, not a current offer.',
  },
  switching: {
    eyebrow: 'Keep your number',
    title: 'Switch to Rogers or Fido in 4 steps',
    subtitle:
      'We help you bring your number across. Wait until your new service is ready before cancelling your old plan.',
    steps: [
      [
        '1',
        'Choose your plan',
        'Compare the current carrier offer and confirm it meets your needs.',
      ],
      [
        '2',
        'Keep your current SIM active',
        'Your old provider must be able to approve the number transfer.',
      ],
      [
        '3',
        'Request the transfer',
        'Use your account details and follow the carrier’s confirmation message.',
      ],
      [
        '4',
        'Check your new service',
        'When your old SIM stops working, test calls, texts and data on the new SIM.',
      ],
    ],
  },
  guide: {
    eyebrow: 'Rogers or Fido',
    title: 'How to choose between Rogers and Fido',
    imageLabel: 'IMAGE',
    imageAlt: 'A phone displaying the Rogers and Fido plan comparison',
    paragraphs: [
      [
        'Do Rogers and Fido use the same network?',
        'Both brands use Rogers network infrastructure. Coverage and speeds still depend on your location, device and plan terms.',
      ],
      [
        'Is Rogers worth $5 more?',
        'In this preview, Rogers includes 5 GB more data. Whether that is worth the difference depends on how much mobile data you use.',
      ],
      [
        'Can I keep my number?',
        'Most active Canadian mobile numbers can be transferred. Keep the old service active until the transfer completes.',
      ],
    ],
    factsTitle: 'Key facts',
    facts: [
      ['Preview prices', 'Fido $29 · Rogers $34 / mo'],
      ['Data', '20 GB · 25 GB'],
      ['Network', 'Rogers coverage'],
      ['Tax', 'Extra'],
      ['Status', 'Preview fixture only'],
    ],
  },
  reviews: {
    eyebrow: 'REVIEWS',
    title: ['Newcomers', 'recommend us.'],
    score: '4.8',
    stars: '★★★★★',
    count: '1,200+ Google reviews',
    ratingLabel: 'Five out of five stars',
    items: [
      {
        stars: '★★★★★',
        quote: '“The advisor helped me compare two plans without making the choice for me.”',
        name: 'Aarav S.',
        detail: 'Student · Toronto',
      },
      {
        stars: '★★★★★',
        quote: '“I kept my number and knew what to expect before switching.”',
        name: 'Maria L.',
        detail: 'Newcomer · Brampton',
      },
      {
        stars: '★★★★★',
        quote: '“Straightforward help and clear answers about the monthly cost.”',
        name: 'Tanvir H.',
        detail: 'Resident · Calgary',
      },
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    title: ['Rogers vs Fido', 'questions'],
    description: 'Still deciding? Talk to an advisor Monday to Saturday, 9am–9pm Pacific.',
    button: 'Talk to an advisor',
    imageLabel: 'IMAGE',
    imageAlt: 'Advisor helping a customer compare mobile plans',
    expand: '+',
    collapse: '−',
    items: [
      {
        id: 'network',
        question: 'Is Fido coverage the same as Rogers?',
        answer:
          'Fido uses Rogers network infrastructure. Actual coverage and performance depend on where you use your phone, your device and plan terms.',
      },
      {
        id: 'price',
        question: 'Why is Fido cheaper than Rogers?',
        answer:
          'Brands can price plans differently and include different data or features. The prices on this page are preview examples and need confirmation.',
      },
      {
        id: 'switch',
        question: 'Can I keep my phone number when I switch?',
        answer:
          'In most cases, yes. Keep your current service active while the new provider processes the transfer.',
      },
      {
        id: 'data',
        question: 'What happens when I use all my data?',
        answer:
          'The sample comparison says data pauses at the allowance. Check the current plan terms before you sign up.',
      },
      {
        id: 'usa',
        question: 'Can I use my plan in the United States?',
        answer:
          'The sample Fido option does not include US use; the Rogers example lists pay-per-use. Confirm roaming terms with the carrier.',
      },
      {
        id: 'fees',
        question: 'Are taxes included in the prices?',
        answer: 'No. The prices shown are monthly examples before tax.',
      },
    ],
  },
  explore: {
    title: 'Explore more',
    groups: [
      {
        title: 'Compare carriers',
        links: [
          { label: 'Rogers plans →', href: '/mobile-plans/rogers' },
          { label: 'Fido plans →', href: '/mobile-plans#mobile-plans' },
          { label: 'Chatr plans →', href: '/mobile-plans#mobile-plans' },
        ],
      },
      {
        title: 'Popular comparisons',
        links: [
          { label: 'Rogers vs Fido →', href: '/compare/rogers-vs-fido' },
          { label: 'Compare mobile plans →', href: '/mobile-plans' },
        ],
      },
      {
        title: 'Helpful guides',
        links: [
          { label: 'Keep your number when switching →', href: '/guides' },
          { label: 'Find a plan for Canada →', href: '/mobile-plans' },
        ],
      },
    ],
    sourceNote:
      'Carrier names are trademarks of their respective owners. Plan and price details are preview examples pending current product verification.',
  },
  final: {
    title: 'Pick the right plan. Keep your number.',
    description: 'Compare plans with an advisor before you switch.',
    primary: 'See current Rogers plans →',
    secondary: 'Talk to an advisor',
  },
} as const;
