import { businessCopy, businessNeeds, type BusinessNeed } from '@content/business-internet';
import { isValidPostalCode } from '@/lib/postal-preview';

export interface BusinessQuoteInput {
  readonly businessName: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly postalCode: string;
  readonly need: string;
  readonly notes: string;
}
export type BusinessQuoteErrors = Partial<Record<keyof BusinessQuoteInput, string>>;
export type BusinessQuoteResult =
  | { readonly status: 'preview'; readonly previewOnly: true }
  | { readonly status: 'invalid'; readonly previewOnly: true };

export const businessQuoteFields = [
  'businessName',
  'name',
  'email',
  'phone',
  'postalCode',
  'need',
  'notes',
] as const satisfies readonly (keyof BusinessQuoteInput)[];

export function isBusinessNeed(value: string): value is BusinessNeed {
  return businessNeeds.some((need) => need.value === value);
}

/** Client and server share these rules; the server re-runs them on the stub action. */
export function validateBusinessQuote(input: BusinessQuoteInput): BusinessQuoteErrors {
  const errors: BusinessQuoteErrors = {};
  const copy = businessCopy.quote.errors;
  const businessName = input.businessName.trim();
  if (!businessName || businessName.length > 200) errors.businessName = copy.businessName;
  const name = input.name.trim();
  if (!name || name.length > 200) errors.name = copy.name;
  const email = input.email.trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) errors.email = copy.email;
  const phone = input.phone.trim();
  const digits = phone.replace(/\D/gu, '').length;
  if (phone && (phone.length > 40 || !/^\+?[\d\s().-]+$/u.test(phone) || digits < 7 || digits > 15))
    errors.phone = copy.phone;
  if (!isValidPostalCode(input.postalCode)) errors.postalCode = copy.postalCode;
  if (!isBusinessNeed(input.need)) errors.need = copy.need;
  if (input.notes.trim().length > 2000) errors.notes = copy.notes;
  return errors;
}
