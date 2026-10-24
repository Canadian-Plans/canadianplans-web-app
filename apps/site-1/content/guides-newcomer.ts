import { teamAuthor, teamReviewer, type GuideArticle } from './guide-shared';

/**
 * Five newcomer guides added 23 October 2026 after the second keyword and audience research
 * pass (docs/marketing/seo-content-research-2026-10-23.md, section 7). Each targets a question
 * competitors answer thinly, and every plan fact traces to docs/LAUNCH_PLANS.md. External
 * facts (SIN documents, carrier bands, GCash rules) were checked on the dates in `sources`.
 */

export const numberBeforeArrivalGuide: GuideArticle = {
  previewOnly: true,
  slug: 'how-to-get-canadian-phone-number-before-arriving',
  title: 'How to get a Canadian phone number before you arrive: step by step (2026)',
  breadcrumbTitle: 'Canadian number before you arrive',
  category: 'Moving to Canada',
  description:
    'A three-week timeline for ordering a Canadian eSIM from abroad, what to do with your new number before you fly, and what happens on landing day.',
  author: teamAuthor,
  reviewer: teamReviewer,
  updated: '2026-10-23',
  updatedLabel: 'Updated 23 Oct 2026',
  readingLabel: '7 min read · Prices as of October 2026',
  imageCaption: 'Boarding pass, passport and a phone showing a new +1 number',
  quickAnswer:
    'Order a Canadian eSIM online 1 to 3 weeks before your flight. An advisor confirms the order by phone or email, your +1 number is assigned, and your eSIM QR code arrives by email.',
  quickPoints: [
    {
      label: 'Install:',
      text: 'at home on WiFi; leave the line off and switch it on when you land.',
    },
    {
      label: 'Students, workers, permanent residents:',
      text: 'monthly Rogers and Fido plans from $35/mo.',
    },
    { label: 'Visitors:', text: 'Chatr prepaid plans from $35 per 30 days.' },
    {
      label: 'To order:',
      text: 'no credit check, nothing uploaded, nothing paid online. Prices CAD + tax.',
    },
  ],
  blocks: [
    {
      kind: 'section',
      id: 'why',
      title: 'Why get the number before you land',
      text: 'In your first days you will be asked for a Canadian phone number by your bank, your college or employer, a landlord, the transit app and the delivery driver. Most of them text a one-time code to it. If the number already exists when you fill in those forms from home, your first week in Canada is admin you have already done.',
    },
    {
      kind: 'checklist',
      items: [
        'Bank: book your newcomer account appointment and receive login codes',
        'School or employer: arrival forms, payroll and HR contact details',
        'Housing: landlords and rental sites expect a local number',
        'Day one: a taxi or ride app, transit and a message to whoever is meeting you',
        'No roaming bill from your home carrier and no line at the airport SIM counter',
      ],
    },
    {
      kind: 'steps',
      id: 'timeline',
      title: 'The timeline, from three weeks out to landing day',
      items: [
        '3 weeks before: check your phone is unlocked and supports eSIM (Settings, General, About on iPhone; SIM manager on Android). Ask your home carrier to unlock it if needed.',
        '1 to 3 weeks before: choose your plan online. Pick how you are arriving (student, worker, permanent resident or visitor) so only eligible plans show. Fill in your name, email and arrival date. Nothing is paid and nothing is uploaded.',
        'Same day, usually: an advisor calls or emails to confirm the plan and your dates. If the carrier needs to see your passport or permit, they ask now.',
        'After confirmation: your Canadian number is assigned and your eSIM QR code arrives by email. Scan it at home on WiFi, label the line “Canada” and leave it switched off.',
        'Before you fly: put the new number on your bank, school, employer and rental forms. Keep your home SIM in the tray for one-time codes.',
        'Landing day: turn off airplane mode, switch the Canada line on, set it as your data line and turn data roaming off on your home SIM. You are online before baggage claim.',
      ],
    },
    {
      kind: 'section',
      id: 'plans',
      title: 'Which plan you can order depends on how you are arriving',
      text: 'Study permit, work permit or permanent resident, staying more than 90 days: a monthly postpaid Rogers or Fido plan, from $35 for Fido 75 GB, $40 for Rogers 100 GB or $50 for Rogers 120 GB with Canada + US calling and roaming. Visitor visa, eTA or Super Visa, staying under 90 days: a Chatr prepaid plan, $35 for 50 GB or $40 for 90 GB per 30 days, or $75 for 75 GB over 90 days. All prices are CAD before tax, and all plans are eSIM for your own unlocked phone.',
    },
    {
      kind: 'plan-cta',
      eyebrow: 'Start here',
      text: 'eSIM plans from $35/mo + tax, nothing paid online',
      mobileLines: ['eSIM plans from $35/mo + tax', 'Nothing paid online'],
      label: 'See eSIM plans →',
    },
    {
      kind: 'section',
      id: 'what-happens',
      title: 'What happens between ordering and landing',
      text: 'Your line is assigned when the order is confirmed, so the number is real and you can share it. Calls and texts to it start working once you switch the line on in Canada. Monthly plans begin when you land; Chatr prepaid plans are activated 24 hours before your arrival date. Your first bill comes from the carrier after the line is active, for the plan price plus tax. Canadian Plans charges nothing: no SIM, activation or shipping fee, and nothing is paid on the website.',
    },
    {
      kind: 'section',
      id: 'documents',
      title: 'What you need to order',
      text: 'Your name, email, arrival date and city, and the plan you want. That is all for the order itself. Keep your passport and your study permit or letter of introduction, work permit, confirmation of permanent residence or visa handy in case the carrier asks your advisor for it. There is no credit check and no SIN.',
    },
    {
      kind: 'tip',
      label: 'Flight change?',
      text: 'Tell your advisor the new date as soon as you know it. The order is set up around your arrival, so the sooner they hear, the simpler the change.',
    },
    {
      kind: 'faq',
      id: 'guide-faq',
      title: 'FAQ',
      items: [
        {
          id: 'how-early',
          question: 'How early can I order a Canadian number?',
          answer:
            'Order 1 to 3 weeks before your flight. Ordering earlier is possible, but your advisor needs your arrival date to set the plan up, so wait until the date is fixed.',
        },
        {
          id: 'share',
          question: 'Can I give out the number before I land?',
          answer:
            'Yes. Once your order is confirmed the number is yours, and you can put it on bank, school, employer and rental forms. Calls and texts to it start working when you switch the line on in Canada.',
        },
        {
          id: 'bank-otp',
          question: 'Will Canadian banks send codes to it?',
          answer:
            'Yes, once the line is on. Canadian banks text verification codes to Canadian mobile numbers, which is the main reason to have one before your first bank appointment.',
        },
        {
          id: 'airport',
          question: 'Which airport can I land at?',
          answer:
            'Any Canadian airport. These are national plans on the Rogers network, so Toronto, Vancouver, Montreal, Calgary, Edmonton, Winnipeg and Halifax all work the same way.',
        },
        {
          id: 'landed',
          question: 'I have already landed without a plan. Is it too late?',
          answer:
            'No. Order online and an advisor confirms it the same way. If you need a number right now, call us and we tell you the fastest route.',
        },
        {
          id: 'cost',
          question: 'What do I pay Canadian Plans?',
          answer:
            'Nothing. The carrier bills you after your line is active for the plan price plus tax. There is no SIM, activation or shipping fee, and our help costs you nothing.',
        },
      ],
    },
  ],
  sources:
    'Sources: Canadian Plans plan terms (owner-confirmed 20 to 22 October 2026); Rogers, Fido and Chatr plan pages, checked October 2026.',
};

