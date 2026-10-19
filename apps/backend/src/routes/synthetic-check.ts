import { createOwnerAlertChannelFromEnv, type OwnerAlertChannel } from '@canadian-plans/adapters';
import { Router, type RequestHandler } from 'express';

import { loadQuoteWithdrawalPolicy } from '../catalogue/policy.js';
import { CatalogueService } from '../catalogue/service.js';
import { DatabaseCatalogueStore } from '../catalogue/store.js';
import { loadDeploymentEnvironment } from '../config/deployment.js';
import { sendStaffAuthError } from '../http/staff-errors.js';
import { sendWebsiteError } from '../http/website-errors.js';
import { DatabaseLeadStore } from '../leads/store.js';
import { loadMachineRegistry, type MachineRegistry } from '../machines/registry.js';
import { DatabaseOrderTransitionStore } from '../orders/transitions.js';
import { OrderService } from '../orders/service.js';
import { DatabaseOrderStore } from '../orders/store.js';
import { runSyntheticOrderCheck, type SyntheticCheckResult } from '../synthetic/check.js';
import { createSyntheticCatalogueProvider } from '../synthetic/provider.js';

export interface SyntheticCheckRouteDependencies {
  registry: MachineRegistry;
  run(input: { actorId: string; requestId: string }): Promise<SyntheticCheckResult>;
  alerts: OwnerAlertChannel;
  selector?: string;
  workspaceId?: string;
  deploymentEnvironment?: string;
}

export function createDefaultSyntheticCheckRouteDependencies(): SyntheticCheckRouteDependencies {
  const workspaceId = process.env.SYNTHETIC_WORKSPACE_ID;
  const productId = process.env.SYNTHETIC_PRODUCT_ID;
  const withdrawalPolicy = loadQuoteWithdrawalPolicy();
  const quotes = new CatalogueService(
    new DatabaseCatalogueStore(),
    (candidate) => (candidate === workspaceId ? createSyntheticCatalogueProvider() : undefined),
    withdrawalPolicy,
  );
  return {
    registry: loadMachineRegistry(),
    workspaceId,
    selector: process.env.SYNTHETIC_CHECK_SELECTOR,
    deploymentEnvironment: loadDeploymentEnvironment(),
    alerts: createOwnerAlertChannelFromEnv(),
    run: (input) => {
      if (!workspaceId || !productId) {
        throw new Error('synthetic_check_not_configured');
      }
      return runSyntheticOrderCheck(
        {
          workspaceId,
          productId,
          leads: { createLead: (leadInput) => new DatabaseLeadStore().createLead(leadInput) },
          quotes,
          orders: {
            submit: (orderInput) =>
              new OrderService(new DatabaseOrderStore(), withdrawalPolicy).submit(orderInput),
          },
          transitions: { transition: (t) => new DatabaseOrderTransitionStore().transition(t) },
        },
        input,
      );
    },
  };
}

function bearerSecret(value: string | undefined): string | undefined {
  const match = /^Bearer ([^\s]+)$/.exec(value ?? '');
  return match?.[1];
}

/**
 * Authenticated scheduled entry point mirroring `/api/internal/jobs/run`
 * (routes/jobs.ts): the scheduler and a manual staging invocation run the
 * identical handler. A failure alerts the owner before responding, so the
 * alert fires even when nothing is polling this route's response.
 */
export function createSyntheticCheckRouter(dependencies: SyntheticCheckRouteDependencies): Router {
  const router = Router();
  const runCheck: RequestHandler = async (req, res) => {
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
    if (!identity.hasScope('synthetic:check')) {
      sendWebsiteError(res, req.id, 'scope_denied', 403);
      return;
    }
    try {
      const result = await dependencies.run({ actorId: identity.actorId, requestId: req.id });
      if (result.status === 'failed') {
        await dependencies.alerts
          .send({
            kind: 'synthetic_check_failed',
            detail: `${result.step}:${result.code}`,
            occurredAt: new Date().toISOString(),
          })
          .catch(() => {
            // The check result itself is still reported below; a failed alert
            // delivery must not also hide the check failure.
          });
      }
      res.json({ ...result, requestId: req.id });
    } catch {
      await dependencies.alerts
        .send({
          kind: 'synthetic_check_failed',
          detail: 'unexpected_error',
          occurredAt: new Date().toISOString(),
        })
        .catch(() => {});
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  };
  router.get('/run', runCheck);
  router.post('/run', runCheck);
  return router;
}
