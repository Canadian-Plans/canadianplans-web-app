/**
 * Copy for the integrated order form's three categories (ADR 0005, D7): the
 * pre-arrival eSIM form, the internet and TV form, and the mobile (bring your
 * own device) form. The two Canadian-resident forms follow the Canada Wide
 * forms; the field names, options and rules mirror them.
 */

export const MIN_LINES = 1;
export const MAX_LINES = 10;

/** "Current provider" answers for mobile, stored as written so staff read them as-is. */
export const MOBILE_PROVIDERS = [
  'Rogers',
  'Bell',
  'TELUS',
  'Fido',
  'Koodo',
  'Virgin Plus',
  'Freedom Mobile',
  'Public Mobile',
  'Chatr',
  'Lucky Mobile',
  'Other',
  "None – I don't have a phone plan",
] as const;

export const SIM_TYPE_OPTIONS = [
  { value: 'esim', label: 'eSIM (digital, no card to wait for)' },
  { value: 'physical', label: 'Physical SIM card (we send it to you)' },
] as const;

export const KEEP_NUMBER_OPTIONS = [
  { value: 'yes', label: 'Yes, keep my number' },
  { value: 'no', label: 'No, give me a new number' },
] as const;

/** Adults only, for the plans that run an identity check. */
export const MINIMUM_AGE = 18;
export const MAXIMUM_AGE = 120;

/** Customer-facing names for document checklist keys; an unknown key falls back to its text. */
const checklistLabels: Readonly<Record<string, string>> = {
  passport: 'Passport',
  visa: 'Visa or permit',
  address_proof: 'Proof of address',
  government_id: "Government-issued ID (driver's licence, provincial ID or passport)",
  none: 'No documents required',
};

export const orderFormContent = {
  checklistLabels,

  fields: {
    fullName: { label: 'Full name' },
    email: { label: 'Email' },
    phone: { label: 'Phone' },
    countryCode: { label: 'Code', hint: 'ISO country, e.g. BD' },
    currentCountry: { label: 'Country you are in now' },
    destination: { label: 'Destination in Canada' },
    arrivalDate: { label: 'Arrival date' },
    province: { label: 'Province', placeholder: 'Choose your province' },
    dateOfBirth: { label: 'Date of birth', hint: 'You must be 18 or older to order.' },
    streetAddress: { label: 'Street address' },
    aptUnit: { label: 'Apartment or unit (optional)' },
    city: { label: 'City' },
    postalCode: { label: 'Postal code', hint: 'For example A1A 1A1' },
    currentProvider: { label: 'Current provider' },
    currentProviderOptional: { label: 'Current provider (optional)' },
    preferredInstallationTime: {
      label: 'Preferred installation time (optional)',
      hint: 'For example weekday mornings.',
    },
    lines: { label: 'How many lines do you need?', hint: 'Between 1 and 10.' },
    keepNumber: { label: 'Keep your phone number?' },
    simType: { label: 'eSIM or SIM card?' },
    creditCheckConsent: {
      label:
        'I agree that my ID can be used for an identity and credit check on this order. It is used only for that check.',
    },
  },

  errors: {
    fullName: 'Enter your full name.',
    email: 'Enter a valid email address.',
    phone: 'Enter your phone number.',
    phoneCanadian: 'Enter a phone number with at least 10 digits.',
    countryCode: 'Use the two-letter country code, for example BD.',
    currentCountry: 'Enter the country you are in now.',
    destination: 'Enter your destination in Canada.',
    arrivalDate: 'Enter your arrival date.',
    province: 'Choose your province.',
    dateOfBirth: 'Enter a valid date of birth.',
    dateOfBirthImpossible: 'That date of birth is not valid.',
    dateOfBirthUnderage: `You must be ${MINIMUM_AGE} or older to order.`,
    streetAddress: 'Enter your street address.',
    city: 'Enter your city.',
    postalCode: 'Enter a valid postal code, for example A1A 1A1.',
    postalCodeProvince: 'That postal code is not in the province you chose.',
    currentProvider: 'Choose your current provider.',
    lines: `Choose ${MIN_LINES} to ${MAX_LINES} lines.`,
    keepNumber: 'Choose whether to keep your number.',
    simType: 'Choose an eSIM or a physical SIM.',
    creditCheckConsent: 'Please confirm we can use your ID for the credit check.',
    terms: 'Please accept the terms to place the order.',
  },

  planStep: {
    title: 'Choose a plan',
    description: 'Prices are confirmed by our server when you reach the review step.',
    empty: 'No plans are available right now. Please try again later.',
    provincePrompt: 'Internet and TV prices depend on your province.',
    provinceLabel: 'Your province',
    provinceApply: 'Show plans',
    categories: {
      internet: 'Internet and TV',
      mobile: 'Mobile plans, bring your own phone',
      sim: 'Pre-arrival eSIM',
    },
    noInternetInProvince:
      "We don't sell internet or TV in that province yet. Tell us where you are and we will let you know when we do.",
    perPeriod: {
      month: '/ month',
      '30_days': '/ 30 days',
      '90_days': '/ 90 days',
    },
  },
} as const;
