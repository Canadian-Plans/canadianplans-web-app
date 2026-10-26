import { z } from 'zod';

import { emailSchema, isoDateTimeSchema, moneySchema, requestIdSchema } from './common';
import { productTypeSchema } from './regions';
import {
  deliveryStateSchema,
  documentChecklistKeySchema,
  documentMediaTypeSchema,
  MAX_DOCUMENT_BYTES,
  orderFulfilmentStatusSchema,
  paymentStateSchema,
} from './domain';
import {
  amendableFieldKeySchema,
  orderChangeRequestPatchSchema,
  orderChangeRequestStatusSchema,
} from './workspace-orders';

/**
 * Customer order tracking (T22, REQ 05/21, IMPLEMENTATION_PLAN §5). The
 * customer proves an email with a six-digit code and then sees every order of
 * that email on the credential's own website (workspace), never another brand.
 *
 * Paths, all under `/api/v1/website/tracking`:
 * - `POST /otp`, `POST /verify` — email only; the code request answers the
 *   same neutral acknowledgement whether or not the email has orders.
 * - `GET /orders`, `GET /orders/:reference` — the verified email's orders.
 * - `POST /orders/:reference/change-requests` — a pending change request that
 *   staff approve or reject (the submitted order is never edited, REQ 14).
 * - `POST /orders/:reference/info-requests/:infoRequestId/response` — answers
 *   a staff request for missing details, again as a pending change request.
 * - `POST /orders/:reference/uploads/intents` and
 *   `POST /orders/:reference/uploads/:uploadId/finalize` — the same signed,
 *   signature-verified upload pipeline the order form uses.
 *
 * The 30-minute grant (`x-customer-grant`) is bound to workspace + verified
 * email; each call re-resolves the order by reference **and** email, so one
 * email can never reach another's order. Codes and grants are never logged.
 */

/** A scoped 30-minute grant issued after a code verifies. */
export const trackingGrantSchema = z.object({
  token: z.string().min(1),
  expiresAt: isoDateTimeSchema,
});
export type TrackingGrant = z.infer<typeof trackingGrantSchema>;

/** Request a six-digit code for an email. */
export const trackingOtpRequestSchema = z.object({
  email: emailSchema,
});
export type TrackingOtpRequest = z.infer<typeof trackingOtpRequestSchema>;

/** Verify a six-digit code; success consumes it and returns a grant. */
export const trackingVerifyRequestSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, 'six-digit code'),
});
export type TrackingVerifyRequest = z.infer<typeof trackingVerifyRequestSchema>;

/** Neutral acknowledgement, identical whether or not the recipient exists. */
export const trackingOtpResponseSchema = z.object({
  status: z.literal('challenge_sent'),
  requestId: requestIdSchema,
});
export type TrackingOtpResponse = z.infer<typeof trackingOtpResponseSchema>;

export const trackingVerifyResponseSchema = z.object({
  status: z.literal('verified'),
  grant: trackingGrantSchema,
  requestId: requestIdSchema,
});
export type TrackingVerifyResponse = z.infer<typeof trackingVerifyResponseSchema>;

/** An order reference as it appears in a path (`CP-...`). */
export const trackingOrderReferenceSchema = z.string().trim().min(1).max(32);

/**
 * Where a customer's document stands. `received` is attached and
 * signature-verified but not yet reviewed; `needs_replacement` means staff
 * rejected it and a new upload is wanted. Staff notes are never exposed.
 */
export const trackingDocumentStatusSchema = z.enum(['received', 'approved', 'needs_replacement']);
export type TrackingDocumentStatus = z.infer<typeof trackingDocumentStatusSchema>;

export const trackingDocumentSchema = z.object({
  id: z.uuid(),
  documentType: documentChecklistKeySchema,
  status: trackingDocumentStatusSchema,
  uploadedAt: isoDateTimeSchema,
});
export type TrackingDocument = z.infer<typeof trackingDocumentSchema>;

/** A pending staff request for missing details, as the customer sees it. */
export const trackingInfoRequestSchema = z.object({
  id: z.uuid(),
  fields: z.array(amendableFieldKeySchema).min(1),
  message: z.string().max(2000).nullable(),
  createdAt: isoDateTimeSchema,
});
export type TrackingInfoRequest = z.infer<typeof trackingInfoRequestSchema>;

/** A change request on the order: which fields and its state, never the proposed values. */
export const trackingChangeRequestSchema = z.object({
  id: z.uuid(),
  status: orderChangeRequestStatusSchema,
  fields: z.array(amendableFieldKeySchema),
  createdAt: isoDateTimeSchema,
});
export type TrackingChangeRequest = z.infer<typeof trackingChangeRequestSchema>;

