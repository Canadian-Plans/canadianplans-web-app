import { teamAuthor, teamReviewer, type GuideArticle } from './guide-shared';

/**
 * Nine newcomer guides from the 24 October 2026 SEO pack, reviewed and rewritten the same day.
 * Plan facts trace to docs/LAUNCH_PLANS.md and the site-1 catalogue; external facts (CRTC fee
 * ban, Rogers bands, tax rates, airport counters) were checked on the dates in `sources`.
 * The pack's tenth guide updates `will-my-phone-work-in-canada` in guides-newcomer.ts.
 */

export const virtualNumberVsSimGuide: GuideArticle = {
  previewOnly: true,
  slug: 'virtual-canadian-phone-number-vs-sim',
  title: 'Virtual Canadian phone number vs a real SIM: which one gets bank codes? (2026)',
  breadcrumbTitle: 'Virtual number vs real SIM',
  category: 'Moving to Canada',
  description:
    'Free number apps, data-only travel eSIMs and a real Canadian eSIM compared: which give you a +1 number, which receive bank and sign-in codes, and what each costs.',
  author: teamAuthor,
  reviewer: teamReviewer,
  updated: '2026-10-24',
  updatedLabel: 'Updated 24 Oct 2026',
  readingLabel: '8 min read · Checked 24 October 2026',
  imageCaption:
    'Two phones side by side: a calling app with a virtual number and a Canadian eSIM line',
  quickAnswer:
    'Use a real Canadian mobile number from a carrier SIM or eSIM for anything that texts you a code. Virtual numbers and data-only eSIMs are fine for calling home, not for bank or sign-in codes.',
  quickPoints: [
    {
      label: 'Virtual number apps:',
      text: 'a +1 number over WiFi or data. TextNow itself says Canadian verification codes are largely unsupported.',
    },
    {
      label: 'Data-only travel eSIMs:',
      text: 'internet only, with no Canadian number for calls or texts.',
    },
    {
      label: 'Real Canadian eSIM:',
      text: 'a Rogers, Fido or Chatr mobile number that receives ordinary texts, bank codes included.',
    },
    {
      label: 'Before you fly:',
      text: 'order 1 to 3 weeks ahead. Plans from $35 + tax, nothing paid online.',
    },
  ],
  blocks: [
    {
      kind: 'section',
      id: 'what-is-virtual',
      title: 'What is a virtual Canadian phone number?',
      text: 'A virtual number is a +1 phone number that lives inside an app rather than on a SIM. Apps such as TextNow give you one free or for a small monthly fee, and calls and texts travel over WiFi or mobile data. That makes them handy for calling home and for having some number to give out early. The catch is that the number belongs to an internet calling (VoIP) service, not a mobile carrier, and many banks and sign-in systems can tell the difference.',
    },
    {
      kind: 'section',
      id: 'codes',
      title: 'Why virtual numbers fail for bank and sign-in codes',
      text: 'Before a bank or government service sends a one-time code, it often checks what kind of number it is texting, and it may refuse internet calling numbers outright. TextNow’s own help centre says Canadian verification codes are largely unsupported, advises against buying a subscription for that purpose, and notes that some services do not accept its numbers for two-factor authentication (help.textnow.com, checked 24 October 2026). Free numbers can also be recycled if they go unused, which can lock you out of every account tied to them.',
    },
    {
      kind: 'table',
      id: 'compare-options',
      title: 'Virtual number, data-only eSIM or real SIM: how they compare',
      caption:
        'Four ways newcomers get a Canadian number or mobile data, compared on number type, verification codes and cost',
      columns: [
        'Option',
        'Canadian +1 number',
        'Bank and sign-in codes',
        'What you pay',
        'Best for',
      ],
      rows: [
        {
          label: 'Virtual number app (for example TextNow)',
          values: [
            'Yes, over WiFi or data',
            'Often refused or never delivered',
            'Free with ads, or a small monthly fee',
            'Calling home over WiFi',
          ],
        },
        {
          label: 'Data-only travel eSIM',
          values: [
            'No',
            'No: it cannot receive texts',
            'A data pack, paid up front',
            'Short trips that only need maps and messaging',
          ],
        },
        {
          label: 'Canadian eSIM ordered before you fly',
          values: [
            'Yes: a Rogers, Fido or Chatr mobile number',
            'Yes: ordinary texts, like any Canadian mobile',
            'From $35 a month + tax, billed by the carrier after activation; nothing paid online',
            'Students, workers, permanent residents and visitors',
          ],
        },
        {
          label: 'SIM card bought after landing',
          values: [
            'Yes: a carrier mobile number',
            'Yes, once the line is active',
            'Store price; postpaid in a store usually needs ID and a credit check',
            'People who can wait a day or two for a number',
          ],
        },
      ],
      note: 'Prices in CAD before tax, October 2026. Through Canadian Plans, monthly Rogers and Fido plans are for study permit, work permit and permanent resident arrivals staying over 90 days; Chatr prepaid plans are for visitors staying under 90 days.',
    },
    {
      kind: 'section',
      id: 'first-week',
      title: 'Where a real Canadian number matters in your first week',
      text: 'Your bank texts a code when you set up online banking and Interac e-Transfer. Your employer’s payroll and HR systems, your college portal and rental sites ask for a mobile number and often verify it. Landlords, delivery drivers and ride apps call or text it. If that number is a virtual one and the code never arrives, you can be locked out of an account on the day you need it. A carrier number avoids that, and having it before you land means you can fill in those forms from home.',
    },
    {
      kind: 'checklist',
      items: [
        'Bank: online banking, Interac e-Transfer and card verification codes',
        'Employer or college: HR, payroll and student portal sign-ins',
        'Housing: landlords and rental sites expect a local number that answers',
        'Getting around: ride apps, food delivery and transit accounts text a code',
        'Family at home: a virtual number or WhatsApp is still fine for calls',
      ],
    },
    {
      kind: 'section',
      id: 'short-codes',
      title: 'What if a code from abroad never arrives?',
      text: 'Some services text from short codes, the five- or six-digit sender numbers, that are not set up to reach Canadian mobiles, so a code from a bank or app back home may not arrive even on a real Canadian number. Rogers says a US short code that is not provisioned in Canada will not work (Rogers community support, checked 24 October 2026). Keep your home SIM for those accounts, or switch them to an authenticator app or email codes where offered. Our guide to keeping your home number in Canada covers the dual-SIM setup.',
    },
    {
      kind: 'section',
      id: 'when-virtual-helps',
      title: 'When a virtual number is still worth having',
      text: 'A virtual number is a good extra, not a replacement. Use it to call home cheaply over WiFi, for marketplace listings you would rather keep separate, or as a stopgap for family while you settle in. Make your real Canadian mobile number the recovery and verification number on every account that matters.',
    },
    {
      kind: 'steps',
      id: 'get-real-number',
      title: 'How to get a real Canadian number before you land',
      items: [
        'Choose your plan online 1 to 3 weeks before your flight. Pick how you are arriving (student, worker, permanent resident or visitor) so only eligible plans show. Nothing is paid and nothing is uploaded.',
        'An advisor calls or emails to confirm, usually the same day, and asks for your passport or permit only if the carrier needs it.',
        'Your Canadian number is assigned when the order is confirmed and your eSIM QR code arrives by email. You can put the number on bank, school and employer forms straight away.',
        'Install the eSIM at home on WiFi and leave it switched off. When you land, switch it on: calls, texts and codes start working on the Rogers network.',
      ],
    },
    {
      kind: 'plan-cta',
      eyebrow: 'A number banks accept',
      text: 'Canadian eSIM plans from $35/mo + tax, nothing paid online',
      mobileLines: ['Canadian eSIM plans', 'from $35/mo + tax'],
      label: 'See eSIM plans →',
    },
    {
      kind: 'faq',
      id: 'guide-faq',
      title: 'FAQ',
      items: [
        {
          id: 'textnow-bank',
          question: 'Can I use a TextNow number for a Canadian bank account?',
          answer:
            'Do not count on it. TextNow says Canadian verification codes are largely unsupported, and banks may refuse internet calling numbers. Use a carrier mobile number for banking and keep the app for calls home.',
        },
        {
          id: 'data-esim-number',
          question: 'Does a data-only travel eSIM come with a Canadian number?',
          answer:
            'No. It gives you mobile data only, so you cannot receive calls or texts on a Canadian number. It works for maps and WhatsApp, not for bank codes or callbacks.',
        },
        {
          id: 'before-landing',
          question: 'Can I give out my Canadian number before I land?',
          answer:
            'Yes. With a plan ordered through Canadian Plans, the number is assigned when an advisor confirms your order, so you can share it straight away. Calls and texts to it start working when you switch the line on in Canada.',
        },
        {
          id: 'keep-home',
          question: 'Can I keep my home number as well?',
          answer:
            'Yes, on a dual-SIM phone. Keep your home SIM in the tray with data roaming off for codes from home, and use the Canadian eSIM for calls, texts and data.',
        },
        {
          id: 'cost',
          question: 'What does a real Canadian number cost through Canadian Plans?',
          answer:
            'Monthly Rogers and Fido plans start at $35 a month for students, workers and permanent residents; Chatr prepaid plans start at $35 for 30 days for visitors (CAD, plus tax). There is no credit check, nothing is paid online, and Canadian Plans charges no SIM, activation or shipping fee. The carrier bills you after your line is active.',
        },
        {
          id: 'whatsapp',
          question: 'Is WhatsApp enough until I get a plan?',
          answer:
            'For family, yes. For life in Canada, no: banks, employers, landlords and delivery drivers expect a number that takes ordinary calls and texts.',
        },
      ],
    },
  ],
  sources:
    'Sources: TextNow help centre on verification codes and number recycling; Rogers community support on short codes not provisioned in Canada; Canadian Plans plan terms (owner-confirmed 20 to 22 October 2026). Checked 24 October 2026.',
  related: [
    'how-to-get-canadian-phone-number-before-arriving',
    'keep-your-home-number-in-canada',
    'how-to-activate-canadian-esim',
  ],
};

