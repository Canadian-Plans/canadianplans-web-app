export const emailCommon = {
  brand: 'Canadian Plans',
  imageLabel: 'IMAGE',
  summary: 'Your order',
  subjectLabel: 'Subject:',
  previewLabel: 'Preview:',
  footer: [
    'Questions? Reply to this email, WhatsApp us, or call +1 778-682-3771 (Mon–Sat, 9am–9pm Pacific).',
    'Canadian Plans · Authorized Rogers, Fido and Chatr dealer · 9981 Whalley Blvd, Surrey, BC',
    'You’re getting this email because you placed an order with us. We will never ask for your password or card number by email.',
  ],
  image: { src: '/design/components/312-2-imgIcon.svg', width: 32, height: 32, nodeId: '312:3' },
} as const;
export const emailCopy = {
  'order-received': {
    name: 'Order received',
    nodeId: '309:3',
    subject: (reference: string) => `We got your order, ${reference}`,
    preheader: 'An advisor will contact you the same day. You haven’t been charged.',
    title: (name: string) => `Thanks, ${name}. We got your order.`,
    intro:
      'An advisor will call or WhatsApp you the same day (Mon–Sat, 9am–9pm Pacific) to check your details. You haven’t been charged anything.',
    caption:
      'Canadian Plans advisor at the Surrey office, headset on, checking a customer order on a laptop',
    stepsTitle: 'What happens next',
    steps: [
      { number: '1', text: 'We call or WhatsApp you to confirm your plan and documents.' },
      { number: '2', text: 'We set up your plan with Rogers and assign your Canadian number.' },
      { number: '3', text: 'We email your eSIM QR code. Install it at home before you fly.' },
    ],
    action: 'Track my order',
    labels: ['Order number', 'Plan', 'Monthly price', 'Paid today'],
    help: 'Didn’t place this order? Reply to this email and we’ll cancel it.',
  },
  'esim-ready': {
    name: 'eSIM ready',
    nodeId: '309:53',
    subject: 'Your Canadian eSIM is ready to install',
    preheader: (number: string) =>
      `Your new number is ${number}. Install it on Wi-Fi before you fly.`,
    title: (name: string) => `Your eSIM is ready, ${name}!`,
    intro: (number: string) =>
      `Your Canadian number is ${number}. Install your eSIM now, at home on Wi-Fi. Your plan starts when you land in Canada.`,
    caption: 'Phone on the Add eSIM screen beside a laptop showing the QR code',
    stepsTitle: 'How to install (2 minutes)',
    steps: [
      { number: '1', text: 'Open this email on another screen, like a laptop.' },
      { number: '2', text: 'On your phone, go to Settings → Mobile data → Add eSIM.' },
      {
        number: '3',
        text: 'Click the button below and scan the QR code with your phone. Keep the new line switched off until you land, then turn it on.',
      },
    ],
    action: 'Show my QR code',
    labels: ['Your number', 'Plan', 'Starts'],
    help: 'Stuck, or only have your phone? Reply with a screenshot and we’ll walk you through it on WhatsApp.',
  },
  'install-booked': {
    name: 'Install booked',
    nodeId: '309:102',
    subject: (date: string) => `Your internet install is booked for ${date}`,
    preheader: (window: string) =>
      `A technician will arrive between ${window}. Here’s how to get ready.`,
    title: 'Your install is booked.',
    intro: (date: string, window: string, address: string) =>
      `A Rogers technician will arrive on ${date}, between ${window}, at ${address}. The visit usually takes about 2 hours.`,
    caption: 'Technician setting up a Wi-Fi modem on a living-room shelf in an apartment',
    stepsTitle: 'Before the technician arrives',
    steps: [
      { number: '1', text: 'Make sure someone 18 or older is home.' },
      { number: '2', text: 'Clear space near where you want the modem.' },
      { number: '3', text: 'If you live in a building, let the concierge or landlord know.' },
    ],
    action: 'Change my install time',
    labels: ['Order number', 'Plan', 'Monthly price', 'Install'],
    help: 'Need to reschedule? Reply to this email at least 24 hours before your install.',
  },
} as const;
export type EmailTemplate = keyof typeof emailCopy;
export const emailPreviewCopy = {
  title: 'Transactional email previews',
  notice: 'Design previews with fictional sample data. No email is sent.',
  navigation: 'Email templates',
  frameTitle: 'Email preview',
  html: 'Rendered HTML',
  plainText: 'Plain text',
  invalid: 'Unknown email template',
  back: 'Return to email previews',
  invalidData: 'Invalid email template data',
  invalidOrigin: 'Invalid email asset origin',
} as const;
export const emailFixtures = {
  'order-received': {
    previewOnly: true,
    customerName: 'Aarav',
    orderReference: 'CP-2026-10482',
    plan: 'Rogers · 100 GB · eSIM',
    monthlyPrice: '$40/mo + tax',
    paidToday: '$0',
  },
  'esim-ready': {
    previewOnly: true,
    customerName: 'Aarav',
    number: '+1 (604) 555-0142',
    plan: 'Rogers · 100 GB',
    starts: 'When you land, Nov 14',
  },
  'install-booked': {
    previewOnly: true,
    orderReference: 'CP-2026-10519',
    plan: 'Home internet · 500 Mbps',
    monthlyPrice: '$75/mo + tax',
    installPrice: 'Free',
    shortDate: 'Thu, Oct 15',
    date: 'Thursday, October 15',
    window: '8am and 12pm',
    address: '9981 Whalley Blvd, Surrey',
  },
} as const;
