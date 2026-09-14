import { z } from 'zod';

import { emailSchema, isoDateTimeSchema, requestIdSchema } from './common';
import { deliveryStateSchema, orderFulfilmentStatusSchema, paymentStateSchema } from './domain';

/**
 * Customer order tracking — `POST /tracking/otp`, `GET /tracking`. Caller: a
 * verified customer grant (the storefront credential carries the request; the
 * grant is bound to workspace + order + normalized email). Public responses are
 * identical for unknown recipients so existence is not leaked (§5). Codes and
 * grants are never logged. No handler here.
 */

/** A scoped 30-minute grant issued after a code verifies (§5). */
export const trackingGrantSchema = z.object({
  token: z.string().min(1),
  expiresAt: isoDateTimeSchema,
});
export type TrackingGrant = z.infer<typeof trackingGrantSchema>;

/**
 * Request a one-time code, or verify one. Both bind to a normalized email and
 * an order reference. Verify carries the six-digit code; success consumes it
 * and returns a grant.
 */
export const trackingOtpRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('request'),
    email: emailSchema,
    orderReference: z.string().min(1).max(32),
  }),
  z.object({
    action: z.literal('verify'),
    email: emailSchema,
    orderReference: z.string().min(1).max(32),
    code: z.string().regex(/^\d{6}$/, 'six-digit code'),
  }),
]);
export type TrackingOtpRequest = z.infer<typeof trackingOtpRequestSchema>;

/**
 * Neutral acknowledgement (`challenge_sent`) — identical whether or not the
 * recipient exists — or, on a successful verify, the issued grant.
 */
export const trackingOtpResponseSchema = z.union([
  z.object({ status: z.literal('challenge_sent'), requestId: requestIdSchema }),
  z.object({
    status: z.literal('verified'),
    grant: trackingGrantSchema,
    requestId: requestIdSchema,
  }),
]);
export type TrackingOtpResponse = z.infer<typeof trackingOtpResponseSchema>;

/** The order state a verified customer may see — no PII beyond what they already hold. */
export const trackingStatusResponseSchema = z.object({
  reference: z.string().min(1).max(32),
  fulfilmentStatus: orderFulfilmentStatusSchema,
  paymentState: paymentStateSchema,
  deliveryState: deliveryStateSchema,
  updatedAt: isoDateTimeSchema,
  requestId: requestIdSchema,
});
export type TrackingStatusResponse = z.infer<typeof trackingStatusResponseSchema>;
