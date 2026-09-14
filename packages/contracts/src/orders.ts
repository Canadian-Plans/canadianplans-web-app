import { z } from 'zod';

import { isoDateTimeSchema, moneySchema, requestIdSchema, versionedFormSchema } from './common';
import {
  archiveStateSchema,
  deliveryStateSchema,
  orderFulfilmentStatusSchema,
  paymentStateSchema,
} from './domain';

/**
 * Order submission — `POST /orders`. Caller: website credential
 * (`orders:create`) + draft grant + idempotency key (the `Idempotency-Key`
 * header, not a body field). Submission freezes a full commercial snapshot
 * (invariant 5) and is idempotent per scoped key (invariant 6). No handler
 * here; A2 implements the transaction.
 */

/** Consent captured at submission (CASL — invariant 11). Terms/marketing recorded with versions. */
export const orderConsentSchema = z.object({
  termsVersion: z.string().min(1).max(64),
  marketingOptIn: z.boolean(),
  marketingConsentVersion: z.string().min(1).max(64).optional(),
});
export type OrderConsent = z.infer<typeof orderConsentSchema>;

/**
 * The four independent order dimensions (invariant 9). They never collapse
 * into one field. `recordVersion` is the optimistic-concurrency token staff
 * transitions must echo (§4 — "expected record version").
 */
export const orderSummarySchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  reference: z.string().min(1).max(32),
  fulfilmentStatus: orderFulfilmentStatusSchema,
  paymentState: paymentStateSchema,
  deliveryState: deliveryStateSchema,
  archiveState: archiveStateSchema,
  total: moneySchema,
  amountPayableToday: moneySchema,
  recordVersion: z.int().nonnegative(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type OrderSummary = z.infer<typeof orderSummarySchema>;

/**
 * The final submission. Carries the accepted quote, the terms version, the
 * versioned form payload and consent. No prices — payment amounts derive only
 * from the frozen snapshot the backend builds from the quote (invariant 4/5).
 */
export const submitOrderRequestSchema = z.object({
  quoteId: z.uuid(),
  termsVersion: z.string().min(1).max(64),
  form: versionedFormSchema(z.record(z.string(), z.unknown())),
  consent: orderConsentSchema,
});
export type SubmitOrderRequest = z.infer<typeof submitOrderRequestSchema>;

export const submitOrderResponseSchema = z.object({
  order: orderSummarySchema,
  requestId: requestIdSchema,
});
export type SubmitOrderResponse = z.infer<typeof submitOrderResponseSchema>;
