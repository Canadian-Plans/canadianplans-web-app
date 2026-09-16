import { z } from 'zod';

import { isoDateTimeSchema, moneySchema, requestIdSchema } from './common';
import { commissionStateSchema, invoiceStatusSchema, partnerStatusSchema } from './domain';

/**
 * Partner identity (T4P). `referralCode` is unique per workspace and is what
 * T11 matches against a lead's `partner_code`. Commission rules/lines and
 * invoices land with T19 — this shape stays minimal until then.
 */
export const partnerSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  name: z.string().min(1),
  referralCode: z.string().min(1),
  status: partnerStatusSchema,
  createdAt: isoDateTimeSchema,
});
export type Partner = z.infer<typeof partnerSchema>;

/**
 * Partner commissions and invoices —
 * `POST /partners/:id/commissions`, `POST /partners/:id/invoices`.
 * Caller: Partners / Finance / Owner permissions. Commission is earned only on
 * order activation (invariant 10); these endpoints only move an existing
 * line's state and generate/approve invoices. `partner_paid` stays disabled
 * while OPEN_INPUTS #18 is unresolved. No handler here.
 */

/** One earned commission for one activated order, with its rule snapshotted (invariant 10). */
export const commissionLineSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  orderId: z.uuid(),
  partnerId: z.uuid(),
  ruleId: z.uuid(),
  amount: moneySchema,
  state: commissionStateSchema,
  earnedAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type CommissionLine = z.infer<typeof commissionLineSchema>;

/** Advances one commission line's state through an audited Finance action (earned → carrier_paid → partner_paid). */
export const changeCommissionStateRequestSchema = z.object({
  commissionId: z.uuid(),
  toState: commissionStateSchema,
});
export type ChangeCommissionStateRequest = z.infer<typeof changeCommissionStateRequestSchema>;

export const changeCommissionStateResponseSchema = z.object({
  commission: commissionLineSchema,
  requestId: requestIdSchema,
});
export type ChangeCommissionStateResponse = z.infer<typeof changeCommissionStateResponseSchema>;

export const invoiceLineSchema = z.object({
  id: z.uuid(),
  commissionId: z.uuid(),
  orderId: z.uuid(),
  amount: moneySchema,
});
export type InvoiceLine = z.infer<typeof invoiceLineSchema>;

/** One invoice per partner per period. Approval freezes it; regenerating an approved period is a no-op. */
export const invoiceSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  partnerId: z.uuid(),
  periodStart: z.iso.date(),
  periodEnd: z.iso.date(),
  status: invoiceStatusSchema,
  total: moneySchema,
  lines: z.array(invoiceLineSchema),
  createdAt: isoDateTimeSchema,
  approvedAt: isoDateTimeSchema.nullable(),
});
export type Invoice = z.infer<typeof invoiceSchema>;

/**
 * Generates a draft invoice for a period, or approves an existing draft.
 * Generation selects earned/carrier_paid lines into one draft; approval
 * freezes it (§4). Idempotent per partner + period.
 */
export const partnerInvoiceRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('generate'),
    periodStart: z.iso.date(),
    periodEnd: z.iso.date(),
  }),
  z.object({
    action: z.literal('approve'),
    invoiceId: z.uuid(),
  }),
]);
export type PartnerInvoiceRequest = z.infer<typeof partnerInvoiceRequestSchema>;

export const partnerInvoiceResponseSchema = z.object({
  invoice: invoiceSchema,
  requestId: requestIdSchema,
});
export type PartnerInvoiceResponse = z.infer<typeof partnerInvoiceResponseSchema>;
