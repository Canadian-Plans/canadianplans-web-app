import { componentAssets } from './components';
import {
  teamAuthor,
  teamReviewer,
  type ArticleBlock,
  type DeviceInstructions,
  type GuideArticle,
  type StudentComparison,
} from './guide-shared';
import { workFromHomeSpeedGuide } from './guides-internet';
import {
  carrierPickerGuide,
  firstWeekGuide,
  homeNumberGuide,
  newcomerGuides,
  numberBeforeArrivalGuide,
  phoneCompatibilityGuide,
} from './guides-newcomer';

export type { ArticleBlock, DeviceInstructions, GuideArticle, StudentComparison };

export const guideCopy = {
  skip: 'Skip to article',
  breadcrumb: 'Breadcrumb',
  separator: '/',
  imageLabel: 'Image',
  home: 'Home',
  guides: 'Guides',
  quick: 'Quick answer',
  contents: 'On this page',
  contentsDetail: 'Jump to any part',
  pendingAnswer: 'This answer is awaiting approved content. Talk to an advisor for help.',
  symbols: { expand: '+', collapse: '−' },
  check: '✓',
  tableHeaders: ['Plan', 'Data', 'Price', 'Best for'],
  tableLabel: 'Plan comparison',
  popular: '★ Most popular',
  popularStar: ' ★',
  inStore: ' in store',
  promotion: {
    title: 'Get your Canadian number before you fly',
    from: 'from',
    price: '$35',
    unit: '/mo + tax',
    button: 'See eSIM plans',
    detail: 'No credit check · Nothing paid online',
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
    title: 'Your Canadian number, ready before your flight.',
    description: 'Choose a plan in about 2 minutes. An advisor confirms it, usually the same day.',
    primary: 'See eSIM plans →',
    secondary: 'Talk to an advisor',
    note: 'Plans from $35/mo + tax · Nothing paid online',
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
  title: 'Best SIM for students from India moving to Canada (2026)',
  breadcrumbTitle: 'Best SIM for students from India',
  category: 'Phones & SIMs',
  description:
    'Which Canadian plan to pick, how much data you really need, how to keep your Indian number for OTPs, and how to get your Canadian number before you leave home.',
  author: teamAuthor,
  reviewer: teamReviewer,
  updated: '2026-10-23',
  updatedLabel: 'Updated 23 Oct 2026',
  readingLabel: '8 min read · Prices as of October 2026',
  imageCaption: 'Student from India at airport arrivals, phone in hand',
  quickAnswer:
    'Most students from India do well with a 75 to 100 GB monthly eSIM plan: Fido 75 GB for $35 or Rogers 100 GB for $40 a month (CAD, plus tax), both with 1,000 minutes to India. Order 1 to 3 weeks before your flight so your Canadian number is ready for your bank and college forms, and keep your Indian SIM for OTPs. There is no Canadian credit check and nothing is paid online.',
  blocks: [
    {
      kind: 'section',
      id: 'needs',
      title: 'What students from India really need in month one',
      text: 'In your first month you will give your phone number to your bank, your college portal, landlords and part-time employers, and most of them text a code to it. That is why having the number before you land matters more than the data allowance on day one.',
    },
    {
      kind: 'checklist',
      items: [
        'A Canadian number before you fly',
        '75–100 GB of data for maps, WhatsApp and video calls home',
        'Included minutes to India and unlimited international texts',
        'No Canadian credit history needed',
        'An unlocked phone that supports eSIM',
      ],
    },
    {
      kind: 'section',
      id: 'compare',
      title: 'Compare student plans',
      text: 'Every monthly plan includes unlimited Canada-wide calling, unlimited international texts and 1,000 international minutes to India, China, Bangladesh, Mexico and the UK. Nothing is paid online; Rogers or Fido bills you after your line is active.',
    },
    {
      kind: 'comparison',
      rows: [
        {
          id: 'fido',
          name: 'Fido',
          data: '75 GB',
          price: '$35/mo',
          bestFor: 'Everyday use at the lowest price',
          mobileDescription: '75 GB · Lowest monthly price',
        },
        {
          id: 'rogers-plus',
          name: 'Rogers',
          data: '100 GB',
          price: '$40/mo',
          detail: 'Hotspot included',
          bestFor: 'Video calls home and a laptop hotspot',
          desktopBestForLines: ['Video calls home', 'and a hotspot'],
          mobileDescription: '100 GB · Video calls home, hotspot included',
          popular: true,
        },
        {
          id: 'rogers-unlimited',
          name: 'Rogers Canada + US',
          data: '120 GB',
          price: '$50/mo',
          detail: 'US calling & roaming',
          bestFor: 'Heavy streaming and trips to the US',
          desktopBestForLines: ['Heavy streaming', 'and US trips'],
          mobileDescription: '120 GB · Heavy streaming and US trips',
        },
      ],
      note: 'Prices in CAD, before tax, as of October 2026. ★ Most popular with students.',
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
      text: 'Plans you order before you arrive are eSIM only: nothing to ship and nothing to wait for. Your phone needs to be unlocked and support eSIM. Most recent iPhone, Samsung Galaxy, OnePlus and Google Pixel models do; phones bought on an Indian carrier contract may be locked. Here is how to check.',
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
      title: 'How to order a Canadian SIM from India',
      items: [
        'Pick your plan on the eSIM plans page, 1 to 3 weeks before your flight.',
        'Add your arrival date and city. Nothing is uploaded; an advisor asks for your passport or permit only if the carrier needs it.',
        'An advisor calls or emails you to confirm, usually the same day. You pay nothing online.',
        'Scan the eSIM QR code at home on WiFi. Land, turn off airplane mode, and you are online before baggage claim.',
      ],
    },
    {
      kind: 'tip',
      label: 'Tip',
      text: 'Keep your Indian SIM active on a cheap plan in a dual-SIM phone. Indian banks, UPI and Aadhaar still send OTPs to it. Turn off data roaming on the Indian SIM so it never costs you anything in Canada.',
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
            'Yes. Most banks only need a Canadian number to send you a verification code. Your number is assigned when an advisor confirms your order, so it works for this before you land.',
        },
        {
          id: 'sin',
          question: 'Do I need a SIN to get a phone plan?',
          answer:
            'No. To order you need your passport, your study permit or letter of introduction, your arrival date and city, and an email address. There is no credit check.',
        },
        {
          id: 'switch',
          question: 'Can I switch plans after I arrive?',
          answer:
            'Yes. You can change your plan after the first month if you use more or less data than expected. The plans are month to month with no contract.',
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
            'Your Indian passport and your study permit, letter of introduction, visa or COPR. Nothing is uploaded when you order; if the carrier asks, a clear photo or PDF of each is enough.',
        },
        {
          id: 'pay',
          question: 'When do I pay?',
          answer:
            'Nothing is paid online. Once your number is active, your first bill comes from Rogers or Fido for the monthly price plus tax, and an advisor explains the date before anything is billed. Canadian Plans charges no SIM, activation or shipping fee.',
        },
      ],
    },
  ],
  sources:
    'Sources: Rogers, Fido and Chatr plan pages, checked 5 October 2026; plan terms from the Canadian Plans catalogue, 20 October 2026.',
};

