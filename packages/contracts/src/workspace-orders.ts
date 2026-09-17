import { z } from 'zod';

import {
  isoDateTimeSchema,
  moneySchema,
  pageInfoSchema,
  requestIdSchema,
  versionedFormSchema,
} from './common';
import {
  archiveStateSchema,
  documentChecklistKeySchema,
  orderFulfilmentStatusSchema,
  paymentStateSchema,
} from './domain';
import { orderConsentSchema, orderSummarySchema } from './orders';
import { chargeComponentSchema } from './quotes';
import { commercialOfferSchema } from './catalogue';
import { staffRoleNameSchema } from './staff-auth';

/**
 * Staff order processing — the `/workspaces/:id/orders` family (T14). Caller:
 * staff session with the workspace and the action permission. Every write is a
 * backend endpoint carrying an expected record version and returns a conflict
 * on mismatch (§4); the admin holds no transition, payment or amendment rules
 * of its own.
 */

/** The archive filter, defaulting to active orders; `all` is an explicit opt-in. */
export const orderArchiveFilterSchema = archiveStateSchema.or(z.literal('all'));
export type OrderArchiveFilter = z.infer<typeof orderArchiveFilterSchema>;

export const listWorkspaceOrdersQuerySchema = z.object({
  status: orderFulfilmentStatusSchema.optional(),
  paymentState: paymentStateSchema.optional(),
  assigneeId: z.uuid().optional(),
  partnerId: z.uuid().optional(),
  /** Partner referral code, e.g. `MAPLE10`; filters to that partner's referred orders. */
  partnerCode: z.string().min(1).max(64).optional(),
  /** Attribution source label, e.g. `partner:MAPLE10`, `utm:google/cpc`, `direct`. */
  source: z.string().min(1).max(160).optional(),
  /** Inclusive lower bound on `submittedAt`. */
  submittedFrom: isoDateTimeSchema.optional(),
  /** Exclusive upper bound on `submittedAt`. */
  submittedTo: isoDateTimeSchema.optional(),
  archiveState: orderArchiveFilterSchema.optional(),
  /** Bounded, workspace-scoped search over reference and customer contact fields. */
  search: z.string().min(1).max(120).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});
export type ListWorkspaceOrdersQuery = z.infer<typeof listWorkspaceOrdersQuerySchema>;

/** Customer contact copied from the originating lead. Staff-only audience (§4a). */
export const orderCustomerSchema = z.object({
  fullName: z.string().max(160).nullable(),
  email: z.string().max(254).nullable(),
  phone: z.string().max(32).nullable(),
  countryCode: z.string().max(2).nullable(),
});
export type OrderCustomer = z.infer<typeof orderCustomerSchema>;

/**
 * One row of the staff orders list. Adds the operational fields the list needs
 * (assignee, partner, customer label, source, submission time) to the shared
 * order summary. It is never used as the public submission response.
 */
export const orderListItemSchema = orderSummarySchema.extend({
  assigneeId: z.uuid().nullable(),
  partnerCode: z.string().max(64).nullable(),
  customer: orderCustomerSchema,
  source: z.string().min(1).max(160),
  submittedAt: isoDateTimeSchema,
});
export type OrderListItem = z.infer<typeof orderListItemSchema>;

/**
 * What this actor may do, decided by the backend from its live membership,
 * roles and individual permissions. The UI renders controls from these flags
 * instead of re-deriving policy from role names.
 */
export const orderCapabilitiesSchema = z.object({
  canManageOrders: z.boolean(),
  /** Manual payment recording: Orders (`order.manage`) or Finance (`financial.read`). */
  canRecordPayment: z.boolean(),
  /** Contact-field search; reference search is always available with `workspace.read`. */
  canSearchContact: z.boolean(),
});
export type OrderCapabilities = z.infer<typeof orderCapabilitiesSchema>;

export const listWorkspaceOrdersResponseSchema = z.object({
  orders: z.array(orderListItemSchema),
  page: pageInfoSchema,
  capabilities: orderCapabilitiesSchema,
  requestId: requestIdSchema,
});
export type ListWorkspaceOrdersResponse = z.infer<typeof listWorkspaceOrdersResponseSchema>;

