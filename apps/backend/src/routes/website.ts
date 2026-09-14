import { Router } from 'express';
import { rateLimitHit, resolveWebsiteCredential } from '@canadian-plans/db';

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
  return {
    auth: {
      resolveCredential: resolveWebsiteCredential,
      rateLimit: rateLimitHit,
      // No edge/bot provider is provisioned yet. Keep public writes closed
      // until a verified admission implementation is supplied at deployment.
      botCheck: () => false,
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