export const esimGuide: GuideArticle = {
  previewOnly: true,
  slug: 'esim-vs-physical-sim-canada',
  title: 'eSIM vs physical SIM in Canada: which should newcomers choose? (2026)',
  breadcrumbTitle: 'eSIM vs physical SIM',
  category: 'Phones & SIMs',
  description:
    'What an eSIM is, how it differs from a SIM card, how to check your phone supports it, and why newcomers who order before they fly almost always choose eSIM.',
  author: teamAuthor,
  reviewer: teamReviewer,
  updated: '2026-10-23',
  updatedLabel: 'Updated 23 Oct 2026',
  readingLabel: '6 min read · Checked October 2026',
  imageCaption: 'Phone showing an eSIM QR code next to a passport and boarding pass',
  quickAnswer:
    'An eSIM is a SIM built into your phone that you install by scanning a QR code; a physical SIM is the small card you put in the SIM tray. If you are ordering a Canadian plan before you fly, choose eSIM: it arrives by email in minutes, nothing is shipped, and your line works the moment you land. You need an unlocked phone that supports eSIM, which most iPhones from the XS onward and most recent Samsung, Pixel and OnePlus phones do.',
  blocks: [
    {
      kind: 'section',
      id: 'what',
      title: 'What is an eSIM?',
      text: 'eSIM stands for embedded SIM. It is a tiny chip soldered inside your phone that can hold one or more carrier profiles. Instead of inserting a card, you scan a QR code (or tap a link) and the carrier’s profile downloads onto the chip. Your Canadian number then works exactly like it would on a plastic SIM: calls, texts, data and 5G.',
    },
    {
      kind: 'section',
      id: 'difference',
      title: 'eSIM vs physical SIM: the practical differences',
      text: 'For a newcomer, the difference is mostly about delivery and timing. A physical SIM has to be shipped to a Canadian address or picked up after you land. An eSIM is emailed to you, so you can install it at home in your own country and switch it on at the airport. Both give you the same network, the same plan and the same price.',
    },
    {
      kind: 'checklist',
      items: [
        'eSIM: delivered by email in minutes, install at home, nothing to ship or lose',
        'eSIM: lets you keep your home SIM in the tray for bank OTPs (dual SIM)',
        'Physical SIM: works on older phones and locked-SIM-tray devices',
        'Physical SIM: has to reach you in Canada or be picked up in person',
        'Both: same Rogers network, same plan, same monthly price',
      ],
    },
    {
      kind: 'section',
      id: 'check',
      title: 'How to check if your phone supports eSIM',
      text: 'It takes about 30 seconds. Your phone must also be unlocked; if it is locked to a carrier at home, ask that carrier to unlock it before you order a Canadian plan.',
    },
    {
      kind: 'devices',
      items: [
        {
          id: 'iphone',
          title: 'iPhone',
          text: 'Settings → General → About. If you see an “EID” number or “Digital SIM”, your iPhone supports eSIM. The XS, XR and every later model do.',
          caption: 'Screenshot: iPhone Settings › General › About, with the EID row highlighted',
        },
        {
          id: 'android',
          title: 'Samsung and other Android',
          text: 'Settings → Connections → SIM manager (or Network & internet → SIMs). If you see “Add eSIM” or “Download a SIM instead”, you are set. Most Galaxy S20 and later, Pixel 3 and later, and recent OnePlus phones support it.',
          caption: 'Screenshot: Android Settings › SIM manager, with “Add eSIM” highlighted',
        },
      ],
    },
    {
      kind: 'steps',
      id: 'install',
      title: 'How to install a Canadian eSIM before you fly',
      items: [
        'Order your plan online 1 to 3 weeks before your flight. An advisor confirms it and emails your eSIM QR code.',
        'At home, connect to WiFi and open the QR code on another screen (a laptop or a printout).',
        'iPhone: Settings → Cellular → Add eSIM → Use QR Code. Android: Settings → Connections → SIM manager → Add eSIM → Scan QR code.',
        'Label the new line “Canada” and leave it switched off until you land. Keep your home SIM as the default for now.',
        'When you land, turn off airplane mode, turn the Canada line on, and set it as your default for data. Turn data roaming off on your home SIM.',
      ],
    },
    {
      kind: 'tip',
      label: 'Keep both numbers',
      text: 'With an eSIM you can leave your home-country SIM in the tray. Banks, government portals and WhatsApp back home keep sending one-time codes to that number. Just turn off its data roaming so it costs nothing in Canada.',
    },
    {
      kind: 'section',
      id: 'when-physical',
      title: 'When a physical SIM is the better choice',
      text: 'If your phone does not support eSIM, or it is an older model, a physical SIM is your only option, and you will get it after you land. The bring-your-own-phone mobile plans for people already in Canada come as either an eSIM or a SIM card; the plans you order before you arrive are eSIM only.',
    },
    {
      kind: 'plan-cta',
      eyebrow: 'Ready before you fly',
      text: 'Canadian eSIM plans from $35/mo + tax',
      mobileLines: ['Canadian eSIM plans', 'from $35/mo + tax'],
      label: 'See eSIM plans →',
    },
    {
      kind: 'faq',
      id: 'guide-faq',
      title: 'FAQ',
      items: [
        {
          id: 'wifi',
          question: 'Do I need WiFi to install an eSIM?',
          answer:
            'Yes, to download the profile the first time. Do it at home before you fly. Once it is installed, you do not need WiFi to switch the line on when you land.',
        },
        {
          id: 'lost',
          question: 'What if I delete the eSIM by mistake?',
          answer:
            'Contact your advisor. The carrier can issue a new QR code for the same number; do not try to rescan an old code.',
        },
        {
          id: 'two',
          question: 'Can I have two eSIMs on one phone?',
          answer:
            'Most recent phones can store several eSIM profiles and run two lines at once. Check your phone’s specifications, and keep only the lines you use switched on.',
        },
        {
          id: 'newphone',
          question: 'Can I move my eSIM to a new phone later?',
          answer:
            'Yes. The carrier transfers the profile to your new phone. Ask your advisor and they tell you how, so you do not lose the number in between.',
        },
        {
          id: 'cost',
          question: 'Does an eSIM cost more than a SIM card?',
          answer:
            'No. The plan price is the same, and there is no SIM, activation or shipping fee through Canadian Plans. Nothing is paid online; the carrier bills you after activation.',
        },
      ],
    },
  ],
  sources:
    'Sources: Apple and Samsung eSIM support pages and Rogers, Fido and Chatr device pages, checked 23 October 2026.',
};