/**
 * One order in the verified email's list. `actionNeeded` is true while a
 * required document is outstanding or staff have asked for details.
 */
export const trackingOrderSummarySchema = z.object({
  reference: trackingOrderReferenceSchema,
  productTitle: z.string().min(1).max(200),
  offerName: z.string().min(1).max(200),
  productType: productTypeSchema,
  fulfilmentStatus: orderFulfilmentStatusSchema,
  paymentState: paymentStateSchema,
  deliveryState: deliveryStateSchema,
  actionNeeded: z.boolean(),
  submittedAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type TrackingOrderSummary = z.infer<typeof trackingOrderSummarySchema>;

export const trackingOrdersResponseSchema = z.object({
  orders: z.array(trackingOrderSummarySchema),
  requestId: requestIdSchema,
});
export type TrackingOrdersResponse = z.infer<typeof trackingOrdersResponseSchema>;

/**
 * Everything a verified customer may see about one of their own orders: the
 * frozen plan and price, the three independent state dimensions (invariant 9),
 * their own contact details (current, after any approved amendment) and what
 * is still needed from them. No internal notes, staff names or audit rows.
 */
export const trackingOrderDetailSchema = trackingOrderSummarySchema.extend({
  billingPeriod: z.enum(['month', '30_days', '90_days']),
  price: z.object({
    recurring: moneySchema,
    total: moneySchema,
    amountPayableToday: moneySchema,
    paymentRequired: z.boolean(),
  }),
  trackingReference: z.string().max(120).nullable(),
  customer: z.object({
    fullName: z.string().max(160).nullable(),
    email: z.string().max(254).nullable(),
    phone: z.string().max(32).nullable(),
    countryCode: z.string().max(2).nullable(),
  }),
  details: z.object({
    currentCountry: z.string().max(120).nullable(),
    destination: z.string().max(120).nullable(),
    arrivalDate: z.string().max(64).nullable(),
  }),
  documentChecklist: z.array(documentChecklistKeySchema),
  documentsRequired: z.array(documentChecklistKeySchema),
  documents: z.array(trackingDocumentSchema),
  infoRequests: z.array(trackingInfoRequestSchema),
  changeRequests: z.array(trackingChangeRequestSchema),
});
export type TrackingOrderDetail = z.infer<typeof trackingOrderDetailSchema>;

export const trackingOrderResponseSchema = z.object({
  order: trackingOrderDetailSchema,
  requestId: requestIdSchema,
});
export type TrackingOrderResponse = z.infer<typeof trackingOrderResponseSchema>;

/** A customer-proposed change to their own details; it waits for staff approval. */
export const trackingChangeRequestRequestSchema = z.object({
  patch: orderChangeRequestPatchSchema,
  note: z.string().trim().min(1).max(2000).optional(),
});
export type TrackingChangeRequestRequest = z.infer<typeof trackingChangeRequestRequestSchema>;

/**
 * The customer's answer to a staff info request. The patch must supply exactly
 * the requested fields; it becomes a pending change request like any other.
 */
export const trackingInfoResponseRequestSchema = trackingChangeRequestRequestSchema;
export type TrackingInfoResponseRequest = z.infer<typeof trackingInfoResponseRequestSchema>;

export const trackingChangeRequestResponseSchema = z.object({
  changeRequest: trackingChangeRequestSchema,
  requestId: requestIdSchema,
});
export type TrackingChangeRequestResponse = z.infer<typeof trackingChangeRequestResponseSchema>;

/**
 * Requests a signed PUT for one document on the order. `documentType` must be
 * on the order's frozen checklist; the declared type and size are bounded up
 * front but finalize verifies the actual bytes (invariant 8).
 */
export const trackingUploadIntentRequestSchema = z.object({
  documentType: documentChecklistKeySchema,
  fileName: z.string().min(1).max(255),
  contentType: documentMediaTypeSchema,
  sizeBytes: z.int().positive().max(MAX_DOCUMENT_BYTES),
});
export type TrackingUploadIntentRequest = z.infer<typeof trackingUploadIntentRequestSchema>;

export const trackingUploadFinalizeResponseSchema = z.object({
  document: trackingDocumentSchema,
  requestId: requestIdSchema,
});
export type TrackingUploadFinalizeResponse = z.infer<typeof trackingUploadFinalizeResponseSchema>;
