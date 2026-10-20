import { z } from 'zod';

import { requestIdSchema } from './common';
import { consentVersionSchema } from './leads';
import { productTypeSchema, provinceCodeSchema } from './regions';

/**
 * Wish list for a province we do not serve yet — `POST /api/v1/website/region-waitlist`.
 * Caller: website credential (`leads:write`). The email is stored for the owner to
 * contact later; the response never says whether the email was already on the list,
 * so the form cannot be used to probe for addresses.
 */
export const joinRegionWaitlistRequestSchema = z.object({
  province: provinceCodeSchema,
  email: z.email().max(254),
  interest: productTypeSchema.optional(),
  consentVersion: consentVersionSchema,
});
export type JoinRegionWaitlistRequest = z.infer<typeof joinRegionWaitlistRequestSchema>;

export const joinRegionWaitlistResponseSchema = z.object({
  requestId: requestIdSchema,
});
export type JoinRegionWaitlistResponse = z.infer<typeof joinRegionWaitlistResponseSchema>;
