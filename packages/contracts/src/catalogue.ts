import { z } from 'zod';

import { currencyCodeSchema, isoDateTimeSchema, requestIdSchema } from './common';
import { documentChecklistKeySchema } from './domain';

const boundedTextSchema = z.string().min(1).max(4_000);
const portableTextBlockSchema = z.record(z.string(), z.unknown());

/**
 * The exact validated commercial payload copied into an immutable offer
 * version. Provider metadata (_id/_rev) deliberately lives outside it so a
 * non-commercial Sanity revision does not create a new version.
 */
export const commercialOfferSchema = z.object({
  productKey: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9][a-z0-9-]*$/),
  productTitle: z.string().min(1).max(200),
  productType: z.literal('sim'),
  offerName: z.string().min(1).max(200),
  currency: currencyCodeSchema,
  recurringChargeAmountMinor: z.int().nonnegative(),
  oneTimeFees: z
    .array(
      z.object({
        label: z.string().min(1).max(160),
        amountMinor: z.int().nonnegative(),
      }),
    )
    .max(32),
  amountPayableTodayMinor: z.int().nonnegative(),
  paymentRequired: z.boolean(),
  documentChecklist: z.array(documentChecklistKeySchema).max(32),
  eligibility: boundedTextSchema,
  availability: boundedTextSchema,
  billingParty: z.string().min(1).max(200),
  contractTerms: z.array(portableTextBlockSchema).min(1).max(256),
  termsVersion: z.string().min(1).max(64),
  specs: z.object({
    carrier: z.string().min(1).max(160),
    dataAllowance: z.string().min(1).max(160),
    speed: z.string().max(160).optional(),
    addressConditions: z.string().max(1_000).optional(),
    notes: z.string().max(4_000).optional(),
  }),
});
export type CommercialOffer = z.infer<typeof commercialOfferSchema>;

/** Published-provider provenance plus the exact commercial payload. */
export const publishedOfferSchema = z.object({
  documentId: z.string().min(1).max(512),
  revisionId: z.string().min(1).max(512),
  commercial: commercialOfferSchema,
});
export type PublishedOffer = z.infer<typeof publishedOfferSchema>;

export const catalogueOfferStatusSchema = z.object({
  productId: z.uuid(),
  productKey: z.string(),
  available: z.boolean(),
  offerVersionId: z.uuid().nullable(),
  contentHash: z.string().nullable(),
  offerName: z.string().nullable(),
  currency: currencyCodeSchema.nullable(),
  cmsRevisionId: z.string().nullable(),
  lastSyncedAt: isoDateTimeSchema.nullable(),
});
export type CatalogueOfferStatus = z.infer<typeof catalogueOfferStatusSchema>;

export const catalogueSyncErrorSchema = z.object({
  eventId: z.uuid(),
  documentId: z.string(),
  errorCode: z.string(),
  occurredAt: isoDateTimeSchema,
});
export type CatalogueSyncError = z.infer<typeof catalogueSyncErrorSchema>;

export const catalogueStatusResponseSchema = z.object({
  sync: z.object({
    lastAttemptAt: isoDateTimeSchema.nullable(),
    lastSuccessAt: isoDateTimeSchema.nullable(),
    lastErrorCode: z.string().nullable(),
  }),
  offers: z.array(catalogueOfferStatusSchema),
  errors: z.array(catalogueSyncErrorSchema),
  requestId: requestIdSchema,
});
export type CatalogueStatusResponse = z.infer<typeof catalogueStatusResponseSchema>;
