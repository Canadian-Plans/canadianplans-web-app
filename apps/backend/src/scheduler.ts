import type { MachineScopeName } from '@canadian-plans/types';

import { loadDeploymentEnvironment } from './config/deployment.js';
import { isConnectionLevelError, logRequestError } from './http/logger.js';
import type { MachineRegistry } from './machines/registry.js';
import { createDefaultCatalogueSyncRouteDependencies } from './routes/catalogue-sync.js';
import { createDefaultJobsRouteDependencies } from './routes/jobs.js';

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

const DEFAULT_STARTUP_DELAY_MS = 10_000;
const DEFAULT_JITTER_MS = 5_000;
const OUTBOX_PREFIX = 'scheduler:outbox';
const CATALOGUE_SYNC_PREFIX = 'scheduler:catalogue_sync';
const SCHEDULER_ROUTE = 'scheduler';

export type SchedulerTaskName = 'outbox' | 'catalogue_sync';

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
    requestId: input.name === 'outbox' ? OUTBOX_PREFIX : CATALOGUE_SYNC_PREFIX,
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

export interface BackendSchedulerDependencies {
  registry: MachineRegistry;
  runOutbox(input: SchedulerRunInput): Promise<unknown>;
  runCatalogueSync(input: SchedulerRunInput): Promise<unknown>;
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

  return createScheduler({
    tasks: [
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
    ],
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
  return {
    registry: jobs.registry,
    runOutbox: (input) => jobs.run(input),
    runCatalogueSync: (input) => catalogue.run(input),
  };
}
