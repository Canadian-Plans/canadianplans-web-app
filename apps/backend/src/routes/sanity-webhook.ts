import { Router } from 'express';
import { z } from 'zod';

import { sendWebsiteError } from '../http/website-errors.js';
import { sendDomainError } from '../http/domain-errors.js';
import { loadMachineRegistry, type MachineRegistry } from '../machines/registry.js';
import { DatabaseCatalogueStore, type CatalogueStore } from '../catalogue/store.js';

const sanityDeliverySchema = z.object({
  documentId: z.string().min(1).max(512),
});

export interface SanityWebhookDependencies {
  registry: MachineRegistry;
  store: Pick<CatalogueStore, 'acceptEvent'>;
}

export function createDefaultSanityWebhookDependencies(): SanityWebhookDependencies {
  return { registry: loadMachineRegistry(), store: new DatabaseCatalogueStore() };
}

function requiredHeader(value: string | undefined): string | undefined {
  if (!value || value.length > 1_024) return undefined;
  return value;
}

export function createSanityWebhookRouter(dependencies: SanityWebhookDependencies): Router {
  const router = Router();
  router.post('/', async (req, res) => {
    if (!Buffer.isBuffer(req.body)) {
      sendWebsiteError(res, req.id, 'machine_signature_invalid', 401);
      return;
    }
    const selector = requiredHeader(req.get('x-webhook-selector'));
    const providerAccount = requiredHeader(req.get('x-provider-account'));
    const signature = requiredHeader(req.get('sanity-webhook-signature'));
    const deliveryId = requiredHeader(req.get('idempotency-key'));
    if (!selector || !providerAccount || !signature || !deliveryId) {
      sendWebsiteError(res, req.id, 'machine_unknown', 401);
      return;
    }

    const resolution = dependencies.registry.resolveWebhook({
      selector,
      expectedProvider: 'sanity',
      providerAccount,
      signature,
      rawBody: req.body,
    });
    if (!resolution.ok) {
      sendWebsiteError(res, req.id, resolution.reason, 401);
      return;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(req.body.toString('utf8'));
    } catch {
      sendWebsiteError(res, req.id, 'machine_signature_invalid', 401);
      return;
    }
    const inboxPayload = z.record(z.string(), z.unknown()).safeParse(payload);
    const parsed = sanityDeliverySchema.safeParse(payload);
    if (!parsed.success || !inboxPayload.success) {
      sendWebsiteError(res, req.id, 'machine_signature_invalid', 401);
      return;
    }

    const transactionTime = req.get('sanity-transaction-time');
    const occurredAt = transactionTime ? new Date(transactionTime) : undefined;
    try {
      const accepted = await dependencies.store.acceptEvent({
        workspaceId: resolution.workspaceId,
        selector: resolution.selector,
        providerAccount: resolution.providerAccount,
        deliveryId,
        documentId: parsed.data.documentId,
        payload: inboxPayload.data,
        occurredAt: occurredAt && Number.isFinite(occurredAt.getTime()) ? occurredAt : undefined,
      });
      res.status(200).json({ received: true, eventId: accepted.eventId, requestId: req.id });
    } catch {
      sendDomainError(res, req.id, 'webhook_rejected', 500);
    }
  });
  return router;
}
