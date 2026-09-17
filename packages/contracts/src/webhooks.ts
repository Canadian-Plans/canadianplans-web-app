import { z } from 'zod';

import { requestIdSchema } from './common';

/**
 * Signed provider webhooks — `POST /webhooks/:provider`. Caller: a verified
 * machine identity (HMAC signature) resolved through the server-only registry
 * (PLATFORM_CONTEXT.md §4b). The URL `provider` selector is untrusted until the
 * mapped signature verifies. Durable inbox — the body is stored before any
 * processing. No handler here.
 */

/** Known provider selectors. Unknown/revoked selectors fail closed at the handler. */
export const webhookProviderSchema = z.enum(['sanity', 'email']);
export type WebhookProvider = z.infer<typeof webhookProviderSchema>;

/** Signed Sanity projection. `documentId` is only a re-fetch selector, never commercial data. */
export const webhookDeliveryRequestSchema = z
  .object({ documentId: z.string().min(1).max(512) })
  .catchall(z.unknown());
export type WebhookDeliveryRequest = z.infer<typeof webhookDeliveryRequestSchema>;

/** Durable acknowledgement: the event was persisted to the inbox, not that it was processed. */
export const webhookAckResponseSchema = z.object({
  received: z.literal(true),
  eventId: z.uuid(),
  requestId: requestIdSchema,
});
export type WebhookAckResponse = z.infer<typeof webhookAckResponseSchema>;
