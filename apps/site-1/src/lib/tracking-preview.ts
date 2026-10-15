import { z } from 'zod';
import {
  trackingCopy as copy,
  trackingStates,
  trackingFixtures,
  trackingChangeOptions,
  type TrackingState,
} from '@content/track-order';
import { arrivalPlans } from '@content/pre-arrival';
import { isValidMoveInDate } from './internet-check';
export function parseTrackingState(value: unknown): TrackingState {
  return trackingStates.find((state) => state === value) ?? 'lookup';
}
export const trackingLookupSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .regex(/^CP-\d{4}-\d{4,8}$/u, copy.lookup.orderError),
  contact: z
    .string()
    .trim()
    .max(254, copy.lookup.contactError)
    .refine(
      (value) =>
        z.email().safeParse(value).success ||
        (/^\+?[\d\s().-]+$/u.test(value) &&
          value.replace(/\D/gu, '').length >= 7 &&
          value.replace(/\D/gu, '').length <= 15),
      copy.lookup.contactError,
    ),
});
export type TrackingLookupValues = z.infer<typeof trackingLookupSchema>;
export type TrackingLookupResult =
  | { status: 'fixture'; previewOnly: true; state: 'esim-sent' | 'not-found' }
  | {
      status: 'invalid';
      previewOnly: true;
      errors: Partial<Record<keyof TrackingLookupValues, string>>;
    };
export function lookupTrackingFixture(input: unknown): TrackingLookupResult {
  const checked = trackingLookupSchema.safeParse(input);
  if (!checked.success) {
    const errors: Partial<Record<keyof TrackingLookupValues, string>> = {};
    for (const issue of checked.error.issues) {
      if (issue.path[0] === 'orderNumber') errors.orderNumber = copy.lookup.orderError;
      if (issue.path[0] === 'contact') errors.contact = copy.lookup.contactError;
    }
    if (!Object.keys(errors).length) errors.orderNumber = copy.lookup.orderError;
    return { status: 'invalid', previewOnly: true, errors };
  }
  const fixture = trackingFixtures['esim-sent'];
  if (!('order' in fixture)) return { status: 'fixture', previewOnly: true, state: 'not-found' };
  const matches =
    checked.data.orderNumber === fixture.order.reference &&
    (checked.data.contact.toLowerCase() === fixture.order.email.toLowerCase() ||
      checked.data.contact.replace(/[\s().-]/gu, '') ===
        fixture.order.phone.replace(/[\s().-]/gu, ''));
  return { status: 'fixture', previewOnly: true, state: matches ? 'esim-sent' : 'not-found' };
}
export function trackingChangeSchema(now = new Date()) {
  return z
    .object({
      kind: z.enum(['email', 'arrival', 'plan', 'device', 'details', 'other']),
      value: z.string().trim().min(1, copy.change.valueError).max(300, copy.change.valueError),
      note: z.string().max(2000, copy.change.noteError),
    })
    .superRefine((values, ctx) => {
      const kind = trackingChangeOptions.find((option) => option.id === values.kind)?.type;
      if (kind === 'email' && !z.email().safeParse(values.value).success)
        ctx.addIssue({ code: 'custom', path: ['value'], message: copy.change.emailError });
      if (kind === 'select' && !arrivalPlans.some((plan) => plan.id === values.value))
        ctx.addIssue({ code: 'custom', path: ['value'], message: copy.change.planError });
      if (kind === 'date') {
        const [d, m, y] = values.value.split(/\s*\/\s*/).map(Number);
        const date =
          d === undefined || m === undefined || y === undefined ? undefined : Date.UTC(y, m - 1, d);
        const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        if (!values.value || !isValidMoveInDate(values.value) || date === undefined || date < today)
          ctx.addIssue({ code: 'custom', path: ['value'], message: copy.change.dateError });
      }
    });
}
export type TrackingChangeValues = z.infer<ReturnType<typeof trackingChangeSchema>>;
export type TrackingChangeResult =
  | { status: 'preview'; previewOnly: true }
  | {
      status: 'invalid';
      previewOnly: true;
      errors: Partial<Record<keyof TrackingChangeValues, string>>;
    };
export function checkTrackingChange(input: unknown): TrackingChangeResult {
  const result = trackingChangeSchema().safeParse(input);
  if (result.success) return { status: 'preview', previewOnly: true };
  const errors: Partial<Record<keyof TrackingChangeValues, string>> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (key === 'value' || key === 'kind' || key === 'note')
      errors[key] =
        key === 'note'
          ? copy.change.noteError
          : key === 'kind'
            ? copy.change.valueError
            : ([copy.change.emailError, copy.change.dateError, copy.change.planError].find(
                (message) => message === issue.message,
              ) ?? copy.change.valueError);
  }
  if (!Object.keys(errors).length) errors.value = copy.change.valueError;
  return { status: 'invalid', previewOnly: true, errors };
}