export const creditCheckGuide: GuideArticle = {
  previewOnly: true,
  slug: 'credit-check-phone-plan-canada',
  title: 'Do you need a credit check for a phone plan in Canada? A newcomer’s guide (2026)',
  breadcrumbTitle: 'Credit checks and phone plans',
  category: 'Money & credit',
  description:
    'Which Canadian phone plans need a credit check, what happens if you have no Canadian credit history, and how to get a monthly plan before you arrive without one.',
  author: teamAuthor,
  reviewer: teamReviewer,
  updated: '2026-10-23',
  updatedLabel: 'Updated 23 Oct 2026',
  readingLabel: '7 min read · Checked October 2026',
  imageCaption: 'Passport and study permit on a desk next to a phone showing an order confirmation',
  quickAnswer:
    'Usually, yes: postpaid phone plans bought in a Canadian store or online from a carrier include an identity and credit check, and a newcomer with no Canadian credit history may be refused or asked for a deposit. Prepaid plans need no credit check. The monthly Rogers and Fido eSIM plans you order through Canadian Plans before you arrive are postpaid but skip the credit check entirely: no Canadian credit history, no deposit, and nothing paid online.',
  blocks: [
    {
      kind: 'section',
      id: 'why',
      title: 'Why Canadian carriers run a credit check',
      text: 'On a postpaid plan you use the service first and pay at the end of the month, so the carrier is extending you credit. Before they do, they check your identity and your Canadian credit file. If you arrived last week, that file is empty. An empty file is not a bad score, but many store systems treat it the same way: a refusal, a lower data plan, or a security deposit.',
    },
    {
      kind: 'section',
      id: 'types',
      title: 'Which plans need a credit check and which do not',
      text: 'The rule of thumb is simple. Prepaid plans never need a credit check because you pay in advance. Postpaid plans normally do. Newcomer offers from the carriers vary and change often, so check the exact terms before you rely on one.',
    },
    {
      kind: 'checklist',
      items: [
        'Prepaid plans (for example Chatr): no credit check, pay before each 30 or 90 days',
        'Postpaid plans bought in Canada: identity and credit check, sometimes a deposit',
        'Monthly eSIM plans ordered before you arrive through Canadian Plans: postpaid, no credit check',
        'Bring-your-own-phone mobile plans for people already in Canada: government ID plus the provider’s identity and credit check',
      ],
    },
    {
      kind: 'section',
      id: 'before-arrival',
      title: 'How to get a monthly plan before you arrive, with no credit history',
      text: 'The Rogers and Fido plans sold through Canadian Plans for people arriving on a study permit, a work permit or as a permanent resident are ordered before you land. You order with your name, email, arrival date and the plan you want. There is no credit check, no SIN and nothing to upload; an advisor asks for your passport or permit only if the carrier needs it. The carrier bills you monthly after your line is active.',
    },
    {
      kind: 'plan-cta',
      eyebrow: 'No credit check',
      text: 'Monthly eSIM plans from $35/mo + tax',
      mobileLines: ['Monthly eSIM plans', 'from $35/mo + tax'],
      label: 'See eSIM plans →',
    },
    {
      kind: 'section',
      id: 'documents',
      title: 'What you need instead of a credit history',
      text: 'For plans ordered before you arrive: your passport and the document you are travelling on (study permit or letter of introduction, work permit, or confirmation of permanent residence). For visitors: your visitor visa, eTA or Super Visa. For home internet in BC, Alberta, Manitoba or Saskatchewan, many newcomers sign up with a passport and permit; if the provider needs a deposit, your advisor tells you before anything is booked.',
    },
    {
      kind: 'section',
      id: 'later',
      title: 'Switching to a regular plan once you have Canadian ID',
      text: 'After a few months you may want a plan with more data, Mexico coverage or a bigger hotspot. The bring-your-own-phone mobile plans do include a credit check and a government ID upload, and your advisor can move your number over so you keep it. Until then, the eSIM plan you arrived with is month to month and can be changed after the first month.',
    },
    {
      kind: 'tip',
      label: 'Watch out',
      text: 'A carrier’s “no credit check” offer in a store can still mean a deposit of a few hundred dollars that is returned later, or a plan that only unlocks after six months of payments. Ask before you sign, and get the deposit terms in writing.',
    },
    {
      kind: 'faq',
      id: 'guide-faq',
      title: 'FAQ',
      items: [
        {
          id: 'refused',
          question: 'Can a carrier refuse me a phone plan for having no credit history?',
          answer:
            'Yes, for postpaid plans sold in Canada they can, or they can ask for a deposit. Prepaid plans and the monthly eSIM plans you order before you arrive through Canadian Plans do not involve a credit check.',
        },
        {
          id: 'build',
          question: 'Does a phone plan build my Canadian credit history?',
          answer:
            'Whether a carrier reports your account to the credit bureaus depends on that carrier and the plan. Ask the carrier directly once your plan is active; Canadian Plans cannot promise it on their behalf.',
        },
        {
          id: 'sin',
          question: 'Do I need a SIN for a credit check?',
          answer:
            'Carriers usually ask for a SIN or another ID for a credit check on plans bought in Canada. The plans you order before you arrive need no SIN at all.',
        },
        {
          id: 'deposit',
          question: 'Is there a deposit on the eSIM plans ordered before arrival?',
          answer:
            'No. Nothing is paid online and there is no deposit. Your first bill comes from Rogers or Fido after your line is active, for the monthly price plus tax.',
        },
        {
          id: 'internet',
          question: 'Does home internet need a credit check?',
          answer:
            'Not always. Many newcomers sign up with a passport and permit. If the provider needs a deposit or a different plan, your advisor tells you before the install is booked.',
        },
      ],
    },
  ],
  sources:
    'Sources: Canadian Plans plan terms (20–22 October 2026) and Rogers, Fido and Chatr plan pages, checked October 2026. Carrier store policies vary and change; confirm before you sign.',
};