/** One selectable assignee: an active staff membership of the same workspace. */
export const assignableMemberSchema = z.object({
  membershipId: z.uuid(),
  roles: z.array(staffRoleNameSchema),
  isSelf: z.boolean(),
});
export type AssignableMember = z.infer<typeof assignableMemberSchema>;

export const listAssignableMembersResponseSchema = z.object({
  members: z.array(assignableMemberSchema),
  requestId: requestIdSchema,
});
export type ListAssignableMembersResponse = z.infer<typeof listAssignableMembersResponseSchema>;

/** One audited transition on an order's status timeline. Personal data is not copied in (invariant 11). */
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

/** One audit row for the order, oldest first. `before`/`after` carry no unnecessary personal data. */
export const orderAuditEntrySchema = z.object({
  id: z.uuid(),
  at: isoDateTimeSchema,
  actorId: z.uuid(),
  action: z.string().min(1).max(80),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
});
export type OrderAuditEntry = z.infer<typeof orderAuditEntrySchema>;

/** An operational contact note (REQ 20). Append-only; author and time are attributable. */
export const orderNoteSchema = z.object({
  id: z.uuid(),
  authorId: z.uuid(),
  body: z.string().min(1).max(2000),
  createdAt: isoDateTimeSchema,
});
export type OrderNote = z.infer<typeof orderNoteSchema>;

/** A follow-up reminder (REQ 20/27). Deleting one stops it being scheduled. */
export const orderReminderSchema = z.object({
  id: z.uuid(),
  createdBy: z.uuid(),
  remindAt: isoDateTimeSchema,
  note: z.string().max(2000).nullable(),
  createdAt: isoDateTimeSchema,
});
export type OrderReminder = z.infer<typeof orderReminderSchema>;

/** One manual payment record; payment state is an independent dimension (invariant 9). */
export const orderPaymentSchema = z.object({
  id: z.uuid(),
  actorId: z.uuid(),
  fromState: paymentStateSchema,
  toState: paymentStateSchema,
  method: z.string().max(120).nullable(),
  reference: z.string().max(120).nullable(),
  amount: moneySchema.nullable(),
  recordedAt: isoDateTimeSchema,
});
export type OrderPayment = z.infer<typeof orderPaymentSchema>;

/** The manual courier record written with the Dispatched transition (REQ 28). */
export const orderDispatchSchema = z.object({
  id: z.uuid(),
  actorId: z.uuid(),
  courier: z.string().min(1).max(120),
  trackingReference: z.string().max(120).nullable(),
  dispatchedAt: isoDateTimeSchema,
});
export type OrderDispatch = z.infer<typeof orderDispatchSchema>;

/**
 * The customer-supplied edits a change request may propose (REQ 21). Commercial
 * facts are deliberately absent: an approved amendment never touches the frozen
 * snapshot, only the customer's own details.
 */
export const amendableContactPatchSchema = z.object({
  fullName: z.string().min(1).max(160).optional(),
  email: z.email().max(254).optional(),
  phone: z.string().min(1).max(32).optional(),
  countryCode: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
});
export type AmendableContactPatch = z.infer<typeof amendableContactPatchSchema>;

export const amendableFormPatchSchema = z.object({
  currentCountry: z.string().min(1).max(120).optional(),
  destination: z.string().min(1).max(120).optional(),
  arrivalDate: z.string().min(1).max(64).optional(),
});
export type AmendableFormPatch = z.infer<typeof amendableFormPatchSchema>;

function hasAtLeastOneKey(value: {
  contact?: Record<string, unknown>;
  form?: Record<string, unknown>;
}): boolean {
  return Object.keys(value.contact ?? {}).length + Object.keys(value.form ?? {}).length > 0;
}

export const orderChangeRequestPatchSchema = z
  .object({
    contact: amendableContactPatchSchema.optional(),
    form: amendableFormPatchSchema.optional(),
  })
  .refine(hasAtLeastOneKey, 'A change request must propose at least one field.');
export type OrderChangeRequestPatch = z.infer<typeof orderChangeRequestPatchSchema>;

export const orderChangeRequestStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export type OrderChangeRequestStatus = z.infer<typeof orderChangeRequestStatusSchema>;