export const prepaidVsPostpaidCanadaGuide: GuideArticle = {
  previewOnly: true,
  slug: 'prepaid-vs-postpaid-plans-canada',
  title: 'Prepaid vs postpaid phone plans in Canada: which should newcomers choose? (2026)',
  breadcrumbTitle: 'Prepaid vs postpaid',
  category: 'Money & credit',
  description:
    'How prepaid and postpaid plans work in Canada, which needs a credit check, how each is billed, and which one fits your immigration status and length of stay.',
  author: teamAuthor,
  reviewer: teamReviewer,
  updated: '2026-10-24',
  updatedLabel: 'Updated 24 Oct 2026',
  readingLabel: '8 min read · Checked 24 October 2026',
  imageCaption: 'A prepaid 30-day plan and a monthly postpaid bill side by side',
  quickAnswer:
    'Prepaid means paying before each 30 or 90 days; postpaid means a bill after each month. For newcomers the real difference is the credit check: store postpaid plans usually need one, prepaid never does.',
  quickPoints: [
    {
      label: 'Prepaid:',
      text: 'pay in advance, no credit check, nothing to cancel when you leave. Suits visits under 90 days.',
    },
    {
      label: 'Postpaid:',
      text: 'a bill after each month, usually with more data, a hotspot and international minutes. Suits stays over 90 days.',
    },
    {
      label: 'Through Canadian Plans:',
      text: 'students, workers and permanent residents get postpaid Rogers or Fido from $35/mo with no credit check; visitors get Chatr prepaid from $35 per 30 days.',
    },
    {
      label: 'No contract either way:',
      text: 'when you bring your own phone. Contracts only come with a financed phone.',
    },
  ],
  blocks: [
    {
      kind: 'section',
      id: 'how-prepaid-works',
      title: 'How prepaid plans work in Canada',
      text: 'A prepaid plan is paid before you use it. Canadian prepaid plans usually run in 30-day periods rather than calendar months, and some run for 90 days. If you do not pay for the next period, service stops; nothing is billed afterwards, and there is no credit check because no credit is extended. Chatr, Lucky Mobile and Public Mobile are prepaid brands owned by Rogers, Bell and Telus. Through Canadian Plans, visitors can order Chatr before they fly: 50 GB for $35 or 90 GB for $40 per 30 days, or 75 GB for $75 over 90 days.',
    },
    {
      kind: 'section',
      id: 'how-postpaid-works',
      title: 'How postpaid plans work in Canada',
      text: 'A postpaid plan bills you after you use it, so the carrier is extending you a little credit each month. Bills arrive on a fixed billing date, and the first one usually covers a part month plus the month ahead; our first-bill guide shows the maths. In a Canadian store, a postpaid plan normally needs government ID and a credit check, and someone with no Canadian credit history may be refused or asked for a deposit. Postpaid plans on your own phone are month to month: no contract, cancel when you like.',
    },
    {
      kind: 'table',
      id: 'side-by-side',
      title: 'Prepaid vs postpaid side by side',
      caption: 'Prepaid and postpaid phone plans in Canada compared for newcomers',
      columns: ['Feature', 'Prepaid', 'Postpaid (your own phone)'],
      rows: [
        {
          label: 'When you pay',
          values: ['Before each 30 or 90 days', 'A bill after each month'],
        },
        {
          label: 'Credit check',
          values: [
            'Never',
            'Usually in a store; not on the plans ordered before arrival through Canadian Plans',
          ],
        },
        {
          label: 'Deposit',
          values: ['None', 'Sometimes, in a store, if you have no Canadian credit history'],
        },
        {
          label: 'Data and extras',
          values: [
            'Often smaller allowances; Chatr runs on 4G LTE',
            'Larger allowances, 5G, hotspot and international minutes on many plans',
          ],
        },
        {
          label: 'Contract',
          values: ['None', 'None when you bring your own phone; month to month'],
        },
        {
          label: 'Leaving Canada',
          values: [
            'Stop paying; nothing to cancel',
            'Cancel with the carrier and pay the final bill',
          ],
        },
        {
          label: 'Who it suits',
          values: [
            'Visitors and short stays',
            'Students, workers and permanent residents staying longer',
          ],
        },
      ],
      note: 'Canadian Plans sells pre-arrival plans by status: monthly postpaid Rogers and Fido plans for study permit, work permit and permanent resident arrivals staying over 90 days, and Chatr prepaid plans for visitor visa, eTA and Super Visa arrivals staying under 90 days. Prices from $35, CAD before tax.',
    },
    {
      kind: 'section',
      id: 'which-fits',
      title: 'Which one fits your status and length of stay?',
      text: 'Your immigration status and how long you will stay decide most of it. Staying more than 90 days on a study or work permit, or landing as a permanent resident, postpaid gives you more data and extras for about the same money, and the Rogers and Fido plans ordered before you arrive skip the credit check. Visiting for less than 90 days, prepaid means there is nothing to close when you fly home.',
    },
    {
      kind: 'checklist',
      items: [
        'Study permit, staying a term or longer: postpaid Fido 75 GB ($35) or Rogers 100 GB with hotspot ($40)',
        'Work permit, including an IEC working holiday: postpaid Rogers or Fido; Rogers 120 GB ($50) if you will cross into the US',
        'New permanent resident: postpaid Rogers or Fido, then review your plan once you have Canadian ID',
        'Visitor visa, eTA or Super Visa, under 90 days: Chatr prepaid, $35 or $40 per 30 days, or $75 for 90 days',
      ],
    },
    {
      kind: 'section',
      id: 'credit-history',
      title: 'Does a postpaid plan build Canadian credit?',
      text: 'Possibly, but do not choose a plan for that reason. Whether a carrier reports your account to Equifax or TransUnion depends on the carrier and the plan, so ask the carrier once your line is active; Canadian Plans cannot promise it on their behalf. The downside is certain, though: an unpaid bill that goes to collections can damage a new credit file. A newcomer credit card from your bank is the usual way to start building credit. Prepaid plans involve no credit at all.',
    },
    {
      kind: 'section',
      id: 'fees',
      title: 'Are there activation or plan change fees?',
      text: 'Not any more. Since 12 June 2026, Telecom Regulatory Policy CRTC 2026-43 has barred Canadian providers from charging fees to activate or change a plan, and early cancellation fees are only allowed when a subsidized phone is part of the contract (CRTC, checked 24 October 2026). Canadian Plans charges no SIM, activation or shipping fee either. Sales tax still applies to both prepaid and postpaid plans.',
    },
    {
      kind: 'plan-cta',
      eyebrow: 'Prepaid or postpaid',
      text: 'Plans for your status from $35 + tax, no credit check',
      mobileLines: ['Plans for your status', 'from $35 + tax, no credit check'],
      label: 'See eSIM plans →',
    },
    {
      kind: 'faq',
      id: 'guide-faq',
      title: 'FAQ',
      items: [
        {
          id: 'switch-keep-number',
          question: 'Can I switch from prepaid to postpaid and keep my number?',
          answer:
            'Usually, yes. Canadian mobile numbers can be moved between carriers and plans, so a visitor who later gets a permit can move to a monthly plan without changing number. Ask the new carrier to transfer the number in before you cancel the old plan.',
        },
        {
          id: 'student-prepaid',
          question: 'I am a student. Can I choose prepaid instead?',
          answer:
            'In a Canadian store, anyone can buy prepaid. Through Canadian Plans, Chatr prepaid is for visitors staying under 90 days; students on a study permit are offered the monthly Rogers and Fido plans, which give more data for a similar price and include 1,000 international minutes.',
        },
        {
          id: 'deposit',
          question: 'Will I pay a deposit on a postpaid plan?',
          answer:
            'Not on the Rogers and Fido plans ordered before you arrive through Canadian Plans: no deposit, no credit check and nothing paid online. In a store, a carrier may ask for a refundable deposit if you have no Canadian credit history; get the terms in writing.',
        },
        {
          id: 'missed',
          question: 'What happens if I miss a postpaid bill?',
          answer:
            'The carrier can add a late payment charge and, if the bill stays unpaid, suspend the line. Accounts left unpaid for long can go to collections, which hurts your credit file. Set up automatic payments once you have a Canadian bank account or card.',
        },
        {
          id: 'summer',
          question: 'Can I cancel a postpaid plan if I leave Canada for a few months?',
          answer:
            'Yes. Postpaid plans on your own phone have no contract, but cancelling gives up the number. To keep it, ask the carrier about a cheaper plan or a temporary suspension before you leave.',
        },
        {
          id: 'pay-us',
          question: 'Do I pay Canadian Plans anything?',
          answer:
            'No. Nothing is paid online and Canadian Plans charges no fee. The carrier bills you after your line is active, for the plan price plus tax.',
        },
      ],
    },
  ],
  sources:
    'Sources: CRTC announcement on eliminating activation, plan change and cancellation fees (12 March 2026) and Telecom Regulatory Policy CRTC 2026-43, in force 12 June 2026; Canadian Plans plan terms (owner-confirmed 20 to 22 October 2026); Rogers, Fido and Chatr plan pages. Checked 24 October 2026.',
  related: [
    'rogers-vs-fido-vs-chatr-for-newcomers',
    'credit-check-phone-plan-canada',
    'first-canadian-phone-bill-explained',
  ],
};