export const internetCostGuide: GuideArticle = {
  previewOnly: true,
  slug: 'home-internet-cost-canada-by-province',
  title: 'How much does home internet cost in Canada? Prices by province (2026)',
  breadcrumbTitle: 'Home internet cost by province',
  category: 'Home internet',
  description:
    'Monthly home internet prices in British Columbia, Alberta, Manitoba and Saskatchewan, what is included, how installation works, and what newcomers need to sign up.',
  author: teamAuthor,
  reviewer: teamReviewer,
  updated: '2026-10-23',
  updatedLabel: 'Updated 23 Oct 2026',
  readingLabel: '6 min read · Prices as of October 2026',
  imageCaption: 'Technician connecting a WiFi modem in a newly rented apartment',
  quickAnswer:
    'Through Canadian Plans, unlimited home internet costs from $50 a month in Saskatchewan, $70 in British Columbia and Alberta, and $90 in Manitoba (CAD, plus tax). Every plan includes unlimited data, a WiFi router and modem with no rental fee, free professional installation and no upfront payment. Internet + TV bundles start at $90. Most homes are installed within about 3 days of your call, and there is no contract.',
  blocks: [
    {
      kind: 'section',
      id: 'prices',
      title: 'Home internet prices by province',
      text: 'Prices are set by province, not by city, so Saskatoon pays the same as Regina and Calgary the same as Edmonton. Here is every plan we sell, in Canadian dollars per month before tax.',
    },
    {
      kind: 'table',
      id: 'price-table',
      title: 'Monthly internet prices by province',
      caption: 'Home internet plans sold through Canadian Plans, October 2026, CAD before tax',
      columns: ['Province', 'Plans and speeds', 'Internet only', 'Internet + TV'],
      rows: [
        {
          label: 'Saskatchewan',
          values: ['1 Gbps or 2 Gbps', '$50 or $60', '$90 (1 Gbps, 120+ channels)'],
        },
        {
          label: 'British Columbia',
          values: [
            '500 Mbps or 1 Gbps',
            '$70 or $80',
            '$115 (StreamSaver) or $140 (120+ channels)',
          ],
        },
        {
          label: 'Alberta',
          values: [
            '500 Mbps or 1 Gbps',
            '$70 or $80',
            '$115 (StreamSaver) or $140 (120+ channels)',
          ],
        },
        {
          label: 'Manitoba',
          values: ['500 Mbps or 2 Gbps', '$90 or $100', '$150 (2 Gbps, 120+ channels)'],
        },
      ],
      note: 'Every plan: unlimited data, WiFi router and modem included, free professional installation, no upfront payment. Saskatchewan: first two months free. BC, Alberta and Manitoba: 2-year price lock, 15-day trial, first bill 15 days after install. Taxes and government fees are extra and billed by the provider.',
    },
    {
      kind: 'section',
      id: 'included',
      title: 'What is included in the price, and what is not',
      text: 'The monthly price covers unlimited data with no overage, the WiFi router and modem, and the technician’s visit. You pay nothing on the website and nothing on install day. What is not included: tax, which the provider adds to each bill, and any TV package you add later. Canadian Plans charges no fee of its own.',
    },
    {
      kind: 'section',
      id: 'speed',
      title: 'Which speed do you actually need?',
      text: '500 Mbps is comfortable for one to three people streaming, video calling and working from home at the same time. 1 Gbps suits households of four or more, gamers and anyone uploading large files. 2 Gbps, available in Saskatchewan and Manitoba, is for big households and heavy users. Remember that WiFi inside the home is always a little slower than the plan speed.',
    },
    {
      kind: 'steps',
      id: 'how',
      title: 'How to get home internet set up as a newcomer',
      items: [
        'Choose your province and plan online and send your address and move-in date. Nothing is paid online.',
        'An advisor calls you, usually the same day, to confirm availability at your exact address, your price and your install date.',
        'A technician installs the modem and WiFi, usually within about 3 days of your call. Installation is free.',
        'Your first bill comes from the provider: in month three in Saskatchewan (two months free), or 15 days after install in BC, Alberta and Manitoba.',
      ],
    },
    {
      kind: 'section',
      id: 'credit',
      title: 'Do newcomers need a credit history for home internet?',
      text: 'Not always. Many newcomers sign up with a passport and permit. If the provider needs a deposit or a different plan at your address, your advisor tells you before anything is booked, so there are no surprises when the technician arrives.',
    },
    {
      kind: 'section',
      id: 'elsewhere',
      title: 'Not in one of these four provinces?',
      text: 'Home internet through Canadian Plans is sold in British Columbia, Alberta, Manitoba and Saskatchewan today. If you are moving to Ontario, Quebec or elsewhere, join the wish list on the order page and we email you when your province opens. Mobile plans and the eSIMs you order before arriving work in every province.',
    },
    {
      kind: 'tip',
      label: 'Moving in soon?',
      text: 'Order before you get the keys and give your advisor the move-in date. They book the first install slot after that date, so you are online in your first week instead of your first month.',
    },
    {
      kind: 'faq',
      id: 'guide-faq',
      title: 'FAQ',
      items: [
        {
          id: 'cheapest',
          question: 'What is the cheapest home internet in Canada through Canadian Plans?',
          answer:
            'Saskatchewan at $50 a month for 1 Gbps with unlimited data, plus tax, with the first two months free. In BC and Alberta the lowest price is $70 for 500 Mbps; in Manitoba it is $90.',
        },
        {
          id: 'equipment',
          question: 'Is the WiFi router included or rented?',
          answer:
            'Included. A WiFi router and modem come with every plan with no monthly equipment rental fee.',
        },
        {
          id: 'contract',
          question: 'Is there a contract or a cancellation fee?',
          answer:
            'No contract. In BC, Alberta and Manitoba your price is locked for 2 years and you have a 15-day trial after installation. Your service agreement is with the provider, and your advisor explains its terms before anything is booked.',
        },
        {
          id: 'tv',
          question: 'How much does TV add?',
          answer:
            'Internet + TV with 120+ channels and a PVR box is $90 in Saskatchewan, $140 in BC and Alberta and $150 in Manitoba. In BC and Alberta, Internet + StreamSaver TV (70+ channels on the app plus Netflix, Disney+ and Apple TV) is $115. All prices are monthly, CAD, before tax.',
        },
        {
          id: 'install-time',
          question: 'How long does installation take?',
          answer:
            'Usually within about 3 days of your call with an advisor. The visit itself is free, and a technician sets up the modem and WiFi for you.',
        },
      ],
    },
  ],
  sources:
    'Sources: Canadian Plans internet and TV plan catalogue, confirmed by the owner on 20 October 2026. Availability depends on the exact address; your advisor confirms it before installation.',
};