export const carrierPickerGuide: GuideArticle = {
  previewOnly: true,
  slug: 'rogers-vs-fido-vs-chatr-for-newcomers',
  title: 'Rogers vs Fido vs Chatr for newcomers: which plan should you pick? (2026)',
  breadcrumbTitle: 'Rogers vs Fido vs Chatr',
  category: 'Phones & SIMs',
  description:
    'All three run on the Rogers network. The right one depends on your immigration status, how long you stay and how much data you use. Prices and a decision table inside.',
  author: teamAuthor,
  reviewer: teamReviewer,
  updated: '2026-10-23',
  updatedLabel: 'Updated 23 Oct 2026',
  readingLabel: '6 min read · Prices as of October 2026',
  imageCaption: 'Three phones side by side showing Rogers, Fido and Chatr plan screens',
  quickAnswer:
    'Rogers, Fido and Chatr all use the Rogers network, so coverage is the same. What differs is price, data and who is eligible, and none needs a credit check when ordered before you arrive.',
  quickPoints: [
    { label: 'Lowest monthly price:', text: 'Fido 75 GB at $35, for stays over 90 days.' },
    { label: 'Most popular:', text: 'Rogers 100 GB at $40, hotspot included.' },
    { label: 'US trips:', text: 'Rogers 120 GB at $50, with Canada + US calling and roaming.' },
    {
      label: 'Visiting under 90 days:',
      text: 'Chatr prepaid from $35 per 30 days. Prices CAD + tax.',
    },
  ],
  blocks: [
    {
      kind: 'section',
      id: 'same-network',
      title: 'First, the thing people get wrong: the network is the same',
      text: 'Fido and Chatr are brands owned by Rogers and they run on the Rogers network. Signal on campus, downtown or on the highway does not change with the brand. What changes is the price, the data allowance, the extras such as a hotspot or US roaming, and whether the plan is prepaid or postpaid.',
    },
    {
      kind: 'section',
      id: 'eligibility',
      title: 'Second, your status decides which brands you can order',
      text: 'Through Canadian Plans, monthly Rogers and Fido plans are for people arriving on a study permit, a work permit or as a permanent resident and staying more than 90 days. Chatr prepaid plans are for visitor visa, eTA and Super Visa arrivals staying under 90 days. Pick your situation on the plans page and only the plans you are eligible for appear.',
    },
    {
      kind: 'comparison',
      rows: [
        {
          id: 'fido',
          name: 'Fido 75 GB',
          data: '75 GB 5G',
          price: '$35/mo',
          detail: 'Postpaid, no hotspot',
          bestFor: 'Lowest monthly price for stays over 90 days',
          desktopBestForLines: ['Lowest monthly price,', 'stays over 90 days'],
          mobileDescription: '75 GB · Lowest monthly price, stays over 90 days',
        },
        {
          id: 'rogers-100',
          name: 'Rogers 100 GB',
          data: '100 GB 5G',
          price: '$40/mo',
          detail: 'Postpaid, hotspot included',
          bestFor: 'Most newcomers: video calls home plus a laptop hotspot',
          desktopBestForLines: ['Most newcomers:', 'video calls + hotspot'],
          mobileDescription: '100 GB · Most popular, hotspot included',
          popular: true,
        },
        {
          id: 'rogers-120',
          name: 'Rogers 120 GB Canada + US',
          data: '120 GB 5G',
          price: '$50/mo',
          detail: 'US calling and roaming',
          bestFor: 'Cross-border trips and heavy streaming',
          desktopBestForLines: ['Cross-border trips,', 'heavy streaming'],
          mobileDescription: '120 GB · US calling and roaming included',
        },
        {
          id: 'chatr-50',
          name: 'Chatr 50 GB',
          data: '50 GB LTE',
          price: '$35/30 days',
          detail: 'Prepaid, +5 GB with Autopay',
          bestFor: 'Visits of up to a month',
          mobileDescription: '50 GB · Prepaid, visits up to a month',
        },
        {
          id: 'chatr-90',
          name: 'Chatr 90 GB',
          data: '90 GB LTE',
          price: '$40/30 days',
          detail: 'Prepaid, +10 GB with Autopay',
          bestFor: 'Visitors who stream and video call daily',
          desktopBestForLines: ['Visitors who stream', 'and video call daily'],
          mobileDescription: '90 GB · Prepaid, for heavy-use visitors',
        },
        {
          id: 'chatr-90-day',
          name: 'Chatr 75 GB, 90 days',
          data: '75 GB LTE',
          price: '$75/90 days',
          detail: 'Prepaid, one payment',
          bestFor: 'Super Visa and longer visits up to 3 months',
          desktopBestForLines: ['Super Visa and', 'visits up to 3 months'],
          mobileDescription: '75 GB over 90 days · Super Visa visits',
        },
      ],
      note: 'Prices in CAD before tax, as of October 2026. Monthly plans include unlimited Canada-wide calling, unlimited international texts and 1,000 minutes to India, China, Bangladesh, Mexico and the UK. ★ Most popular.',
    },
    {
      kind: 'section',
      id: 'fido',
      title: 'Choose Fido if you want the lowest monthly bill',
      text: '75 GB covers maps, messaging, music and daily video calls home with plenty left over, especially if you have WiFi at home or on campus. It does not include a mobile hotspot, so if you plan to run a laptop off your phone before your home internet is installed, look at Rogers instead.',
    },
    {
      kind: 'section',
      id: 'rogers',
      title: 'Choose Rogers if you want room to spare, a hotspot or US roaming',
      text: 'Rogers 100 GB at $40 is what most newcomers pick: the extra data and the hotspot cost $5 more than Fido. Rogers 120 GB at $50 adds unlimited US calling and US roaming, which matters if you will cross the border for work, family or weekend trips. Both are postpaid, month to month, with no contract.',
    },
    {
      kind: 'section',
      id: 'chatr',
      title: 'Choose Chatr if you are visiting for less than 90 days',
      text: 'Chatr plans are prepaid, so there is nothing to cancel when you leave. The 30-day plans include unlimited calling to Canada and the US and are activated 24 hours before you land. The 90-day plan is one payment for the whole stay, which suits parents and grandparents on a Super Visa visit. Chatr runs on 4G LTE rather than 5G, which is more than enough for maps, messaging and video calls.',
    },
    {
      kind: 'plan-cta',
      eyebrow: 'Most newcomers pick',
      text: 'Rogers · 100 GB · $40/mo + tax',
      mobileLines: ['Rogers · 100 GB', '$40/mo + tax'],
      label: 'See this plan →',
    },
    {
      kind: 'section',
      id: 'switch',
      title: 'You can change your mind after the first month',
      text: 'The monthly plans have no contract. If 75 GB turns out to be too little or 120 GB too much, ask your advisor to move you after the first month. Once you have Canadian ID and a few months of history, the bring-your-own-phone mobile plans for people already in Canada (100 GB for $55, 175 GB for $60 as a limited-time offer, unlimited 5G+ for $90) are another option; those do include a credit check.',
    },
    {
      kind: 'faq',
      id: 'guide-faq',
      title: 'FAQ',
      items: [
        {
          id: 'coverage',
          question: 'Is Fido or Chatr coverage worse than Rogers?',
          answer:
            'No. All three brands use the Rogers network, so coverage is identical. Chatr runs on 4G LTE rather than 5G, which affects top speed, not where you get signal.',
        },
        {
          id: 'credit',
          question: 'Do any of these plans need a credit check?',
          answer:
            'Not when you order them through Canadian Plans before you arrive. There is no credit check and no Canadian credit history needed on the Rogers, Fido or Chatr plans above.',
        },
        {
          id: 'student-chatr',
          question: 'I am a student. Can I take a Chatr plan instead?',
          answer:
            'Chatr prepaid plans are for visitors staying under 90 days. Students on a study permit are eligible for the monthly Rogers and Fido plans, which give you more data for a similar price and include international minutes.',
        },
        {
          id: 'family',
          question: 'Can a family mix plans?',
          answer:
            'Yes. Each line is its own order in its own name, so a student can take Fido while visiting parents take Chatr.',
        },
        {
          id: 'pay',
          question: 'When do I pay?',
          answer:
            'Nothing is paid online. The carrier bills you after your line is active for the plan price plus tax. Canadian Plans charges no fee.',
        },
      ],
    },
  ],
  sources:
    'Sources: Canadian Plans plan catalogue (owner-confirmed 20 October 2026); Rogers, Fido and Chatr plan pages, checked October 2026.',
};

