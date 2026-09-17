import { afterEach, describe, expect, it, vi } from 'vitest';

import { MachineRegistry, type MachineRegistryConfig } from '../src/machines/registry.js';
import {
  createBackendScheduler,
  createScheduler,
  SchedulerConfigurationError,
  type SchedulerTask,
} from '../src/scheduler.js';

const WORKSPACE = '10000000-0000-4000-8000-000000000901';
const ACTOR = '20000000-0000-4000-8000-000000000901';
const SECRET = 'scheduler-secret-value-000000000901';

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
    await scheduler?.stop();
  });
});