export const studentWorkerPhonePlansGuide: GuideArticle = {
  previewOnly: true,
  slug: 'phone-plans-international-students-canada',
  title: 'Phone plans for international students and workers in Canada: how to choose (2026)',
  breadcrumbTitle: 'Student and worker phone plans',
  category: 'Moving to Canada',
  description:
    'How Canadian mobile brands fit together, how much data students and work permit holders need, what you can order before you fly, and the documents to keep handy.',
  author: teamAuthor,
  reviewer: teamReviewer,
  updated: '2026-10-24',
  updatedLabel: 'Updated 24 Oct 2026',
  readingLabel: '8 min read · Prices as of October 2026',
  imageCaption: 'An international student and a work permit holder comparing Canadian plans',
  quickAnswer:
    'Most international students and workers bring their own unlocked phone and take a monthly plan with 75 to 120 GB. Order before you fly and your number is ready for college, employer and bank forms.',
  quickPoints: [
    { label: 'Lowest price:', text: 'Fido 75 GB at $35/mo, hotspot not included.' },
    { label: 'Most popular:', text: 'Rogers 100 GB at $40/mo, hotspot included.' },
    {
      label: 'Cross-border trips:',
      text: 'Rogers 120 GB at $50/mo, with Canada + US calling and roaming.',
    },
    {
      label: 'All three:',
      text: '1,000 minutes to India, China, Bangladesh, Mexico and the UK, no credit check and nothing paid online. Prices CAD + tax.',
    },
  ],
  blocks: [
    {
      kind: 'section',
      id: 'carrier-types',
      title: 'How Canadian mobile brands fit together',
      text: 'Canada’s three national carriers, Rogers, Bell and Telus, each run cheaper “flanker” brands on the same network: Fido and Chatr belong to Rogers, Virgin Plus and Lucky Mobile to Bell, and Koodo and Public Mobile to Telus. A flanker brand gives you the parent network’s coverage at a lower price, which is why students and workers so often end up on one. For a newcomer, though, the bigger question is who will sell you a plan before you have Canadian credit history or ID.',
    },
    {
      kind: 'table',
      id: 'brand-tiers',
      title: 'Main brands, flanker brands and prepaid brands compared',
      caption: 'Canadian mobile brand types compared for international students and workers',
      columns: ['Brand type', 'Examples', 'Network', 'What newcomers should know'],
      rows: [
        {
          label: 'Main brands',
          values: [
            'Rogers, Bell, Telus',
            'Their own national networks',
            'Highest prices in store, where postpaid needs ID and a credit check. Rogers plans ordered before arrival through Canadian Plans skip the credit check.',
          ],
        },
        {
          label: 'Flanker brands',
          values: [
            'Fido, Koodo, Virgin Plus',
            'The parent carrier’s network',
            'Lower prices on the same coverage. Fido 75 GB is $35/mo through Canadian Plans.',
          ],
        },
        {
          label: 'Prepaid brands',
          values: [
            'Chatr, Public Mobile, Lucky Mobile',
            'The parent carrier’s network, often 4G LTE',
            'No credit check; pay before each 30 days. Through Canadian Plans, Chatr is for visitors staying under 90 days.',
          ],
        },
      ],
      note: 'Brand ownership as of October 2026. Every plan sold through Canadian Plans runs on the Rogers network.',
    },
    {
      kind: 'section',
      id: 'compare',
      title: 'Plans you can order before you arrive',
      text: 'Students, workers and permanent residents staying more than 90 days can order three monthly plans. All include unlimited Canada-wide calling, unlimited local and international texts and 1,000 international minutes to India, China, Bangladesh, Mexico and the UK, with no contract.',
    },
    {
      kind: 'comparison',
      rows: [
        {
          id: 'fido',
          name: 'Fido Essential',
          data: '75 GB 5G',
          price: '$35/mo',
          detail: 'Hotspot not included',
          bestFor: 'Lowest monthly price',
          mobileDescription: '75 GB · Lowest monthly price',
        },
        {
          id: 'rogers-100',
          name: 'Rogers Plus',
          data: '100 GB 5G',
          price: '$40/mo',
          detail: 'Hotspot included',
          bestFor: 'A laptop hotspot and video calls home',
          desktopBestForLines: ['Laptop hotspot,', 'video calls home'],
          mobileDescription: '100 GB · Hotspot included',
          popular: true,
        },
        {
          id: 'rogers-120',
          name: 'Rogers Unlimited',
          data: '120 GB 5G',
          price: '$50/mo',
          detail: 'US calling & roaming',
          bestFor: 'Cross-border trips and heavy use',
          desktopBestForLines: ['Cross-border trips,', 'heavy use'],
          mobileDescription: '120 GB · Canada + US calling and roaming',
        },
      ],
      note: 'Prices in CAD before tax, as of October 2026. Rogers plans continue at reduced speed after 100 GB or 120 GB. ★ Most popular.',
    },
    {
      kind: 'section',
      id: 'data-needs',
      title: 'How much data do students and workers need?',
      text: 'Less than most people fear, if you have WiFi at home or on campus. Maps, transit apps, messaging and a daily video call home fit comfortably in 75 GB. Choose more data or a hotspot plan if you will run a laptop off your phone before your home internet is installed, if you stream on a long commute, or if your workplace has no WiFi. The Rogers plans keep working at reduced speed after the full-speed allowance, so you are not cut off at the end of the month.',
    },
    {
      kind: 'section',
      id: 'students-vs-workers',
      title: 'What differs for students and for workers',
      text: 'Students usually have campus WiFi, an orientation week that covers health insurance, and long breaks when they may travel home, so a month-to-month plan with no contract suits them. Workers often need a working number before the first shift, because employers, agencies and payroll systems call and text it, and some job sites are outside city centres, where low-band coverage (LTE band 12) matters. IEC working holiday participants hold a work permit, so they qualify for the monthly plans when staying over 90 days.',
    },
    {
      kind: 'section',
      id: 'documents',
      title: 'What you need to order',
      text: 'Your name, email, arrival date and city, and the plan you want. Nothing is uploaded, and there is no credit check and no SIN. Keep your passport and your study permit, work permit or port of entry letter of introduction handy in case the carrier asks your advisor to see it. The permit itself is issued by the border officer when you land, so ordering with the letter you travel with is normal.',
    },
    {
      kind: 'steps',
      id: 'order-steps',
      title: 'How to order before your flight',
      items: [
        'Check that your phone is unlocked and supports eSIM; our phone compatibility guide shows how.',
        'Pick student or worker on the plans page 1 to 3 weeks before your flight, choose a plan, and add your arrival date and city.',
        'An advisor calls or emails to confirm, usually the same day. Your number is assigned and your eSIM QR code arrives by email.',
        'Put the number on your college, employer and bank forms, install the eSIM at home on WiFi, and switch it on when you land.',
      ],
    },
    {
      kind: 'checklist',
      items: [
        'Phone unlocked by your home carrier, with eSIM support',
        'Passport plus study permit, work permit or letter of introduction',
        'Arrival date and the city you are moving to',
        'Home SIM kept active for codes from banks at home, with data roaming off',
      ],
    },
    {
      kind: 'plan-cta',
      eyebrow: 'Students and workers pick',
      text: 'Rogers · 100 GB · $40/mo + tax',
      mobileLines: ['Rogers · 100 GB', '$40/mo + tax'],
      label: 'See this plan →',
    },
    {
      kind: 'faq',
      id: 'guide-faq',
      title: 'FAQ',
      items: [
        {
          id: 'poe-letter',
          question: 'Can I order with a port of entry letter before I have my permit?',
          answer:
            'Yes. The permit is issued when you land, so ordering with your passport and your port of entry letter of introduction is normal. An advisor asks to see them only if the carrier needs it.',
        },
        {
          id: 'hotspot',
          question: 'Which plans let me use my phone as a hotspot for my laptop?',
          answer:
            'Rogers Plus 100 GB ($40) and Rogers Unlimited 120 GB ($50) include a hotspot. Fido Essential 75 GB ($35) does not.',
        },
        {
          id: 'iec',
          question: 'I am coming on an IEC working holiday. Which plan fits?',
          answer:
            'An IEC working holiday comes with an open work permit, so the monthly Rogers and Fido plans are available if you are staying more than 90 days. If you will visit the US often, Rogers 120 GB includes US calling and roaming.',
        },
        {
          id: 'move-province',
          question: 'Does my plan work if I move province for a co-op term or a new job?',
          answer:
            'Yes. These are national plans with the same price in every province and unlimited Canada-wide calling, so your number works the same in Toronto, Vancouver, Calgary or Halifax.',
        },
        {
          id: 'switch',
          question: 'Can I change plans after I arrive?',
          answer:
            'Yes. The plans are month to month with no contract, so you can move up or down after the first month if your data use turns out different.',
        },
        {
          id: 'first-bill',
          question: 'When do I pay?',
          answer:
            'Nothing is paid online. Rogers or Fido bills you after your line is active, for the plan price plus tax, and an advisor explains the date before anything is billed.',
        },
      ],
    },
  ],
  sources:
    'Sources: Canadian Plans plan catalogue (owner-confirmed 20 October 2026); Rogers, Fido and Chatr plan pages; IRCC guidance on permits issued at the port of entry. Checked 24 October 2026.',
  related: ['best-sim-for-students-from-india', 'student-sim', 'workers-sim'],
};

