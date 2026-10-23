import { afterEach, describe, expect, it, vi } from 'vitest';

import { MachineRegistry, type MachineRegistryConfig } from '../src/machines/registry.js';
import {
  createBackendScheduler,
  createScheduler,
  SchedulerConfigurationError,
  type SchedulerTask,
  runCatalogueSyncWithAlert,
  runDataRetention,
  runDocumentCleanup,
  runOutboxWithQueueMonitor,
} from '../src/scheduler.js';
import { INITIAL_QUEUE_HEALTH_STATE, type QueueHealthState } from '../src/jobs/queueMonitor.js';
import { operationalRetentionEnabled } from '../src/retention/operational.js';

const WORKSPACE = '10000000-0000-4000-8000-000000000901';
const ACTOR = '20000000-0000-4000-8000-000000000901';
const SECRET = 'scheduler-secret-value-000000000901';

it('alerts for a persisted failed queue even when later runs process nothing', async () => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(0);
    let state: QueueHealthState = INITIAL_QUEUE_HEALTH_STATE;
    const jobs = {
      run: vi.fn(async () => ({ failed: 0, uncertain: 0 })),
      queueHealth: vi.fn(async () => ({ failed: 1, uncertain: 0 })),
    };
    const alerts = { send: vi.fn(async () => {}) };
    const input = { authorizedWorkspaceIds: [WORKSPACE], actorId: ACTOR };
    const tick = () =>
      runOutboxWithQueueMonitor(
        jobs,
        alerts,
        input,
        (next) => {
          state = next;
        },
        () => state,
      );
    await tick();
    expect(alerts.send).not.toHaveBeenCalled();
    vi.setSystemTime(10 * 60_000);
    await tick();
    expect(alerts.send).toHaveBeenCalledOnce();
    expect(jobs.queueHealth).toHaveBeenCalledWith(input);
    expect(alerts.send).toHaveBeenCalledWith(
      expect.objectContaining({ detail: 'failed:1,uncertain:0' }),
    );
  } finally {
    vi.useRealTimers();
  }
});

it('alerts once when catalogue sync starts failing, and again only after a clean run', async () => {
  let failing = false;
  const failures = [{ stage: 'reconcile', errorCode: 'provider_unavailable' }];
  const catalogue = { run: vi.fn(async () => ({ failures })) };
  const alerts = { send: vi.fn(async () => {}) };
  const input = { authorizedWorkspaceIds: [WORKSPACE], actorId: ACTOR };
  const tick = () =>
    runCatalogueSyncWithAlert(
      catalogue,
      alerts,
      input,
      (next) => {
        failing = next;
      },
      () => failing,
    );
  const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await tick();
    await tick();
    expect(alerts.send).toHaveBeenCalledOnce();
    expect(alerts.send).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'catalogue_sync_failed',
        detail: 'reconcile:provider_unavailable',
      }),
    );
    expect(logged).toHaveBeenCalledTimes(2);

    catalogue.run.mockResolvedValueOnce({ failures: [] });
    await tick();
    expect(failing).toBe(false);
    await tick();
    expect(alerts.send).toHaveBeenCalledTimes(2);
  } finally {
    logged.mockRestore();
  }
});

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function task(run: SchedulerTask['run']): SchedulerTask {
  return { name: 'outbox', intervalMs: 1_000, run };
}

