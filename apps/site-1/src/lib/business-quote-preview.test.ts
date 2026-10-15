import { describe, expect, it } from 'vitest';
import { businessQuotePreviewAction } from '@/app/(business-internet)/actions';
import { validateBusinessQuote, type BusinessQuoteInput } from './business-quote-preview';

const valid = (overrides: Partial<BusinessQuoteInput> = {}): BusinessQuoteInput => ({
  businessName: 'Preview Café',
  name: 'Preview owner',
  email: 'owner@example.com',
  phone: '',
  postalCode: 'V3T 1Z2',
  need: 'internet',
  notes: '',
  ...overrides,
});

describe('business quote preview validation', () => {
  it('accepts a complete request with optional phone and notes left empty', () => {
    expect(validateBusinessQuote(valid())).toEqual({});
  });

  it('requires business name, name, email, postal code and need', () => {
    expect(
      Object.keys(
        validateBusinessQuote(
          valid({ businessName: ' ', name: '', email: 'nope', postalCode: '12345', need: '' }),
        ),
      ),
    ).toEqual(['businessName', 'name', 'email', 'postalCode', 'need']);
  });

  it.each(['call me', '+123', '+1234567890123456'])('rejects a malformed optional phone: %s', (phone) => {
    expect(validateBusinessQuote(valid({ phone })).phone).toBeDefined();
  });

  it('rejects unknown needs and overlong notes', () => {
    const errors = validateBusinessQuote(valid({ need: 'fibre-to-mars', notes: 'x'.repeat(2001) }));
    expect(errors.need).toBeDefined();
    expect(errors.notes).toBeDefined();
  });
});

describe('business quote stub action', () => {
  it('returns a preview result for valid input and never claims a real request', async () => {
    await expect(businessQuotePreviewAction(valid())).resolves.toEqual({
      status: 'preview',
      previewOnly: true,
    });
  });

  it('re-validates on the server and rejects invalid or malformed input', async () => {
    await expect(businessQuotePreviewAction(valid({ email: '' }))).resolves.toEqual({
      status: 'invalid',
      previewOnly: true,
    });
    const malformed = await Reflect.apply(businessQuotePreviewAction, undefined, [
      { ...valid(), notes: 42 },
    ]);
    expect(malformed).toEqual({ status: 'invalid', previewOnly: true });
  });
});
