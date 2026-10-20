import { describe, expect, it } from 'vitest';

import {
  buildOrderForm,
  emptyDetails,
  parseOrderDetails,
  type InternetDetails,
  type MobileDetails,
} from './details';

/** Fixed clock so the age rule never depends on the day the tests run. */
const NOW = new Date('2026-10-20T12:00:00.000Z');

const internet: InternetDetails = {
  category: 'internet',
  fullName: 'Test Customer',
  email: ' Customer@Example.test ',
  phone: '(306) 555-0123',
  province: 'SK',
  dateOfBirth: '1990-05-15',
  streetAddress: '123 Main Street',
  aptUnit: '4B',
  city: 'Saskatoon',
  postalCode: 's7k0a1',
  currentProvider: 'SaskTel',
  preferredInstallationTime: 'Weekday mornings',
};

const mobile: MobileDetails = {
  category: 'mobile',
  fullName: 'Test Customer',
  email: 'customer@example.test',
  phone: '4165550123',
  lines: '2',
  currentProvider: 'Rogers',
  keepNumber: 'yes',
  simType: 'esim',
  streetAddress: '1 Queen Street',
  aptUnit: '',
  city: 'Toronto',
  postalCode: 'M5V 2T6',
  creditCheckConsent: true,
};

const arrival = {
  category: 'sim' as const,
  fullName: 'Test Customer',
  email: 'customer@example.test',
  phone: '1712345678',
  countryCode: 'bd',
  currentCountry: 'Bangladesh',
  destination: 'Toronto',
  arrivalDate: '2026-11-01',
};

function failed(input: unknown) {
  const result = parseOrderDetails(input, NOW);
  if (result.ok) throw new Error('expected the details to be rejected');
  return result.errors;
}

function accepted(input: unknown) {
  const result = parseOrderDetails(input, NOW);
  if (!result.ok) throw new Error(`expected the details to be accepted: ${JSON.stringify(result)}`);
  return result.order;
}

describe('pre-arrival (sim) details', () => {
  it('accepts valid details and normalises the country code', () => {
    const order = accepted(arrival);
    expect(order.category).toBe('sim');
    expect(order.contact.countryCode).toBe('BD');
    expect(order.province).toBeUndefined();
    expect(order.fields).toEqual({
      currentCountry: 'Bangladesh',
      destination: 'Toronto',
      arrivalDate: '2026-11-01',
    });
  });

  it('treats details with no category as the pre-arrival form', () => {
    const { category: _category, ...legacy } = arrival;
    expect(accepted(legacy).category).toBe('sim');
  });

  it('rejects each missing or malformed field with its own message', () => {
    const errors = failed({
      ...arrival,
      fullName: '',
      email: 'nope',
      phone: '12',
      countryCode: 'BGD',
      currentCountry: '',
      destination: '',
      arrivalDate: '1 Nov',
    });
    expect(Object.keys(errors).sort()).toEqual(
      [
        'arrivalDate',
        'countryCode',
        'currentCountry',
        'destination',
        'email',
        'fullName',
        'phone',
      ].sort(),
    );
  });

  it('accepts a phone number from any country', () => {
    expect(accepted({ ...arrival, phone: '+880 1712-345678' }).contact.phone).toBe(
      '+880 1712-345678',
    );
  });
});

describe('internet details', () => {
  it('accepts valid details, trims and lowercases nothing it should not, and formats the postal code', () => {
    const order = accepted(internet);
    expect(order.category).toBe('internet');
    expect(order.province).toBe('SK');
    expect(order.contact).toEqual({
      fullName: 'Test Customer',
      email: 'Customer@Example.test',
      phone: '(306) 555-0123',
      countryCode: 'CA',
    });
    expect(order.fields).toEqual({
      category: 'internet',
      province: 'SK',
      dateOfBirth: '1990-05-15',
      address: { street: '123 Main Street', unit: '4B', city: 'Saskatoon', postalCode: 'S7K 0A1' },
      currentProvider: 'SaskTel',
      preferredInstallationTime: 'Weekday mornings',
    });
  });

  it('omits the optional fields when they are blank', () => {
    const order = accepted({
      ...internet,
      aptUnit: '',
      currentProvider: '',
      preferredInstallationTime: '',
    });
    expect(order.fields).toEqual({
      category: 'internet',
      province: 'SK',
      dateOfBirth: '1990-05-15',
      address: { street: '123 Main Street', city: 'Saskatoon', postalCode: 'S7K 0A1' },
    });
  });

  it('requires a province that is a real province', () => {
    expect(failed({ ...internet, province: '' }).province).toBeDefined();
    expect(failed({ ...internet, province: 'XX' }).province).toBeDefined();
    expect(failed({ ...internet, province: 'CA' }).province).toBeDefined();
  });

  it.each(['1 Jan 1990', '1990-02-31', '2030-01-01', '1890-01-01'])(
    'rejects the date of birth %s',
    (dateOfBirth) => {
      expect(failed({ ...internet, dateOfBirth }).dateOfBirth).toBeDefined();
    },
  );

  it('rejects someone under 18 and accepts someone turning 18 today', () => {
    expect(failed({ ...internet, dateOfBirth: '2008-10-21' }).dateOfBirth).toMatch(/18/);
    expect(accepted({ ...internet, dateOfBirth: '2008-10-20' }).category).toBe('internet');
  });

  it('refuses a postal code from a different province than the one chosen', () => {
    // T is Alberta, but the customer chose Saskatchewan.
    expect(failed({ ...internet, postalCode: 'T2P 1J9' }).postalCode).toMatch(/province/);
  });

  it('does not decide a province from a territory postal code', () => {
    expect(accepted({ ...internet, province: 'BC', postalCode: 'X0A 0H0' }).province).toBe('BC');
  });

  it('rejects a malformed postal code and a short phone number', () => {
    expect(failed({ ...internet, postalCode: '12345' }).postalCode).toBeDefined();
    expect(failed({ ...internet, phone: '555-0123' }).phone).toBeDefined();
  });

  it('requires the address and the contact fields', () => {
    const errors = failed({
      ...internet,
      fullName: '',
      email: '',
      streetAddress: '',
      city: '',
    });
    expect(Object.keys(errors).sort()).toEqual(['city', 'email', 'fullName', 'streetAddress']);
  });
});

