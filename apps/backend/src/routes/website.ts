import { Router, type Request } from 'express';
import { rateLimitHit, resolveWebsiteCredential } from '@canadian-plans/db';
import {
  createLeadRequestSchema,
  createQuoteRequestSchema,
  submitOrderRequestSchema,
  updateLeadRequestSchema,
} from '@canadian-plans/contracts';
import { z } from 'zod';

import { sendDomainError } from '../http/domain-errors.js';
import { CatalogueService, providerResolverFromRegistry } from '../catalogue/service.js';
import { loadQuoteWithdrawalPolicy } from '../catalogue/policy.js';
import { DatabaseCatalogueStore } from '../catalogue/store.js';
import { DatabaseLeadStore, type LeadStore } from '../leads/store.js';
import { parseDraftGrantToken } from '../leads/token.js';
import { createTurnstileVerifier } from '../website/turnstile.js';
import { loadMachineRegistry } from '../machines/registry.js';
import { OrderService } from '../orders/service.js';
import { DatabaseOrderStore } from '../orders/store.js';
import {
  requireScope,
  requireWebsiteCredential,
  websiteContext,
  type WebsiteAuthDependencies,
} from '../website/session.js';

export interface WebsiteRouteDependencies {
  auth: WebsiteAuthDependencies;
  leads: { store: LeadStore };
  quotes?: { service: Pick<CatalogueService, 'createQuote'> };
  orders?: { service: Pick<OrderService, 'submit'> };
}

export function createDefaultWebsiteRouteDependencies(): WebsiteRouteDependencies {
  const verify = createTurnstileVerifier({
    secret: process.env.TURNSTILE_SECRET_KEY,
    hostname: process.env.TURNSTILE_HOSTNAME,
    action: 'lead-submit',
  });
  const registry = loadMachineRegistry();
  return {
    auth: {
      resolveCredential: resolveWebsiteCredential,
      rateLimit: rateLimitHit,
      botCheck: (req) => verify(req.get('x-turnstile-token')),
    },
    leads: { store: new DatabaseLeadStore() },
    quotes: {
      service: new CatalogueService(
        new DatabaseCatalogueStore(),
        providerResolverFromRegistry(registry),
        loadQuoteWithdrawalPolicy(),
      ),
    },
    orders: {
      service: new OrderService(new DatabaseOrderStore(), loadQuoteWithdrawalPolicy()),
    },
  };
}

/** Exact T10 public path (`POST /api/v1/quotes`) with website authentication. */
export function createQuoteRouter(dependencies: WebsiteRouteDependencies): Router {
  const router = Router();
  const quoteDependencies = dependencies.quotes;
  if (!quoteDependencies) return router;
  router.post(
    '/quotes',
    requireWebsiteCredential(dependencies.auth),
    requireScope('quotes:create'),
    async (req, res) => {
      const body = createQuoteRequestSchema.safeParse(req.body);
      const grantToken = requireDraftGrant(req);
      if (!body.success) {
        sendDomainError(res, req.id, 'validation_error', 400);
        return;
      }
      if (!grantToken) {
        sendDomainError(res, req.id, 'draft_not_found', 401);
        return;
      }
      try {
        const ctx = websiteContext(req);
        const outcome = await quoteDependencies.service.createQuote({
          workspaceId: ctx.workspaceId,
          actorId: ctx.credentialId,
          draftId: body.data.leadId,
          productId: body.data.productId,
          grantToken,
          requestId: req.id,
        });
        if (outcome.status === 'created') {
          res.status(201).json({ quote: outcome.quote, requestId: req.id });
          return;
        }
        if (outcome.status === 'draft_invalid') {
          sendDomainError(res, req.id, 'draft_not_found', 401);
          return;
        }
        if (outcome.status === 'draft_expired') {
          sendDomainError(res, req.id, 'draft_expired', 401);
          return;
        }
        if (outcome.status === 'product_not_found') {
          sendDomainError(res, req.id, 'not_found', 404);
          return;
        }
        if (outcome.status === 'offer_unavailable') {
          sendDomainError(res, req.id, 'offer_unavailable', 409);
          return;
        }
        if (outcome.status === 'checkout_disabled') {
          sendDomainError(res, req.id, 'priced_checkout_disabled', 503);
          return;
        }
        sendDomainError(res, req.id, 'unpriced_lead_required', 503, {
          canSaveUnpricedLead: true,
        });
      } catch {
        sendDomainError(res, req.id, 'internal_error', 500);
      }
    },
  );
  return router;
}

const idempotencyKeySchema = z
  .string()
  .min(8)
  .max(200)
  .regex(/^[A-Za-z0-9._:-]+$/);

