import { afterEach, describe, expect, it, vi } from 'vitest';

describe('browser instrumentation', () => {
  afterEach(() => {
    if (globalThis.__zod_globalConfig) delete globalThis.__zod_globalConfig.jitless;
    vi.unstubAllGlobals();
  });

  it('turns off the eval probe zod would otherwise report as a CSP violation', async () => {
    const { z } = await import('zod');
    expect(z.config().jitless).toBeUndefined();
    await import('./instrumentation-client');
    // zod reads the very object the instrumentation wrote to.
    expect(z.config().jitless).toBe(true);

    const construct = vi.fn();
    vi.stubGlobal(
      'Function',
      new Proxy(Function, {
        construct(target, args: unknown[]): object {
          construct();
          const made: unknown = Reflect.construct(target, args);
          if (typeof made !== 'function') throw new TypeError('Function did not build one.');
          return made;
        },
      }),
    );
    const parsed = z.object({ email: z.string() }).safeParse({ email: 'a@example.test' });
    expect(parsed.success).toBe(true);
    expect(construct).not.toHaveBeenCalled();
  });
});
