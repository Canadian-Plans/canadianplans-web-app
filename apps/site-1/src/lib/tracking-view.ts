import {
  amendableContactPatchSchema,
  amendableFieldKeySchema,
  amendableFormPatchSchema,
  type AmendableFieldKey,
  type Money,
  type OrderChangeRequestPatch,
  type OrderFulfilmentStatus,
  type TrackingDocumentStatus,
  type TrackingOrderDetail,
} from '@canadian-plans/contracts';
import { trackProgressSteps } from '@content/track';

/**
 * Pure view helpers for live order tracking. They shape backend responses for
 * display and turn a single edited field back into a change-request patch; they
 * hold no business rules of their own (the backend validates every write).
 */

export function fillTemplate(text: string, values: Readonly<Record<string, string>>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

export function formatMoney(money: Money): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: money.currency }).format(
    money.amountMinor / 100,
  );
}

/** A calendar date, in the shape customers read on the rest of the site. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

export type ProgressKind = 'done' | 'current' | 'waiting' | 'future';

/**
 * The progress steps for a status. `awaiting_customer` marks the in-progress
 * step as waiting on the customer; a cancelled order shows no step as reached.
 */
export function progressFor(
  status: OrderFulfilmentStatus,
): { label: string; kind: ProgressKind; marker: string }[] {
  const reached = trackProgressSteps.findIndex((step) => step.statuses.includes(status));
  return trackProgressSteps.map((step, index) => {
    const kind: ProgressKind =
      reached < 0 || index > reached
        ? 'future'
        : index < reached
          ? 'done'
          : status === 'awaiting_customer'
            ? 'waiting'
            : status === 'activated'
              ? 'done'
              : 'current';
    return {
      label: step.label,
      kind,
      marker: kind === 'done' ? '✓' : kind === 'waiting' ? '!' : String(index + 1),
    };
  });
}

/** The value the customer currently sees for one field. */
export function currentValue(order: TrackingOrderDetail, field: AmendableFieldKey): string | null {
  switch (field) {
    case 'contact.fullName':
      return order.customer.fullName;
    case 'contact.email':
      return order.customer.email;
    case 'contact.phone':
      return order.customer.phone;
    case 'contact.countryCode':
      return order.customer.countryCode;
    case 'form.currentCountry':
      return order.details.currentCountry;
    case 'form.destination':
      return order.details.destination;
    case 'form.arrivalDate':
      return order.details.arrivalDate;
  }
}

export type FieldValueError = 'value' | 'email' | 'countryCode';

const FIELD_PARTS: Readonly<
  Record<AmendableFieldKey, { group: 'contact' | 'form'; name: string }>
> = {
  'contact.fullName': { group: 'contact', name: 'fullName' },
  'contact.email': { group: 'contact', name: 'email' },
  'contact.phone': { group: 'contact', name: 'phone' },
  'contact.countryCode': { group: 'contact', name: 'countryCode' },
  'form.currentCountry': { group: 'form', name: 'currentCountry' },
  'form.destination': { group: 'form', name: 'destination' },
  'form.arrivalDate': { group: 'form', name: 'arrivalDate' },
};

function errorFor(field: AmendableFieldKey): FieldValueError {
  if (field === 'contact.email') return 'email';
  if (field === 'contact.countryCode') return 'countryCode';
  return 'value';
}

/**
 * Builds the change-request patch for edited fields, validating each value with
 * the shared amendable-field schemas so the browser reports what the backend
 * would reject.
 */
export function patchFromValues(
  values: Partial<Record<AmendableFieldKey, string>>,
):
  | { ok: true; patch: OrderChangeRequestPatch }
  | { ok: false; errors: Partial<Record<AmendableFieldKey, FieldValueError>> } {
  const contact: Record<string, string> = {};
  const form: Record<string, string> = {};
  const errors: Partial<Record<AmendableFieldKey, FieldValueError>> = {};
  for (const [key, raw] of Object.entries(values)) {
    const field = amendableFieldKeySchema.safeParse(key);
    if (!field.success) continue;
    const trimmed = (raw ?? '').trim();
    const value = field.data === 'contact.countryCode' ? trimmed.toUpperCase() : trimmed;
    if (!value) {
      errors[field.data] = 'value';
      continue;
    }
    const { group, name } = FIELD_PARTS[field.data];
    (group === 'contact' ? contact : form)[name] = value;
  }
  const parsedContact = amendableContactPatchSchema.strict().safeParse(contact);
  const parsedForm = amendableFormPatchSchema.strict().safeParse(form);
  for (const [group, result] of [
    ['contact', parsedContact],
    ['form', parsedForm],
  ] as const) {
    if (result.success) continue;
    for (const issue of result.error.issues) {
      const field = amendableFieldKeySchema.safeParse(`${group}.${String(issue.path[0])}`);
      if (field.success) errors[field.data] = errorFor(field.data);
    }
  }
  if (Object.keys(errors).length > 0 || !parsedContact.success || !parsedForm.success)
    return { ok: false, errors };
  const patch: OrderChangeRequestPatch = {
    ...(Object.keys(parsedContact.data).length > 0 ? { contact: parsedContact.data } : {}),
    ...(Object.keys(parsedForm.data).length > 0 ? { form: parsedForm.data } : {}),
  };
  if (!patch.contact && !patch.form) return { ok: false, errors: {} };
  return { ok: true, patch };
}

export interface DocumentRow {
  documentType: string;
  status: TrackingDocumentStatus | 'missing';
  /** True when the customer should upload (missing or needs a replacement). */
  uploadable: boolean;
}

/**
 * One row per checklist document: the newest file's state, or `missing` when
 * the type is still required and nothing usable has arrived.
 */
export function documentRows(order: TrackingOrderDetail): DocumentRow[] {
  return order.documentChecklist
    .filter((documentType) => documentType !== 'none')
    .map((documentType) => {
      const newest = order.documents
        .filter((document) => document.documentType === documentType)
        .sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt))[0];
      const required = order.documentsRequired.includes(documentType);
      const status: DocumentRow['status'] = newest ? newest.status : 'missing';
      return {
        documentType,
        status,
        uploadable: required && status !== 'received' && status !== 'approved',
      };
    });
}
