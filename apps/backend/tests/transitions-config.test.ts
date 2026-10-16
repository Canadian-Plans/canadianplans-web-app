import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadOperationalTransitionsEnabled } from '../src/orders/transitions-config.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('loadOperationalTransitionsEnabled', () => {
  it.each(['1', 'true'])('enables operational transitions for %s in any environment', (value) => {
    expect(
      loadOperationalTransitionsEnabled({ NODE_ENV: 'test', ORDER_OPERATIONAL_TRANSITIONS: value }),
    ).toBe(true);
    expect(
      loadOperationalTransitionsEnabled({
        NODE_ENV: 'development',
        ORDER_OPERATIONAL_TRANSITIONS: value,
      }),
    ).toBe(true);
    expect(loadOperationalTransitionsEnabled({ ORDER_OPERATIONAL_TRANSITIONS: value })).toBe(true);
  });

  it.each(['1', 'true'])(
    'no longer ignores %s in production now that OPEN_INPUTS #15 is resolved',
    (value) => {
      expect(
        loadOperationalTransitionsEnabled({
          NODE_ENV: 'production',
          ORDER_OPERATIONAL_TRANSITIONS: value,
        }),
      ).toBe(true);
    },
  );

  it('stays off in production until deliberately set (opt-in, not default-on)', () => {
    expect(loadOperationalTransitionsEnabled({ NODE_ENV: 'production' })).toBe(false);
  });

  it.each([undefined, '', '0', 'yes', 'TRUE', 'True', ' true', 'true '])(
    'stays disabled for the unset or non-canonical value %j',
    (value) => {
      const env: NodeJS.ProcessEnv = { NODE_ENV: 'test' };
      if (value !== undefined) env.ORDER_OPERATIONAL_TRANSITIONS = value;
      expect(loadOperationalTransitionsEnabled(env)).toBe(false);
    },
  );

  it('reads the process environment by default', () => {
    expect(loadOperationalTransitionsEnabled()).toBe(false);

    vi.stubEnv('ORDER_OPERATIONAL_TRANSITIONS', '1');
    expect(loadOperationalTransitionsEnabled()).toBe(true);

    vi.stubEnv('NODE_ENV', 'production');
    expect(loadOperationalTransitionsEnabled()).toBe(true);
  });
});
