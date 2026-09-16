import { Router, type Request } from 'express';
import { rateLimitHit, resolveWebsiteCredential } from '@canadian-plans/db';
import { createLeadRequestSchema, updateLeadRequestSchema } from '@canadian-plans/contracts';
import { z } from 'zod';

import { sendDomainError } from '../http/domain-errors.js';
import { DatabaseLeadStore, type LeadStore } from '../leads/store.js';
import { parseDraftGrantToken } from '../leads/token.js';
import { createTurnstileVerifier } from '../website/turnstile.js';
import {
  requireScope,
  requireWebsiteCredential,
  websiteContext,
  type WebsiteAuthDependencies,
} from '../website/session.js';

export interface WebsiteRouteDependencies {
  auth: WebsiteAuthDependencies;
  leads: { store: LeadStore };
}

export function createDefaultWebsiteRouteDependencies(): WebsiteRouteDependencies {
  const verify = createTurnstileVerifier({
    secret: process.env.TURNSTILE_SECRET_KEY,
    hostname: process.env.TURNSTILE_HOSTNAME,
    action: 'lead-submit',
  });
  return {
    auth: {
      resolveCredential: resolveWebsiteCredential,
      rateLimit: rateLimitHit,
      botCheck: (req) => verify(req.get('x-turnstile-token')),
    },
    leads: { store: new DatabaseLeadStore() },
  };
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

      res.json({ lead: outcome.lead, requestId: req.id });
    } catch {
      sendDomainError(res, req.id, 'internal_error', 500);
    }
  });

  return router;
}
