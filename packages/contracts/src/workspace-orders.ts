import { z } from 'zod';

import {
  isoDateTimeSchema,
  moneySchema,
  pageInfoSchema,
  requestIdSchema,
  versionedFormSchema,
} from './common';
import {
  documentChecklistKeySchema,
  orderFulfilmentStatusSchema,
  paymentStateSchema,
} from './domain';
import { orderConsentSchema, orderSummarySchema } from './orders';
import { chargeComponentSchema } from './quotes';
import { commercialOfferSchema } from './catalogue';

/**
 * Staff order processing — `GET/PATCH /workspaces/:id/orders`. Caller: staff
 * session with the workspace and the action permission. Transitions go through
 * explicit actions carrying an expected record version and return a conflict
 * on mismatch (§4). No handler here; A2/A3 implement the transitions.
 */

export const listWorkspaceOrdersQuerySchema = z.object({
  status: orderFulfilmentStatusSchema.optional(),
  paymentState: paymentStateSchema.optional(),
  assigneeId: z.uuid().optional(),
  partnerId: z.uuid().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});
export type ListWorkspaceOrdersQuery = z.infer<typeof listWorkspaceOrdersQuerySchema>;

export const listWorkspaceOrdersResponseSchema = z.object({
  orders: z.array(orderSummarySchema),
  page: pageInfoSchema,
  requestId: requestIdSchema,
});
export type ListWorkspaceOrdersResponse = z.infer<typeof listWorkspaceOrdersResponseSchema>;

/** One audited transition on an order's timeline. Personal data is not copied in (invariant 11). */
export const orderHistoryEntrySchema = z.object({
  at: isoDateTimeSchema,
  actorId: z.uuid(),
  action: z.string().min(1).max(64),
  fromStatus: orderFulfilmentStatusSchema.nullable(),
  toStatus: orderFulfilmentStatusSchema,
  recordVersion: z.int().positive(),
  note: z.string().max(2000).optional(),
});
export type OrderHistoryEntry = z.infer<typeof orderHistoryEntrySchema>;

/**
 * The frozen commercial snapshot taken at submission (invariant 5). Later CMS
 * or price changes never alter it. Prices come only from this snapshot.
 */
export const orderSnapshotSchema = z.object({
  quoteId: z.uuid(),
  productId: z.uuid(),
  offerVersionId: z.uuid(),
  offer: commercialOfferSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  charges: z.array(chargeComponentSchema),
  total: moneySchema,
  amountPayableToday: moneySchema,
  paymentRequired: z.boolean(),
  documentChecklist: z.array(documentChecklistKeySchema),
  termsVersion: z.string().min(1).max(64),
});
export type OrderSnapshot = z.infer<typeof orderSnapshotSchema>;

export const orderDetailSchema = orderSummarySchema.extend({
  assigneeId: z.uuid().nullable(),
  partnerCode: z.string().max(64).nullable(),
  snapshot: orderSnapshotSchema,
  payload: versionedFormSchema(z.record(z.string(), z.unknown())),
  // Consent captured at submission (invariant 11). Staff-only: never exposed on
  // the public summary. Nullable for orders that predate the consent column.
  consent: orderConsentSchema.nullable(),
  history: z.array(orderHistoryEntrySchema),
});
export type OrderDetail = z.infer<typeof orderDetailSchema>;

export const getWorkspaceOrderResponseSchema = z.object({
  order: orderDetailSchema,
  requestId: requestIdSchema,
});
export type GetWorkspaceOrderResponse = z.infer<typeof getWorkspaceOrderResponseSchema>;

/**
 * A staff transition. `expectedVersion` must equal the order's current
 * `recordVersion`; a mismatch is a `version_conflict` (§4). `activate` is the
 * transition that also creates the commission line, in the same DB
 * transaction (invariant 10) — no separate endpoint.
 */
const withExpectedVersion = { expectedVersion: z.int().nonnegative() };

export const patchWorkspaceOrderRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('transition'),
    toStatus: orderFulfilmentStatusSchema,
    reason: z.string().min(1).max(2000).optional(),
    ...withExpectedVersion,
  }),
  z.object({ action: z.literal('assign'), assigneeId: z.uuid(), ...withExpectedVersion }),
  z.object({
    action: z.literal('note'),
    note: z.string().min(1).max(2000),
    ...withExpectedVersion,
  }),
  z.object({ action: z.literal('remind'), remindAt: isoDateTimeSchema, ...withExpectedVersion }),
  z.object({
    action: z.literal('dispatch'),
    carrier: z.string().min(1).max(120).optional(),
    trackingReference: z.string().min(1).max(120).optional(),
    ...withExpectedVersion,
  }),
  z.object({ action: z.literal('activate'), ...withExpectedVersion }),
  z.object({
    action: z.literal('cancel'),
    reason: z.string().min(1).max(2000),
    ...withExpectedVersion,
  }),
  z.object({
    action: z.literal('set_payment'),
    paymentState: paymentStateSchema,
    ...withExpectedVersion,
  }),
]);
export type PatchWorkspaceOrderRequest = z.infer<typeof patchWorkspaceOrderRequestSchema>;

export const patchWorkspaceOrderResponseSchema = z.object({
  order: orderDetailSchema,
  requestId: requestIdSchema,
});
export type PatchWorkspaceOrderResponse = z.infer<typeof patchWorkspaceOrderResponseSchema>;
