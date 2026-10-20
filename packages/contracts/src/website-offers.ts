import { z } from 'zod';

import { commercialOfferSchema } from './catalogue';
import { isoDateTimeSchema, requestIdSchema } from './common';
import { provinceCodeSchema } from './regions';

/**
 * Optional filter for the storefront read: with a province, only offers sold in
 * it (and national offers) come back.
 */
export const listWebsiteOffersQuerySchema = z.object({
  province: provinceCodeSchema.optional(),
});
export type ListWebsiteOffersQuery = z.infer<typeof listWebsiteOffersQuerySchema>;

/**
 * The storefront read of the published catalogue: for each currently available
 * product, the backend product UUID a quote must reference plus the current
 * immutable commercial snapshot. This is public catalogue content scoped to the
 * credential's own workspace, never a tenant record (PLATFORM_CONTEXT §4b).
 */
export const websiteOfferSchema = z.object({
  productId: z.uuid(),
  offerVersionId: z.uuid(),
  lastSyncedAt: isoDateTimeSchema.nullable(),
  commercial: commercialOfferSchema,
});
export type WebsiteOffer = z.infer<typeof websiteOfferSchema>;

export const listWebsiteOffersResponseSchema = z.object({
  offers: z.array(websiteOfferSchema),
  requestId: requestIdSchema,
});
export type ListWebsiteOffersResponse = z.infer<typeof listWebsiteOffersResponseSchema>;