export const orderChangeRequestSchema = z.object({
  id: z.uuid(),
  requestedBy: z.uuid(),
  status: orderChangeRequestStatusSchema,
  patch: orderChangeRequestPatchSchema,
  note: z.string().max(2000).nullable(),
  resolvedBy: z.uuid().nullable(),
  resolvedAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
});
export type OrderChangeRequest = z.infer<typeof orderChangeRequestSchema>;

/**
 * A staff adjustment recorded as its own audited row (REQ 14). The submitted
 * order envelope — snapshot, payload, terms — is immutable (invariant 5), so an
 * approved change is stored here with the exact before/after values rather than
 * rewritten into the frozen record.
 */
export const orderAmendmentSchema = z.object({
  id: z.uuid(),
  actorId: z.uuid(),
  reason: z.string().min(1).max(2000),
  patch: orderChangeRequestPatchSchema,
  before: z.record(z.string(), z.unknown()),
  after: z.record(z.string(), z.unknown()),
  createdAt: isoDateTimeSchema,
});
export type OrderAmendment = z.infer<typeof orderAmendmentSchema>;

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
  customer: orderCustomerSchema,
  source: z.string().min(1).max(160),
  submittedAt: isoDateTimeSchema,
  snapshot: orderSnapshotSchema,
  payload: versionedFormSchema(z.record(z.string(), z.unknown())),
  // Consent captured at submission (invariant 11). Staff-only: never exposed on
  // the public summary. Nullable for orders that predate the consent column.
  consent: orderConsentSchema.nullable(),
  history: z.array(orderHistoryEntrySchema),
  audit: z.array(orderAuditEntrySchema),
  notes: z.array(orderNoteSchema),
  reminders: z.array(orderReminderSchema),
  changeRequests: z.array(orderChangeRequestSchema),
  amendments: z.array(orderAmendmentSchema),
  payments: z.array(orderPaymentSchema),
  dispatch: orderDispatchSchema.nullable(),
  /**
   * The transitions this actor may perform on this order right now, computed by
   * the backend from the transition map, the operational-transition gate and the
   * partnered-activation rule. The UI renders exactly these and no others.
   */
  allowedTransitions: z.array(orderFulfilmentStatusSchema),
  capabilities: orderCapabilitiesSchema,
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
 * transaction (invariant 10) — no separate endpoint. Notes, reminders,
 * assignment, archive, payments and change requests each have their own
 * endpoint so the UI never assembles business logic.
 */
const withExpectedVersion = { expectedVersion: z.int().nonnegative() };

export const patchWorkspaceOrderRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('transition'),
    toStatus: orderFulfilmentStatusSchema,
    reason: z.string().min(1).max(2000).optional(),
    ...withExpectedVersion,
  }),
  z.object({
    action: z.literal('dispatch'),
    courier: z.string().min(1).max(120),
    trackingReference: z.string().min(1).max(120).optional(),
    dispatchDate: isoDateTimeSchema.optional(),
    ...withExpectedVersion,
  }),
  z.object({ action: z.literal('activate'), ...withExpectedVersion }),
  z.object({
    action: z.literal('cancel'),
    reason: z.string().min(1).max(2000),
    ...withExpectedVersion,
  }),
]);
export type PatchWorkspaceOrderRequest = z.infer<typeof patchWorkspaceOrderRequestSchema>;

export const patchWorkspaceOrderResponseSchema = z.object({
  order: orderDetailSchema,
  requestId: requestIdSchema,
});
export type PatchWorkspaceOrderResponse = z.infer<typeof patchWorkspaceOrderResponseSchema>;

/** Assign or unassign one order; the assignee must be an active member of this workspace. */
export const patchOrderAssigneeRequestSchema = z.object({
  assigneeId: z.uuid().nullable(),
  ...withExpectedVersion,
});
export type PatchOrderAssigneeRequest = z.infer<typeof patchOrderAssigneeRequestSchema>;

/** Archive is a visibility action, never deletion (REQ 19). */
export const patchOrderArchiveRequestSchema = z.object({
  archived: z.boolean(),
  ...withExpectedVersion,
});
export type PatchOrderArchiveRequest = z.infer<typeof patchOrderArchiveRequestSchema>;

