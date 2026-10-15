import { describe, expect, it, vi } from 'vitest';
import { lookupInternetAvailability } from './internet-availability';
import { isValidMoveInDate } from './internet-check';
vi.mock('server-only', () => ({}));

describe('replaceable internet availability lookup', () => {
  it.each(['V3T 1Z2', ' v3t1z2 ', 'V3T-1Z2'])(
    'normalizes the available demo input %s',
    async (postalCode) => {
      const result = await lookupInternetAvailability({ postalCode });
      expect(result.status).toBe('available');
      if (result.status !== 'available') throw new Error('Expected available preview');
      expect(result.postalCode).toBe('V3T 1Z2');
      expect(result.previewOnly).toBe(true);
      expect(result.plans).toHaveLength(4);
    },
  );
  it('returns the unavailable scenario without inferring regional coverage', async () => {
    expect(await lookupInternetAvailability({ postalCode: 't0l1a0' })).toEqual({
      status: 'unavailable',
      postalCode: 'T0L 1A0',
      previewOnly: true,
    });
    expect(await lookupInternetAvailability({ postalCode: 'K1A 0B1' })).toEqual({
      status: 'error',
      reason: 'unconfigured',
      previewOnly: true,
    });
  });
  it.each(['V3T 1Z', 'D1A 1A1', '', null])(
    'rejects invalid postal input %s before fixture lookup',
    async (postalCode) => {
      expect(await lookupInternetAvailability({ postalCode })).toEqual({
        status: 'invalid',
        field: 'postalCode',
        previewOnly: true,
      });
    },
  );
  it('rejects invalid optional dates without changing the coverage outcome', async () => {
    expect(
      await lookupInternetAvailability({ postalCode: 'V3T 1Z2', moveInDate: '31/02/2026' }),
    ).toEqual({ status: 'invalid', field: 'moveInDate', previewOnly: true });
  });
});
describe('optional calendar date', () => {
  it.each(['', undefined, '15 / 10 / 2026', '29/02/2028'])('accepts %s', (value) =>
    expect(isValidMoveInDate(value)).toBe(true),
  );
  it.each(['29/02/2026', '32/01/2026', '12/13/2026', '2026-10-15', null])('rejects %s', (value) =>
    expect(isValidMoveInDate(value)).toBe(false),
  );
});
