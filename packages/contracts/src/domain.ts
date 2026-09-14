import { z } from 'zod';

/**
 * API-surface vocabularies shared across the order, partner, upload and
 * tracking families. These are the values the `/api/v1` contract exposes to
 * callers, not the database's internal enums (a DB row type is not an API
 * type — invariant 14). Real transition rules land with A2/A3; the values
 * here are the provisional contract vocabulary those tasks refine.
 *
 * Order status, payment, delivery and commission are independent dimensions
 * and never collapse into one field (invariant 9).
 */

/** Fulfilment dimension. Staff transitions: assign / note / remind / dispatch / activate (§7). */
export const orderFulfilmentStatusSchema = z.enum([
  'received',
  'processing',
  'dispatched',
  'activated',
  'cancelled',
]);
export type OrderFulfilmentStatus = z.infer<typeof orderFulfilmentStatusSchema>;

/** Payment dimension. Manual/flagged at launch; per-offer `paymentRequired` decides `not_required`. */
export const paymentStateSchema = z.enum(['not_required', 'unpaid', 'paid']);
export type PaymentState = z.infer<typeof paymentStateSchema>;

/** Delivery dimension. Manual courier, recorded in admin (§7 decisions). */
export const deliveryStateSchema = z.enum(['pending', 'dispatched', 'delivered']);
export type DeliveryState = z.infer<typeof deliveryStateSchema>;

/** Archive dimension. Independent of fulfilment (invariant 9). */
export const archiveStateSchema = z.enum(['active', 'archived']);
export type ArchiveState = z.infer<typeof archiveStateSchema>;

/**
 * Commission state machine (PLATFORM_CONTEXT.md §4): earned → carrier_paid →
 * partner_paid. Phase A records earned and carrier_paid; partner_paid stays
 * disabled while OPEN_INPUTS #18 is unresolved.
 */
export const commissionStateSchema = z.enum(['earned', 'carrier_paid', 'partner_paid']);
export type CommissionState = z.infer<typeof commissionStateSchema>;

/** Invoice lifecycle. Approval freezes an invoice; regeneration for an approved period is a no-op. */
export const invoiceStatusSchema = z.enum(['draft', 'approved']);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

/**
 * The only stored document media types (recorded decision: PDF/JPG/PNG, no
 * malware scanner yet). The declared Content-Type is never trusted — the
 * finalize step verifies the file signature (invariant 8) — but a caller must
 * still declare an allowed type up front.
 */
export const documentMediaTypeSchema = z.enum(['application/pdf', 'image/jpeg', 'image/png']);
export type DocumentMediaType = z.infer<typeof documentMediaTypeSchema>;

/**
 * A per-offer document-checklist key (e.g. `passport`, `study_permit`). The
 * concrete taxonomy comes from the offer, not this contract, so it is a
 * bounded slug rather than a fixed enum.
 */
export const documentChecklistKeySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9_]+$/, 'lower_snake_case checklist key');
export type DocumentChecklistKey = z.infer<typeof documentChecklistKeySchema>;

/** Records an attachment can hang off. Widened as new parent records gain documents. */
export const documentParentTypeSchema = z.enum(['lead', 'order']);
export type DocumentParentType = z.infer<typeof documentParentTypeSchema>;

/** Maximum uploaded document size: 10 MB (recorded decision). */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