export const airportSimVsOrderingAheadGuide: GuideArticle = {
  previewOnly: true,
  slug: 'canada-airport-sim-vs-ordering-ahead',
  title: 'Buying a SIM card at a Canadian airport vs ordering before you fly (2026)',
  breadcrumbTitle: 'Airport SIM vs ordering ahead',
  category: 'Moving to Canada',
  description:
    'What you can buy at Toronto Pearson and other Canadian airports, what arrival day looks like, and when ordering a Canadian eSIM before you fly is the better choice.',
  author: teamAuthor,
  reviewer: teamReviewer,
  updated: '2026-10-24',
  updatedLabel: 'Updated 24 Oct 2026',
  readingLabel: '6 min read · Checked 24 October 2026',
  imageCaption:
    'Arrivals hall at a Canadian airport, with a traveller switching on a Canadian eSIM',
  quickAnswer:
    'Some Canadian airports sell prepaid SIMs, but counters are few, hours are limited and the choice is mostly short-term prepaid. Ordering an eSIM before you fly means you land with a working number.',
  quickPoints: [
    {
      label: 'Toronto Pearson:',
      text: 'chatr sells prepaid SIM cards and eSIMs in arrivals; check its hours if you land late.',
    },
    {
      label: 'Other airports:',
      text: 'fewer options, sometimes only a convenience store, and nothing after hours.',
    },
    {
      label: 'Long stays:',
      text: 'students, workers and permanent residents want a monthly plan, which airport counters rarely sell.',
    },
    {
      label: 'Ordering ahead:',
      text: 'number ready before you board, line on when you land. From $35/mo + tax, nothing paid online.',
    },
  ],
  blocks: [
    {
      kind: 'section',
      id: 'what-airports-sell',
      title: 'Can you buy a SIM card at a Canadian airport?',
      text: 'Yes, at some. At Toronto Pearson, chatr, Rogers’ prepaid brand, sells prepaid SIM cards and eSIMs in the arrivals areas (chatrwireless.com, checked 24 October 2026). Other large airports have fewer options, often a convenience or travel store with a small range of prepaid cards, and counters close at night. What you will rarely find is a carrier store selling monthly postpaid plans in the arrivals hall, which is what most students, workers and new permanent residents end up wanting.',
    },
    {
      kind: 'table',
      id: 'compare',
      title: 'Airport counter, city store or ordering ahead: how they compare',
      caption: 'Four ways to get a Canadian SIM or eSIM on arrival, compared',
      columns: ['Option', 'What you can get', 'What you pay, and when', 'Main drawback'],
      rows: [
        {
          label: 'Airport counter',
          values: [
            'Mostly prepaid SIM cards and eSIMs',
            'The first 30 days, at the counter',
            'Limited hours and choice; a queue after a long flight',
          ],
        },
        {
          label: 'City carrier store, a day or two later',
          values: [
            'Prepaid and postpaid plans',
            'Prepaid at the till; postpaid needs ID and usually a credit check',
            'No Canadian number for your first days',
          ],
        },
        {
          label: 'Data-only travel eSIM',
          values: [
            'Mobile data, no Canadian number',
            'A data pack, paid up front',
            'No +1 number for bank codes or callbacks',
          ],
        },
        {
          label: 'Canadian eSIM ordered before you fly',
          values: [
            'Monthly Rogers or Fido plans, or Chatr prepaid for visitors',
            'Nothing online; the carrier bills after activation, from $35 + tax',
            'Needs an unlocked, eSIM-capable phone and 1 to 3 weeks’ notice',
          ],
        },
      ],
      note: 'Prices in CAD before tax, October 2026. Since 12 June 2026, Canadian providers cannot charge activation fees (Telecom Regulatory Policy CRTC 2026-43), wherever you buy.',
    },
    {
      kind: 'section',
      id: 'arrival-day',
      title: 'What arrival day actually looks like',
      text: 'After a long-haul flight you go through border control, where students and workers also have their permit issued, and then collect your bags. On a busy arrival day that can take a while, and a counter may have closed by the time you reach the public hall. Major airports, Pearson included, offer free WiFi, which helps you message whoever is meeting you, but it can be slow at peak times and stops the moment you step outside to the taxi rank or bus stop.',
    },
    {
      kind: 'section',
      id: 'why-ahead',
      title: 'Why most newcomers order before they fly',
      text: 'Ordering ahead moves the waiting to before your trip. Your number is assigned when an advisor confirms the order, so you can put it on bank, college and employer forms from home. You install the eSIM on home WiFi, and when you land you switch the line on: monthly Rogers and Fido plans start when you land, and Chatr prepaid plans are activated 24 hours before your arrival date. There is no credit check, nothing to upload and nothing paid online.',
    },
    {
      kind: 'section',
      id: 'when-airport',
      title: 'When the airport counter is the better choice',
      text: 'Buying at the airport still makes sense in a few cases: your phone does not support eSIM and you need a physical SIM card straight away, you are making a last-minute trip with no time to order, or you are visiting for a few days and only want prepaid. If your phone is eSIM-capable and you know your arrival date, ordering ahead is simpler.',
    },
    {
      kind: 'checklist',
      items: [
        'Landing time: late-evening arrivals may find counters closed',
        'Phone: unlocked and eSIM-capable, or you will need a physical SIM card',
        'Length of stay: under 90 days suits prepaid; longer stays suit a monthly plan',
        'Forms before you fly: if your bank, school or employer wants a Canadian number now, the airport is too late',
        'Home SIM: keep it in the phone with data roaming off for codes from home',
      ],
    },
    {
      kind: 'plan-cta',
      eyebrow: 'Skip the airport counter',
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
          id: 'pricier',
          question: 'Are SIM cards more expensive at the airport?',
          answer:
            'They can be, and you get less choice: a counter sells one brand’s prepaid plans and you pay on the spot. Ordering ahead lets you compare Rogers, Fido and Chatr plans first, with nothing paid online.',
        },
        {
          id: 'postpaid-airport',
          question: 'Can I get a monthly postpaid plan at the airport?',
          answer:
            'Rarely. Airport counters focus on prepaid, and chatr, the brand at Pearson, is prepaid only. Students, workers and permanent residents can order a monthly Rogers or Fido plan before they fly, with no credit check.',
        },
        {
          id: 'wifi',
          question: 'Can I install my eSIM using airport WiFi?',
          answer:
            'You can, but install it at home before you fly instead. Airport WiFi can be slow at peak times, and with the eSIM already installed you only need to switch the line on when you land.',
        },
        {
          id: 'no-esim',
          question: 'What if my phone does not support eSIM?',
          answer:
            'Plans ordered before you arrive are eSIM only, so you would need a physical SIM card after you land, from an airport counter or a store in the city. The bring-your-own-phone plans for people already in Canada come as an eSIM or a SIM card.',
        },
        {
          id: 'how-early',
          question: 'How early should I order?',
          answer:
            '1 to 3 weeks before your flight, once your arrival date is fixed. An advisor needs the date to set the plan up.',
        },
        {
          id: 'which-airport',
          question: 'Does it matter which airport I land at?',
          answer:
            'No. The plans are national and run on the Rogers network, so Toronto, Vancouver, Montreal, Calgary, Edmonton, Winnipeg and Halifax all work the same way.',
        },
      ],
    },
  ],
  sources:
    'Sources: chatr Toronto Pearson airport page; Telecom Regulatory Policy CRTC 2026-43; Canadian Plans plan terms (owner-confirmed 20 to 22 October 2026). Checked 24 October 2026. Airport counters and hours change; check before you travel.',
  related: [
    'toronto-pearson',
    'how-to-get-canadian-phone-number-before-arriving',
    'how-to-activate-canadian-esim',
  ],
};

