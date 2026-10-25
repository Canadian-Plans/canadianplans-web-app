import type {
  AmendableFieldKey,
  DeliveryState,
  OrderFulfilmentStatus,
  PaymentState,
} from '@canadian-plans/contracts';

/**
 * Live order tracking (/track, owner request 25 Oct 2026): the customer signs in
 * with only their email and a six-digit code, then sees every order placed with
 * that email on this website. Visual language follows the /track-order design
 * preview; behaviour is backend-authoritative. Email is the only contact
 * channel (no WhatsApp or SMS), so help links go to the contact page.
 */
export const trackCopy = {
  title: 'Track your order | Canadian Plans',
  skip: 'Skip to main content',
  breadcrumb: [{ label: 'Home', href: '/' }, { label: 'Track order' }],
  breadcrumbLabel: 'Breadcrumb',
  separator: '/',
  loading: 'Loading your orders…',
  lookup: {
    eyebrow: 'Track order',
    heading: 'Track your order',
    intro:
      'Enter the email you ordered with. We will email you a six-digit code, then show every order placed with that email.',
    emailLabel: 'Email used on your order',
    emailPlaceholder: 'you@example.com',
    emailError: 'Enter the email address you used on your order.',
    submit: 'Email me a code',
    pending: 'Sending…',
    help: 'Can’t find the email you used?',
    helpLink: 'Contact us',
  },
  code: {
    heading: 'Enter your code',
    sent: 'If we have orders for {email}, we have sent a six-digit code to it. It works for 10 minutes.',
    label: 'Six-digit code',
    error: 'Enter the six digits from the email.',
    submit: 'Show my orders',
    pending: 'Checking…',
    resend: 'Send a new code',
    resent: 'A new code is on its way. Only the newest code works.',
    change: 'Use a different email',
    invalid: 'That code is not valid or has expired. Check the newest email or send a new code.',
    limited: 'Too many tries. Please wait 10 minutes and try again.',
  },
  list: {
    heading: 'Your orders',
    intro: 'Every order placed with {email} on Canadian Plans.',
    empty: 'We could not find any orders for this email.',
    open: 'View order',
    actionNeeded: 'Action needed',
    submitted: 'Ordered',
    signOut: 'Sign out',
  },
  detail: {
    back: '← All my orders',
    orderPrefix: 'Order',
    updated: 'Last updated {date}',
    requestChange: 'Request change →',
    detailsTitle: 'Order details',
    detailsIntro:
      'Everything you sent us. Something wrong? Request a change and our team will review it. Your order stays as submitted until a change is approved.',
    plan: 'Plan',
    planName: 'Plan',
    billing: 'Billing',
    price: 'Price',
    payableToday: 'Due today',
    payment: 'Payment',
    delivery: 'Hand-over',
    trackingReference: 'Provider reference',
    submitted: 'Ordered on',
    personal: 'Your details',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    country: 'Country code',
    arrival: 'Arrival',
    currentCountry: 'Country you are in now',
    destination: 'Destination in Canada',
    arrivalDate: 'Arrival date',
    notGiven: 'Not given',
    documents: 'Documents',
    documentsNone: 'This plan needs no documents.',
    documentsNote: 'We use your documents only to set up your plan, and we keep them private.',
    changesTitle: 'Your change requests',
    changePending: 'Waiting for review',
    changeApproved: 'Approved',
    changeRejected: 'Not approved',
  },
  action: {
    title: 'We need something from you',
    documents: 'Upload the documents below so we can continue.',
    info: 'Our team asked for a few details. Fill them in below.',
    mark: '!',
  },
  info: {
    title: 'Details we need',
    submit: 'Send details',
    pending: 'Sending…',
    sent: 'Thank you. Our team will review your details.',
    fieldError: 'Fill in this detail.',
    failed: 'We could not send your details. Please try again.',
    mismatch: 'Fill in every detail we asked for.',
  },
  upload: {
    choose: 'Upload {document}',
    replace: 'Upload a new {document}',
    hint: 'PDF, JPG or PNG, up to 10 MB.',
    uploading: 'Uploading and checking your file…',
    done: 'Received. Our team will review it.',
    typeError: 'Choose a PDF, JPG or PNG file.',
    sizeError: 'That file is larger than the 10 MB limit.',
    failed: 'The upload could not be completed. Please try again.',
    rejected: 'That file could not be verified as a PDF, JPG or PNG. Please choose another file.',
    unavailable: 'Uploads are not available right now. Please try again later.',
    statusReceived: 'Received',
    statusApproved: '✓ Approved',
    statusReplace: 'Needs a new file',
    statusMissing: 'Still needed',
    doc: 'DOC',
  },
  change: {
    title: 'Request a change',
    description: 'Ask us to correct your details. Our team reviews every request.',
    legend: 'What do you want to change?',
    current: 'Current:',
    newValue: 'New value',
    noteLabel: 'Anything else we should know?',
    optional: '(optional)',
    notePlaceholder: 'For example, my flight moved to the next day',
    notice:
      'Our team will review your request and email you if anything else is needed. Plan and price changes are not made here; contact us for those.',
    send: 'Send request →',
    pending: 'Sending…',
    cancel: 'Cancel',
    close: 'Close request change',
    desktopClose: '×',
    successTitle: 'Request sent',
    success: 'Our team will review your change. Your order shows the new details once approved.',
    done: 'Done',
    valueError: 'Enter the new value.',
    emailError: 'Enter a valid email address.',
    countryCodeError: 'Enter a two-letter country code, for example IN.',
    noteError: 'Keep the note to 2,000 characters.',
    failed: 'We could not send your request. Please try again.',
    tooMany:
      'You already have three changes waiting for review on this order. We will get to them soon.',
  },
  session: {
    expired: 'For your security, please confirm your email again.',
    failed: 'We could not load your orders right now. Please try again.',
    retry: 'Try again',
  },
  destinations: {
    home: '/',
    contact: '/contact#contact-options',
    plans: '/pre-arrival-sim#plans',
  },
} as const;

