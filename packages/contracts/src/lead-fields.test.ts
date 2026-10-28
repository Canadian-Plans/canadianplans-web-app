import { describe, expect, test } from 'vitest';
import {
  applyLeadFieldEdits,
  builtInLeadFields,
  createLeadFieldSchema,
  fieldOptionSchema,
  generateLeadFieldKey,
  inferLeadType,
  leadFieldSchema,
  leadFieldTypes,
  leadLayoutSchema,
  leadSearchSchema,
  parseLeadFieldValue,
  updateLeadFieldSchema,
  validateLeadQuery,
} from './lead-fields';

const field = (type: keyof typeof leadFieldTypes = 'text') =>
  leadFieldSchema.parse({
    id: '10000000-0000-4000-8000-000000000001',
    key: 'custom_test',
    label: 'Test',
    type,
    origin: 'custom',
    createdBy: null,
    updatedBy: null,
    createdAt: '2026-10-27T00:00:00.000Z',
    updatedAt: '2026-10-27T00:00:00.000Z',
    version: 1,
    options:
      type === 'select' || type === 'multi_select'
        ? [fieldOptionSchema.parse({ value: 'a', label: 'A' })]
        : [],
  });
describe('lead field contracts', () => {
  test.each([
    ['text', ' value ', 'value'],
    ['long_text', 'hello\nworld', 'hello\nworld'],
    ['number', 0, 0],
    ['boolean', false, false],
    ['date', '2024-02-29', '2024-02-29'],
    ['datetime', '2026-10-27T10:00:00Z', '2026-10-27T10:00:00Z'],
    ['select', 'a', 'a'],
    ['multi_select', ['a'], ['a']],
    [
      'phone',
      { number: '+1 (613) 555-0100', countryCode: 'CA' },
      { number: '+16135550100', countryCode: 'CA' },
    ],
    ['email', { address: 'TEST@example.com' }, { address: 'test@example.com' }],
    [
      'address',
      { street: '1 Test', city: 'Test', postalCode: 'K1A 0B1' },
      { street: '1 Test', city: 'Test', postalCode: 'K1A 0B1' },
    ],
    [
      'links',
      [{ url: 'https://example.com', label: 'Example' }],
      [{ url: 'https://example.com', label: 'Example' }],
    ],
  ] as const)('validates and normalizes %s', (type, value, expected) => {
    expect(parseLeadFieldValue(field(type), value)).toEqual(expected);
  });
  test.each([
    ['text', ''],
    ['text', 'x'.repeat(501)],
    ['long_text', 'x'.repeat(10001)],
    ['number', Infinity],
    ['number', '3'],
    ['number', 1e13],
    ['boolean', 'false'],
    ['date', '2025-02-29'],
    ['date', '2026-13-01'],
    ['datetime', 'tomorrow'],
    ['select', 'unknown'],
    ['multi_select', ['a', 'a']],
    ['multi_select', []],
    ['phone', { number: 'invalid', countryCode: 'CA' }],
    ['phone', { number: '+12345', countryCode: 'Canada' }],
    ['email', { address: 'not email' }],
    ['address', { street: 'x', city: 'x' }],
    ['links', [{ url: 'javascript:alert(1)' }]],
    ['links', [{ url: 'https://example.com', extra: 'no' }]],
  ] as const)('rejects malformed %s without echoing its value', (type, value) => {
    expect(() => parseLeadFieldValue(field(type), value)).toThrow('Invalid lead field operation.');
  });
  test('generates stable collision-safe keys, including deleted reservations', () => {
    const key = generateLeadFieldKey('Arrival preference', new Set());
    expect(key).toBe('custom_arrival_preference');
    expect(generateLeadFieldKey('Arrival preference', new Set([key]))).toBe(`${key}_2`);
    expect(updateLeadFieldSchema.safeParse({ expectedVersion: 1, key: 'renamed' }).success).toBe(
      false,
    );
    expect(updateLeadFieldSchema.safeParse({ expectedVersion: 1, type: 'number' }).success).toBe(
      false,
    );
    expect(
      createLeadFieldSchema.safeParse({ label: 'X', type: 'text', required: true }).success,
    ).toBe(false);
  });
  test('applies typed edits, removes clear values and reports only changed keys', () => {
    const f = field();
    const input = {
      fields: [f],
      leadType: 'sim' as const,
      current: { custom_test: 'before', other: false },
      edits: { custom_test: ' after ' },
      audience: 'staff' as const,
    };
    expect(applyLeadFieldEdits(input)).toEqual({
      values: { custom_test: 'after', other: false },
      changedKeys: ['custom_test'],
    });
    expect(applyLeadFieldEdits({ ...input, edits: { custom_test: null } })).toEqual({
      values: { other: false },
      changedKeys: ['custom_test'],
    });
    expect(applyLeadFieldEdits({ ...input, edits: { custom_test: 'before' } }).changedKeys).toEqual(
      [],
    );
    for (const changed of [
      { active: false },
      { staffEditable: false },
      { leadTypes: ['mobile'] as const },
    ]) {
      expect(() =>
        applyLeadFieldEdits({
          ...input,
          fields: [{ ...f, ...changed, leadTypes: [...(changed.leadTypes ?? f.leadTypes)] }],
        }),
      ).toThrow();
    }
    expect(() => applyLeadFieldEdits({ ...input, audience: 'website' })).toThrow();
    expect(() => applyLeadFieldEdits({ ...input, edits: { unknown: 'no' } })).toThrow();
  });
  test('keeps hidden options readable but refuses new assignment', () => {
    const f = field('select');
    f.options[0]!.hidden = true;
    expect(parseLeadFieldValue(f, 'a', true)).toBe('a');
    expect(() => parseLeadFieldValue(f, 'a')).toThrow();
  });
  test('enforces search bounds, personal access and operators by type', () => {
    const state = {
      columns: ['custom_test'],
      filters: [],
      sort: { key: 'custom_test', direction: 'asc' as const },
    };
    expect(() => validateLeadQuery(state, [field()], true)).not.toThrow();
    expect(() => validateLeadQuery(state, [field()], false)).toThrow();
    expect(() => validateLeadQuery(state, [{ ...field(), sensitive: true }], true)).toThrow();
    expect(() =>
      validateLeadQuery(
        { ...state, filters: [{ key: 'custom_test', operator: 'contains', value: '1' }] },
        [field('number')],
        true,
      ),
    ).toThrow();
    expect(
      leadSearchSchema.safeParse({
        ...state,
        filters: Array(11).fill({ key: 'x', operator: 'empty' }),
      }).success,
    ).toBe(false);
    expect(
      leadSearchSchema.safeParse({
        ...state,
        columns: Array.from({ length: 13 }, (_, i) => `f${i}`),
      }).success,
    ).toBe(false);
  });
  test('has code-owned definitions for every current website form key and preserves ambiguous rows', () => {
    for (const key of [
      'fullName',
      'email',
      'phone',
      'countryCode',
      'currentCountry',
      'destination',
      'arrivalDate',
      'province',
      'dateOfBirth',
      'address',
      'currentProvider',
      'preferredInstallationTime',
      'lines',
      'keepNumber',
      'simType',
      'documents',
      'creditCheck',
      'callbackRequested',
      'category',
    ])
      expect(builtInLeadFields.some((f) => f.key === key)).toBe(true);
    expect(builtInLeadFields.find((f) => f.key === 'dateOfBirth')?.sensitive).toBe(true);
    expect(inferLeadType({ category: 'internet' }, 'mobile')).toBe('internet');
    expect(inferLeadType({}, 'mobile')).toBe('mobile');
    expect(inferLeadType({ arrivalDate: '2026-12-01' })).toBe('sim');
    expect(inferLeadType({ unknown: 'value' })).toBe('legacy');
  });
  test('rejects duplicate layout entries', () => {
    expect(
      leadLayoutSchema.safeParse({ sections: [{ id: 'main', label: 'Main', fields: ['a', 'a'] }] })
        .success,
    ).toBe(false);
  });
});