export const foreignPhoneCompatibilityGuide: GuideArticle = {
  previewOnly: true,
  slug: 'foreign-phone-compatibility-canada',
  title: 'Will my Indian phone work in Canada? A guide to phones bought abroad (2026)',
  breadcrumbTitle: 'Phones bought abroad',
  category: 'Phones & SIMs',
  description:
    'Which phones from India, Bangladesh, the Philippines, Nigeria and China work on Canadian networks, which struggle with bands, calls or eSIM, and how to check your exact model.',
  author: teamAuthor,
  reviewer: teamReviewer,
  updated: '2026-10-24',
  updatedLabel: 'Updated 24 Oct 2026',
  readingLabel: '8 min read · Checked 24 October 2026',
  imageCaption:
    'Phones bought in India, the Philippines, Nigeria and China lined up for a compatibility check',
  quickAnswer:
    'Usually yes for an unlocked iPhone, Google Pixel or Samsung Galaxy S. Budget Android models and phones sold by a carrier at home are where problems appear: missing bands, failed calls or no eSIM.',
  quickPoints: [
    {
      label: 'Usually fine:',
      text: 'iPhone XS or newer (not mainland China models), Google Pixel, Samsung Galaxy S, Z Fold and Z Flip.',
    },
    {
      label: 'Check carefully:',
      text: 'Xiaomi, Redmi, POCO, Realme, Vivo, Oppo and Samsung Galaxy M and F models.',
    },
    {
      label: 'Often a problem:',
      text: 'Tecno, Infinix and itel phones built for African and South Asian networks.',
    },
    {
      label: 'No eSIM:',
      text: 'most iPhones from mainland China, Hong Kong and Macau take two physical SIMs, so a pre-arrival eSIM will not install.',
    },
  ],
  blocks: [
    {
      kind: 'section',
      id: 'why-region',
      title: 'Why the country you bought it in matters',
      text: 'Phone makers build different versions of the same model for different regions. A version made for India, for example, is tuned to the bands Indian networks use, mainly LTE bands 1, 3, 5, 8 and 40, and can leave out bands 2, 4, 12 and 66, which carry much of the Rogers network in Canada. The phone still switches on and may find signal, but coverage can be weak indoors, patchy outside cities, or limited to data while calls fail because voice over LTE (VoLTE) is not enabled for Canadian carriers.',
    },
    {
      kind: 'table',
      id: 'brand-matrix',
      title: 'How popular brands from abroad usually fare in Canada',
      caption:
        'Phone brands common in India, Bangladesh, the Philippines, Nigeria and China, rated for Rogers network bands, VoLTE calling and eSIM',
      columns: ['Brand and models', 'Rogers bands', 'Calls (VoLTE)', 'eSIM', 'What to do'],
      rows: [
        {
          label: 'iPhone XS or newer (India, Philippines, Nigeria, Bangladesh, Gulf and UK models)',
          values: [
            'Full support',
            'Works on Canadian networks',
            'Yes',
            'Check Carrier Lock says “No SIM restrictions”, then order',
          ],
        },
        {
          label: 'iPhone from mainland China, Hong Kong or Macau',
          values: [
            'Full support',
            'Works',
            'Not on most models: two physical nano-SIM slots instead',
            'Use a physical SIM after you land; a pre-arrival eSIM will not install',
          ],
        },
        {
          label: 'Google Pixel 4 or newer',
          values: [
            'Full support on most models',
            'Works',
            'Yes',
            'Check it is unlocked, then order',
          ],
        },
        {
          label: 'Samsung Galaxy S, Z Fold, Z Flip',
          values: [
            'Good on global models',
            'Usually works',
            'Yes on recent models in most countries',
            'Look for “Add eSIM” in SIM manager',
          ],
        },
        {
          label: 'Samsung Galaxy A (mid-range)',
          values: [
            'Varies by model',
            'Usually works',
            'Some models only',
            'Check the exact model code and “Add eSIM”',
          ],
        },
        {
          label: 'Samsung Galaxy M and F',
          values: [
            'Often missing B12 or B66',
            'May fail',
            'Rarely',
            'Send us the model code before ordering',
          ],
        },
        {
          label: 'OnePlus',
          values: [
            'Good on recent flagships, weaker on Nord models',
            'Varies by model and software',
            'Recent flagships only',
            'Check bands and eSIM, or send us the model',
          ],
        },
        {
          label: 'Xiaomi, Redmi, POCO',
          values: [
            'Indian and Asian versions often miss B2, B4, B12 and B66',
            'Often fails on imported models',
            'Rare, except some high-end models',
            'Check before you fly and consider a backup phone',
          ],
        },
        {
          label: 'Vivo, Oppo, Realme, iQOO',
          values: [
            'Budget and mid-range versions often miss key bands',
            'Often fails',
            'Few models',
            'Check the spec sheet against the Rogers bands',
          ],
        },
        {
          label: 'Tecno, Infinix, itel',
          values: [
            'Built for bands such as 1, 3, 8, 20 and 28; most lack B2, B4, B12 and B66',
            'Usually not supported',
            'Almost never',
            'Plan on a different phone for Canada',
          ],
        },
      ],
      note: 'A general guide, not a guarantee: support depends on the exact model code and software version. Rogers network bands: LTE B2, B4, B5, B7, B12, B25, B66; 5G n41, n66, n71, n78 (rogers.com, checked 24 October 2026).',
    },
    {
      kind: 'section',
      id: 'country-notes',
      title: 'Notes by country',
      text: 'India and Bangladesh: iPhones, Pixels and Galaxy S phones sold unlocked generally work; budget Redmi, POCO, Realme, Vivo, Oppo and Galaxy M models are the ones to check. Philippines: phones bought on a Globe or Smart postpaid plan are often locked, so ask the carrier to unlock yours before you leave. Nigeria: iPhones and Galaxy S models work well; Tecno, Infinix and itel phones usually lack the bands Canadian networks rely on. China, Hong Kong and Macau: most iPhones from these markets have two physical SIM slots and no eSIM, and Chinese-market Android phones may limit VoLTE to Chinese carriers.',
    },
    {
      kind: 'section',
      id: 'model-code',
      title: 'How to find your exact model code',
      text: 'Compatibility depends on the exact model, not the name on the box. On iPhone, open Settings › General › About and tap Model Number until it shows a code starting with M; the letters before the slash show the market, such as HN/A for India, CH/A for mainland China and LL/A for the United States. On Android, open Settings › About phone and note the full model number (on a Samsung it starts with SM-). Search that exact code plus “bands”, or send it to us before you order.',
    },
    {
      kind: 'steps',
      id: 'check-steps',
      title: 'Four checks before you fly',
      items: [
        'Unlock: ask the carrier that sold the phone to remove any carrier lock, and test with another network’s SIM if you can.',
        'Bands: compare your model’s LTE bands with the Rogers list: B2, B4 or B66, B5, B7 and B12. Aim for all of them; B12 matters most indoors and outside cities.',
        'Calls: search your model plus “VoLTE Canada”, or send us the model. Data working while calls fail is the classic VoLTE problem.',
        'eSIM: dial *#06# or check Settings › About. An EID number means the phone has eSIM, which plans ordered before you arrive require.',
      ],
    },
    {
      kind: 'tip',
      label: 'Keeping your home number',
      text: 'Leave your home SIM in the tray with data roaming off so bank, UPI, GCash or BVN-linked codes still reach you. Our guide to keeping your home number in Canada covers the setup for India, the Philippines and Nigeria.',
    },
    {
      kind: 'plan-cta',
      eyebrow: 'Not sure about your model?',
      text: 'Pick a plan, then send us your phone model and we check it',
      mobileLines: ['Pick a plan, then send us', 'your phone model to check'],
      label: 'See eSIM plans →',
    },
    {
      kind: 'faq',
      id: 'guide-faq',
      title: 'FAQ',
      items: [
        {
          id: 'indian-iphone',
          question: 'Will an iPhone bought in India work with a Canadian eSIM?',
          answer:
            'Yes, if it is an iPhone XS or newer and Settings › General › About › Carrier Lock shows “No SIM restrictions”. iPhones sold in India support the Canadian bands, VoLTE and eSIM.',
        },
        {
          id: 'redmi-calls',
          question: 'Why do some Xiaomi and Redmi phones get data in Canada but cannot make calls?',
          answer:
            'Calls on the Rogers network go over LTE (VoLTE), and Rogers is retiring its older 3G network. Many Indian and Asian versions of Xiaomi, Redmi and POCO phones do not enable VoLTE for Canadian carriers, so data works while calls fail. Check before you fly.',
        },
        {
          id: 'china-iphone',
          question: 'Can I use a Canadian eSIM on an iPhone from mainland China?',
          answer:
            'No. iPhones made for mainland China, and most made for Hong Kong and Macau, have two physical nano-SIM slots instead of eSIM (Apple support, checked 24 October 2026). They work in Canada with a physical SIM card bought after you land.',
        },
        {
          id: 'philippines-locked',
          question: 'My phone came with a Globe or Smart postpaid plan. Will it work?',
          answer:
            'Only once it is unlocked. Phones sold on a postpaid plan are often locked to that carrier, and only Globe or Smart can remove the lock. Ask before you leave the Philippines, as it can take several days.',
        },
        {
          id: 'tecno',
          question: 'Will a Tecno or Infinix phone from Nigeria work in Canada?',
          answer:
            'Usually not well. Most of these phones are built for the bands used in Africa and lack the main Canadian bands and VoLTE support. If you can, bring an unlocked phone that lists LTE bands 2, 4, 12 and 66.',
        },
        {
          id: 'no-esim',
          question: 'What if my phone has no eSIM?',
          answer:
            'Plans ordered before you arrive are eSIM only, so you would get a physical SIM card after you land. The bring-your-own-phone mobile plans for people already in Canada come as an eSIM or a SIM card.',
        },
      ],
    },
  ],
  sources:
    'Sources: Rogers bring-your-own-device page (network bands and VoLTE requirement); Apple support on Dual SIM with two nano-SIM cards in mainland China, Hong Kong and Macao, and on eSIM; manufacturer specification pages. Checked 24 October 2026. Specs change by model and software version; confirm your exact model.',
  related: [
    'will-my-phone-work-in-canada',
    'keep-your-home-number-in-canada',
    'canadian-esim-locked-phone-check',
  ],
};