/** Exact T12 public path (`POST /api/v1/orders`) with authenticated draft authority. */
export function createOrderRouter(dependencies: WebsiteRouteDependencies): Router {
  const router = Router();
  const orderDependencies = dependencies.orders;
  if (!orderDependencies) return router;
  router.post(
    '/orders',
    requireWebsiteCredential(dependencies.auth),
    requireScope('orders:create'),
    async (req, res) => {
      const body = submitOrderRequestSchema.safeParse(req.body);
      const grantToken = requireDraftGrant(req);
      const idempotencyKey = idempotencyKeySchema.safeParse(req.get('idempotency-key'));
      if (!body.success || !idempotencyKey.success) {
        sendDomainError(res, req.id, 'validation_error', 400);
        return;
      }
      if (!grantToken) {
        sendDomainError(res, req.id, 'draft_not_found', 401);
        return;
      }

      try {
        const ctx = websiteContext(req);
        const outcome = await orderDependencies.service.submit({
          workspaceId: ctx.workspaceId,
          actorId: ctx.credentialId,
          requestId: req.id,
          grantToken,
          idempotencyKey: idempotencyKey.data,
          body: body.data,
        });
        if (outcome.status === 'created' || outcome.status === 'existing') {
          res.status(201).json({
            order: outcome.order,
            requestId: req.id,
          });
          return;
        }
        if (outcome.status === 'idempotency_conflict') {
          sendDomainError(res, req.id, 'idempotency_conflict', 409);
          return;
        }
        if (outcome.status === 'draft_invalid') {
          sendDomainError(res, req.id, 'draft_not_found', 401);
          return;
        }
        if (outcome.status === 'draft_expired') {
          sendDomainError(res, req.id, 'draft_expired', 401);
          return;
        }
        if (outcome.status === 'quote_not_found') {
          sendDomainError(res, req.id, 'quote_not_found', 404);
          return;
        }
        if (outcome.status === 'quote_expired') {
          sendDomainError(res, req.id, 'quote_expired', 409);
          return;
        }
        if (outcome.status === 'quote_withdrawn') {
          sendDomainError(res, req.id, 'quote_withdrawn', 409);
          return;
        }
        if (outcome.status === 'quote_consumed') {
          sendDomainError(res, req.id, 'quote_consumed', 409);
          return;
        }
        if (outcome.status === 'terms_version_unsupported') {
          sendDomainError(res, req.id, 'terms_version_unsupported', 409);
          return;
        }
        if (outcome.status === 'draft_already_submitted') {
          sendDomainError(res, req.id, 'draft_already_submitted', 409);
          return;
        }
        if (outcome.status === 'checkout_disabled') {
          sendDomainError(res, req.id, 'priced_checkout_disabled', 503);
          return;
        }
        sendDomainError(res, req.id, 'conflict', 409);
      } catch {
        res.setHeader('retry-after', '2');
        sendDomainError(res, req.id, 'persistence_unavailable', 503, { retryable: true });
      }
    },
  );
  return router;
}

function requireDraftGrant(req: Request): string | undefined {
  return parseDraftGrantToken(req.get('x-draft-grant'));
}

/**
 * Public storefront surface. Every route authenticates by service credential
 * only: the workspace and scopes come from the credential, so a `workspace_id`
 * in the body, or a spoofed Host/Origin, cannot change the tenant
 * (PLATFORM_CONTEXT §4b, invariant 2). The website has no human actor, so the
 * credential's own id stands in as `actorId` for its tenant writes (T11).
 */
export function createWebsiteRouter(dependencies: WebsiteRouteDependencies): Router {
  const router = Router();
  router.use(requireWebsiteCredential(dependencies.auth));

  router.post('/leads', requireScope('leads:write'), async (req, res) => {
    const body = createLeadRequestSchema.safeParse(req.body);
    if (!body.success) {
      sendDomainError(res, req.id, 'validation_error', 400);
      return;
    }

    try {
      const ctx = websiteContext(req);
      const result = await dependencies.leads.store.createLead({
        workspaceId: ctx.workspaceId,
        actorId: ctx.credentialId,
        requestId: req.id,
        contact: body.data.contact,
        form: body.data.form,
        productId: body.data.productId,
        attribution: body.data.attribution,
        consentVersion: body.data.consentVersion,
      });
      res.status(201).json({
        lead: result.lead,
        draftGrant: result.grant,
        requestId: req.id,
      });
    } catch {
      sendDomainError(res, req.id, 'internal_error', 500);
    }
  });

  router.patch('/leads/:leadId', requireScope('leads:write'), async (req, res) => {
    const leadId = z.uuid().safeParse(req.params['leadId']);
    const body = updateLeadRequestSchema.safeParse(req.body);
    if (!leadId.success || !body.success) {
      sendDomainError(res, req.id, 'validation_error', 400);
      return;
    }

    const grantToken = requireDraftGrant(req);
    if (!grantToken) {
      sendDomainError(res, req.id, 'draft_not_found', 401);
      return;
    }

    try {
      const ctx = websiteContext(req);
      const outcome = await dependencies.leads.store.updateLead({
        workspaceId: ctx.workspaceId,
        actorId: ctx.credentialId,
        requestId: req.id,
        leadId: leadId.data,
        grantToken,
        contact: body.data.contact,
        form: body.data.form,
        productId: body.data.productId,
        attribution: body.data.attribution,
        consentVersion: body.data.consentVersion,
      });

      if (outcome.status === 'grant_invalid') {
        sendDomainError(res, req.id, 'draft_not_found', 401);
        return;
      }
      if (outcome.status === 'grant_expired') {
        sendDomainError(res, req.id, 'draft_expired', 401);
        return;
      }
      if (outcome.status === 'draft_submitted') {
        sendDomainError(res, req.id, 'draft_already_submitted', 409);
        return;
      }

      res.json({ lead: outcome.lead, requestId: req.id });
    } catch {
      sendDomainError(res, req.id, 'internal_error', 500);
    }
  });

  return router;
}
