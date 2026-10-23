import { randomUUID } from 'node:crypto';

import { createOwnerAlertChannelFromEnv, type OwnerAlertChannel } from '@canadian-plans/adapters';
import type { MachineScopeName } from '@canadian-plans/types';

import { loadDeploymentEnvironment } from './config/deployment.js';
import { createDocumentServiceFromEnv } from './documents/factory.js';
import type { DocumentService } from './documents/service.js';
import { DatabaseAbandonedLeadPruner } from './retention/abandoned-leads.js';
import { DatabaseOperationalPruner, operationalRetentionEnabled } from './retention/operational.js';
import { isConnectionLevelError, logRequestError } from './http/logger.js';
import {
  INITIAL_QUEUE_HEALTH_STATE,
  trackQueueHealth,
  type QueueHealthState,
} from './jobs/queueMonitor.js';
import type { MachineRegistry } from './machines/registry.js';
import { createDefaultCatalogueSyncRouteDependencies } from './routes/catalogue-sync.js';
import { createDefaultJobsRouteDependencies } from './routes/jobs.js';
import { createDefaultSyntheticCheckRouteDependencies } from './routes/synthetic-check.js';

/**
 * In-process scheduler for the long-lived Railway deployment (plan D2). Railway
 * cron has a five-minute floor and no minute-level precision, but T15's outbox
 * needs a 60-second cadence, so the two jobs run on timers inside the service.
 *
 * Identity is resolved exactly as the HTTP routes resolve it: through the
 * server-only machine registry, selected by `JOB_RUNNER_SELECTOR` /
 * `CATALOGUE_SYNC_SELECTOR`, verified with `CRON_SECRET`, and required to hold
 * `outbox:run` / `reconcile:run`. The authorized workspace set and actor id come
 * from that verified entry — never from a database tenant scan.
 */

export const OUTBOX_INTERVAL_MS = 60_000;
export const CATALOGUE_SYNC_INTERVAL_MS = 300_000;
/** REQ 40 / IMPLEMENTATION_PLAN §10: "a later synthetic check" on the same in-process scheduler. */
export const SYNTHETIC_CHECK_INTERVAL_MS = 15 * 60_000;
/** REL-18: abandoned uploads expire after a 24-hour grace, so hourly is plenty. */
export const DOCUMENT_CLEANUP_INTERVAL_MS = 60 * 60_000;
/** SEC-12 / REL-19: retention windows are measured in days, so once a day. */
export const DATA_RETENTION_INTERVAL_MS = 24 * 60 * 60_000;

const DEFAULT_STARTUP_DELAY_MS = 10_000;
const DEFAULT_JITTER_MS = 5_000;
const OUTBOX_PREFIX = 'scheduler:outbox';
const CATALOGUE_SYNC_PREFIX = 'scheduler:catalogue_sync';
const SYNTHETIC_CHECK_PREFIX = 'scheduler:synthetic_check';
const DOCUMENT_CLEANUP_PREFIX = 'scheduler:document_cleanup';
const DATA_RETENTION_PREFIX = 'scheduler:data_retention';
const SCHEDULER_ROUTE = 'scheduler';
const SCHEDULER_ERROR_PREFIXES: Record<SchedulerTaskName, string> = {
  outbox: OUTBOX_PREFIX,
  catalogue_sync: CATALOGUE_SYNC_PREFIX,
  synthetic_check: SYNTHETIC_CHECK_PREFIX,
  document_cleanup: DOCUMENT_CLEANUP_PREFIX,
  data_retention: DATA_RETENTION_PREFIX,
};

export type SchedulerTaskName =
  'outbox' | 'catalogue_sync' | 'synthetic_check' | 'document_cleanup' | 'data_retention';

export interface SchedulerTask {
  name: SchedulerTaskName;
  intervalMs: number;
  run(): Promise<unknown>;
}

export interface SchedulerErrorInput {
  name: SchedulerTaskName;
  error: unknown;
}

export interface SchedulerOptions {
  tasks: readonly SchedulerTask[];
  startupDelayMs?: number;
  jitterMs?: number;
  random?: () => number;
  onError?(input: SchedulerErrorInput): void;
}

export interface Scheduler {
  start(): void;
  /** Stops scheduling and resolves only once any in-flight run has finished. */
  stop(): Promise<void>;
}

interface TaskState {
  task: SchedulerTask;
  timer: ReturnType<typeof setTimeout> | undefined;
  inFlight: Promise<void> | undefined;
}

/** A misconfiguration, not a run failure. Its message is always a bounded code. */
export class SchedulerConfigurationError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'SchedulerConfigurationError';
  }
}

