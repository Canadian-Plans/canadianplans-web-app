import { describe, expect, it } from 'vitest';
import {
  validateInternetOrder,
  emptyInternetOrder,
  type InternetOrderValues,
} from './internet-order-preview';
import { internetOrderPreviewAction } from '@/app/(internet-order)/order/home-internet/actions';
const now = new Date('2026-10-12T12:00:00Z');
const valid: InternetOrderValues = {
  firstName: 'Preview',
  lastName: 'Tester',
  email: 'preview@example.test',
  phone: '+880 1712 345678',
  birthDate: '29 / 02 / 2000',
  street: '123 Preview Street',
  city: 'Surrey',
  province: 'BC',
  postalCode: 'v3t1z2',
  installDate: '13 / 10 / 2026',
  callTime: '',
  contactConsent: true,
  terms: true,
};
describe('home internet preview validation', () => {
  it('accepts international phone, optional time and calendar input', () =>
    expect(validateInternetOrder(valid, now)).toEqual({}));
  it('requires details and separate contact/terms consent', () => {
    const errors = validateInternetOrder({ ...emptyInternetOrder, contactConsent: false }, now);
    expect(errors).toMatchObject({
      firstName: expect.any(String),
      lastName: expect.any(String),
      street: expect.any(String),
      contactConsent: expect.any(String),
      terms: expect.any(String),
    });
  });
  it('rejects impossible, future birth and past install dates without an invented age rule', () => {
    expect(validateInternetOrder({ ...valid, birthDate: '29 / 02 / 2001' }, now)).toHaveProperty(
      'birthDate',
    );
    expect(validateInternetOrder({ ...valid, birthDate: '13 / 10 / 2026' }, now)).toHaveProperty(
      'birthDate',
    );
    expect(validateInternetOrder({ ...valid, installDate: '11 / 10 / 2026' }, now)).toHaveProperty(
      'installDate',
    );
    expect(
      validateInternetOrder(
        { ...valid, birthDate: '11 / 10 / 2026', installDate: '12 / 10 / 2026' },
        now,
      ),
    ).toEqual({});
  });
  it('rejects invalid postal codes, option injection and malformed phone/email', () => {
    expect(
      validateInternetOrder(
        {
          ...valid,
          postalCode: 'D1A 1A1',
          province: 'not-a-province',
          callTime: 'anytime',
          phone: 'letters',
          email: 'invalid',
        },
        now,
      ),
    ).toMatchObject({
      postalCode: expect.any(String),
      province: expect.any(String),
      callTime: expect.any(String),
      phone: expect.any(String),
      email: expect.any(String),
    });
  });
  it('fails closed for arbitrary runtime input', () => {
    for (const input of [null, undefined, {}, 'text', { ...valid, terms: 'true' }])
      expect(Object.keys(validateInternetOrder(input, now)).length).toBeGreaterThan(0);
  });
  it('stub returns only preview status and never a reference or captured personal data', async () => {
    const input = { ...valid, installDate: '31 / 12 / 2099' };
    expect(await internetOrderPreviewAction(input)).toEqual({
      status: 'preview',
      previewOnly: true,
    });
    const result = await internetOrderPreviewAction({ ...input, terms: false });
    expect(result.status).toBe('invalid');
    expect(JSON.stringify(result)).not.toContain(input.email);
    expect(result).not.toHaveProperty('reference');
  });
});