/** Customer-facing names for the details a customer may change or be asked for. */
export const trackFieldLabels: Readonly<Record<AmendableFieldKey, string>> = {
  'contact.fullName': 'Full name',
  'contact.email': 'Email',
  'contact.phone': 'Phone number',
  'contact.countryCode': 'Country code',
  'form.currentCountry': 'Country you are in now',
  'form.destination': 'Destination in Canada',
  'form.arrivalDate': 'Arrival date',
};

/** The change options in the order the dialog lists them. */
export const trackChangeFields: readonly AmendableFieldKey[] = [
  'contact.email',
  'form.arrivalDate',
  'form.destination',
  'contact.fullName',
  'contact.phone',
  'form.currentCountry',
];

/** What each fulfilment status means to the customer; never internal notes. */
export const trackStatusCopy: Readonly<
  Record<OrderFulfilmentStatus, { label: string; description: string }>
> = {
  submitted: {
    label: 'Received',
    description: 'We have your order. Our team will contact you to confirm it.',
  },
  in_progress: { label: 'In progress', description: 'Our team is working on your order.' },
  awaiting_customer: {
    label: 'Action needed',
    description: 'We need something from you before we can continue.',
  },
  ready_for_delivery: {
    label: 'Ready',
    description: 'Your order is ready to pass to your service provider.',
  },
  dispatched: {
    label: 'With your provider',
    description:
      'Your order has been passed to your service provider for activation. They will contact you directly.',
  },
  activated: { label: 'Active', description: 'Your service is active.' },
  cancelled: { label: 'Cancelled', description: 'This order was cancelled.' },
};

export const trackPaymentCopy: Readonly<Record<PaymentState, string>> = {
  not_required: 'Nothing to pay now',
  pending: 'Payment pending',
  paid: 'Paid',
};

export const trackDeliveryCopy: Readonly<Record<DeliveryState, string>> = {
  none: 'Not yet passed to your provider',
  dispatched: 'Passed to your provider',
};

export const trackBillingCopy = {
  month: 'per month',
  '30_days': 'per 30 days',
  '90_days': 'per 90 days',
} as const;

/** The progress steps shown on an order, in order. */
export const trackProgressSteps: readonly {
  label: string;
  statuses: readonly OrderFulfilmentStatus[];
}[] = [
  { label: 'Received', statuses: ['submitted'] },
  { label: 'In progress', statuses: ['in_progress', 'awaiting_customer'] },
  { label: 'Ready', statuses: ['ready_for_delivery'] },
  { label: 'With your provider', statuses: ['dispatched'] },
  { label: 'Active', statuses: ['activated'] },
];