/**
 * PII-safe default: a raw error is never serialized. A connection-level
 * failure is retryable and everything else is not, matching the HTTP routes.
 */
function logSchedulerError(input: SchedulerErrorInput): void {
  logRequestError({
    requestId: SCHEDULER_ERROR_PREFIXES[input.name],
    route: SCHEDULER_ROUTE,
    code: 'scheduler_task_failed',
    flag: isConnectionLevelError(input.error) ? 'retryable' : 'not_retryable',
  });
}

/** Builds the timer engine. Two independent timers, no shared tick. */
export function createScheduler(options: SchedulerOptions): Scheduler {
  const startupDelayMs = options.startupDelayMs ?? DEFAULT_STARTUP_DELAY_MS;
  const jitterMs = options.jitterMs ?? DEFAULT_JITTER_MS;
  const random = options.random ?? Math.random;
  const onError = options.onError ?? logSchedulerError;
  const states: TaskState[] = options.tasks.map((task) => ({
    task,
    timer: undefined,
    inFlight: undefined,
  }));

  let started = false;
  let stopped = false;

  const delayFor = (baseMs: number): number => baseMs + Math.floor(random() * jitterMs);

  const schedule = (state: TaskState, delayMs: number): void => {
    state.timer = setTimeout(() => {
      void tick(state);
    }, delayMs);
  };

  const tick = async (state: TaskState): Promise<void> => {
    if (stopped) return;
    state.timer = undefined;
    // Cadence is fixed: the next tick is scheduled from this one, before the
    // run starts. A tick that lands while the previous run is still in flight
    // is skipped, not queued — both runners already enforce a 120s run deadline,
    // so the next scheduled tick is the right place to resume.
    schedule(state, delayFor(state.task.intervalMs));
    if (state.inFlight) return;
    state.inFlight = (async () => {
      try {
        await state.task.run();
      } catch (error) {
        onError({ name: state.task.name, error });
      }
    })();
    try {
      await state.inFlight;
    } finally {
      state.inFlight = undefined;
    }
  };

  return {
    start(): void {
      if (started || stopped) return;
      started = true;
      for (const state of states) schedule(state, delayFor(startupDelayMs));
    },
    async stop(): Promise<void> {
      stopped = true;
      for (const state of states) {
        if (state.timer !== undefined) {
          clearTimeout(state.timer);
          state.timer = undefined;
        }
      }
      await Promise.all(states.map((state) => state.inFlight ?? Promise.resolve()));
    },
  };
}

export interface SchedulerRunInput {
  authorizedWorkspaceIds: readonly string[];
  actorId: string;
}

export interface SyntheticCheckRunInput {
  actorId: string;
  requestId: string;
}

export interface BackendSchedulerDependencies {
  registry: MachineRegistry;
  runOutbox(input: SchedulerRunInput): Promise<unknown>;
  runCatalogueSync(input: SchedulerRunInput): Promise<unknown>;
  runSyntheticCheck(input: SyntheticCheckRunInput): Promise<unknown>;
  /** Expires abandoned uploads and deletes their R2 objects (REL-18). */
  runDocumentCleanup(input: SchedulerRunInput): Promise<unknown>;
  /** Daily retention: abandoned order forms (SEC-12) and operational rows (REL-19). */
  runDataRetention(input: SchedulerRunInput): Promise<unknown>;
}

export interface BackendSchedulerConfig {
  env?: NodeJS.ProcessEnv;
  startupDelayMs?: number;
  jitterMs?: number;
  random?: () => number;
  onError?(input: SchedulerErrorInput): void;
}

function resolveIdentity(
  registry: MachineRegistry,
  selector: string | undefined,
  secret: string | undefined,
  scope: MachineScopeName,
): SchedulerRunInput {
  if (!selector) throw new SchedulerConfigurationError('scheduler_selector_missing');
  if (!secret) throw new SchedulerConfigurationError('scheduler_secret_missing');
  const identity = registry.resolveScheduler({ selector, secret });
  if (!identity.ok) throw new SchedulerConfigurationError('scheduler_identity_invalid');
  if (!identity.hasScope(scope)) throw new SchedulerConfigurationError('scheduler_scope_missing');
  return { actorId: identity.actorId, authorizedWorkspaceIds: identity.workspaceIds };
}

/**
 * Builds the backend scheduler when `ENABLE_SCHEDULER=1`; otherwise returns
 * `undefined` (the default). Throws a {@link SchedulerConfigurationError} when
 * enabled but misconfigured, including a preview deployment — a preview must
 * never act as a scheduler.
 */
