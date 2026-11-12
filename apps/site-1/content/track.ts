import type {
  ChangeableFieldKey,
  TrackingDocumentState,
  TrackingOrder,
} from '@canadian-plans/crm-contracts';

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
    planNotGiven: 'Plan not shown',
    submitted: 'Ordered',
    signOut: 'Sign out',
  },
  detail: {
    back: '← All my orders',
    orderPrefix: 'Order',
    submittedOn: 'Ordered on {date}',
    requestChange: 'Request change →',
    detailsTitle: 'Order details',
    detailsIntro:
      'What we have on your order. Something wrong? Request a change and our team will review it. Your order stays as submitted until a change is approved.',
    detailsIntroLocked: 'What we have on your order. To change something, contact us.',
    plan: 'Plan',
    planName: 'Plan',
    planNotGiven: 'Not shown',
    price: 'Price',
    quantity: 'Quantity',
    submitted: 'Ordered on',
    delivery: 'Delivery',
    deliveryMethod: 'Delivery method',
    courier: 'Courier',
    trackingNumber: 'Tracking number',
    dispatched: 'Sent on',
    simNumber: 'SIM number',
    personal: 'Your details',
    name: 'Full name',
    phone: 'Phone number',
    arrivalDate: 'Arrival date',
    destination: 'Destination in Canada',
    permitType: 'Visa or permit type',
    shippingAddress: 'Shipping address',
    flightBooked: 'Flight booked',
    yes: 'Yes',
    no: 'No',
    notGiven: 'Not given',
    documents: 'Documents',
    documentsNone: 'No documents are listed for this order.',
    documentsNote: 'We use your documents only to set up your plan, and we keep them private.',
    pendingTitle: 'Your change request',
    pendingStatus: 'Waiting for review',
    pendingRequest: 'Request {number}',
    pendingFields: 'Details you asked to change',
    pendingDocuments: 'Documents you sent',
    pendingUpdated: 'Sent {date}',
  },
  action: {
    title: 'We need something from you',
    documents: 'Upload the documents below so we can continue.',
    mark: '!',
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
    expired: 'The upload took too long. Please choose the file again.',
    rejected: 'That file could not be verified as a PDF, JPG or PNG. Please choose another file.',
    unavailable: 'Uploads are not available right now. Please try again later.',
    checking: 'We are still checking your file. Please try again in a moment.',
    notAllowed: 'Documents can no longer be added to this order here. Contact us for help.',
    mismatch: 'This order does not take that document.',
    sent: 'Sent for review',
    doc: 'DOC',
  },
  change: {
    title: 'Request a change',
    description: 'Ask us to correct your details. Our team reviews every request.',
    legend: 'Correct the details that are wrong',
    current: 'Current:',
    notice:
      'Our team will review your request. If you already have a request waiting for review, this one replaces it. Plan and price changes are not made here; contact us for those.',
    send: 'Send request →',
    pending: 'Sending…',
    cancel: 'Cancel',
    close: 'Close request change',
    desktopClose: '×',
    successTitle: 'Request sent',
    success: 'Our team will review your change. Your order shows the new details once approved.',
    done: 'Done',
    unchanged: 'Change at least one detail before sending.',
    invalid: 'Check the details you entered and try again.',
    failed: 'We could not send your request. Please try again.',
    notAllowed: 'This order can no longer be changed here. Contact us for help.',
    fieldErrors: {
      fullName: 'Enter your full name.',
      phone: 'Enter a phone number with at least seven digits.',
      arrivalDate: 'Enter a valid arrival date.',
      canadaAddress: 'Enter your destination in Canada.',
    },
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

/** Customer-facing names for every detail a change request can carry. */
export const trackFieldLabels: Readonly<Record<ChangeableFieldKey, string>> = {
  fullName: 'Full name',
  phone: 'Phone number',
  planId: 'Plan',
  delivery: 'Delivery method',
  arrivalDate: 'Arrival date',
  permitType: 'Visa or permit type',
  canadaAddress: 'Destination in Canada',
  shippingAddress: 'Shipping address',
  flightBooked: 'Flight booked',
};

/** Customer-facing names for the documents an order can list. */
export const trackDocumentLabels: Readonly<Record<string, string>> = {
  passport: 'Passport',
  visa: 'Visa or permit',
  address_proof: 'Proof of address',
  government_id: 'Government-issued ID',
};

export const trackDocumentStateCopy: Readonly<Record<TrackingDocumentState, string>> = {
  missing: 'Still needed',
  received: 'Received',
  approved: '✓ Approved',
  needs_replacement: 'Needs a new file',
};

export const trackDeliveryCopy: Readonly<Record<NonNullable<TrackingOrder['delivery']>, string>> = {
  esim: 'eSIM',
  pickup: 'Pickup',
};

export const trackPermitCopy: Readonly<
  Record<NonNullable<TrackingOrder['details']['permitType']>, string>
> = {
  newcomer: 'Newcomer',
  student: 'Student',
  worker: 'Worker',
  tourist: 'Tourist',
};

type TrackBillingPeriod = NonNullable<TrackingOrder['plan']>['billingPeriod'];

/** Follows the price; a one-time price stands alone. */
export const trackBillingCopy: Readonly<Record<TrackBillingPeriod, string>> = {
  one_time: 'one time',
  month: 'per month',
  '30_days': 'per 30 days',
  '90_days': 'per 90 days',
  year: 'per year',
};
