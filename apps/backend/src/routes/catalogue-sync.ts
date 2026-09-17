import { Router, type RequestHandler } from 'express';

import { loadQuoteWithdrawalPolicy } from '../catalogue/policy.js';
import { CatalogueSyncRunner, type CatalogueSyncRunSummary } from '../catalogue/runner.js';
import { CatalogueService, providerResolverFromRegistry } from '../catalogue/service.js';
import { DatabaseCatalogueStore } from '../catalogue/store.js';
import { loadDeploymentEnvironment } from '../config/deployment.js';
import { sendStaffAuthError } from '../http/staff-errors.js';
import { sendWebsiteError } from '../http/website-errors.js';
import { loadMachineRegistry, type MachineRegistry } from '../machines/registry.js';

export interface CatalogueSyncRouteDependencies {
  registry: MachineRegistry;
  run(input: {
    authorizedWorkspaceIds: readonly string[];
    actorId: string;
  }): Promise<CatalogueSyncRunSummary>;
  selector?: string;
  deploymentEnvironment?: string;
}

export function createDefaultCatalogueSyncRouteDependencies(): CatalogueSyncRouteDependencies {
  const registry = loadMachineRegistry();
  const service = new CatalogueService(
    new DatabaseCatalogueStore(),
    providerResolverFromRegistry(registry),
    loadQuoteWithdrawalPolicy(),
  );
  const runner = new CatalogueSyncRunner({ handlers: service });
  return {
    registry,
    run: (input) => runner.run(input),
    selector: process.env.CATALOGUE_SYNC_SELECTOR,
    deploymentEnvironment: loadDeploymentEnvironment(),
  };
}

function bearerSecret(value: string | undefined): string | undefined {
  const match = /^Bearer ([^\s]+)$/.exec(value ?? '');
  return match?.[1];
}

/**
 * Authenticated scheduled entry point for catalogue sync (T10B). Like the
 * outbox runner it derives its authorized workspace set only from the verified
 * scheduler identity — never from a database tenant scan — and refuses to act
 * as a scheduler on a preview deployment. The scheduler entry must hold the
 * existing `reconcile:run` scope; no new scope or migration is introduced.
 */
export function createCatalogueSyncRouter(dependencies: CatalogueSyncRouteDependencies): Router {
  const router = Router();
  const runSync: RequestHandler = async (req, res) => {
    if (dependencies.deploymentEnvironment === 'preview') {
      sendWebsiteError(res, req.id, 'machine_unknown', 403);
      return;
    }
    const selector = req.get('x-scheduler-selector') ?? dependencies.selector;
    const secret = bearerSecret(req.get('authorization'));
    if (!selector || !secret) {
      sendWebsiteError(res, req.id, 'machine_unknown', 401);
      return;
    }
    const identity = dependencies.registry.resolveScheduler({ selector, secret });
    if (!identity.ok) {
      sendWebsiteError(res, req.id, identity.reason, 401);
      return;
    }
    if (!identity.hasScope('reconcile:run')) {
      sendWebsiteError(res, req.id, 'scope_denied', 403);
      return;
    }
    try {
      const summary = await dependencies.run({
        authorizedWorkspaceIds: identity.workspaceIds,
        actorId: identity.actorId,
      });
      res.json({ ...summary, requestId: req.id });
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  };
  // The scheduler issues GET. POST remains available for an authenticated
  // manual staging invocation of the identical path.
  router.get('/sync', runSync);
  router.post('/sync', runSync);
  return router;
}
