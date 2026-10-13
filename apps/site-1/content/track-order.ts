import {
  chromeContent,
  componentAssets,
  footerContent,
  type ChromeContent,
  type FooterContent,
} from './components';
import type { FigmaAsset } from '@canadian-plans/ui/canadian-plans';
export const trackingStates = [
  'lookup',
  'esim-sent',
  'action-needed',
  'request-change',
  'not-found',
  'too-many-tries',
  'code-expired',
] as const;
export type TrackingState = (typeof trackingStates)[number];
export type TrackingResultState = 'esim-sent' | 'action-needed' | 'request-change';
export type ChangeKind = 'email' | 'arrival' | 'plan' | 'device' | 'details' | 'other';
export const trackingCopy = {
  previewOnly: true,
  title: 'Track order | Canadian Plans',
  skip: 'Skip to main content',
  path: '/track-order',
  breadcrumb: [{ label: 'Home', href: '/' }, { label: 'Track order' }],
  breadcrumbLabel: 'Breadcrumb',
  separator: '/',
  lookup: {
    eyebrow: 'Track order',
    heading: 'Where’s my order?',
    intro:
      'Check your eSIM, mobile plan or internet install in seconds. No account or password needed.',
    orderLabel: 'Order number',
    orderPlaceholder: 'CP-2026-10482',
    orderHint: 'It starts with CP- and is in your confirmation email and WhatsApp message.',
    contactLabel: 'Email or phone used on the order',
    contactPlaceholder: 'you@example.com or phone',
    submit: 'Track my order →',
    pending: 'Checking preview…',
    missing: 'Can’t find your order number?',
    help: 'Ask us on WhatsApp',
    orderError: 'Enter an order number starting with CP-, for example CP-2026-10482.',
    contactError: 'Enter the email or international phone number used on your order.',
  },
  meanings: {
    title: 'What each status means',
    cards: [
      {
        number: '1',
        title: 'Received',
        description: 'We have your order and documents. You haven’t been charged anything.',
        tone: 'mint',
      },
      {
        number: '2',
        title: 'Confirmed',
        description: 'An advisor spoke with you by phone or WhatsApp.',
        tone: 'sky',
      },
      {
        number: '3',
        title: 'Activated',
        description: 'Your Canadian number or internet account is set up.',
        tone: 'lemon',
      },
      {
        number: '4',
        title: 'eSIM sent',
        description: 'Your eSIM QR code is in your email, or your internet install is booked.',
        tone: 'rose',
      },
      {
        number: '5',
        title: 'Active',
        description: 'You’re connected. Billing starts from here.',
        tone: 'mint',
      },
    ],
  },
  help: {
    title: 'Status not moving?',
    description:
      'If we haven’t called within 2 hours (Mon–Sat, 9am–9pm PT), message us and the same advisor will pick it up.',
    caption: 'Two of our Surrey advisors at the shop counter, replying to WhatsApp messages',
    button: 'Chat on WhatsApp',
  },
  imageLabel: 'Image',
  back: '← Track another order',
  orderPrefix: 'Order',
  request: 'Request change →',
  detailsTitle: 'Order details',
  updatesTitle: 'Updates',
  detailsIntro:
    'Everything you sent us. Something wrong? Request a change and an advisor will confirm it with you.',
  install: {
    eyebrow: 'Your next step',
    title: 'Install your eSIM before you board',
    caption:
      'Hand holding a phone on the “Add eSIM” screen, scanning the QR code shown on a laptop',
    steps: [
      {
        number: '1',
        text: 'Connect to WiFi and open our email on a second screen, like a laptop.',
      },
      { number: '2', text: 'Scan the QR code with the phone you will use in Canada.' },
      { number: '3', text: 'Keep the new line switched off until you land, then turn it on.' },
    ],
    resend: 'Resend my QR code',
    guide: 'Step-by-step install guide →',
  },
  action: {
    title: 'We need a clearer photo of your study permit',
    description:
      'The photo you sent was blurry, so Rogers can’t verify it. Upload a new one and we’ll continue within 2 hours. Your plan and price stay the same.',
    caption: 'Example of a clear photo: study permit flat, all four corners in frame, no glare',
    drop: 'Drop your file here',
    mobileDrop: 'Take a photo or pick a file',
    hint: 'JPG, PNG or PDF · max 10 MB',
    upload: 'Upload document',
    alternative: 'or send it on WhatsApp',
    mark: '!',
  },
  advisor: {
    eyebrow: 'Your advisor',
    name: 'Priya',
    hours: 'Mon–Sat, 9am–9pm PT',
    description:
      'Questions about this order? Message Priya directly. No need to explain from the start.',
    button: 'Chat on WhatsApp',
  },
  details: {
    passport: 'Passport photo page',
    permit: 'Study permit / visa',
    chargedAmount: '$0',
    afterActivation: 'After activation',
    plan: 'Plan',
    personal: 'Your details',
    arrival: 'Arrival & eSIM',
    documents: 'Documents',
    sim: 'SIM type',
    price: 'Monthly price',
    charged: 'Charged so far',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    audience: 'I am a',
    whatsapp: 'WhatsApp',
    arriving: 'Arriving',
    newNumber: 'Your new number',
    sentTo: 'eSIM sent to',
    planNote: 'Plan changes are free until your plan becomes Active.',
    arrivalSentNote:
      'Lost the QR code or changed phones? Request a new eSIM. It’s free until your plan is active.',
    arrivalActionNote:
      'We send your eSIM after activation. You can still change your email or arrival date for free.',
    documentNote: 'We use your documents only to activate your plan, and we keep them safe.',
    doc: 'DOC',
    verified: '✓ Verified',
    uploadAnother: '+ Upload another document',
    reupload: 'Re-upload',
    blurred: 'study_permit.jpg · too blurry',
    collapsedPlan: 'Rogers Plus · 100 GB · $40/mo',
    collapsedPersonal: 'Aarav Sharma · aarav@example.com',
    collapsedDocuments: '2 documents · both verified',
    actionDocuments: 'Study permit needs a new photo',
  },
  errors: {
    heading: 'Track your order',
    emailLabel: 'Email',
    retry: 'Try again',
    throttleHelp: 'Message us on WhatsApp',
    newCode: 'Send a new code',
    codeLabel: 'Expired verification code',
    dot: '·',
    missingPrefix: 'Can’t find the email? Message us on ',
    whatsapp: 'WhatsApp',
    orCall: ' or call ',
    period: '.',
    urgent: 'Need it now? Call ',
    phone: '1-888-555-0199',
  },
  change: {
    title: 'Request a change',
    legend: 'What do you want to change?',
    current: 'Current:',
    optional: '(optional)',
    newEmailLabel: 'New email',
    noteLabel: 'Anything else we should know?',
    notePlaceholder: 'e.g. moving next week, please hold the SIM',
    note: 'Priya will confirm this change with you, usually within 2 hours. Changes are free until your plan is active.',
    send: 'Send request →',
    pending: 'Checking preview…',
    cancel: 'Cancel',
    close: 'Close request change',
    desktopClose: '×',
    description: 'Preview a change to this fixture order. Nothing is saved or sent.',
    successTitle: 'Preview request checked',
    success: 'No order details were changed and no message was sent.',
    edit: 'Back to request',
    valueError: 'Enter the requested new value.',
    emailError: 'Enter a valid new email address.',
    dateError: 'Enter a valid arrival date, today or later.',
    planError: 'Choose a preview plan.',
    noteError: 'Keep the note to 2,000 characters.',
  },
  feedback: {
    failed: 'The preview could not be checked. Your input is still here. Please try again.',
    qr: 'QR resend preview checked. No email was sent.',
    code: 'New-code preview checked. No code or email was sent.',
    upload: 'Document selected for preview. Nothing was uploaded.',
    fileError: 'Choose a JPG, PNG or PDF up to 10 MB.',
  },
  destinations: {
    home: '/',
    contact: '/contact#contact-options',
    guide: '/guides/best-sim-for-students-from-india#esim',
    plans: '/pre-arrival-sim#plans',
    privacy: '/privacy',
    terms: '/terms',
  },
} as const;
export const trackingChangeOptions: readonly {
  id: ChangeKind;
  label: string;
  title: string;
  placeholder: string;
  type: 'email' | 'date' | 'select' | 'text' | 'textarea';
}[] = [
  {
    id: 'email',
    label: 'Email for my eSIM',
    title: 'New email for your eSIM',
    placeholder: 'you@example.com',
    type: 'email',
  },
  {
    id: 'arrival',
    label: 'Arrival date',
    title: 'New arrival date',
    placeholder: 'DD / MM / YYYY',
    type: 'date',
  },
  {
    id: 'plan',
    label: 'Plan',
    title: 'Choose a new plan',
    placeholder: 'Select a preview plan',
    type: 'select',
  },
  {
    id: 'device',
    label: 'Phone / eSIM device',
    title: 'New phone or eSIM device',
    placeholder: 'e.g. iPhone 15',
    type: 'text',
  },
  {
    id: 'details',
    label: 'Name or contact details',
    title: 'New name or contact details',
    placeholder: 'Enter the corrected details',
    type: 'text',
  },
  {
    id: 'other',
    label: 'Something else',
    title: 'What would you like to change?',
    placeholder: 'Describe your request',
    type: 'textarea',
  },
];
export interface TrackingUpdate {
  readonly phoneDescription?: string;
  readonly time: string;
  readonly title: string;
  readonly description: string;
}
export interface TrackingOrderFixture {
  readonly reference: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly plan: string;
  readonly planId: string;
  readonly price: string;
  readonly sim: string;
  readonly audience: string;
  readonly arrival: string;
  readonly newNumber: string;
  readonly device: string;
  readonly passportFile: string;
  readonly permitFile: string;
}
const order: TrackingOrderFixture = {
  reference: 'CP-2026-10482',
  name: 'Aarav Sharma',
  email: 'aarav@example.com',
  phone: '+91 98765 43210',
  plan: 'Rogers Plus · 100 GB',
  planId: 'preview-rogers-plus',
  price: '$40/mo · CAD + tax',
  sim: 'eSIM',
  audience: 'Student',
  arrival: 'Vancouver · 14 Nov 2026',
  newNumber: '+1 (604) 555-0142',
  device: 'iPhone 15 · eSIM-ready',
  passportFile: 'passport_aarav.jpg',
  permitFile: 'study_permit.pdf',
};
const received: TrackingUpdate = {
  time: '5 Oct · 10:12 am',
  title: 'Order received',
  description: "We have your plan, details and documents. You haven't been charged anything.",
};
const confirmed: TrackingUpdate = {
  time: '5 Oct · 11:03 am',
  title: 'Confirmed by Priya',
  description: 'Order checked with you on WhatsApp.',
};
export type TrackingFixture =
  | { readonly key: 'lookup'; readonly previewOnly: true }
  | {
      readonly key: TrackingResultState;
      readonly previewOnly: true;
      readonly order: TrackingOrderFixture;
      readonly attention: boolean;
      readonly status: string;
      readonly description: string;
      readonly updated: string;
      readonly progress: readonly {
        label: string;
        date: string;
        marker: string;
        kind: 'done' | 'current' | 'waiting' | 'future';
      }[];
      readonly updates: readonly TrackingUpdate[];
      readonly mobileOpen: 'arrival' | 'documents';
      readonly openRequest: boolean;
    }
  | {
      readonly key: 'not-found' | 'too-many-tries' | 'code-expired';
      readonly previewOnly: true;
      readonly title: string;
      readonly description: string;
      readonly orderNumber: string;
      readonly email: string;
    };