export const documentsForPhonePlanGuide: GuideArticle = {
  previewOnly: true,
  slug: 'documents-for-phone-plan-canada',
  title: 'What documents do you need for a phone plan in Canada? (2026)',
  breadcrumbTitle: 'Documents for a phone plan',
  category: 'Money & credit',
  description:
    'The ID and documents Canadian phone plans ask for, by plan type and by immigration status, and exactly what you need to order a plan before you arrive.',
  author: teamAuthor,
  reviewer: teamReviewer,
  updated: '2026-10-24',
  updatedLabel: 'Updated 24 Oct 2026',
  readingLabel: '7 min read · Checked 24 October 2026',
  imageCaption: 'Passport, study permit and a phone laid out for a phone plan order',
  quickAnswer:
    'It depends on the plan and where you buy it. Plans ordered before you arrive through Canadian Plans need no uploads; postpaid plans bought in a Canadian store need the most ID and a credit check.',
  quickPoints: [
    {
      label: 'Ordering before you arrive:',
      text: 'name, email, arrival date and plan. Keep your passport and permit handy in case the carrier asks.',
    },
    { label: 'Prepaid in Canada:', text: 'little or no ID and no credit check.' },
    {
      label: 'Postpaid in a store:',
      text: 'government photo ID, often a second ID showing your address, and a credit check.',
    },
    {
      label: 'Not needed for our pre-arrival plans:',
      text: 'a SIN, proof of a Canadian address, credit history or a deposit.',
    },
  ],
  blocks: [
    {
      kind: 'section',
      id: 'overview',
      title: 'Why phone plans ask for documents',
      text: 'A carrier checks who you are for two reasons: to prevent fraud and, on postpaid plans, to decide whether to extend you credit, because you use the service before you pay for it. Prepaid plans carry no credit risk, so they ask for little. Postpaid plans sold in Canadian stores ask for the most. Plans ordered before you arrive through Canadian Plans sit in between: your status decides which plans you see, and the carrier may ask to see your passport or permit, but nothing is uploaded when you order.',
    },
    {
      kind: 'table',
      id: 'by-plan',
      title: 'Documents by plan type',
      caption: 'ID, documents and credit checks by type of Canadian phone plan',
      columns: ['Plan type', 'ID and documents', 'Credit check or deposit'],
      rows: [
        {
          label: 'Pre-arrival eSIM through Canadian Plans',
          values: [
            'Name, email, arrival date and city. Passport and permit kept handy; an advisor asks only if the carrier needs them',
            'None',
          ],
        },
        {
          label: 'Prepaid plan bought in Canada',
          values: ['Little or no ID on most prepaid plans', 'None'],
        },
        {
          label: 'Postpaid plan in a Canadian store',
          values: [
            'Government photo ID, often plus a second ID showing your address',
            'Credit check; sometimes a refundable deposit without Canadian credit history',
          ],
        },
        {
          label: 'Bring-your-own-phone plan through Canadian Plans, once in Canada',
          values: [
            'Government ID uploaded with the order',
            'The provider’s identity and credit check',
          ],
        },
        {
          label: 'Phone financed over 24 months',
          values: [
            'Government ID; the carrier sets the rest',
            'Full credit check; hard to get without Canadian credit history',
          ],
        },
      ],
      note: 'Store requirements vary by carrier and change often, so confirm before you go. Rogers, for example, asks for two pieces of ID for some in-store transactions, one showing your address (rogers.com, checked 24 October 2026).',
    },
    {
      kind: 'table',
      id: 'by-status',
      title: 'Documents by immigration status',
      caption: 'Which documents to keep handy for a pre-arrival phone plan, by immigration status',
      columns: ['Status', 'Keep handy', 'Plans you can order before arrival'],
      rows: [
        {
          label: 'International student',
          values: [
            'Passport and study permit or port of entry letter of introduction',
            'Monthly Rogers or Fido, from $35/mo',
          ],
        },
        {
          label: 'Worker, including IEC working holiday',
          values: [
            'Passport and work permit or port of entry letter of introduction',
            'Monthly Rogers or Fido, from $35/mo',
          ],
        },
        {
          label: 'New permanent resident',
          values: [
            'Passport and confirmation of permanent residence (COPR)',
            'Monthly Rogers or Fido, from $35/mo',
          ],
        },
        {
          label: 'Visitor, eTA or Super Visa',
          values: [
            'Passport and visitor visa, eTA or Super Visa',
            'Chatr prepaid, from $35 per 30 days',
          ],
        },
      ],
      note: 'Monthly plans are for stays over 90 days; Chatr prepaid plans are for visits under 90 days. Prices in CAD before tax, October 2026.',
    },
    {
      kind: 'section',
      id: 'accepted-id',
      title: 'Which IDs Canadian stores usually accept',
      text: 'For plans bought in a store, carriers generally accept a passport (Canadian or foreign), a provincial driver’s licence or photo ID card, or a permanent resident card as photo ID. A second document may need to show your Canadian address, such as a bank statement or a utility bill, which a newcomer may not have in week one. Provincial health cards are often not accepted as ID. If you are ordering before you arrive, none of this applies yet.',
    },
    {
      kind: 'section',
      id: 'credit',
      title: 'Credit checks and deposits, in short',
      text: 'Postpaid plans bought in a Canadian store include a credit check, and someone with no Canadian credit file may be refused or asked for a refundable deposit. Prepaid plans never need one. The monthly Rogers and Fido plans ordered before you arrive through Canadian Plans skip the credit check entirely: no Canadian credit history, no deposit and no SIN. Our credit check guide explains the store rules in more detail.',
    },
    {
      kind: 'section',
      id: 'name-match',
      title: 'Make sure the details match',
      text: 'Order in your name exactly as it appears in your passport, and use the arrival date on your ticket. If the carrier asks to see a document, a clear photo or PDF of each is enough. Each line is its own order in its own name, so family members travelling together order separately.',
    },
    {
      kind: 'checklist',
      items: [
        'Passport, with your name spelled exactly as on your order',
        'Study permit, work permit, letter of introduction, COPR, or visitor visa or eTA',
        'Arrival date and city',
        'An email address you check while travelling',
        'An unlocked, eSIM-capable phone',
      ],
    },
    {
      kind: 'plan-cta',
      eyebrow: 'Nothing to upload',
      text: 'eSIM plans from $35/mo + tax, no credit check',
      mobileLines: ['eSIM plans from $35/mo + tax', 'No credit check'],
      label: 'See eSIM plans →',
    },
    {
      kind: 'faq',
      id: 'guide-faq',
      title: 'FAQ',
      items: [
        {
          id: 'passport-only',
          question: 'Can I get a Canadian phone plan with only a foreign passport?',
          answer:
            'For prepaid, yes: visitors can order a Chatr prepaid plan with a passport and their visa or eTA. The monthly plans ordered before arrival are for students, workers and permanent residents, who also hold a permit, letter of introduction or COPR.',
        },
        {
          id: 'sin',
          question: 'Do I need a SIN to get a phone plan?',
          answer:
            'No, not for any plan ordered before you arrive through Canadian Plans. A store may ask for one during a postpaid credit check, but a SIN is for work and government benefits, not a phone plan requirement.',
        },
        {
          id: 'upload',
          question: 'Do I upload documents when I order?',
          answer:
            'No. Nothing is uploaded with a pre-arrival order. If the carrier needs to see your passport or permit, an advisor asks, and a clear photo or PDF is enough.',
        },
        {
          id: 'address',
          question: 'Do I need a Canadian address?',
          answer:
            'Not to order before you arrive; your arrival date and city are enough. A Canadian store may ask for proof of address on a postpaid plan.',
        },
        {
          id: 'canadian-bank',
          question: 'Do I need a Canadian bank account or credit card to order?',
          answer:
            'No, because nothing is paid online. The carrier bills you after your line is active, and an advisor explains how and when to pay before anything is billed.',
        },
        {
          id: 'visitor-postpaid',
          question: 'Can a visitor get a monthly postpaid plan?',
          answer:
            'Not through Canadian Plans. Visitors staying under 90 days get Chatr prepaid plans, which need no credit check and leave nothing to cancel when you fly home.',
        },
      ],
    },
  ],
  sources:
    'Sources: Canadian Plans plan terms and order requirements (owner-confirmed 20 to 22 October 2026); Rogers support on ID for in-store transactions; IRCC guidance on permits issued at the port of entry. Checked 24 October 2026. Store ID rules vary; confirm before you visit.',
  related: [
    'credit-check-phone-plan-canada',
    'phone-plans-international-students-canada',
    'prepaid-vs-postpaid-plans-canada',
  ],
};

export const lockedPhoneEsimCheckGuide: GuideArticle = {
  previewOnly: true,
  slug: 'canadian-esim-locked-phone-check',
  title: 'Can you use a Canadian eSIM on a locked phone? How to check before you fly (2026)',
  breadcrumbTitle: 'eSIM on a locked phone',
  category: 'Phones & SIMs',
  description:
    'Why a carrier-locked phone rejects a Canadian eSIM, how to check the lock on iPhone and Android in a minute, and how to get the phone unlocked before you leave home.',
  author: teamAuthor,
  reviewer: teamReviewer,
  updated: '2026-10-24',
  updatedLabel: 'Updated 24 Oct 2026',
  readingLabel: '6 min read · Checked 24 October 2026',
  imageCaption: 'iPhone settings showing Carrier Lock: No SIM restrictions next to an eSIM QR code',
  quickAnswer:
    'No. A carrier lock blocks every other network’s SIM card and eSIM, Canadian ones included. If your phone is locked, ask the carrier that sold it to unlock it before you leave home.',
  quickPoints: [
    {
      label: 'iPhone:',
      text: 'Settings › General › About › Carrier Lock should say “No SIM restrictions”.',
    },
    {
      label: 'Android:',
      text: 'the surest test is another network’s SIM card. If it gets service, the phone is unlocked.',
    },
    {
      label: 'eSIM is not unlocking:',
      text: 'an EID or an “Add eSIM” button says nothing about the lock.',
    },
    {
      label: 'Who can unlock it:',
      text: 'only the carrier that locked it. Canadian carriers cannot, so do it before you fly.',
    },
  ],
  blocks: [
    {
      kind: 'section',
      id: 'what-lock',
      title: 'Why a locked phone rejects a Canadian eSIM',
      text: 'A carrier lock is a restriction the original carrier puts on a phone it sold, often on an instalment plan or a contract, so the phone works only with that carrier. The lock applies to the whole phone, not just the SIM tray, so a downloaded eSIM is blocked exactly like a plastic card. Until the original carrier removes it, a Canadian eSIM from Rogers, Fido or Chatr will not activate, and neither will a data-only travel eSIM.',
    },
    {
      kind: 'table',
      id: 'lock-check',
      title: 'How to check if your phone is locked',
      caption:
        'How to check carrier lock status on iPhone, Samsung Galaxy, Google Pixel and other Android phones',
      columns: ['Phone', 'Where to look', 'Unlocked if you see', 'Locked if you see'],
      rows: [
        {
          label: 'iPhone',
          values: [
            'Settings › General › About › Carrier Lock',
            '“No SIM restrictions”',
            'Anything else, such as “SIM locked”',
          ],
        },
        {
          label: 'Samsung Galaxy',
          values: [
            'Insert another network’s SIM; some models also show a network lock status in Settings › Connections › More connection settings',
            'Signal and a working call on the other SIM',
            'A request for a network unlock PIN, or “SIM not supported”',
          ],
        },
        {
          label: 'Google Pixel',
          values: [
            'Insert another network’s SIM, or try adding the eSIM',
            'Service on the other SIM',
            'A message that the SIM is not supported or the eSIM cannot be added',
          ],
        },
        {
          label: 'Other Android phones',
          values: [
            'Insert another network’s SIM',
            'Calls and data on the other SIM',
            'A request for a network unlock code (NCK), or no service',
          ],
        },
      ],
      note: 'The SIM test needs an active SIM from a different carrier than the one that sold you the phone. Apple’s carrier lock check: support.apple.com, checked 24 October 2026.',
    },
    {
      kind: 'section',
      id: 'eid',
      title: 'Seeing an EID does not mean your phone is unlocked',
      text: 'An EID, the 32-digit number that appears when you dial *#06# or open Settings › About on an eSIM phone, only proves the phone has eSIM hardware. An “Add eSIM” button only proves the software supports it. Neither says anything about the lock. On a locked iPhone, scanning a Canadian QR code typically ends with a “SIM Not Supported” message; on Android you may be told the eSIM cannot be added or the SIM is not supported.',
    },
    {
      kind: 'section',
      id: 'unlock',
      title: 'How to get your phone unlocked before you leave',
      text: 'Contact the carrier that sold you the phone while you still have service at home. Most will unlock a phone once any instalment balance or contract condition is met; some charge a fee, and some need the phone to have been active for a set time. Allow several days, then test with another SIM. Avoid paid third-party unlocking services: only the original carrier can remove the lock properly, and a Canadian store cannot do it for you.',
    },
    {
      kind: 'section',
      id: 'canada-rules',
      title: 'Phones sold in Canada are already unlocked',
      text: 'Since 1 December 2017, the CRTC’s Wireless Code has required Canadian carriers to sell phones unlocked and to unlock older phones free on request (CRTC Wireless Code, checked 24 October 2026). That protects phones bought in Canada; it does not reach a phone sold by a carrier in another country, so a phone from home has to be unlocked there.',
    },
    {
      kind: 'checklist',
      items: [
        'Lock: “No SIM restrictions” on iPhone, or another network’s SIM tested on Android',
        'Balance: any instalment owed to your home carrier paid off or cleared for unlocking',
        'eSIM: an EID under *#06# or in Settings › About',
        'Calls: VoLTE support on Canadian networks for your exact model',
        'Timing: unlocking done at least a week before you fly',
      ],
    },
    {
      kind: 'plan-cta',
      eyebrow: 'We check before we confirm',
      text: 'Pick a plan, then send us your phone model',
      mobileLines: ['Pick a plan, then send', 'us your phone model'],
      label: 'See eSIM plans →',
    },
    {
      kind: 'faq',
      id: 'guide-faq',
      title: 'FAQ',
      items: [
        {
          id: 'travel-esim',
          question: 'Will a data-only travel eSIM work on a locked phone?',
          answer:
            'No. The lock blocks every other network’s profile, whether it is a full Canadian plan or a data-only travel eSIM.',
        },
        {
          id: 'us-uk',
          question: 'My phone is still on a payment plan with a US or UK carrier. What can I do?',
          answer:
            'Ask that carrier what it needs to unlock the phone: usually the device balance paid off, and sometimes a minimum time on the account. Do it before you travel, while you can still sign in and receive their texts.',
        },
        {
          id: 'canada-phones',
          question: 'Are phones sold in Canada locked?',
          answer:
            'No. Under the CRTC Wireless Code, phones sold by Canadian carriers since December 2017 come unlocked, and carriers must unlock older ones free.',
        },
        {
          id: 'dual-sim',
          question: 'If my phone is unlocked, can I keep my home SIM too?',
          answer:
            'Yes. On a dual-SIM phone, keep your home SIM in the tray with data roaming off for codes from home, and use the Canadian eSIM for calls, texts and data.',
        },
        {
          id: 'ordered-locked',
          question: 'What if I order and then find out my phone is locked?',
          answer:
            'Tell your advisor straight away. Nothing is paid online, so you can get the phone unlocked first or switch to an unlocked one before your eSIM is set up.',
        },
        {
          id: 'store-unlock',
          question: 'Can a Canadian phone store unlock my phone from home?',
          answer:
            'No. Only the carrier that locked it can unlock it properly. Canadian carriers unlock phones they sold, not phones from other countries.',
        },
      ],
    },
  ],
  sources:
    'Sources: Apple support on checking carrier lock and on eSIM; CRTC Wireless Code (unlocking rules since 1 December 2017); Rogers bring-your-own-device page. Checked 24 October 2026.',
  related: [
    'will-my-phone-work-in-canada',
    'foreign-phone-compatibility-canada',
    'esim-vs-physical-sim-canada',
  ],
};

