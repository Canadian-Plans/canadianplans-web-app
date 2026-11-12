import {
  CHANGEABLE_FIELD_KEYS,
  CHANGE_REQUEST_DOCUMENTS,
  changeRequestFieldsSchema,
  type ChangeableFieldKey,
  type TrackingDocumentState,
  type TrackingOrder,
} from '@canadian-plans/crm-contracts';
import type { z } from 'zod';

/**
 * Pure view helpers for live order tracking. They shape the CRM's tracked
 * orders for display and turn the change form back into a change request; they
 * hold no business rules of their own (the backend validates every write and
 * decides whether an order may still change).
 */

export function fillTemplate(text: string, values: Readonly<Record<string, string>>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

/** A price in minor units. The CRM sends no currency; this storefront sells in Canadian dollars. */
export function formatPrice(priceMinor: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(
    priceMinor / 100,
  );
}

/** A timestamp or a `YYYY-MM-DD` date, in the shape customers read on the rest of the site. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** The order with this reference in the verified email's list. */
export function findOrder(
  orders: readonly TrackingOrder[],
  reference: string,
): TrackingOrder | undefined {
  return orders.find((order) => order.reference === reference);
}

export interface PlanView {
  /** The frozen plan's name, else the website's own label on an imported order. */
  name: string | null;
  priceMinor: number | null;
  billingPeriod: NonNullable<TrackingOrder['plan']>['billingPeriod'] | null;
}

export function planView(order: TrackingOrder): PlanView {
  if (order.plan)
    return {
      name: order.plan.name,
      priceMinor: order.plan.priceMinor,
      billingPeriod: order.plan.billingPeriod,
    };
  return { name: order.details.websitePlanLabel ?? null, priceMinor: null, billingPeriod: null };
}

/** The details this storefront collects and lets a customer ask to change. */
export const TRACK_EDITABLE_FIELDS = ['fullName', 'phone', 'arrivalDate', 'canadaAddress'] as const;
export type TrackEditableField = (typeof TRACK_EDITABLE_FIELDS)[number];

/**
 * A change request as this storefront sends it: the contract's own rules for
 * the four editable details and nothing else (never a plan, never an email).
 */
export const trackChangeFieldsSchema = changeRequestFieldsSchema
  .pick({ fullName: true, phone: true, arrivalDate: true, canadaAddress: true })
  .strict()
  .refine((fields) => Object.keys(fields).length > 0, 'at least one field');
export type TrackChangeFields = z.infer<typeof trackChangeFieldsSchema>;

/** The value the order currently holds for one editable detail. */
export function currentValue(order: TrackingOrder, field: TrackEditableField): string | null {
  return order.details[field];
}

export type TrackChangeValues = Readonly<Record<TrackEditableField, string>>;

/**
 * What the change form starts with: the pending request's value where the
 * customer already asked for one (a new request replaces the pending one, so
 * it must carry those again), else the order's current value.
 */
export function changeFormValues(order: TrackingOrder): TrackChangeValues {
  const pending = order.pendingChange?.fields;
  const value = (field: TrackEditableField) => pending?.[field] ?? currentValue(order, field) ?? '';
  return {
    fullName: value('fullName'),
    phone: value('phone'),
    arrivalDate: value('arrivalDate'),
    canadaAddress: value('canadaAddress'),
  };
}

export type FieldValueError = 'required' | 'invalid';

const isEditableField = (key: unknown): key is TrackEditableField =>
  TRACK_EDITABLE_FIELDS.some((field) => field === key);

/**
 * Builds the change request from the form: only the details that differ from
 * the order, each checked with the contract's schema so the browser reports
 * what the backend would reject. `unchanged` means nothing differs.
 */
export function changeFromValues(
  order: TrackingOrder,
  values: TrackChangeValues,
):
  | { ok: true; fields: TrackChangeFields }
  | {
      ok: false;
      unchanged: boolean;
      errors: Partial<Record<TrackEditableField, FieldValueError>>;
    } {
  const candidate: Partial<Record<TrackEditableField, string>> = {};
  const errors: Partial<Record<TrackEditableField, FieldValueError>> = {};
  for (const field of TRACK_EDITABLE_FIELDS) {
    const value = values[field].trim();
    if (value === (currentValue(order, field) ?? '').trim()) continue;
    // Clearing a detail is not offered here: an emptied field is a mistake.
    if (!value) errors[field] = 'required';
    else candidate[field] = value;
  }
  if (Object.keys(errors).length > 0) return { ok: false, unchanged: false, errors };
  if (Object.keys(candidate).length === 0) return { ok: false, unchanged: true, errors };
  const parsed = trackChangeFieldsSchema.safeParse(candidate);
  if (parsed.success) return { ok: true, fields: parsed.data };
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (isEditableField(field)) errors[field] = 'invalid';
  }
  return { ok: false, unchanged: false, errors };
}

export type UploadDocumentType = (typeof CHANGE_REQUEST_DOCUMENTS)[number];

export const isUploadDocumentType = (documentType: string): documentType is UploadDocumentType =>
  CHANGE_REQUEST_DOCUMENTS.some((type) => type === documentType);

/** Uploads join a change request, so only a SIM order that may still change takes them. */
export function canUploadDocuments(order: TrackingOrder): boolean {
  return order.canRequestChange && order.leadType === 'sim_order';
}

export interface DocumentRow {
  documentType: string;
  state: TrackingDocumentState;
  /** The customer already sent this document with the pending change request. */
  sent: boolean;
  /** The customer may upload this document now. */
  uploadable: boolean;
  /** Uploadable, still missing or rejected, and nothing sent yet: ask for it. */
  needed: boolean;
}

/** One row per document the order lists, with what the customer can do about it. */
export function documentRows(order: TrackingOrder): DocumentRow[] {
  const allowed = canUploadDocuments(order);
  return order.documents.map(({ documentType, state }) => {
    const sent = order.pendingChange?.documents.some((type) => type === documentType) ?? false;
    const uploadable = allowed && isUploadDocumentType(documentType) && state !== 'approved';
    return {
      documentType,
      state,
      sent,
      uploadable,
      needed: uploadable && !sent && (state === 'missing' || state === 'needs_replacement'),
    };
  });
}

/** True when the order waits on a document from the customer. */
export function needsAttention(order: TrackingOrder): boolean {
  return documentRows(order).some((row) => row.needed);
}

export interface PendingChangeView {
  requestNo: number;
  /** The details asked to change, in the contract's order; never their values. */
  fields: ChangeableFieldKey[];
  documents: UploadDocumentType[];
  updatedAt: string;
}

/** The customer's pending change request, as a list of what it touches. */
export function pendingChangeView(order: TrackingOrder): PendingChangeView | null {
  const pending = order.pendingChange;
  if (!pending) return null;
  return {
    requestNo: pending.requestNo,
    fields: CHANGEABLE_FIELD_KEYS.filter((key) => pending.fields[key] !== undefined),
    documents: [...pending.documents],
    updatedAt: pending.updatedAt,
  };
}
