import { componentAssets } from './components';
import { internetPlansByProvince, type InternetPlan } from './home-internet';
const internetPlans: readonly InternetPlan[] = Object.values(internetPlansByProvince).flat();
export const internetOrderPlan = internetPlans.find((plan) => plan.id === 'internet-bc-1000');

/** Only known local fixtures may enter the preview checkout; query values never set prices. */
export function selectInternetOrderPlan(value: string | string[] | undefined) {
  return (
    (typeof value === 'string' ? internetPlans.find((plan) => plan.id === value) : undefined) ??
    internetOrderPlan
  );
}
export const internetOrderCopy = {
  previewOnly: true,
  title: 'Get connected | Home Internet',
  brand: 'Canadian Plans',
  skip: 'Skip to form',
  header: {
    payment: '✓ No payment online',
    help: 'Questions? +1 778-682-3771 · WhatsApp',
    call: 'Call us',
  },
  eyebrow: 'Home internet · one short form',
  heading: 'Get connected',
  intro:
    'Send your details and an advisor will call or WhatsApp you, usually the same day, to confirm and book your install.',
  personal: 'Your details',
  address: 'Install address',
  optional: '(optional)',
  fields: {
    firstName: { label: 'First name', placeholder: 'First name' },
    lastName: { label: 'Last name', placeholder: 'Last name' },
    email: { label: 'Email', placeholder: 'you@example.com' },
    phone: { label: 'Phone', placeholder: '+1 (604) 555-0123', hint: 'Canadian or international.' },
    birthDate: {
      label: 'Date of birth',
      placeholder: 'DD / MM / YYYY',
      hint: 'The provider needs this to set up your account.',
    },
    street: { label: 'Street address', placeholder: 'Unit, number and street' },
    city: { label: 'City', placeholder: 'e.g. Surrey' },
    province: { label: 'Province' },
    postalCode: { label: 'Postal code', placeholder: 'V3T 1Z2' },
    installDate: {
      label: 'Preferred install date',
      placeholder: 'DD / MM / YYYY',
      hint: 'Usually within 3 days. We’ll confirm the exact slot.',
    },
    callTime: { label: 'Best time to call', placeholder: 'Morning · Afternoon · Evening' },
  },
  provinces: ['BC', 'ON', 'AB', 'MB', 'SK', 'QC', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'NU'],
  callTimes: [
    { value: 'morning', label: 'Morning' },
    { value: 'afternoon', label: 'Afternoon' },
    { value: 'evening', label: 'Evening' },
  ],
  contactConsent: 'I agree to be contacted by phone, WhatsApp or email about this request.',
  contactMobileLines: [
    'I agree to be contacted by phone,',
    'WhatsApp or email about this',
    'request.',
  ],
  installHintLines: ['Usually within 3 days. We’ll confirm the', 'exact slot.'],
  termsPrefix: 'I accept the ',
  terms: 'Terms',
  termsJoin: ' and ',
  privacy: 'Privacy Policy',
  privacyWords: ['Privacy ', 'Policy'],
  termsEnd: '.',
  back: '← Back to plans',
  submit: 'Send my details →',
  pending: 'Checking preview…',
  note: '$0 today · you pay nothing until we confirm',
  summary: {
    heading: 'Your plan',
    change: 'Change',
    category: 'Home Internet',
    compactTitle: 'Home Internet · 500 Mbps',
    compactPrice: '$75/mo + tax · $0 due today',
    details: 'Details',
    hide: 'Hide details',
    unit: '/mo · CAD, taxes extra',
    features: ['✓ Unlimited data', '✓ WiFi modem included', '✓ Free professional install'],
    footnote: '*Your advisor confirms the promo terms before anything is billed.',
    due: 'Due today',
    dueValue: '$0',
    firstBill: 'First bill',
    firstBillValue: 'After your plan starts',
    noPayment: "You don't pay anything online",
    noPaymentDetail:
      'A real person confirms your order by phone or WhatsApp before anything is activated or billed.',
    noPaymentDesktopLines: [
      'A real person confirms your order by phone',
      'or WhatsApp before anything is activated or',
      'billed.',
    ],
    recap: 'Order summary',
    plan: 'Plan',
    monthly: 'Monthly price',
    monthlyValue: '$75/mo + tax',
  },
  feedback: {
    title: 'Please check your details',
    retry: 'The preview could not be completed. Try again; your details are still here.',
    errors: {
      firstName: 'Enter your first name.',
      lastName: 'Enter your last name.',
      email: 'Enter a valid email address.',
      phone: 'Enter a valid Canadian or international phone number.',
      birthDate: 'Enter a valid date of birth in DD / MM / YYYY format, before today.',
      street: 'Enter your street address.',
      city: 'Enter your city.',
      province: 'Choose a Canadian province or territory.',
      postalCode: 'Enter a valid Canadian postal code, such as A1A 1A1.',
      installDate: 'Enter a valid install date in DD / MM / YYYY format, today or later.',
      callTime: 'Choose one of the listed call times.',
      contactConsent: 'Agree to be contacted about this request.',
      terms: 'Accept the Terms and Privacy Policy.',
    },
  },
  destinations: {
    plans: '/home-internet#internet-plans',
    contact: '/contact#contact-options',
    terms: '/terms',
    privacy: '/privacy',
  },
} as const;
export function internetOrderSummaryFor(plan: InternetPlan) {
  return {
    ...internetOrderCopy.summary,
    // `unit` is optional on plan cards; never print the word "undefined".
    compactTitle: `${internetOrderCopy.summary.category} · ${plan.allowance}${plan.unit ? ` ${plan.unit}` : ''}`,
    compactPrice: `${plan.amount}${plan.period} + tax · $0 due today`,
    monthlyValue: `${plan.amount}${plan.period} + tax`,
  };
}

export const internetOrderAssets = {
  logo: componentAssets.footerLogo,
  lock: { src: '/design/internet-order/0-imgLock.svg', width: 16, height: 16, nodeId: '119:137' },
  phone: {
    src: '/design/internet-order/1-imgPhone.svg',
    width: 18,
    height: 18,
    nodeId: '349:1178',
  },
  chevron: {
    src: '/design/internet-order/1-imgChevronDown.svg',
    width: 20,
    height: 20,
    nodeId: '349:1003',
  },
};
