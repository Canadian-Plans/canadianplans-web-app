import { z } from 'zod';

import { commercialOfferSchema } from './catalogue';
import { isoDateTimeSchema, requestIdSchema } from './common';

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
