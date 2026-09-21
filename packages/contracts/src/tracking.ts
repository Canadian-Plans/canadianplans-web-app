import { z } from 'zod';

import { emailSchema, isoDateTimeSchema, requestIdSchema } from './common';
import {
  deliveryStateSchema,
  documentChecklistKeySchema,
  orderFulfilmentStatusSchema,
  paymentStateSchema,
} from './domain';

/**
 * Customer order tracking (T22, REQ 05, IMPLEMENTATION_PLAN §5). Paths:
 * `POST /website/tracking/otp`, `POST /website/tracking/verify`,
 * `GET /website/tracking`. The storefront credential authenticates the request;
 * the granted response is bound to workspace + order + normalized email. Public
 * responses are identical for unknown recipients so existence is not leaked.
 * Codes and grants are never logged.
 */

/** A scoped 30-minute grant issued after a code verifies. */
export const trackingGrantSchema = z.object({
  token: z.string().min(1),
  expiresAt: isoDateTimeSchema,
});
export type TrackingGrant = z.infer<typeof trackingGrantSchema>;

/** Request a six-digit code for a reference + email. */
export const trackingOtpRequestSchema = z.object({
  email: emailSchema,
  orderReference: z.string().trim().min(1).max(32),
});
export type TrackingOtpRequest = z.infer<typeof trackingOtpRequestSchema>;

/** Verify a six-digit code; success consumes it and returns a grant. */
export const trackingVerifyRequestSchema = z.object({
  email: emailSchema,
  orderReference: z.string().trim().min(1).max(32),
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

/**
 * The order state a verified customer may see. No internal notes or staff
 * names. `documentsRequired` is the checklist still outstanding for the order.
 */
export const trackingStatusResponseSchema = z.object({
  reference: z.string().min(1).max(32),
  fulfilmentStatus: orderFulfilmentStatusSchema,
  paymentState: paymentStateSchema,
  deliveryState: deliveryStateSchema,
  trackingReference: z.string().max(120).nullable(),
  documentsRequired: z.array(documentChecklistKeySchema),
  updatedAt: isoDateTimeSchema,
  requestId: requestIdSchema,
});
export type TrackingStatusResponse = z.infer<typeof trackingStatusResponseSchema>;
