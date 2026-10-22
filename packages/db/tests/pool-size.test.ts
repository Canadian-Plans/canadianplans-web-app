import { afterEach, describe, expect, it, vi } from 'vitest';

// Unit test: no database. `postgres` is replaced so the options the runtime
// client passes to the driver can be asserted without opening a socket.
const postgresMock = vi.hoisted(() =>
  vi.fn(() => ({ options: { parsers: {}, serializers: {} }, end: async () => {} })),
);
vi.mock('postgres', () => ({ default: postgresMock }));

const { createDatabaseClient, runtimePoolMax } = await import('../src/index.js');

afterEach(() => {
  postgresMock.mockClear();
  vi.unstubAllEnvs();
});

describe('runtime pool sizing (DATABASE_POOL_MAX)', () => {
  it('defaults to a small shared pool, not a single connection', () => {
    expect(runtimePoolMax({})).toBe(8);
  });

  it('honours an integer between 1 and 50 and ignores anything else', () => {
    expect(runtimePoolMax({ DATABASE_POOL_MAX: '5' })).toBe(5);
    expect(runtimePoolMax({ DATABASE_POOL_MAX: ' 12 ' })).toBe(12);
    for (const value of ['0', '51', '-3', '2.5', 'eight', '']) {
      expect(runtimePoolMax({ DATABASE_POOL_MAX: value })).toBe(8);
    }
  });

  it('passes the configured size to the driver with prepared statements disabled', () => {
    createDatabaseClient({
      connectionString: 'postgresql://app_runtime:secret@localhost:6543/app',
      ssl: false,
      maxConnections: runtimePoolMax({ DATABASE_POOL_MAX: '5' }),
    });
    expect(postgresMock).toHaveBeenCalledWith(
      'postgresql://app_runtime:secret@localhost:6543/app',
      expect.objectContaining({ max: 5, prepare: false }),
    );
  });
});