export function createBackendScheduler(
  dependencies: BackendSchedulerDependencies,
  config: BackendSchedulerConfig = {},
): Scheduler | undefined {
  const env = config.env ?? process.env;
  if (env['ENABLE_SCHEDULER'] !== '1') return undefined;
  if (loadDeploymentEnvironment(env) === 'preview') {
    throw new SchedulerConfigurationError('scheduler_preview_refused');
  }
  const secret = env['CRON_SECRET'];
  const outbox = resolveIdentity(
    dependencies.registry,
    env['JOB_RUNNER_SELECTOR'],
    secret,
    'outbox:run',
  );
  const catalogue = resolveIdentity(
    dependencies.registry,
    env['CATALOGUE_SYNC_SELECTOR'],
    secret,
    'reconcile:run',
  );
  const tasks: SchedulerTask[] = [
    {
      name: 'outbox',
      intervalMs: OUTBOX_INTERVAL_MS,
      run: () => dependencies.runOutbox(outbox),
    },
    {
      name: 'catalogue_sync',
      intervalMs: CATALOGUE_SYNC_INTERVAL_MS,
      run: () => dependencies.runCatalogueSync(catalogue),
    },
    {
      // Reuses the outbox identity: same verified actor, same workspace set.
      name: 'document_cleanup',
      intervalMs: DOCUMENT_CLEANUP_INTERVAL_MS,
      run: () => dependencies.runDocumentCleanup(outbox),
    },
    {
      name: 'data_retention',
      intervalMs: DATA_RETENTION_INTERVAL_MS,
      run: () => dependencies.runDataRetention(outbox),
    },
  ];
  // Optional: the synthetic workspace/registry entry is provisioned
  // separately (docs/RUNBOOKS/alerts.md). Its absence must never take down
  // outbox/catalogue-sync, which are load-bearing — so this resolves best-
  // effort and only adds the task when it succeeds, logging once otherwise.
  try {
    const synthetic = resolveIdentity(
      dependencies.registry,
      env['SYNTHETIC_CHECK_SELECTOR'],
      secret,
      'synthetic:check',
    );
    tasks.push({
      name: 'synthetic_check',
      intervalMs: SYNTHETIC_CHECK_INTERVAL_MS,
      run: () =>
        dependencies.runSyntheticCheck({ actorId: synthetic.actorId, requestId: randomUUID() }),
    });
  } catch (error) {
    (config.onError ?? logSchedulerError)({ name: 'synthetic_check', error });
  }

  return createScheduler({
    tasks,
    startupDelayMs: config.startupDelayMs,
    jitterMs: config.jitterMs,
    random: config.random,
    onError: config.onError,
  });
}

/**
 * Wires the real runners by reusing the exact dependencies the HTTP routes
 * build, so the scheduler and the manual endpoints run identical handler code
 * (plan D3).
 */
export function createDefaultSchedulerDependencies(): BackendSchedulerDependencies {
  const jobs = createDefaultJobsRouteDependencies();
  const catalogue = createDefaultCatalogueSyncRouteDependencies();
  const synthetic = createDefaultSyntheticCheckRouteDependencies();
  const alerts = createOwnerAlertChannelFromEnv();
  const documents = createDocumentServiceFromEnv();
  const abandonedLeads = new DatabaseAbandonedLeadPruner();
  const operational = operationalRetentionEnabled() ? new DatabaseOperationalPruner() : undefined;
  let queueHealth = INITIAL_QUEUE_HEALTH_STATE;
  let catalogueFailing = false;
  return {
    registry: jobs.registry,
    runOutbox: (input) =>
      runOutboxWithQueueMonitor(
        jobs,
        alerts,
        input,
        (state) => (queueHealth = state),
        () => queueHealth,
      ),
    runCatalogueSync: (input) =>
      runCatalogueSyncWithAlert(
        catalogue,
        alerts,
        input,
        (failing) => (catalogueFailing = failing),
        () => catalogueFailing,
      ),
    runSyntheticCheck: (input) => synthetic.run(input),
    runDocumentCleanup: (input) => runDocumentCleanup(documents, input),
    runDataRetention: (input) =>
      runDataRetention({ abandonedLeads, operational }, input, new Date()),
  };
}

export interface DataRetentionDependencies {
  abandonedLeads: Pick<DatabaseAbandonedLeadPruner, 'restrictAbandoned'>;
  /** REL-19: present only when OPERATIONAL_RETENTION_ENABLED=1. */
  operational?: Pick<DatabaseOperationalPruner, 'prune'>;
}

