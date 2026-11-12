import { afterEach, describe, expect, it, vi } from 'vitest';

const zodGlobal = globalThis as { __zod_globalConfig?: { jitless?: boolean } };

describe('browser instrumentation', () => {
  afterEach(() => {
    if (zodGlobal.__zod_globalConfig) delete zodGlobal.__zod_globalConfig.jitless;
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
        construct(target, args: unknown[]) {
          construct();
          return Reflect.construct(target, args) as object;
        },
      }),
    );
    const parsed = z.object({ email: z.string() }).safeParse({ email: 'a@example.test' });
    expect(parsed.success).toBe(true);
    expect(construct).not.toHaveBeenCalled();
  });
});