const sent: Extract<TrackingFixture, { key: TrackingResultState }> = {
  key: 'esim-sent',
  previewOnly: true,
  order,
  attention: false,
  status: 'eSIM sent',
  description: 'Your eSIM QR code is in your email. Install it before you fly.',
  updated: 'Last updated 6 Oct, 2:14 pm PT',
  progress: [
    { label: 'Received', date: '5 Oct', marker: '✓', kind: 'done' },
    { label: 'Confirmed', date: '5 Oct', marker: '✓', kind: 'done' },
    { label: 'Activated', date: '6 Oct', marker: '✓', kind: 'done' },
    { label: 'eSIM sent', date: '6 Oct', marker: '4', kind: 'current' },
    { label: 'Active', date: 'After you land', marker: '5', kind: 'future' },
  ],
  updates: [
    {
      time: '6 Oct · 2:14 pm',
      title: 'eSIM QR code sent',
      description: 'Sent to aarav@example.com. Install it on WiFi before you fly.',
    },
    {
      time: '6 Oct · 9:40 am',
      title: 'Number activated',
      description: 'Your Canadian number: +1 (604) 555-0142. It works from the day you land.',
      phoneDescription:
        'Your Canadian number: +1 (604)\n555-0142. It works from the day you\nland.',
    },
    confirmed,
    received,
  ],
  mobileOpen: 'arrival',
  openRequest: false,
};
const attention: Extract<TrackingFixture, { key: TrackingResultState }> = {
  ...sent,
  key: 'action-needed',
  attention: true,
  status: 'Action needed',
  description: 'Paused. We need one document before we can activate your number.',
  updated: 'Last updated 6 Oct, 9:40 am PT',
  progress: [
    { label: 'Received', date: '5 Oct', marker: '✓', kind: 'done' },
    { label: 'Confirmed', date: '5 Oct', marker: '✓', kind: 'done' },
    { label: 'Activation', date: 'Waiting for you', marker: '!', kind: 'waiting' },
    { label: 'eSIM sent', date: 'After activation', marker: '4', kind: 'future' },
    { label: 'Active', date: 'After you land', marker: '5', kind: 'future' },
  ],
  updates: [
    {
      time: '6 Oct · 9:40 am',
      title: 'Document needed',
      description: 'Study permit photo is blurry. Please upload a clearer one.',
    },
    confirmed,
    received,
  ],
  mobileOpen: 'documents',
};
/** Exactly one synthetic fixture per visible state; never a customer/order API response. */
export const trackingFixtures: Readonly<Record<TrackingState, TrackingFixture>> = {
  lookup: { key: 'lookup', previewOnly: true },
  'esim-sent': sent,
  'action-needed': attention,
  'request-change': {
    ...attention,
    key: 'request-change',
    mobileOpen: 'arrival',
    openRequest: true,
  },
  'not-found': {
    key: 'not-found',
    previewOnly: true,
    title: 'We couldn’t find that order',
    description:
      'Check the order number in your confirmation email. It starts with CP- (for example CP-2026-10482), and the email must be the one you ordered with.',
    orderNumber: 'CP-2026-10842',
    email: 'aarav@example.com',
  },
  'too-many-tries': {
    key: 'too-many-tries',
    previewOnly: true,
    title: 'Too many tries, please wait 15 minutes',
    description:
      'For your security, we paused lookups for this order. You can try again at 3:45 pm, or \nmessage us on WhatsApp and we’ll help right away.',
    orderNumber: order.reference,
    email: order.email,
  },
  'code-expired': {
    key: 'code-expired',
    previewOnly: true,
    title: 'Your code has expired',
    description: 'Codes work for 10 minutes. We can send you a new one to aarav@example.com.',
    orderNumber: order.reference,
    email: order.email,
  },
};
const asset = (src: string, width: number, height: number, nodeId: string): FigmaAsset => ({
  src,
  width,
  height,
  nodeId,
});
export const trackingAssets = {
  ...componentAssets,
  logo: asset('/design/components/364-2163-imgMark.svg', 36, 36, '126:15'),
  phone: asset('/design/track-order/1-imgPhoneIcon.svg', 16, 16, '364:2155'),
  resultPhone: asset('/design/track-order/3-imgPhoneIcon.svg', 16, 16, '364:2155'),
  imageLight: asset('/design/components/312-2-imgIcon.svg', 32, 32, 'I314:1028;312:3'),
  imageInverse: asset('/design/components/312-9-imgIcon.svg', 32, 32, 'I314:52;312:10'),
  sentDot: asset('/design/track-order/2-imgEllipse1.svg', 10, 10, '127:43'),
  attentionDot: asset('/design/track-order/4-imgEllipse1.svg', 10, 10, '130:43'),
  updateDot: asset('/design/track-order/2-imgEllipse2.svg', 12, 12, '127:89'),
  pastDot: asset('/design/track-order/2-imgEllipse3.svg', 12, 12, '127:97'),
  avatar: asset('/design/guides/0-imgEllipse1.svg', 44, 44, '129:8'),
  check: asset('/design/track-order/3-imgCheck.svg', 16, 16, '314:718'),
  down: asset('/design/track-order/3-imgChevronDown.svg', 24, 24, '367:2738'),
  up: asset('/design/track-order/3-imgChevronUp.svg', 24, 24, '367:2752'),
  upload: asset('/design/track-order/4-imgUploadIcon.svg', 18, 18, '367:2907'),
  radioDesktop: asset('/design/track-order/6-imgEllipse5.svg', 16, 16, '131:611'),
  radioEmptyDesktop: asset('/design/track-order/6-imgEllipse6.svg', 16, 16, '131:614'),
  radioMobile: asset('/design/track-order/8-imgEllipse.svg', 20, 20, '247:7'),
  radioEmptyMobile: asset('/design/track-order/8-imgEllipse1.svg', 20, 20, '247:10'),
  close: asset('/design/mobile-plans/367-2760-imgIconClose1.svg', 20, 20, '314:1243'),
  notFound: asset('/design/track-order/10-imgFrame.svg', 22, 22, '308:210'),
  throttle: asset('/design/track-order/11-imgFrame.svg', 22, 22, '308:166'),
  expired: asset('/design/track-order/13-imgFrame.svg', 22, 22, '308:186'),
};
export const trackingChrome: ChromeContent = {
  ...chromeContent,
  phone: { ...chromeContent.phone, href: trackingCopy.destinations.contact },
  track: { ...chromeContent.track, href: trackingCopy.path },
  contact: { ...chromeContent.contact, href: '/contact' },
  help: { ...chromeContent.help, href: '/faq' },
  navigation: [
    { label: 'Pre-arrival SIM', href: '/pre-arrival-sim' },
    { label: 'Home Internet', href: '/home-internet' },
    { label: 'Mobile Plans', href: '/mobile-plans' },
    { label: 'Guides', href: '/guides' },
  ],
};
export const trackingFooter: FooterContent = {
  ...footerContent,
  groups: footerContent.groups.map((group) => ({
    ...group,
    links: group.links.map((link) => ({
      ...link,
      href:
        group.title === 'Pre-arrival SIM'
          ? trackingCopy.destinations.plans
          : group.title === 'Home Internet'
            ? '/home-internet#internet-plans'
            : group.title === 'Mobile Plans'
              ? '/mobile-plans'
              : link.label === 'Track order'
                ? trackingCopy.path
                : link.label === 'Contact'
                  ? '/contact'
                  : link.label === 'Guides'
                    ? '/guides'
                    : '/faq',
    })),
  })),
  legal: footerContent.legal.map((link) => ({
    ...link,
    href:
      link.label === 'Privacy'
        ? '/privacy'
        : link.label === 'Terms'
          ? '/terms'
          : trackingCopy.destinations.contact,
  })),
};