/** One pass per authorized workspace; returns counts only, never row data. */
export async function runDataRetention(
  dependencies: DataRetentionDependencies,
  input: SchedulerRunInput,
  now: Date,
): Promise<{ restrictedLeads: number; prunedRows: Record<string, number> | 'disabled' }> {
  let restrictedLeads = 0;
  const pruned: Record<string, number> = {};
  for (const workspaceId of new Set(input.authorizedWorkspaceIds)) {
    const leads = await dependencies.abandonedLeads.restrictAbandoned({
      workspaceId,
      actorId: input.actorId,
      now,
    });
    restrictedLeads += leads.restrictedLeads;
    if (dependencies.operational) {
      for (const table of await dependencies.operational.prune({
        workspaceId,
        actorId: input.actorId,
        now,
      })) {
        pruned[table.tableName] = (pruned[table.tableName] ?? 0) + table.deleted;
      }
    }
  }
  return { restrictedLeads, prunedRows: dependencies.operational ? pruned : 'disabled' };
}

/**
 * REL-18: one sweep per authorized workspace. Without R2 configured there are
 * no uploads to clean, so the task reports that and does nothing.
 */
export async function runDocumentCleanup(
  documents: Pick<DocumentService, 'sweepExpired'> | undefined,
  input: SchedulerRunInput,
): Promise<
  | { skipped: 'feature_not_ready' }
  | { expiredIntents: number; deletedObjects: number; failedDeletes: number }
> {
  if (!documents) return { skipped: 'feature_not_ready' };
  const totals = { expiredIntents: 0, deletedObjects: 0, failedDeletes: 0 };
  for (const workspaceId of new Set(input.authorizedWorkspaceIds)) {
    const result = await documents.sweepExpired({ workspaceId, actorId: input.actorId });
    totals.expiredIntents += result.expiredIntents;
    totals.deletedObjects += result.deletedObjects;
    totals.failedDeletes += result.failedDeletes;
  }
  return totals;
}

/**
 * The catalogue runner records drain/reconcile failures in its summary and
 * resolves normally, so without this wrapper a sync that never publishes a
 * plan (missing static-catalogue workspace, open TEST- inputs, DB errors) is
 * invisible while customers see an empty plan list. Edge-triggered: one owner
 * alert when the sync starts failing, none while it keeps failing, and a new
 * one only after a clean run. Failure codes are already bounded, so they are
 * log/alert-safe.
 */
export async function runCatalogueSyncWithAlert(
  catalogue: {
    run(input: SchedulerRunInput): Promise<{ failures: readonly CatalogueAlertFailure[] }>;
  },
  alerts: OwnerAlertChannel,
  input: SchedulerRunInput,
  setFailing: (failing: boolean) => void,
  wasFailing: () => boolean,
): Promise<unknown> {
  const summary = await catalogue.run(input);
  const failing = summary.failures.length > 0;
  if (failing) {
    logRequestError({
      requestId: 'scheduler:catalogue_sync',
      route: 'scheduler',
      code: summary.failures[0]?.errorCode ?? 'catalogue_sync_failed',
      flag: 'not_retryable',
    });
    if (!wasFailing()) {
      await alerts
        .send({
          kind: 'catalogue_sync_failed',
          detail: summary.failures
            .slice(0, 5)
            .map((failure) => `${failure.stage}:${failure.errorCode}`)
            .join(','),
          occurredAt: new Date().toISOString(),
        })
        .catch(() => {
          // Best-effort — the sync's own outcome is already recorded in its state row.
        });
    }
  }
  setFailing(failing);
  return summary;
}

interface CatalogueAlertFailure {
  stage: string;
  errorCode: string;
}

/**
 * Wraps the real outbox runner with the failed-job-queue-growth alert
 * (REQ 40). Kept as a small standalone function (rather than inline in the
 * closure above) purely for readability — the actual detection logic lives
 * in the pure, unit-tested {@link trackQueueHealth}.
 */
export async function runOutboxWithQueueMonitor(
  jobs: {
    run(input: SchedulerRunInput): Promise<unknown>;
    queueHealth(input: SchedulerRunInput): Promise<{ failed: number; uncertain: number }>;
  },
  alerts: OwnerAlertChannel,
  input: SchedulerRunInput,
  setState: (state: QueueHealthState) => void,
  getState: () => QueueHealthState,
): Promise<unknown> {
  const summary = await jobs.run(input);
  const queue = await jobs.queueHealth(input);
  const outcome = trackQueueHealth(getState(), queue, Date.now());
  setState(outcome.nextState);
  if (outcome.shouldAlert) {
    await alerts
      .send({
        kind: 'job_queue_stuck',
        detail: `failed:${queue.failed},uncertain:${queue.uncertain}`,
        occurredAt: new Date().toISOString(),
      })
      .catch(() => {
        // Best-effort — the outbox run itself already succeeded/failed independently.
      });
  }
  return summary;
}
