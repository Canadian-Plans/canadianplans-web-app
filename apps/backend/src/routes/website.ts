import { Router } from 'express';
import { rateLimitHit, resolveWebsiteCredential } from '@canadian-plans/db';
import { createTurnstileVerifier } from '../website/turnstile.js';

import {
  requireScope,
  requireWebsiteCredential,
  websiteContext,
  type WebsiteAuthDependencies,
} from '../website/session.js';

export interface WebsiteRouteDependencies {
  auth: WebsiteAuthDependencies;
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
  };
}

/**
 * Public storefront surface. Every route authenticates by service credential
 * only: the workspace and scopes come from the credential, so a `workspace_id`
 * in the body, or a spoofed Host/Origin, cannot change the tenant. Real lead
 * persistence lands in A2; this first `leads:write` route establishes and
 * proves the credential → scoped-context boundary.
 */
export function createWebsiteRouter(dependencies: WebsiteRouteDependencies): Router {
  const router = Router();
  router.use(requireWebsiteCredential(dependencies.auth));

  router.post('/leads', requireScope('leads:write'), (req, res) => {
    const ctx = websiteContext(req);
    res.status(202).json({
      workspaceId: ctx.workspaceId,
      callerType: ctx.callerType,
      scopes: ctx.scopes,
      requestId: req.id,
    });
  });

  return router;
}