/** Bulk assignment from the list; each order carries its own version and result. */
export const bulkAssignOrdersRequestSchema = z.object({
  assigneeId: z.uuid().nullable(),
  orders: z
    .array(z.object({ orderId: z.uuid(), expectedVersion: z.int().nonnegative() }))
    .min(1)
    .max(100),
});
export type BulkAssignOrdersRequest = z.infer<typeof bulkAssignOrdersRequestSchema>;

export const bulkAssignOrderResultSchema = z.object({
  orderId: z.uuid(),
  status: z.enum(['assigned', 'version_conflict', 'not_found']),
  version: z.int().positive().optional(),
});
export type BulkAssignOrderResult = z.infer<typeof bulkAssignOrderResultSchema>;

export const bulkAssignOrdersResponseSchema = z.object({
  results: z.array(bulkAssignOrderResultSchema),
  requestId: requestIdSchema,
});
export type BulkAssignOrdersResponse = z.infer<typeof bulkAssignOrdersResponseSchema>;

export const createOrderNoteRequestSchema = z.object({
  body: z.string().min(1).max(2000),
});
export type CreateOrderNoteRequest = z.infer<typeof createOrderNoteRequestSchema>;

export const listOrderNotesResponseSchema = z.object({
  notes: z.array(orderNoteSchema),
  requestId: requestIdSchema,
});
export type ListOrderNotesResponse = z.infer<typeof listOrderNotesResponseSchema>;

export const createOrderReminderRequestSchema = z.object({
  remindAt: isoDateTimeSchema,
  note: z.string().min(1).max(2000).optional(),
});
export type CreateOrderReminderRequest = z.infer<typeof createOrderReminderRequestSchema>;

export const createOrderReminderResponseSchema = z.object({
  reminder: orderReminderSchema,
  requestId: requestIdSchema,
});
export type CreateOrderReminderResponse = z.infer<typeof createOrderReminderResponseSchema>;

export const deleteOrderReminderResponseSchema = z.object({
  reminderId: z.uuid(),
  requestId: requestIdSchema,
});
export type DeleteOrderReminderResponse = z.infer<typeof deleteOrderReminderResponseSchema>;

export const createOrderChangeRequestRequestSchema = z.object({
  patch: orderChangeRequestPatchSchema,
  note: z.string().min(1).max(2000).optional(),
});
export type CreateOrderChangeRequestRequest = z.infer<typeof createOrderChangeRequestRequestSchema>;

export const createOrderChangeRequestResponseSchema = z.object({
  changeRequest: orderChangeRequestSchema,
  requestId: requestIdSchema,
});
export type CreateOrderChangeRequestResponse = z.infer<
  typeof createOrderChangeRequestResponseSchema
>;

/**
 * Resolving a change request. Approval writes exactly one audited amendment row
 * and applies the proposal in the same transaction as the order's version
 * check; rejection only records the resolution. The decision is the endpoint
 * (`/approve` or `/reject`), not a body field.
 */
export const resolveOrderChangeRequestRequestSchema = z.object({
  reason: z.string().min(1).max(2000).optional(),
  ...withExpectedVersion,
});
export type ResolveOrderChangeRequestRequest = z.infer<
  typeof resolveOrderChangeRequestRequestSchema
>;

export const resolveOrderChangeRequestResponseSchema = z.object({
  order: orderDetailSchema,
  requestId: requestIdSchema,
});
export type ResolveOrderChangeRequestResponse = z.infer<
  typeof resolveOrderChangeRequestResponseSchema
>;

/** Record a manual payment (Phase A) against the frozen snapshot amount. */
export const recordOrderPaymentRequestSchema = z.object({
  paymentState: paymentStateSchema,
  method: z.string().min(1).max(120).optional(),
  reference: z.string().min(1).max(120).optional(),
  amountMinor: z.int().nonnegative().optional(),
  ...withExpectedVersion,
});
export type RecordOrderPaymentRequest = z.infer<typeof recordOrderPaymentRequestSchema>;

export const recordOrderPaymentResponseSchema = z.object({
  order: orderDetailSchema,
  requestId: requestIdSchema,
});
export type RecordOrderPaymentResponse = z.infer<typeof recordOrderPaymentResponseSchema>;