describe('createScheduler', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ticks at the configured interval', async () => {
    vi.useFakeTimers();
    const run = vi.fn(async () => undefined);
    const scheduler = createScheduler({
      tasks: [task(run)],
      startupDelayMs: 0,
      jitterMs: 0,
      random: () => 0,
    });

    scheduler.start();
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(0);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(run).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(3_000);
    expect(run).toHaveBeenCalledTimes(5);
    await scheduler.stop();
  });

  it('waits for the startup delay before the first tick', async () => {
    vi.useFakeTimers();
    const run = vi.fn(async () => undefined);
    const scheduler = createScheduler({
      tasks: [task(run)],
      startupDelayMs: 10_000,
      jitterMs: 0,
      random: () => 0,
    });

    scheduler.start();
    await vi.advanceTimersByTimeAsync(9_999);
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(1);
    await scheduler.stop();
  });

  it('applies the injected jitter to each tick', async () => {
    vi.useFakeTimers();
    const run = vi.fn(async () => undefined);
    const scheduler = createScheduler({
      tasks: [task(run)],
      startupDelayMs: 0,
      jitterMs: 5_000,
      random: () => 0.5,
    });

    scheduler.start();
    await vi.advanceTimersByTimeAsync(2_500);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3_499);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(2);
    await scheduler.stop();
  });

  it('skips a tick while the previous run is still in flight', async () => {
    vi.useFakeTimers();
    const gate = deferred<void>();
    const run = vi.fn(() => gate.promise);
    const scheduler = createScheduler({
      tasks: [task(run)],
      startupDelayMs: 0,
      jitterMs: 0,
      random: () => 0,
    });

    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(run).toHaveBeenCalledTimes(1);

    // The run is still in flight, so the tick at +1s must be skipped.
    await vi.advanceTimersByTimeAsync(1_000);
    expect(run).toHaveBeenCalledTimes(1);

    gate.resolve();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(run).toHaveBeenCalledTimes(2);
    await scheduler.stop();
  });

  it('keeps ticking after a run throws', async () => {
    vi.useFakeTimers();
    const error = new Error('transient failure');
    const run = vi.fn().mockRejectedValueOnce(error).mockResolvedValue(undefined);
    const onError = vi.fn();
    const scheduler = createScheduler({
      tasks: [task(run)],
      startupDelayMs: 0,
      jitterMs: 0,
      random: () => 0,
      onError,
    });

    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(run).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith({ name: 'outbox', error });

    await vi.advanceTimersByTimeAsync(1_000);
    expect(run).toHaveBeenCalledTimes(2);
    await scheduler.stop();
  });

  it('logs a thrown run through the PII-safe logger by default', async () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const run = vi.fn(async () => {
      throw new Error('sensitive someone@example.com');
    });
    const scheduler = createScheduler({
      tasks: [task(run)],
      startupDelayMs: 0,
      jitterMs: 0,
      random: () => 0,
    });

    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(spy).toHaveBeenCalledTimes(1);
    const line = String(spy.mock.calls[0]?.[0] ?? '');
    expect(line).toContain('scheduler_task_failed');
    expect(line).not.toContain('someone@example.com');
    spy.mockRestore();
    await scheduler.stop();
  });

  it('stop() resolves only after an in-flight run finishes', async () => {
    vi.useFakeTimers();
    const gate = deferred<void>();
    const run = vi.fn(() => gate.promise);
    const scheduler = createScheduler({
      tasks: [task(run)],
      startupDelayMs: 0,
      jitterMs: 0,
      random: () => 0,
    });

    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(run).toHaveBeenCalledTimes(1);

    let stopped = false;
    const stopping = scheduler.stop().then(() => {
      stopped = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(stopped).toBe(false);

    gate.resolve();
    await stopping;
    expect(stopped).toBe(true);
  });
});

describe('createBackendScheduler', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const baseEnv = {
    ENABLE_SCHEDULER: '1',
    DEPLOYMENT_ENV: 'production',
    CRON_SECRET: SECRET,
    JOB_RUNNER_SELECTOR: 'combined',
    CATALOGUE_SYNC_SELECTOR: 'combined',
  };

  const combined: MachineRegistryConfig['schedulers'][number] = {
    selector: 'combined',
    secret: SECRET,
    actorId: ACTOR,
    workspaceIds: [WORKSPACE],
    scopes: ['outbox:run', 'reconcile:run'],
    revoked: false,
  };

  function registryWith(entries: MachineRegistryConfig['schedulers']): MachineRegistry {
    return new MachineRegistry({ webhooks: [], schedulers: entries });
  }

  function dependencies(registry: MachineRegistry) {
    return {
      registry,
      runOutbox: vi.fn(async () => undefined),
      runCatalogueSync: vi.fn(async () => undefined),
      runSyntheticCheck: vi.fn(async () => undefined),
      runDocumentCleanup: vi.fn(async () => undefined),
      runDataRetention: vi.fn(async () => undefined),
    };
  }

  it('is disabled unless ENABLE_SCHEDULER=1', () => {
    const scheduler = createBackendScheduler(dependencies(registryWith([combined])), { env: {} });
    expect(scheduler).toBeUndefined();
  });

  it('refuses to start on a preview deployment', () => {
    expect(() =>
      createBackendScheduler(dependencies(registryWith([combined])), {
        env: { ...baseEnv, DEPLOYMENT_ENV: 'preview' },
      }),
    ).toThrow(SchedulerConfigurationError);
  });

  it('refuses to start without the required scope', () => {
    expect(() =>
      createBackendScheduler(
        dependencies(registryWith([{ ...combined, scopes: ['outbox:run'] }])),
        {
          env: baseEnv,
        },
      ),
    ).toThrow(/scheduler_scope_missing/);
  });

  it('runs both tasks with the registry actor and workspace set', async () => {
    vi.useFakeTimers();
    const deps = dependencies(registryWith([combined]));
    const scheduler = createBackendScheduler(deps, {
      env: baseEnv,
      startupDelayMs: 0,
      jitterMs: 0,
      random: () => 0,
    });
    expect(scheduler).toBeDefined();

    scheduler?.start();
    await vi.advanceTimersByTimeAsync(0);
    const expected = { actorId: ACTOR, authorizedWorkspaceIds: [WORKSPACE] };
    expect(deps.runOutbox).toHaveBeenCalledWith(expected);
    expect(deps.runCatalogueSync).toHaveBeenCalledWith(expected);
    // REL-18: the upload sweep runs with the outbox identity.
    expect(deps.runDocumentCleanup).toHaveBeenCalledWith(expected);
    // SEC-12 / REL-19: daily retention runs with the same identity.
    expect(deps.runDataRetention).toHaveBeenCalledWith(expected);
    await scheduler?.stop();
  });

  it('starts outbox/catalogue-sync even when the synthetic check is unconfigured', async () => {
    vi.useFakeTimers();
    const deps = dependencies(registryWith([combined]));
    const scheduler = createBackendScheduler(deps, {
      env: baseEnv,
      startupDelayMs: 0,
      jitterMs: 0,
      random: () => 0,
    });
    expect(scheduler).toBeDefined();
    scheduler?.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.runOutbox).toHaveBeenCalled();
    expect(deps.runSyntheticCheck).not.toHaveBeenCalled();
    await scheduler?.stop();
  });

  it('also runs the synthetic check once its scope is granted on the shared scheduler entry', async () => {
    vi.useFakeTimers();
    // Per docs/ENV.md, SYNTHETIC_CHECK_SELECTOR points at the same entry as
    // JOB_RUNNER_SELECTOR/CATALOGUE_SYNC_SELECTOR (one CRON_SECRET, one
    // entry) — the owner just grants it the additional `synthetic:check` scope.
    const withSynthetic: MachineRegistryConfig['schedulers'][number] = {
      ...combined,
      scopes: ['outbox:run', 'reconcile:run', 'synthetic:check'],
    };
    const deps = dependencies(registryWith([withSynthetic]));
    const scheduler = createBackendScheduler(deps, {
      env: { ...baseEnv, SYNTHETIC_CHECK_SELECTOR: 'combined' },
      startupDelayMs: 0,
      jitterMs: 0,
      random: () => 0,
    });
    scheduler?.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.runSyntheticCheck).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: ACTOR }),
    );
    await scheduler?.stop();
  });
});

