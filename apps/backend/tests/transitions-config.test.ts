import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadOperationalTransitionsEnabled } from '../src/orders/transitions-config.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('loadOperationalTransitionsEnabled', () => {
  it.each(['1', 'true'])('enables operational transitions outside production for %s', (value) => {
    expect(
      loadOperationalTransitionsEnabled({ NODE_ENV: 'test', ORDER_OPERATIONAL_TRANSITIONS: value }),
    ).toBe(true);
    expect(
      loadOperationalTransitionsEnabled({
        NODE_ENV: 'development',
        ORDER_OPERATIONAL_TRANSITIONS: value,
      }),
    ).toBe(true);
    // An absent NODE_ENV is not production either.
    expect(loadOperationalTransitionsEnabled({ ORDER_OPERATIONAL_TRANSITIONS: value })).toBe(true);
  });

  it.each(['1', 'true'])('ignores %s exactly when NODE_ENV is production', (value) => {
    expect(
      loadOperationalTransitionsEnabled({
        NODE_ENV: 'production',
        ORDER_OPERATIONAL_TRANSITIONS: value,
      }),
    ).toBe(false);
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
    expect(loadOperationalTransitionsEnabled()).toBe(false);
  });
});