describe('mobile details', () => {
  it('accepts valid details and derives the province from the postal code', () => {
    const order = accepted(mobile);
    expect(order.category).toBe('mobile');
    expect(order.province).toBe('ON');
    expect(order.contact.countryCode).toBe('CA');
    expect(order.fields).toEqual({
      category: 'mobile',
      lines: 2,
      currentProvider: 'Rogers',
      keepNumber: true,
      simType: 'esim',
      address: { street: '1 Queen Street', city: 'Toronto', postalCode: 'M5V 2T6' },
    });
  });

  it('stores "no" for keep my number as false', () => {
    expect(accepted({ ...mobile, keepNumber: 'no' }).fields['keepNumber']).toBe(false);
  });

  it.each(['0', '11', '', 'two', '-1', '1.5'])('rejects %j lines', (lines) => {
    expect(failed({ ...mobile, lines }).lines).toBeDefined();
  });

  it('accepts one and ten lines', () => {
    expect(accepted({ ...mobile, lines: '1' }).fields['lines']).toBe(1);
    expect(accepted({ ...mobile, lines: '10' }).fields['lines']).toBe(10);
  });

  it('gives neither SIM question a default', () => {
    const errors = failed({ ...mobile, keepNumber: '', simType: '' });
    expect(errors.keepNumber).toBeDefined();
    expect(errors.simType).toBeDefined();
  });

  it('requires a listed current provider', () => {
    expect(failed({ ...mobile, currentProvider: '' }).currentProvider).toBeDefined();
    expect(failed({ ...mobile, currentProvider: 'Nobody Mobile' }).currentProvider).toBeDefined();
    expect(
      accepted({ ...mobile, currentProvider: "None – I don't have a phone plan" }).category,
    ).toBe('mobile');
  });

  it('requires the credit-check consent', () => {
    expect(failed({ ...mobile, creditCheckConsent: false }).creditCheckConsent).toBeDefined();
  });

  it('requires a valid postal code', () => {
    expect(failed({ ...mobile, postalCode: '' }).postalCode).toBeDefined();
  });
});

describe('unknown categories', () => {
  it('rejects a category the form does not know', () => {
    expect(parseOrderDetails({ ...arrival, category: 'tv' }, NOW)).toEqual({
      ok: false,
      errors: {},
    });
  });

  it('rejects input that is not an object', () => {
    expect(parseOrderDetails(null, NOW).ok).toBe(false);
    expect(parseOrderDetails('details', NOW).ok).toBe(false);
  });
});

describe('emptyDetails', () => {
  it('starts mobile at one line and gives no default to the SIM questions', () => {
    const empty = emptyDetails('mobile');
    expect(empty).toMatchObject({ category: 'mobile', lines: '1', keepNumber: '', simType: '' });
  });

  it.each(['sim', 'internet', 'mobile'] as const)('starts %s empty and invalid', (category) => {
    expect(parseOrderDetails(emptyDetails(category), NOW).ok).toBe(false);
  });
});

describe('buildOrderForm', () => {
  const options = { creditCheckConsentVersion: 'TEST-credit-check-v1' };

  it('keeps the pre-arrival payload exactly as it was before categories existed', () => {
    const form = buildOrderForm(accepted(arrival), ['passport'], false, options);
    expect(form).toEqual({
      schemaVersion: 1,
      payload: {
        currentCountry: 'Bangladesh',
        destination: 'Toronto',
        arrivalDate: '2026-11-01',
        documents: { required: ['passport'], acknowledged: false },
      },
    });
  });

  it('records the credit-check consent and its version for a mobile order', () => {
    const form = buildOrderForm(accepted(mobile), ['government_id'], true, options);
    expect(form.payload).toMatchObject({
      category: 'mobile',
      creditCheck: { consent: true, version: 'TEST-credit-check-v1' },
      documents: { required: ['government_id'], acknowledged: true },
    });
  });

  it('records no credit-check consent for internet', () => {
    const form = buildOrderForm(accepted(internet), [], false, options);
    expect(form.payload).not.toHaveProperty('creditCheck');
    expect(form.payload).toMatchObject({ category: 'internet', province: 'SK' });
  });

  it('adds extra fields such as a callback request', () => {
    const form = buildOrderForm(accepted(internet), [], false, {
      ...options,
      extra: { callbackRequested: true },
    });
    expect(form.payload).toMatchObject({ callbackRequested: true });
  });
});