/** Only supplied complete articles resolve; unknown slugs must return 404. */
export const guideArticles: readonly GuideArticle[] = [
  studentIndiaGuide,
  esimGuide,
  creditCheckGuide,
  internetCostGuide,
  workFromHomeSpeedGuide,
  ...newcomerGuides,
];
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
 * Index entries: every card opens real content, either a full guide article or one of the
 * Electric Blue audience pages, which are written as guides. Cards for guides that do not
 * exist yet are not listed.
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
    id: esimGuide.slug,
    previewOnly: true,
    topic: 'phones',
    category: esimGuide.category,
    title: esimGuide.title,
    detail: '6 min read · Updated October 2026',
    caption: 'Phone showing an eSIM QR code next to a passport',
    href: `/guides/${esimGuide.slug}`,
    description: esimGuide.description,
    keywords: ['esim', 'physical sim', 'unlocked', 'eid', 'qr code'],
  },
  {
    id: creditCheckGuide.slug,
    previewOnly: true,
    topic: 'credit',
    category: creditCheckGuide.category,
    title: creditCheckGuide.title,
    detail: '7 min read · Updated October 2026',
    caption: 'Passport and permit on a desk next to a phone',
    href: `/guides/${creditCheckGuide.slug}`,
    description: creditCheckGuide.description,
    keywords: ['credit check', 'credit history', 'deposit', 'postpaid', 'prepaid', 'newcomer'],
  },
  {
    id: internetCostGuide.slug,
    previewOnly: true,
    topic: 'internet',
    category: internetCostGuide.category,
    title: internetCostGuide.title,
    detail: '6 min read · Updated October 2026',
    caption: 'Technician connecting a WiFi modem in a new apartment',
    href: `/guides/${internetCostGuide.slug}`,
    description: internetCostGuide.description,
    keywords: ['internet cost', 'price', 'province', 'bc', 'alberta', 'manitoba', 'saskatchewan'],
  },
  {
    id: workFromHomeSpeedGuide.slug,
    previewOnly: true,
    topic: 'internet',
    category: workFromHomeSpeedGuide.category,
    title: workFromHomeSpeedGuide.title,
    detail: '8 min read · Updated October 2026',
    caption: 'Person on a video call at a home desk next to a WiFi router',
    href: `/guides/${workFromHomeSpeedGuide.slug}`,
    description: workFromHomeSpeedGuide.description,
    keywords: [
      'work from home',
      'remote work',
      'upload speed',
      'mbps',
      'zoom',
      'teams',
      'video calls',
      'vpn',
      'cra',
    ],
  },
  {
    id: numberBeforeArrivalGuide.slug,
    previewOnly: true,
    topic: 'moving',
    category: numberBeforeArrivalGuide.category,
    title: numberBeforeArrivalGuide.title,
    detail: '7 min read · Updated October 2026',
    caption: 'Boarding pass, passport and a phone showing a new +1 number',
    href: `/guides/${numberBeforeArrivalGuide.slug}`,
    description: numberBeforeArrivalGuide.description,
    keywords: ['canadian number', 'before you arrive', 'before you land', 'esim', 'timeline'],
  },
  {
    id: carrierPickerGuide.slug,
    previewOnly: true,
    topic: 'phones',
    category: carrierPickerGuide.category,
    title: carrierPickerGuide.title,
    detail: '6 min read · Updated October 2026',
    caption: 'Three phones side by side showing Rogers, Fido and Chatr plan screens',
    href: `/guides/${carrierPickerGuide.slug}`,
    description: carrierPickerGuide.description,
    keywords: ['rogers', 'fido', 'chatr', 'which plan', 'comparison', 'prepaid', 'postpaid'],
  },
  {
    id: firstWeekGuide.slug,
    previewOnly: true,
    topic: 'moving',
    category: firstWeekGuide.category,
    title: firstWeekGuide.title,
    detail: '9 min read · Updated October 2026',
    caption: 'Newcomer at a kitchen table with passport, permit and a checklist',
    href: `/guides/${firstWeekGuide.slug}`,
    description: firstWeekGuide.description,
    keywords: ['first week', 'checklist', 'sin', 'bank account', 'health card', 'settlement'],
  },
  {
    id: phoneCompatibilityGuide.slug,
    previewOnly: true,
    topic: 'phones',
    category: phoneCompatibilityGuide.category,
    title: phoneCompatibilityGuide.title,
    detail: '8 min read · Updated October 2026',
    caption: 'Phone settings screen showing the IMEI and network bands',
    href: `/guides/${phoneCompatibilityGuide.slug}`,
    description: phoneCompatibilityGuide.description,
    keywords: ['unlocked', 'bands', 'volte', 'imei', 'will my phone work', 'network'],
  },
  {
    id: homeNumberGuide.slug,
    previewOnly: true,
    topic: 'moving',
    category: homeNumberGuide.category,
    title: homeNumberGuide.title,
    detail: '8 min read · Updated October 2026',
    caption: 'Dual-SIM phone showing a home number and a Canadian number',
    href: `/guides/${homeNumberGuide.slug}`,
    description: homeNumberGuide.description,
    keywords: [
      'otp',
      'dual sim',
      'home number',
      'india',
      'philippines',
      'gcash',
      'upi',
      'whatsapp',
    ],
  },
  {
    id: 'student-sim',
    previewOnly: true,
    topic: 'phones',
    category: 'Phones & SIMs',
    title: 'SIM card and eSIM for international students in Canada',
    detail: 'Guide · Updated Oct 2026',
    caption: 'Student checking a new Canadian number at arrivals',
    href: '/pre-arrival-sim/students',
    keywords: ['student', 'esim', 'study permit', 'device', 'compatibility'],
  },
  {
    id: 'workers-sim',
    previewOnly: true,
    topic: 'moving',
    category: 'Moving to Canada',
    title: 'SIM card for work permit holders arriving in Canada',
    detail: 'Guide · Updated Oct 2026',
    caption: 'New arrival on a work permit checking their phone outside the terminal',
    href: '/pre-arrival-sim/workers',
    keywords: ['work permit', 'worker', 'employer', 'esim'],
  },
  {
    id: 'new-immigrants-sim',
    previewOnly: true,
    topic: 'moving',
    category: 'Moving to Canada',
    title: 'SIM card for new immigrants and permanent residents',
    detail: 'Guide · Updated Oct 2026',
    caption: 'Family with suitcases at arrivals, one of them on the phone',
    href: '/pre-arrival-sim/new-immigrants',
    keywords: ['permanent resident', 'pr', 'copr', 'immigrant', 'landing', 'esim'],
  },
  {
    id: 'visitors-sim',
    previewOnly: true,
    topic: 'moving',
    category: 'Moving to Canada',
    title: 'Prepaid SIM for visitors and Super Visa parents',
    detail: 'Guide · Updated Oct 2026',
    caption: 'Grandparents at arrivals video-calling family',
    href: '/pre-arrival-sim/visitors',
    keywords: ['visitor', 'tourist', 'super visa', 'prepaid', 'chatr'],
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
    title: 'Home internet in Ontario: wish list and what is available now',
    detail: 'Guide · Updated Oct 2026',
    caption: 'Technician connecting a WiFi modem in a Toronto condo',
    href: '/home-internet/ontario',
    keywords: ['wifi', 'wi-fi', 'installation', 'toronto', 'ottawa', 'renter'],
  },
];
export const guidesIndexCopy = {
  title: 'Newcomer Guides: SIM Cards, Phone Plans & Internet in Canada | Canadian Plans',
  skip: 'Skip to guides',
  eyebrow: 'Newcomer guides',
  heading: 'Plain answers about phones, SIM cards and internet in Canada',
  description:
    'Guides to Canadian SIM cards, eSIM, phone plans, credit checks and home internet for international students, workers, new permanent residents and visitors. Written in plain English by the Canadian Plans team and checked against the carriers’ plan pages.',
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
      href: '/pre-arrival-sim#faq',
    },
    {
      id: 'credit',
      text: 'Do I need a credit check for a phone plan in Canada?',
      href: `/guides/${creditCheckGuide.slug}`,
    },
    {
      id: 'esim',
      text: 'Does my phone support eSIM?',
      href: `/guides/${esimGuide.slug}#check`,
    },
    { id: 'sin', text: 'Do I need a SIN to get a phone plan?', href: '/faq#faq-eligibility' },
    {
      id: 'internet-cost',
      text: 'How much is home internet in Canada?',
      href: `/guides/${internetCostGuide.slug}`,
    },
    {
      id: 'wfh-speed',
      text: 'How much internet speed do I need to work from home?',
      href: `/guides/${workFromHomeSpeedGuide.slug}`,
    },
    {
      id: 'number',
      text: 'Can I keep my number if I change carriers?',
      href: '/mobile-plans#faq',
    },
    {
      id: 'phone-work',
      text: 'Will my phone work in Canada?',
      href: `/guides/${phoneCompatibilityGuide.slug}`,
    },
    {
      id: 'home-otp',
      text: 'How do I keep getting OTPs on my home number?',
      href: `/guides/${homeNumberGuide.slug}`,
    },
  ],
  final: {
    title: 'Ready when you land',
    subtitle: 'Choose a plan in about 2 minutes. An advisor confirms it, usually the same day.',
    primary: { label: 'See eSIM plans →', href: '/pre-arrival-sim#plans' },
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
