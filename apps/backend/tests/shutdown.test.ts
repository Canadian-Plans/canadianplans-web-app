import { afterEach, describe, expect, it, vi } from 'vitest';

import { createShutdownHandler } from '../src/shutdown.js';

describe('createShutdownHandler', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('awaits an in-flight scheduler run before closing the database and exiting', async () => {
    const calls: string[] = [];
    let releaseScheduler: () => void = () => undefined;
    const inFlightRun = new Promise<void>((resolve) => {
      releaseScheduler = resolve;
    });
    const handler = createShutdownHandler({
      server: {
        close: (callback) => {
          calls.push('close');
          callback();
        },
      },
      scheduler: {
        stop: () => {
          calls.push('stop');
          return inFlightRun;
        },
      },
      closeDatabase: async () => {
        calls.push('closeDatabase');
      },
      exit: (code) => {
        calls.push(`exit:${code}`);
      },
    });

    const running = handler();
    await Promise.resolve();
    await Promise.resolve();
    expect(calls).toEqual(['close', 'stop']);
    expect(calls).not.toContain('exit:0');

    releaseScheduler();
    await running;
    expect(calls).toEqual(['close', 'stop', 'closeDatabase', 'exit:0']);
  });

  it('runs the sequence once when signalled twice', async () => {
    const exit = vi.fn();
    const closeDatabase = vi.fn(async () => undefined);
    const handler = createShutdownHandler({
      server: { close: (callback) => callback() },
      closeDatabase,
      exit,
    });

    await Promise.all([handler(), handler()]);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(closeDatabase).toHaveBeenCalledTimes(1);
  });

  it('continues shutdown when the server reports a close error', async () => {
    const calls: string[] = [];
    const handler = createShutdownHandler({
      server: {
        close: (callback) => {
          calls.push('close');
          callback(new Error('connection still open'));
        },
      },
      closeDatabase: async () => {
        calls.push('closeDatabase');
      },
      exit: (code) => {
        calls.push(`exit:${code}`);
      },
    });

    await handler();
    expect(calls).toEqual(['close', 'closeDatabase', 'exit:0']);
  });

  it('force-exits after the hard timeout when a run never finishes', async () => {
    vi.useFakeTimers();
    const exit = vi.fn();
    const closeDatabase = vi.fn(async () => undefined);
    const handler = createShutdownHandler({
      server: { close: (callback) => callback() },
      scheduler: { stop: () => new Promise<void>(() => undefined) },
      closeDatabase,
      exit,
      timeoutMs: 25_000,
    });

    void handler();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(25_000);
    expect(exit).toHaveBeenCalledWith(0);
    expect(closeDatabase).not.toHaveBeenCalled();
  });
});
