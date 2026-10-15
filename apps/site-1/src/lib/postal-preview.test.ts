import { describe, expect, it } from 'vitest';
import { isValidPostalCode } from './postal-preview';
import { postalPreviewAction } from '@/app/(home)/actions';

describe('postal code preview', () => {
  it.each(['V3T 1Z2', 'v3t1z2', ' K1A 0B1 ', 'H0H-0H0'])(
    'accepts formatted Canadian examples: %s',
    (code) => {
      expect(isValidPostalCode(code)).toBe(true);
    },
  );
  it.each(['12345', 'D1A 1A1', 'W1A 1A1', 'A1I 1A1', 'V3T  1Z2', '', null])(
    'rejects invalid input without checking availability: %s',
    (code) => {
      expect(isValidPostalCode(code)).toBe(false);
    },
  );
  it('returns only a preview status from the stub, with no availability or reflected postal code', async () => {
    const form = new FormData();
    form.set('postalCode', 'V3T 1Z2');
    expect(await postalPreviewAction({ status: 'idle' }, form)).toEqual({ status: 'preview' });
    form.set('postalCode', 'invalid');
    expect(await postalPreviewAction({ status: 'preview' }, form)).toEqual({ status: 'invalid' });
  });
});