export const firstWeekGuide: GuideArticle = {
  previewOnly: true,
  slug: 'first-week-in-canada-checklist',
  title: 'First week in Canada checklist: phone number, SIN, bank account, health card (2026)',
  breadcrumbTitle: 'First week in Canada',
  category: 'Moving to Canada',
  description:
    'A day-by-day order for newcomer admin: Canadian number, SIN, bank account, health card and internet, what each step needs from the last, and the documents to carry.',
  author: teamAuthor,
  reviewer: teamReviewer,
  updated: '2026-10-23',
  updatedLabel: 'Updated 23 Oct 2026',
  readingLabel: '9 min read · Checked October 2026',
  imageCaption: 'Newcomer at a kitchen table with passport, permit and a checklist',
  quickAnswer:
    'Do the admin in the order each step depends on. The phone number comes first because the bank, your employer and most online services text a code to it.',
  quickPoints: [
    {
      label: '1. Phone number:',
      text: 'a working Canadian number, ideally ordered before you fly.',
    },
    { label: '2. SIN:', text: 'your Social Insurance Number from Service Canada, free.' },
    { label: '3. Bank account:', text: 'a newcomer account, once you have your SIN.' },
    {
      label: '4. Health card:',
      text: 'apply in week one and keep interim insurance until it is active.',
    },
    { label: '5. Home internet:', text: 'once you have an address.' },
  ],
  blocks: [
    {
      kind: 'section',
      id: 'order',
      title: 'Why the order matters',
      text: 'Each step feeds the next. The bank wants a Canadian number to text you a login code and usually asks for your SIN. Your employer needs your SIN before your first pay and a bank account to send it to. The internet provider wants an address and a phone number to confirm the install. Doing these in the wrong order means repeat visits.',
    },
    {
      kind: 'steps',
      id: 'week',
      title: 'Day by day',
      items: [
        'Before you fly: order a Canadian eSIM so your number exists already. Put it on your bank and school or employer forms from home. Pack originals: passport, study or work permit or letter of introduction, or confirmation of permanent residence (COPR).',
        'Day 1, landing: switch on your Canadian line, message whoever is meeting you, get to your accommodation. Turn data roaming off on your home SIM.',
        'Day 2, SIN: apply for your Social Insurance Number. You need a passport plus your work permit, a study permit that says you may work, or your COPR or PR card. Apply online or in person at a Service Canada Centre; in person you usually get the number the same day. There is no fee.',
        'Day 3, bank: open a newcomer account. Bring your passport, your permit or COPR, your SIN and proof of where you are staying (a host letter or booking works at most banks). Set up the app and direct deposit while you are there.',
        'Day 4, health: apply for your provincial health card (MSP in BC, Alberta Health Care Insurance Plan, Manitoba Health, eHealth Saskatchewan, OHIP in Ontario). Some provinces have a waiting period of up to about three months, so keep interim private insurance until your card is active.',
        'Day 5, home: once you have an address in BC, Alberta, Manitoba or Saskatchewan, order home internet. An advisor confirms availability and books a free install, usually within about 3 days.',
        'Day 6 to 7: transit pass, settlement agency registration (free), and photocopies or scans of every document you now hold.',
      ],
    },
    {
      kind: 'section',
      id: 'phone',
      title: 'Step 1: a Canadian phone number that already works',
      text: 'Order it 1 to 3 weeks before your flight. Monthly Rogers and Fido eSIM plans start at $35 (CAD, plus tax) for students, workers and permanent residents, with no credit check and nothing paid online. If you land without one, you can still order the same day; it just means doing the bank and employer forms after you arrive instead of before.',
    },
    {
      kind: 'section',
      id: 'sin',
      title: 'Step 2: Social Insurance Number',
      text: 'The SIN is the nine-digit number you need to work and to receive government benefits. Service Canada issues it free. Temporary residents bring a passport and a work permit, or a study permit that allows work. Permanent residents bring a passport and their COPR (accepted within one year of landing) or PR card. You do not need a phone number or a Canadian address to apply in person, but the bank in step 3 will ask for the SIN.',
    },
    {
      kind: 'section',
      id: 'bank',
      title: 'Step 3: bank account',
      text: 'The big banks run newcomer packages with fee waivers and a first credit card that does not need Canadian credit history. Expect to show your passport, your permit or COPR and your SIN. Most banks text a verification code to a Canadian mobile number when you set up online banking, which is why the phone comes first. Some banks let you start the application from abroad; having your Canadian number already makes that smoother.',
    },
    {
      kind: 'section',
      id: 'health',
      title: 'Step 4: provincial health card',
      text: 'Health coverage is provincial, so where you live decides the office and the rules. Apply in your first week. Several provinces have a waiting period before coverage starts, so keep the interim insurance your school or employer recommends until the card is active. The health office may text or mail you, so give them the Canadian number.',
    },
    {
      kind: 'section',
      id: 'internet',
      title: 'Step 5: home internet',
      text: 'Once you have a lease, order home internet with your move-in date. In British Columbia, Alberta, Manitoba and Saskatchewan, unlimited plans start at $50 to $90 a month depending on the province, with a WiFi router included, free installation and nothing paid up front. An advisor confirms availability at the exact address and books the technician, usually within about 3 days of your call.',
    },
    {
      kind: 'checklist',
      items: [
        'Passport (original) and a photocopy',
        'Study permit or letter of introduction, work permit, or COPR / PR card',
        'Canadian phone number (ordered before you fly)',
        'Proof of where you are staying: lease, host letter or hotel booking',
        'Interim health insurance details',
        'A few hundred dollars in cash or a card for the first deposit',
      ],
    },
    {
      kind: 'tip',
      label: 'One number',
      text: 'Use the same Canadian number on the SIN form, the bank, your employer, the health office and your lease. Changing it later means updating every account and chasing every verification code again.',
    },
    {
      kind: 'faq',
      id: 'guide-faq',
      title: 'FAQ',
      items: [
        {
          id: 'sin-phone',
          question: 'Do I need a phone number to apply for a SIN?',
          answer:
            'No. Service Canada does not require one for an in-person or online application. You need it for the bank, your employer and most online services instead.',
        },
        {
          id: 'bank-before',
          question: 'Can I open a bank account before I arrive?',
          answer:
            'Some Canadian banks let newcomers from certain countries start an account online before landing and finish identity checks in a branch. Having a Canadian phone number already makes the online part easier, since verification codes go to it.',
        },
        {
          id: 'health-wait',
          question: 'Is health coverage immediate?',
          answer:
            'Not everywhere. Several provinces have a waiting period of up to about three months. Keep interim insurance until your provincial card is active, and check your province’s rules.',
        },
        {
          id: 'internet-credit',
          question: 'Can I get home internet with no credit history?',
          answer:
            'Often, yes. Many newcomers sign up with a passport and permit. If the provider needs a deposit, your advisor tells you before the install is booked.',
        },
        {
          id: 'student-order',
          question: 'Does the order change for students?',
          answer:
            'Only slightly. Students usually have campus WiFi and an orientation that covers health insurance, so the phone number, SIN (if your permit allows work) and bank account are the three to do in the first days.',
        },
      ],
    },
  ],
  sources:
    'Sources: Service Canada SIN application requirements (canada.ca, checked 23 October 2026); provincial health plan pages; Canadian Plans plan terms (owner-confirmed 20 to 22 October 2026). Bank and health rules change by province and institution; confirm before you rely on them.',
};