export const activateCanadianEsimGuide: GuideArticle = {
  previewOnly: true,
  slug: 'how-to-activate-canadian-esim',
  title: 'How to activate a Canadian eSIM: install before you fly, connect when you land (2026)',
  breadcrumbTitle: 'Activate a Canadian eSIM',
  category: 'Phones & SIMs',
  description:
    'Step-by-step eSIM setup for iPhone, Samsung and Pixel, the dual-SIM settings that keep your home number for codes, and what to check if the line does not connect after landing.',
  author: teamAuthor,
  reviewer: teamReviewer,
  updated: '2026-10-24',
  updatedLabel: 'Updated 24 Oct 2026',
  readingLabel: '7 min read · Checked 24 October 2026',
  imageCaption: 'Scanning a Canadian eSIM QR code from a laptop screen at home before a flight',
  quickAnswer:
    'Install the eSIM at home over WiFi when the QR code arrives and leave it switched off. When you land, switch the Canada line on and make it your data line. Until then, “No Service” is normal.',
  quickPoints: [
    {
      label: 'At home:',
      text: 'scan the QR code from another screen on WiFi, label the line “Canada” and switch it off.',
    },
    {
      label: 'Before you board:',
      text: 'keep the Canada line off and turn data roaming off on your home SIM.',
    },
    {
      label: 'When you land:',
      text: 'airplane mode off, Canada line on, set as your data and default line.',
    },
    {
      label: 'Never delete it:',
      text: 'QR codes usually work once. If something goes wrong, ask your advisor for a new one.',
    },
  ],
  blocks: [
    {
      kind: 'section',
      id: 'three-stages',
      title: 'Activation happens in three stages',
      text: 'Carrier help pages assume you are already in Canada, which is why activating from abroad can look confusing. Separate three things. First, your line is set up: when an advisor confirms your order, your Canadian number is assigned and your eSIM QR code is emailed to you. Second, you install the eSIM profile on your phone over WiFi at home. Third, the line connects to a Canadian tower when you land. Your phone cannot reach a Canadian network from overseas, so the new line showing “No Service” at home is expected.',
    },
    {
      kind: 'table',
      id: 'timeline',
      title: 'The timeline from order to landing',
      caption:
        'Timeline for a Canadian eSIM ordered before arrival, from order to first connection',
      columns: ['When', 'What happens', 'What your phone shows'],
      rows: [
        {
          label: '1 to 3 weeks before your flight',
          values: [
            'You choose a plan online and add your arrival date. Nothing is paid or uploaded.',
            'Only your home carrier',
          ],
        },
        {
          label: 'Usually the same day',
          values: [
            'An advisor confirms by phone or email; your number is assigned and the QR code arrives by email.',
            'Only your home carrier',
          ],
        },
        {
          label: 'Any day before you fly',
          values: [
            'You install the eSIM at home on WiFi, label it Canada and switch it off.',
            'A second line, switched off or showing No Service',
          ],
        },
        {
          label: 'Landing day',
          values: [
            'Monthly Rogers and Fido plans start when you land; Chatr prepaid plans are activated 24 hours before your arrival date. You switch the line on.',
            'Rogers, Fido or Chatr, with signal bars',
          ],
        },
      ],
      note: 'Typical timings. Tell your advisor straight away if your arrival date changes.',
    },
    {
      kind: 'section',
      id: 'install',
      title: 'How to install the eSIM on iPhone, Samsung and Pixel',
      text: 'Connect to WiFi at home, open the QR code email on a laptop, tablet or printout, and follow the steps for your phone. If you only have one phone, ask your advisor for the manual setup details, or on recent iPhones touch and hold the QR code image to start the setup. Once installed, the new line appears in your SIM list.',
    },
    {
      kind: 'devices',
      items: [
        {
          id: 'iphone',
          title: 'iPhone',
          text: 'Settings › Cellular (or Mobile Data) › Add eSIM › Use QR Code, then scan the code. Or tap Enter Details Manually and type the SM-DP+ address and activation code.',
          caption: 'Screenshot: iPhone Settings › Cellular › Add eSIM › Use QR Code',
        },
        {
          id: 'android',
          title: 'Samsung Galaxy and Google Pixel',
          text: 'Samsung: Settings › Connections › SIM manager › Add eSIM › Scan QR code. Pixel: Settings › Network & internet › SIMs › Add SIM › Download a SIM instead, then scan.',
          caption:
            'Screenshot: Samsung SIM manager and Pixel SIMs screens with the QR scanner open',
        },
      ],
    },
    {
      kind: 'section',
      id: 'dual-sim',
      title: 'Dual-SIM settings that keep your home number for codes',
      text: 'Most newcomers keep their home SIM for one-time codes from banks at home. Right after installing, set four things: label the lines “Home” and “Canada”; turn data roaming off on the Home line so it never runs up roaming charges; make Canada your mobile data line and turn off automatic data switching; and, once you land, make Canada your default line for calls and texts. Texts to your home number still arrive as long as your home carrier delivers texts abroad.',
    },
    {
      kind: 'steps',
      id: 'troubleshooting',
      title: 'If the eSIM does not connect after you land',
      items: [
        'Check that the Canada line is switched on and selected for mobile data, then turn airplane mode on and off.',
        'Restart the phone. This forces a fresh search for Canadian networks.',
        'Make sure network selection is set to automatic and the phone’s software is up to date, so its carrier settings are current.',
        'If data works but calls fail, check that VoLTE or 4G calling is switched on for the Canada line.',
        'Still no service? Do not delete the eSIM. Contact your advisor with your phone model and what the screen shows.',
      ],
    },
    {
      kind: 'checklist',
      items: [
        'An unlocked phone with eSIM (an EID under *#06#)',
        'Home WiFi and a second screen or printout for the QR code',
        'Your arrival date confirmed with your advisor',
        'Data roaming off on your home SIM before you board',
      ],
    },
    {
      kind: 'plan-cta',
      eyebrow: 'Ready before you board',
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
          id: 'no-service',
          question: 'Why does my Canadian eSIM say No Service before I fly?',
          answer:
            'Because there is no Canadian network to connect to yet. The profile is installed; the line registers on a Canadian tower when you land and switch it on. Leave it installed.',
        },
        {
          id: 'deleted',
          question: 'What if I delete the eSIM by mistake?',
          answer:
            'Contact your advisor. QR codes usually work only once, so do not try to rescan the old one; the carrier can issue a new QR code for the same number.',
        },
        {
          id: 'one-phone',
          question: 'Can I scan the QR code with the phone that is showing it?',
          answer:
            'No, a camera cannot scan its own screen. Open the email on a laptop or another phone, print it, or ask your advisor for the manual setup details. On recent iPhones you can also touch and hold the QR code image.',
        },
        {
          id: 'delayed',
          question: 'What if my flight is delayed or rescheduled?',
          answer:
            'Tell your advisor the new date as soon as you know it. An installed eSIM stays on your phone and connects when you arrive.',
        },
        {
          id: 'new-phone',
          question: 'Can I move the eSIM to a new phone later?',
          answer:
            'Yes. The carrier transfers the profile to the new phone; ask your advisor or the carrier how, so you do not lose the number in between.',
        },
        {
          id: 'wifi-needed',
          question: 'Do I need WiFi when I land?',
          answer:
            'No. WiFi is only needed to download the profile the first time. When you land, the line connects over the Canadian mobile network.',
        },
      ],
    },
  ],
  sources:
    'Sources: Apple support on setting up eSIM; Samsung and Google Pixel eSIM setup help; Rogers bring-your-own-device page; Canadian Plans plan terms (owner-confirmed 20 to 22 October 2026). Checked 24 October 2026.',
  related: [
    'esim-vs-physical-sim-canada',
    'keep-your-home-number-in-canada',
    'will-my-phone-work-in-canada',
  ],
};

