import { z } from 'zod';

import { isoDateTimeSchema, moneySchema, requestIdSchema } from './common';
import {
  commissionRuleTypeSchema,
  commissionStateSchema,
  invoiceStatusSchema,
  orderFulfilmentStatusSchema,
  partnerStatusSchema,
} from './domain';

/**
 * Partner identity (T4P). `referralCode` is unique per workspace and is what
 * T11 matches against a lead's `partner_code`. T19 adds commission rules,
 * lines, invoices and the staff-facing partner directory around it.
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
 * A workspace-scoped, time-bounded commission rule (T19; REQ 32). The rule in
 * effect at activation time is snapshotted onto the commission line, so a later
 * rule change never alters lines already earned (invariant 10). `value` is a
 * flat amount for `fixed` rules; for `percentage` the basis and rounding are
 * OPEN_INPUTS #17 (unresolved). `isTest` marks a placeholder rule that may only
 * produce lines outside production.
 */
export const commissionRuleSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  ruleType: commissionRuleTypeSchema,
  value: moneySchema,
  isTest: z.boolean(),
  effectiveFrom: isoDateTimeSchema,
  effectiveTo: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
});
export type CommissionRule = z.infer<typeof commissionRuleSchema>;

/** The immutable rule terms copied onto a commission line at activation. */
export const commissionRuleSnapshotSchema = z.object({
  ruleId: z.uuid(),
  ruleType: commissionRuleTypeSchema,
  value: moneySchema,
  isTest: z.boolean(),
  effectiveFrom: isoDateTimeSchema,
  effectiveTo: isoDateTimeSchema.nullable(),
});
export type CommissionRuleSnapshot = z.infer<typeof commissionRuleSnapshotSchema>;

/** One earned commission for one activated order, with its rule snapshotted (invariant 10). */
export const commissionLineSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  orderId: z.uuid(),
  partnerId: z.uuid(),
  ruleId: z.uuid(),
  ruleSnapshot: commissionRuleSnapshotSchema,
  amount: moneySchema,
  state: commissionStateSchema,
  invoiceId: z.uuid().nullable(),
  earnedAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type CommissionLine = z.infer<typeof commissionLineSchema>;

/** One recorded commission state transition (REQ 32 — "state history"). */
export const commissionLineEventSchema = z.object({
  id: z.uuid(),
  fromState: commissionStateSchema.nullable(),
  toState: commissionStateSchema,
  createdAt: isoDateTimeSchema,
});
export type CommissionLineEvent = z.infer<typeof commissionLineEventSchema>;

/**
 * A commission line as shown in the partner directory. Financial figures
 * (`amount`) are *payout details*: they are populated only for a caller with
 * `financial.read`; everyone else with `workspace.read` sees the line and its
 * state but `amount` is `null` (a DB row is not an API response — invariant 14;
 * "Viewer sees no payout details").
 */
export const partnerCommissionViewSchema = z.object({
  id: z.uuid(),
  orderId: z.uuid(),
  orderReference: z.string(),
  state: commissionStateSchema,
  amount: moneySchema.nullable(),
  invoiceId: z.uuid().nullable(),
  earnedAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type PartnerCommissionView = z.infer<typeof partnerCommissionViewSchema>;

/** A referred order shown on the partner detail page. */
export const partnerReferredOrderSchema = z.object({
  id: z.uuid(),
  reference: z.string(),
  fulfilmentStatus: orderFulfilmentStatusSchema,
  submittedAt: isoDateTimeSchema,
});
export type PartnerReferredOrder = z.infer<typeof partnerReferredOrderSchema>;

export const partnerSummarySchema = partnerSchema.extend({
  referredOrderCount: z.int().nonnegative(),
  commissionLineCount: z.int().nonnegative(),
});
export type PartnerSummary = z.infer<typeof partnerSummarySchema>;

export const listPartnersResponseSchema = z.object({
  partners: z.array(partnerSummarySchema),
  requestId: requestIdSchema,
});
export type ListPartnersResponse = z.infer<typeof listPartnersResponseSchema>;

/**
 * Partner detail for the admin page. `canViewPayouts` reflects the caller's
 * `financial.read`; `canManagePayouts` additionally reflects a verified aal2
 * session and whether payout actions are enabled at all. `payoutDisabledReason`
 * explains the missing dependency when carrier/partner-paid actions are off.
 */
export const partnerDetailResponseSchema = z.object({
  partner: partnerSchema,
  referredOrders: z.array(partnerReferredOrderSchema),
  commissions: z.array(partnerCommissionViewSchema),
  canViewPayouts: z.boolean(),
  canMarkCarrierPaid: z.boolean(),
  partnerPaidEnabled: z.literal(false),
  payoutDisabledReason: z.string(),
  requestId: requestIdSchema,
});
export type PartnerDetailResponse = z.infer<typeof partnerDetailResponseSchema>;

/**
 * Advances one commission line's state through an audited Finance action.
 * Phase A only allows `earned → carrier_paid`; `partner_paid` stays disabled
 * (OPEN_INPUTS #18) and the backend rejects it.
 */
export const changeCommissionStateRequestSchema = z.object({
  commissionId: z.uuid(),
  toState: commissionStateSchema,
});
export type ChangeCommissionStateRequest = z.infer<typeof changeCommissionStateRequestSchema>;

export const changeCommissionStateResponseSchema = z.object({
  commission: commissionLineSchema,
  history: z.array(commissionLineEventSchema),
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
  invoiceNumber: z.int().positive(),
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
 * freezes it (§4). Idempotent per partner + period. Not implemented in Phase A
 * (B1) — the schema is kept so the contract is stable when B1 lands.
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
