import {
  createDeletionLedgerFromEnv,
  FakeAnalyticsSink,
  FakeEmailAdapter,
  InMemoryDeletionLedger,
  UmamiAnalyticsSink,
  type AnalyticsSink,
  type EmailAdapter,
} from '@canadian-plans/adapters';
import {
  createFailingJobHandlerRegistry,
  createJobHandlerRegistry,
  JobHandlerError,
  type JobHandlerRegistry,
} from '@canadian-plans/jobs';
import { z } from 'zod';

import {
  createDeletionLedgerHandler,
  DatabaseDeletionLedgerStore,
  DeletionLedgerService,
} from '../deletion/ledger.js';

/**
 * The explicit opt-in for the in-memory provider fakes. There is deliberately
 * no implicit fallback: an unset value means no provider is configured, so the
 * outbox fails closed instead of silently delivering through a test double.
 */
export const FAKE_OUTBOX_ADAPTERS_VALUE = 'fake';

/**
 * Deployment configuration for the Umami server-event sink. The workspace →
 * website-id mapping is what keeps each storefront's events on its own Umami
 * site (REQ 35); a workspace with no mapping fails closed in the adapter rather
 * than sending to the wrong site. Parsed strictly so a malformed value yields
 * "no provider" instead of a guess.
 */
const umamiConfigSchema = z
  .object({
    endpoint: z.url(),
    hostname: z.string().min(1).max(253).optional(),
    sites: z
      .array(z.object({ workspaceId: z.uuid(), websiteId: z.string().min(1).max(64) }))
      .min(1),
  })
  .strict();

/** Builds the Umami sink from the environment, or `undefined` when unconfigured/invalid. */
export function loadUmamiAnalyticsSink(
  env: NodeJS.ProcessEnv = process.env,
): AnalyticsSink | undefined {
  const endpoint = env.UMAMI_EVENTS_URL?.trim();
  const rawSites = env.UMAMI_WORKSPACE_WEBSITES?.trim();
  if (!endpoint || !rawSites) return undefined;
  let sites: unknown;
  try {
    sites = JSON.parse(rawSites);
  } catch {
    return undefined;
  }
  const parsed = umamiConfigSchema.safeParse({
    endpoint,
    hostname: env.UMAMI_HOSTNAME?.trim() || undefined,
    sites,
  });
  if (!parsed.success) return undefined;
  const byWorkspace = new Map(parsed.data.sites.map((site) => [site.workspaceId, site.websiteId]));
  return new UmamiAnalyticsSink({
    endpoint: parsed.data.endpoint,
    hostname: parsed.data.hostname,
    websiteIdForWorkspace: (workspaceId) => byWorkspace.get(workspaceId),
  });
}

/** Fails an email job permanently until a real selected adapter is wired (T18). */
function unconfiguredEmailAdapter(): EmailAdapter {
  return {
    send: async () => {
      throw new JobHandlerError('provider_not_configured', false);
    },
  };
}

/**
 * Builds the outbox handler registry for the current deployment.
 *
 * Fakes are constructed only when `OUTBOX_ADAPTERS=fake` is set explicitly
 * *and* the process is not production. Otherwise analytics uses the configured
 * Umami sink; email stays unconfigured until its own adapter lands. When
 * neither a fake nor a real analytics sink is available the whole registry
 * fails closed with `provider_not_configured`, so the failure is recorded on
 * the job and surfaces in admin rather than being delivered by a fake.
 */
export function createOutboxJobHandlers(env: NodeJS.ProcessEnv = process.env): JobHandlerRegistry {
  const explicitFake = env.OUTBOX_ADAPTERS === FAKE_OUTBOX_ADAPTERS_VALUE;
  const allowFakes = explicitFake && env.NODE_ENV !== 'production';

  const analytics = allowFakes ? new FakeAnalyticsSink() : loadUmamiAnalyticsSink(env);
  const base = analytics
    ? createJobHandlerRegistry({
        email: allowFakes ? new FakeEmailAdapter() : unconfiguredEmailAdapter(),
        analytics,
      })
    : createFailingJobHandlerRegistry('provider_not_configured');

  // The deletion-ledger handler is registered independently of analytics/email:
  // deleting customer data must work even when no other provider is configured,
  // and it fails closed when the ledger itself is not configured.
  const handlers = new Map(base);
  const ledger = allowFakes ? new InMemoryDeletionLedger() : createDeletionLedgerFromEnv(env);
  handlers.set(
    'deletion_ledger_publish',
    createDeletionLedgerHandler(
      new DeletionLedgerService({ ledger, store: new DatabaseDeletionLedgerStore() }),
    ),
  );
  return handlers;
}