export const firstPhoneBillExplainedGuide: GuideArticle = {
  previewOnly: true,
  slug: 'first-canadian-phone-bill-explained',
  title: 'Your first phone bill in Canada explained: part-month charges, taxes and fees (2026)',
  breadcrumbTitle: 'First phone bill explained',
  category: 'Money & credit',
  description:
    'Why your first Canadian postpaid bill is higher than the plan price, a worked example, sales tax by province, 911 fees, and the fees carriers can no longer charge.',
  author: teamAuthor,
  reviewer: teamReviewer,
  updated: '2026-10-24',
  updatedLabel: 'Updated 24 Oct 2026',
  readingLabel: '8 min read · Checked 24 October 2026',
  imageCaption: 'A first Canadian phone bill with the part-month charge and sales tax highlighted',
  quickAnswer:
    'Your first postpaid bill covers the days since activation plus the next month in advance, with tax on both, so it is higher than the plan price. From the second bill, you pay one month plus tax.',
  quickPoints: [
    {
      label: 'Part month:',
      text: 'a daily charge for the days between activation and your billing date.',
    },
    { label: 'Month ahead:', text: 'postpaid plans are billed a month in advance.' },
    {
      label: 'Tax:',
      text: '5% in Alberta up to 15% in New Brunswick, Newfoundland and Labrador and PEI, plus a small 911 fee in some provinces.',
    },
    {
      label: 'No activation fee:',
      text: 'banned since 12 June 2026 (CRTC 2026-43). Canadian Plans charges no fee either.',
    },
  ],
  blocks: [
    {
      kind: 'section',
      id: 'why-higher',
      title: 'Why the first bill is higher than the plan price',
      text: 'Canadian plan prices are advertised before tax, and postpaid plans bill each month in advance. When your line starts partway through a billing cycle, the first bill therefore carries two charges: a part-month charge for the days between activation and your billing date, and the full price of the coming month. Sales tax is added to both. It looks like a mistake, but it happens once; the second bill settles at the plan price plus tax.',
    },
    {
      kind: 'table',
      id: 'worked-example',
      title: 'A worked example: Rogers 100 GB at $40 in Ontario',
      caption:
        'Illustration of a first and second postpaid phone bill in Ontario for a $40 monthly plan activated on the 10th with a billing date of the 15th',
      columns: ['Charge', 'First bill', 'Second bill'],
      rows: [
        { label: 'Part month, 10th to 14th (5 days)', values: ['$6.67', '—'] },
        { label: 'Month ahead, 15th to 14th', values: ['$40.00', '$40.00'] },
        { label: 'HST at 13%', values: ['$6.07', '$5.20'] },
        { label: 'Total', values: ['$52.74', '$45.20'] },
      ],
      note: 'An illustration only: carriers calculate daily rates and billing dates their own way, and your advisor tells you your first bill date before anything is billed. Prices in CAD.',
    },
    {
      kind: 'section',
      id: 'prepaid-differs',
      title: 'Prepaid plans work differently',
      text: 'On a prepaid plan there is no part-month bill. You pay for each 30-day or 90-day period before it starts, plus tax, and nothing is billed afterwards. Chatr plans ordered through Canadian Plans are activated 24 hours before your arrival date.',
    },
    {
      kind: 'section',
      id: 'what-you-pay',
      title: 'What you pay when you order, and after',
      text: 'Nothing is paid when you order through Canadian Plans, and we charge no SIM, activation or shipping fee. Once your line is active, Rogers, Fido or Chatr bills you directly for the plan price plus tax. Your advisor tells you the first bill date and how to pay before anything is billed. Set up automatic payments once you have a Canadian bank account or card, so a bill is never missed.',
    },
    {
      kind: 'table',
      id: 'taxes',
      title: 'Sales tax on phone plans by province',
      caption:
        'GST, HST, PST, RST and QST rates applied to phone plans in each province and territory, October 2026',
      columns: ['Province or territory', 'Tax', 'Total rate'],
      rows: [
        { label: 'Alberta, Northwest Territories, Nunavut, Yukon', values: ['GST 5%', '5%'] },
        { label: 'Saskatchewan', values: ['GST 5% + PST 6%', '11%'] },
        { label: 'British Columbia', values: ['GST 5% + PST 7%', '12%'] },
        { label: 'Manitoba', values: ['GST 5% + RST 7%', '12%'] },
        { label: 'Ontario', values: ['HST 13%', '13%'] },
        { label: 'Nova Scotia', values: ['HST 14% (since 1 April 2025)', '14%'] },
        { label: 'Quebec', values: ['GST 5% + QST 9.975%', '14.975%'] },
        {
          label: 'New Brunswick, Newfoundland and Labrador, Prince Edward Island',
          values: ['HST 15%', '15%'],
        },
      ],
      note: 'GST and HST rates from the Canada Revenue Agency; provincial sales tax rates from each province. Checked 24 October 2026.',
    },
    {
      kind: 'section',
      id: 'fees-911',
      title: 'The 911 fee on your bill',
      text: 'Several provinces charge a monthly 911 fee on each phone line, which the carrier collects and passes on. The amounts are small and change from time to time: Alberta’s is $0.95, for example, while Ontario, British Columbia and Manitoba charge none. Saskatchewan, Nova Scotia and New Brunswick raised theirs in 2025 and 2026, to between roughly $1 and $3 a month.',
    },
    {
      kind: 'table',
      id: 'fees',
      title: 'Which fees carriers can and cannot charge since June 2026',
      caption:
        'Charges permitted and banned for Canadian mobile customers under Telecom Regulatory Policy CRTC 2026-43',
      columns: ['Charge', 'Allowed?', 'What it means for you'],
      rows: [
        {
          label: 'Activation or setup fee',
          values: [
            'No, banned since 12 June 2026',
            'You should not see a fee for starting your line',
          ],
        },
        {
          label: 'Fee to change your plan',
          values: [
            'No, banned since 12 June 2026',
            'Moving up or down a plan carries no admin fee',
          ],
        },
        {
          label: 'Early cancellation fee',
          values: [
            'Only if a subsidized phone is part of the contract',
            'Monthly plans on your own phone can be cancelled without one',
          ],
        },
        {
          label: 'Part-month charge and month in advance',
          values: ['Yes, normal postpaid billing', 'Appears once, on the first bill'],
        },
        {
          label: 'Sales tax and 911 fee',
          values: ['Yes, set by governments', 'Added to every bill'],
        },
        {
          label: 'Optional extras you choose',
          values: ['Yes', 'Roaming packs, add-ons and calls outside your plan'],
        },
        {
          label: 'Canadian Plans fee',
          values: ['None', 'No SIM, activation or shipping fee, and nothing paid online'],
        },
      ],
      note: 'After the ban took effect, the CRTC wrote to some carriers about new device setup, shipping and SIM charges, so query any one-time charge you do not recognize. If a carrier will not fix a billing problem, the Commission for Complaints for Telecom-television Services (CCTS) handles complaints free (ccts-cprst.ca).',
    },
    {
      kind: 'steps',
      id: 'check-first-bill',
      title: 'How to check your first bill',
      items: [
        'Find the billing period and the part-month dates; the part month should start on your activation day.',
        'Check that the monthly charge matches your plan price before tax.',
        'Check that the tax rate matches your province.',
        'Look for any one-time charge you did not agree to, and ask the carrier to explain or remove it.',
        'Set up automatic payments so the next bill is paid on time.',
      ],
    },
    {
      kind: 'tip',
      label: 'Budget tip',
      text: 'For a $40 plan in Ontario, budget about $53 for the first bill and $45.20 a month after that. In Alberta, the same plan comes to about $43 a month with GST and the 911 fee.',
    },
    {
      kind: 'plan-cta',
      eyebrow: 'Clear billing from day one',
      text: 'eSIM plans from $35/mo + tax, nothing paid online',
      mobileLines: ['eSIM plans from $35/mo + tax', 'Nothing paid online'],
      label: 'See eSIM plans →',
    },
    {
      kind: 'faq',
      id: 'guide-faq',
      title: 'FAQ',
      items: [
        {
          id: 'pay-us',
          question: 'Do I pay Canadian Plans anything?',
          answer:
            'No. Nothing is paid when you order, and we charge no SIM, activation or shipping fee. The carrier bills you after your line is active.',
        },
        {
          id: 'before-tax',
          question: 'Why are Canadian phone prices shown before tax?',
          answer:
            'Because sales tax varies by province, from 5% to 15%, Canadian businesses usually advertise prices before tax and add it at billing.',
        },
        {
          id: 'activation-fee',
          question: 'Can a carrier still charge an activation fee in 2026?',
          answer:
            'No. Since 12 June 2026, Telecom Regulatory Policy CRTC 2026-43 has barred providers from charging fees to activate or change a plan. If you see one, ask the carrier to remove it, and contact the CCTS if they refuse.',
        },
        {
          id: 'second-bill',
          question: 'Will my second bill be lower?',
          answer:
            'Yes, if nothing else changes. The part-month charge appears only once, so from the second bill you pay one month in advance plus tax.',
        },
        {
          id: 'when-due',
          question: 'When is my first bill due, and how do I pay it?',
          answer:
            'Your advisor tells you the first bill date before anything is billed. You can pay through the carrier’s app or website, and once you have a Canadian bank account you can set up automatic payments.',
        },
        {
          id: 'wrong-charge',
          question: 'What if a charge looks wrong?',
          answer:
            'Ask the carrier first; most billing mistakes are fixed by phone or chat. If the carrier does not resolve it, the CCTS reviews telecom complaints free.',
        },
      ],
    },
  ],
  sources:
    'Sources: CRTC announcement and Telecom Regulatory Policy CRTC 2026-43 (fees banned from 12 June 2026); CRTC staff letters to carriers, June 2026; Canada Revenue Agency GST/HST rates; provincial sales tax and 911 fee notices; CCTS. Checked 24 October 2026.',
  related: [
    'prepaid-vs-postpaid-plans-canada',
    'credit-check-phone-plan-canada',
    'rogers-vs-fido-vs-chatr-for-newcomers',
  ],
};

/** New standalone slugs; the pack's phone-compatibility rewrite lives in guides-newcomer.ts. */
export const seoPackGuides: readonly GuideArticle[] = [
  virtualNumberVsSimGuide,
  prepaidVsPostpaidCanadaGuide,
  studentWorkerPhonePlansGuide,
  airportSimVsOrderingAheadGuide,
  foreignPhoneCompatibilityGuide,
  documentsForPhonePlanGuide,
  lockedPhoneEsimCheckGuide,
  activateCanadianEsimGuide,
  firstPhoneBillExplainedGuide,
];
