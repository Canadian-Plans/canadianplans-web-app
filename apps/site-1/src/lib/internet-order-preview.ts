import { z } from 'zod';
import { internetOrderCopy as copy } from '@content/internet-order';
import { isValidPostalCode } from './postal-preview';
import { isValidMoveInDate } from './internet-check';
export interface InternetOrderValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  installDate: string;
  callTime: string;
  contactConsent: boolean;
  terms: boolean;
}
export type InternetOrderErrors = Partial<Record<keyof InternetOrderValues, string>>;
function isInternetOrderField(value: unknown): value is keyof InternetOrderValues {
  return typeof value === 'string' && Object.hasOwn(copy.feedback.errors, value);
}
export type InternetOrderPreviewResult =
  | { status: 'preview'; previewOnly: true }
  | { status: 'invalid'; previewOnly: true; errors: InternetOrderErrors };
export const emptyInternetOrder: InternetOrderValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  birthDate: '',
  street: '',
  city: '',
  province: 'BC',
  postalCode: '',
  installDate: '',
  callTime: '',
  contactConsent: true,
  terms: false,
};
function calendar(value: string): number | undefined {
  if (!value || !isValidMoveInDate(value)) return undefined;
  const [day, month, year] = value
    .trim()
    .split(/\s*\/\s*/)
    .map(Number);
  if (day === undefined || month === undefined || year === undefined) return undefined;
  return Date.UTC(year, month - 1, day);
}
export function validateInternetOrder(input: unknown, now = new Date()): InternetOrderErrors {
  const e = copy.feedback.errors;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const schema = z.object({
    firstName: z.string().trim().min(1, e.firstName).max(200, e.firstName),
    lastName: z.string().trim().min(1, e.lastName).max(200, e.lastName),
    email: z.string().trim().max(254, e.email).email(e.email),
    phone: z
      .string()
      .trim()
      .refine(
        (value) =>
          /^\+?[\d\s().-]+$/u.test(value) &&
          value.length <= 40 &&
          value.replace(/\D/gu, '').length >= 7 &&
          value.replace(/\D/gu, '').length <= 15,
        e.phone,
      ),
    birthDate: z.string().refine((value) => {
      const date = calendar(value);
      return date !== undefined && date < today;
    }, e.birthDate),
    street: z.string().trim().min(1, e.street).max(300, e.street),
    city: z.string().trim().min(1, e.city).max(200, e.city),
    province: z
      .string()
      .refine((value) => copy.provinces.some((province) => province === value), e.province),
    postalCode: z.string().refine(isValidPostalCode, e.postalCode),
    installDate: z.string().refine((value) => {
      const date = calendar(value);
      return date !== undefined && date >= today;
    }, e.installDate),
    callTime: z
      .string()
      .refine(
        (value) => value === '' || copy.callTimes.some((time) => time.value === value),
        e.callTime,
      ),
    contactConsent: z.boolean().refine(Boolean, e.contactConsent),
    terms: z.boolean().refine(Boolean, e.terms),
  });
  const parsed = schema.safeParse(input);
  if (parsed.success) return {};
  const errors: InternetOrderErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (isInternetOrderField(field)) {
      errors[field] = e[field];
    }
  }
  if (Object.keys(errors).length === 0) errors.firstName = e.firstName;
  return errors;
}