export const phoneCompatibilityGuide: GuideArticle = {
  previewOnly: true,
  slug: 'will-my-phone-work-in-canada',
  title: 'Will my phone work in Canada? Unlock, bands, VoLTE and eSIM checks (2026)',
  breadcrumbTitle: 'Will my phone work in Canada',
  category: 'Phones & SIMs',
  description:
    'Four checks before you fly: is the phone unlocked, does it support the Rogers network bands, will calls work over VoLTE, and does it support eSIM. With settings paths for iPhone and Android.',
  author: teamAuthor,
  reviewer: teamReviewer,
  updated: '2026-10-24',
  updatedLabel: 'Updated 24 Oct 2026',
  readingLabel: '9 min read · Checked 24 October 2026',
  imageCaption: 'Phone settings screen showing the IMEI and network bands',
  quickAnswer:
    'Most phones from the last five years work in Canada if they pass four checks: unlocked, Canadian bands, calls over LTE (VoLTE) and, for plans ordered before you arrive, eSIM.',
  quickPoints: [
    {
      label: 'Unlocked:',
      text: 'on iPhone, Settings › General › About › Carrier Lock says “No SIM restrictions”.',
    },
    {
      label: 'Bands:',
      text: 'LTE B2, B4 or B66, B7 and B12 at minimum on the Rogers network; 5G is a bonus.',
    },
    {
      label: 'Calls:',
      text: 'the phone must support VoLTE on Canadian networks; data working while calls fail points here.',
    },
    { label: 'eSIM:', text: 'dial *#06#; a 32-digit EID means the phone has eSIM.' },
  ],
  blocks: [
    {
      kind: 'section',
      id: 'four-checks',
      title: 'The four checks',
      text: 'A phone fails in Canada for one of four reasons. It is locked to a carrier at home and refuses another SIM. It lacks the radio bands Canadian networks use, so signal is weak or missing. It has the bands, but its software does not support voice over LTE (VoLTE) on Canadian carriers, so data works and calls do not. Or, for a plan ordered before you arrive, it has no eSIM. Each has a quick check, and every plan sold through Canadian Plans runs on the Rogers network, so that is the network to check against.',
    },
    {
      kind: 'section',
      id: 'unlocked',
      title: 'Check 1: is it unlocked?',
      text: 'A locked phone only works with the carrier that sold it. If you bought the phone on a contract or an instalment plan at home, assume it is locked until proven otherwise. The simplest test is to put in a SIM from another carrier; if it connects, the phone is unlocked. Otherwise ask your home carrier to unlock it before you leave, which can take days. Phones sold in Canada have had to be unlocked since December 2017 under the CRTC Wireless Code, but that does not help a phone bought elsewhere.',
    },
    {
      kind: 'devices',
      items: [
        {
          id: 'iphone',
          title: 'iPhone',
          text: 'Settings → General → About → Carrier Lock. “No SIM restrictions” means unlocked. The same screen shows your IMEI and, on eSIM models, the EID.',
          caption: 'Screenshot: iPhone Settings › General › About, with Carrier Lock and EID rows',
        },
        {
          id: 'android',
          title: 'Android',
          text: 'Settings → About phone shows the model number and IMEI. Dial *#06# to see the IMEI and, on most eSIM models, the EID. If the lock status is not shown, a SIM from another carrier is the surest test.',
          caption: 'Screenshot: Android SIM manager with “Add eSIM” and the *#06# IMEI dialog',
        },
      ],
    },
    {
      kind: 'section',
      id: 'bands',
      title: 'Check 2: does it support Canadian bands?',
      text: 'Search your exact model number plus “specifications” and compare its LTE and 5G bands with the table below. A phone that matches only one or two bands will have signal in some places and none in others, because not every tower broadcasts every band. Aim for all the main ones; band 12 matters most for signal inside buildings and outside cities.',
    },
    {
      kind: 'table',
      id: 'band-table',
      title: 'Bands used on the Rogers network (Rogers, Fido and Chatr)',
      caption:
        'LTE and 5G bands on the Rogers network, from Rogers’ bring-your-own-device page, checked 24 October 2026',
      columns: ['Network', 'Bands', 'Why it matters'],
      rows: [
        {
          label: '4G LTE',
          values: [
            'B2 and B25 (1900 MHz), B4 and B66 (AWS), B5 (850 MHz), B7 (2600 MHz), B12 (700 MHz)',
            'B4/B66 and B7 carry most city traffic; B12 and B5 reach indoors and rural areas',
          ],
        },
        {
          label: '5G',
          values: [
            'n71 (600 MHz), n66 (AWS), n41 (2500 MHz), n78 (3500 MHz)',
            'n71 gives wide 5G coverage; n41 and n78 give the fastest speeds',
          ],
        },
        {
          label: 'Minimum to be comfortable',
          values: [
            'B2, B4 or B66, B7, B12',
            'Without B12 you may lose signal inside buildings and outside cities',
          ],
        },
      ],
      note: 'Band support does not guarantee coverage, and a phone’s software can switch bands off for some regions. Chatr plans run on 4G LTE only, and a phone without Canadian 5G bands simply uses LTE.',
    },
    {
      kind: 'section',
      id: 'volte',
      title: 'Check 3: will calls work? (VoLTE)',
      text: 'Rogers requires phones on its network to make calls over LTE, known as voice over LTE (VoLTE), and it is retiring its older 3G network. It also warns that a phone bought elsewhere can lack VoLTE or WiFi calling on its network even with the right bands (rogers.com, checked 24 October 2026). The symptom is a phone with full data that fails the moment you dial, or never rings. Global or international versions, and recent iPhones, Pixels and Galaxy S models sold unlocked, generally work. If your phone was sold by a carrier at home or is a regional budget model, check before you fly or send us the model.',
    },
    {
      kind: 'section',
      id: 'esim',
      title: 'Check 4: does it support eSIM?',
      text: 'The plans you order before you arrive are eSIM only, so your phone also needs eSIM. Dial *#06#: on most eSIM phones a 32-digit EID appears beside the IMEI, or look in Settings › About. iPhone XS, XR and later support eSIM, except most models sold in mainland China, Hong Kong and Macau, which take two physical SIM cards. Most Galaxy S20 and later, Pixel 3 and later, and recent OnePlus phones support it too. If yours does not, you can still get a physical SIM on a bring-your-own-phone mobile plan after you land.',
    },
    {
      kind: 'section',
      id: 'countries',
      title: 'Notes by where you bought the phone',
      text: 'India: unlocked iPhones, Pixels and Galaxy S phones generally work; budget models built for Indian networks often lack bands 2, 4, 12 or 66. Philippines: phones sold on a Globe or Smart postpaid plan are often locked; check VoLTE on carrier-sold units. China: phones made for the Chinese market often lack bands 12 and 66 and may limit VoLTE to Chinese carriers. Nigeria and Bangladesh: phones bought unlocked from retail usually work; check budget models for bands 4, 12 and 66. Our guide to phones bought abroad goes brand by brand.',
    },
    {
      kind: 'checklist',
      items: [
        'Exact model number noted from Settings › About',
        'Unlocked: “No SIM restrictions” on iPhone, or another carrier’s SIM tested on Android',
        'LTE bands 2, 4 or 66, 7 and 12 on the spec sheet',
        'VoLTE on Canadian networks confirmed for your model',
        'An EID under *#06# for eSIM',
        'Latest software update installed over WiFi before you fly',
      ],
    },
    {
      kind: 'plan-cta',
      eyebrow: 'Not sure?',
      text: 'Pick a plan, then send us your phone model and we check it before confirming',
      mobileLines: ['Pick a plan, then send us your', 'phone model and we check it'],
      label: 'See eSIM plans →',
    },
    {
      kind: 'tip',
      label: 'Buying new?',
      text: 'If you are buying a phone before you fly, buy it unlocked from the maker or a retailer rather than a carrier, choose the global or international version, and check the spec sheet lists LTE bands 2, 4, 7, 12 and 66 and 5G n71. That one choice avoids all four problems.',
    },
    {
      kind: 'faq',
      id: 'guide-faq',
      title: 'FAQ',
      items: [
        {
          id: 'no-volte',
          question: 'My phone has data but cannot make calls in Canada. Why?',
          answer:
            'Almost always VoLTE. Your phone supports the data bands but its software does not support voice over LTE on Canadian networks. Check for a VoLTE setting in the mobile network menu; if there is none, the model may not support it here.',
        },
        {
          id: 'lte-no-5g',
          question: 'My phone has 4G but not 5G. Will it work?',
          answer:
            'Yes. A phone without Canadian 5G bands uses 4G LTE for calls and data, which is plenty for maps, messaging and video calls, as long as it has the main LTE bands and VoLTE.',
        },
        {
          id: 'eid-lock',
          question: 'Does having an EID mean my phone is unlocked?',
          answer:
            'No. The EID only shows the phone has eSIM hardware. A locked phone with an EID still rejects a Canadian eSIM until the original carrier unlocks it.',
        },
        {
          id: 'unlock-canada',
          question: 'Can I unlock my phone after I arrive in Canada?',
          answer:
            'Only your home carrier can unlock a phone it locked. Canadian carriers cannot. Ask for the unlock before you leave; it can take several days.',
        },
        {
          id: 'imei',
          question: 'Where do I find my IMEI and what is it for?',
          answer:
            'Dial *#06# on any phone, or look in Settings, About. The IMEI identifies the device; your home carrier uses it to unlock the phone and some compatibility checkers use it to look up your exact model.',
        },
        {
          id: 'dual',
          question: 'Can I keep my home SIM in the phone too?',
          answer:
            'Yes, if the phone supports dual SIM or eSIM plus SIM. Keep the home SIM for one-time codes with data roaming off, and use the Canadian eSIM for calls and data.',
        },
        {
          id: 'check-service',
          question: 'Can Canadian Plans check my phone for me?',
          answer:
            'Yes. Email us the exact model (from Settings, About) and we tell you whether it supports the bands, VoLTE and eSIM before you order.',
        },
      ],
    },
  ],
  sources:
    'Sources: Rogers bring-your-own-device page (LTE B2, B4, B5, B7, B12, B25, B66; 5G n41, n66, n71, n78; VoLTE requirement and 3G retirement), checked 24 October 2026; Apple support on carrier lock, eSIM and Dual SIM with two nano-SIM cards; CRTC Wireless Code (unlocking rules). Band lists change as networks grow; confirm your model with the maker.',
  related: [
    'foreign-phone-compatibility-canada',
    'canadian-esim-locked-phone-check',
    'esim-vs-physical-sim-canada',
  ],
};

