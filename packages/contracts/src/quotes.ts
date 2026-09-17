import { z } from 'zod';

import {
  currencyCodeSchema,
  isoDateTimeSchema,
  moneySchema,
  requestIdSchema,
  versionedFormSchema,
} from './common';
import { documentChecklistKeySchema } from './domain';

/**
 * Priced quotes — `POST /quotes`. Caller: website credential (`quotes:create`).
 * The request never carries a price; the backend re-reads the authoritative
 * offer and returns server-computed charges (invariant 4). No handler here.
 */

/** One line of a quote's price breakdown. `amount` may be negative for a discount. */
export const chargeComponentSchema = z.object({
  code: z.string().min(1).max(64),
  label: z.string().min(1).max(160),
  amount: moneySchema,
});
export type ChargeComponent = z.infer<typeof chargeComponentSchema>;

/**
 * A short-lived, server-authoritative quote tied to one immutable offer
 * version (glossary; PLATFORM_CONTEXT.md §6). Carries the charge breakdown,
 * document checklist, payment setting, terms version and expiry.
 */
export const quoteSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  productId: z.uuid(),
  offerVersionId: z.uuid(),
  currency: currencyCodeSchema,
  charges: z.array(chargeComponentSchema),
  total: moneySchema,
  amountPayableToday: moneySchema,
  paymentRequired: z.boolean(),
  documentChecklist: z.array(documentChecklistKeySchema),
  termsVersion: z.string().min(1).max(64),
  createdAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema,
});
export type Quote = z.infer<typeof quoteSchema>;

/**
 * Requests a quote for a product/offer selection. Prices are never submitted
 * by the caller; only the selection and the (versioned) form are. The draft is
 * identified by its grant header, the workspace by the credential.
 */
export const createQuoteRequestSchema = z.object({
  leadId: z.uuid(),
  productId: z.uuid(),
  form: versionedFormSchema(z.record(z.string(), z.unknown())).optional(),
});
export type CreateQuoteRequest = z.infer<typeof createQuoteRequestSchema>;

export const createQuoteResponseSchema = z.object({
  quote: quoteSchema,
  requestId: requestIdSchema,
});
export type CreateQuoteResponse = z.infer<typeof createQuoteResponseSchema>;