describe('runDocumentCleanup (REL-18)', () => {
  it('sweeps each authorized workspace once and totals the result', async () => {
    const sweepExpired = vi.fn(async ({ workspaceId }: { workspaceId: string }) =>
      workspaceId === 'w1'
        ? { expiredIntents: 2, deletedObjects: 3, failedDeletes: 1 }
        : { expiredIntents: 1, deletedObjects: 1, failedDeletes: 0 },
    );
    const result = await runDocumentCleanup(
      { sweepExpired },
      { actorId: 'actor', authorizedWorkspaceIds: ['w1', 'w2', 'w1'] },
    );
    expect(sweepExpired).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ expiredIntents: 3, deletedObjects: 4, failedDeletes: 1 });
  });

  it('does nothing when document storage is not configured', async () => {
    expect(
      await runDocumentCleanup(undefined, { actorId: 'actor', authorizedWorkspaceIds: ['w1'] }),
    ).toEqual({ skipped: 'feature_not_ready' });
  });
});

describe('runDataRetention (SEC-12)', () => {
  it('restricts abandoned order forms once per authorized workspace', async () => {
    const now = new Date('2026-10-22T00:00:00.000Z');
    const restrictAbandoned = vi.fn(async ({ workspaceId }: { workspaceId: string }) => ({
      restrictedLeads: workspaceId === 'w1' ? 3 : 1,
    }));
    const result = await runDataRetention(
      { abandonedLeads: { restrictAbandoned } },
      { actorId: 'actor', authorizedWorkspaceIds: ['w1', 'w2', 'w1'] },
      now,
    );
    expect(restrictAbandoned).toHaveBeenCalledTimes(2);
    expect(restrictAbandoned).toHaveBeenCalledWith({ workspaceId: 'w1', actorId: 'actor', now });
    expect(result).toEqual({ restrictedLeads: 4, prunedRows: 'disabled' });
  });

  it('prunes operational rows only when the pruner is configured (REL-19)', async () => {
    const now = new Date('2026-10-22T00:00:00.000Z');
    const restrictAbandoned = vi.fn(async () => ({ restrictedLeads: 0 }));
    const prune = vi.fn(async ({ workspaceId }: { workspaceId: string }) => [
      { tableName: 'outbox_jobs', deleted: workspaceId === 'w1' ? 5 : 2 },
      { tableName: 'quotes', deleted: 1 },
    ]);
    const result = await runDataRetention(
      { abandonedLeads: { restrictAbandoned }, operational: { prune } },
      { actorId: 'actor', authorizedWorkspaceIds: ['w1', 'w2'] },
      now,
    );
    expect(prune).toHaveBeenCalledWith({ workspaceId: 'w2', actorId: 'actor', now });
    expect(result).toEqual({ restrictedLeads: 0, prunedRows: { outbox_jobs: 7, quotes: 2 } });
  });
});

describe('operationalRetentionEnabled (REL-19)', () => {
  it('is off unless OPERATIONAL_RETENTION_ENABLED is exactly 1', () => {
    expect(operationalRetentionEnabled({})).toBe(false);
    expect(operationalRetentionEnabled({ OPERATIONAL_RETENTION_ENABLED: 'true' })).toBe(false);
    expect(operationalRetentionEnabled({ OPERATIONAL_RETENTION_ENABLED: '1' })).toBe(true);
  });
});