export const homeNumberGuide: GuideArticle = {
  previewOnly: true,
  slug: 'keep-your-home-number-in-canada',
  title: 'How to keep your home number in Canada and still get OTPs (India, Philippines, Nigeria)',
  breadcrumbTitle: 'Keep your home number in Canada',
  category: 'Moving to Canada',
  description:
    'Banks, UPI and GCash keep texting codes to your old number. How to keep it alive on a dual-SIM phone, what to switch off, and what to set up before you fly.',
  author: teamAuthor,
  reviewer: teamReviewer,
  updated: '2026-10-23',
  updatedLabel: 'Updated 23 Oct 2026',
  readingLabel: '8 min read · Checked October 2026',
  imageCaption: 'Dual-SIM phone showing two lines: a home number and a Canadian number',
  quickAnswer:
    'Keep your home SIM in the phone as a second line with data roaming switched off, and run your Canadian eSIM as the main line for calls and data.',
  quickPoints: [
    {
      label: 'Before you fly:',
      text: 'check the home line can receive texts abroad; some carriers need a roaming pack or WiFi calling.',
    },
    { label: 'Keep it alive:', text: 'know the minimum top-up that keeps the number active.' },
    { label: 'Move accounts:', text: 'switch everything you can to the Canadian number.' },
    { label: 'Keep the home line for:', text: 'the banks and portals that insist on it.' },
  ],
  blocks: [
    {
      kind: 'section',
      id: 'why',
      title: 'Why you cannot just drop the old number yet',
      text: 'Your bank at home, a payment app, a tax portal, your university, a pension or a family phone plan will keep sending one-time passwords to the number they have on file. Changing that number usually requires logging in, which requires the code, which goes to the old number. For the first few months in Canada, the safest setup is two lines on one phone.',
    },
    {
      kind: 'section',
      id: 'setup',
      title: 'The dual-SIM setup that works',
      text: 'Most recent phones take a physical SIM plus an eSIM, or two eSIMs. Your home SIM stays in the tray as line 2 with data roaming off, so it costs nothing in Canada beyond what your home carrier charges to keep it active. Your Canadian eSIM is line 1: default for calls, texts and data. Incoming texts on line 2 still arrive, which is all an OTP needs.',
    },
    {
      kind: 'steps',
      id: 'before-you-fly',
      title: 'Before you fly',
      items: [
        'Ask your home carrier whether your SIM will receive texts abroad. Some carriers need an international roaming pack or international roaming switched on before you leave, and it cannot be done from Canada.',
        'Ask what keeps the number alive: a minimum monthly top-up, a validity pack or just an active postpaid account. Put a reminder in your calendar.',
        'Turn on WiFi calling on the home line if your carrier offers it. Where it works abroad, calls and texts arrive over WiFi without roaming.',
        'Change the registered number to your new Canadian number on every account that lets you do it from home: email, social apps, shopping sites, airline accounts.',
        'List the accounts that will not let you change it yet (bank, payment app, tax portal, SIM-linked services). Those are what the home line is for.',
        'Order your Canadian eSIM 1 to 3 weeks out so the new number exists before you start changing accounts.',
      ],
    },
    {
      kind: 'section',
      id: 'india',
      title: 'India: UPI, bank OTPs and Aadhaar',
      text: 'Indian banks, UPI apps and Aadhaar-linked services send OTPs to the registered Indian mobile. Keep the Indian SIM active with your carrier’s minimum recharge and enable international roaming or a roaming pack before you leave; users report both Jio and Airtel delivering texts in Canada when this is set up, and failing when it is not. Keep data roaming off. The Canadian monthly plans include 1,000 minutes to India each month, so calling home does not depend on the Indian SIM at all.',
    },
    {
      kind: 'section',
      id: 'philippines',
      title: 'Philippines: GCash, bank apps and SIM registration',
      text: 'GCash now lets Filipinos abroad, including in Canada, register with a non-Philippine number through GCash Overseas, though loan and credit features need a Philippine number. Philippine bank apps and some government portals still text the registered Philippine number, and some Philippine short codes cannot reach Canadian numbers. Keep the Philippine SIM registered and active, with data roaming off, until those accounts are moved.',
    },
    {
      kind: 'section',
      id: 'nigeria-china',
      title: 'Nigeria, Bangladesh and China',
      text: 'Nigerian bank and BVN-linked services, Bangladeshi mobile banking and most Chinese banking and payment apps all verify by text to the home number. The pattern is the same: confirm international roaming for texts before you leave, keep the line active with the minimum top-up, and keep data roaming off. The Canadian monthly plans include 1,000 international minutes to China and Bangladesh, so voice calls home are covered either way.',
    },
    {
      kind: 'section',
      id: 'whatsapp',
      title: 'WhatsApp and the family group',
      text: 'WhatsApp is tied to a number only at sign-in. You can keep WhatsApp on your home number for as long as the SIM can receive an occasional verification text, or move it to your Canadian number from inside the app once you are settled. Calls and video on WhatsApp use data or WiFi, so they cost nothing extra on your Canadian plan.',
    },
    {
      kind: 'plan-cta',
      eyebrow: 'Calling home included',
      text: '1,000 international minutes a month on Rogers and Fido plans',
      mobileLines: ['1,000 international minutes', 'a month on Rogers and Fido plans'],
      label: 'See eSIM plans →',
    },
    {
      kind: 'tip',
      label: 'Roaming off',
      text: 'The expensive mistake is leaving data roaming on for the home SIM: a few background app updates on your home carrier’s roaming rate can cost more than a month of your Canadian plan. Keep the line on for texts; keep its data off.',
    },
    {
      kind: 'faq',
      id: 'guide-faq',
      title: 'FAQ',
      items: [
        {
          id: 'cost',
          question: 'Does keeping my home SIM cost money in Canada?',
          answer:
            'Only what your home carrier charges to keep the number active, usually a minimum top-up. Receiving texts is free on most carriers; receiving calls may cost roaming, so let calls go to voicemail or WhatsApp. Data roaming must be off.',
        },
        {
          id: 'no-dual',
          question: 'My phone is not dual SIM. What then?',
          answer:
            'Keep the home SIM in a cheap second phone with roaming texts enabled, or move your most important accounts to the Canadian number before you fly while you still have the old SIM in the phone.',
        },
        {
          id: 'how-long',
          question: 'How long should I keep the old number?',
          answer:
            'Until every account that sends codes to it has your Canadian number. For most people that is three to six months; for a bank or pension at home it can be as long as you hold the account.',
        },
        {
          id: 'canadian-otp',
          question: 'Will services at home accept a Canadian number?',
          answer:
            'Many do, including GCash Overseas for Filipinos and most email and shopping accounts. Some banks and government portals accept only a domestic number. Try changing it on each account; keep the home line for the ones that refuse.',
        },
        {
          id: 'include',
          question: 'Does my Canadian plan include calls home?',
          answer:
            'The monthly Rogers and Fido plans include 1,000 minutes a month to India, China, Bangladesh, Mexico and the UK, plus unlimited international texts. Chatr prepaid plans include unlimited international texts.',
        },
      ],
    },
  ],
  sources:
    'Sources: GCash Help Centre (GCash Overseas registration with a non-PH number, feature limits), Jio and Airtel roaming guidance and user reports on OTP delivery abroad, Canadian Plans plan terms (owner-confirmed 20 October 2026); checked 23 October 2026. Home-carrier roaming rules change; confirm yours before you fly.',
};

export const newcomerGuides: readonly GuideArticle[] = [
  numberBeforeArrivalGuide,
  carrierPickerGuide,
  firstWeekGuide,
  phoneCompatibilityGuide,
  homeNumberGuide,
];
