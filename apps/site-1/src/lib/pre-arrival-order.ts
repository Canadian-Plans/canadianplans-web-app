import { z } from 'zod';
import { arrivalPlans } from '@content/pre-arrival';
import { preArrivalOrderCopy as copy } from '@content/pre-arrival-order';
import { isValidMoveInDate } from './internet-check';

const e = copy.feedback.errors;
export const documentMetadataSchema = z.object({
  name: z.string().min(1).max(255),
  size: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
  type: z.enum(['image/jpeg', 'image/png', 'application/pdf']),
});
export type PreviewDocument = z.infer<typeof documentMetadataSchema>;
function dateNumber(value: string): number | undefined {
  if (!value || !isValidMoveInDate(value)) return undefined;
  const [d, m, y] = value
    .trim()
    .split(/\s*\/\s*/)
    .map(Number);
  return d === undefined || m === undefined || y === undefined ? undefined : Date.UTC(y, m - 1, d);
}
export function formatArrivalDate(value: string): string {
  const date = dateNumber(value);
  return date === undefined
    ? value
    : new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(date);
}
export function preArrivalSchemas(now = new Date()) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const one = z.object({
    audience: z.enum(['student', 'worker', 'resident', 'visitor'], { error: e.audience }),
    firstName: z.string().trim().min(1, e.firstName).max(200, e.firstName),
    lastName: z.string().trim().min(1, e.lastName).max(200, e.lastName),
    email: z.string().trim().max(254, e.email).email(e.email),
    phone: z
      .string()
      .trim()
      .refine(
        (v) =>
          /^\+[\d\s().-]+$/u.test(v) &&
          v.length <= 40 &&
          v.replace(/\D/gu, '').length >= 7 &&
          v.replace(/\D/gu, '').length <= 15,
        e.phone,
      ),
    whatsapp: z.boolean(),
    arrivalDate: z.string().refine((v) => {
      const d = dateNumber(v);
      return d !== undefined && d >= today;
    }, e.arrivalDate),
    city: z.string().refine((v) => copy.cities.some((c) => c === v), e.city),
  });
  const two = z.object({
    passportNumber: z.string().trim().min(1, e.passportNumber).max(64, e.passportNumber),
    birthDate: z.string().refine((v) => {
      const d = dateNumber(v);
      return d !== undefined && d < today;
    }, e.birthDate),
    confirmEmail: z.string().trim().max(254, e.confirmEmail).email(e.confirmEmail),
    phoneModel: z.string().trim().min(1, e.phoneModel).max(200, e.phoneModel),
    contactConsent: z.boolean().refine(Boolean, e.contactConsent),
    terms: z.boolean().refine(Boolean, e.terms),
    passportFile: documentMetadataSchema
      .nullable()
      .refine((v): boolean => v !== null, e.passportFile),
    permitFile: documentMetadataSchema.nullable().refine((v): boolean => v !== null, e.permitFile),
  });
  const all = one
    .extend(two.shape)
    .refine((v) => v.email.trim().toLowerCase() === v.confirmEmail.trim().toLowerCase(), {
      path: ['confirmEmail'],
      message: e.confirmEmail,
    });
  return { one, two, all };
}
export type PreArrivalValues = z.infer<ReturnType<typeof preArrivalSchemas>['all']>;
export type PreArrivalField = keyof PreArrivalValues;
export const emptyPreArrival: PreArrivalValues = {
  audience: 'student',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  whatsapp: true,
  arrivalDate: '',
  city: '',
  passportNumber: '',
  birthDate: '',
  confirmEmail: '',
  phoneModel: '',
  contactConsent: true,
  terms: false,
  passportFile: null,
  permitFile: null,
};
export const stepOneFields = [
  'audience',
  'firstName',
  'lastName',
  'email',
  'phone',
  'whatsapp',
  'arrivalDate',
  'city',
] as const;
export const stepTwoFields = [
  'passportFile',
  'permitFile',
  'passportNumber',
  'birthDate',
  'confirmEmail',
  'phoneModel',
  'contactConsent',
  'terms',
] as const;
export function isPreArrivalField(v: unknown): v is PreArrivalField {
  return typeof v === 'string' && Object.hasOwn(e, v);
}
/** Draft parsing accepts incomplete text, but bounds and validates every stored field. */
const text = z.string().max(300);
export const preArrivalDraftSchema = z.object({
  version: z.literal(1),
  planId: z.string().refine((v) => arrivalPlans.some((p) => p.id === v)),
  step: z.enum(['one', 'two', 'confirmation']),
  values: z.object({
    audience: z.enum(['student', 'worker', 'resident', 'visitor']),
    firstName: text,
    lastName: text,
    email: text,
    phone: text,
    whatsapp: z.boolean(),
    arrivalDate: text,
    city: text,
    passportNumber: text,
    birthDate: text,
    confirmEmail: text,
    phoneModel: text,
    contactConsent: z.boolean(),
    terms: z.boolean(),
    passportFile: documentMetadataSchema.nullable(),
    permitFile: documentMetadataSchema.nullable(),
  }),
});
export type PreArrivalDraft = z.infer<typeof preArrivalDraftSchema>;
export function parsePreArrivalDraft(raw: string | null): PreArrivalDraft | undefined {
  if (!raw || raw.length > 10000) return undefined;
  try {
    const result = preArrivalDraftSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}
export type PreArrivalPreviewResult =
  | { status: 'preview'; previewOnly: true }
  | { status: 'invalid'; previewOnly: true; errors: Partial<Record<PreArrivalField, string>> };
export function checkPreArrivalPreview(
  input: unknown,
  planId: unknown,
  now = new Date(),
): PreArrivalPreviewResult {
  const checked = preArrivalSchemas(now).all.safeParse(input);
  const errors: Partial<Record<PreArrivalField, string>> = {};
  if (!checked.success)
    for (const issue of checked.error.issues)
      if (isPreArrivalField(issue.path[0])) errors[issue.path[0]] = e[issue.path[0]];
  if (!checked.success && Object.keys(errors).length === 0) errors.firstName = e.firstName;
  const plan = arrivalPlans.find((p) => p.id === planId);
  if (!plan || (checked.success && !plan.audiences.includes(checked.data.audience)))
    errors.audience = e.audience;
  return Object.keys(errors).length
    ? { status: 'invalid', previewOnly: true, errors }
    : { status: 'preview', previewOnly: true };
}
