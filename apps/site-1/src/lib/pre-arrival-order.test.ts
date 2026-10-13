import { describe, it, expect } from 'vitest';
import {
  emptyPreArrival,
  preArrivalSchemas,
  parsePreArrivalDraft,
  checkPreArrivalPreview,
  documentMetadataSchema,
} from './pre-arrival-order';
import { preArrivalPreviewAction } from '@/app/(pre-arrival-order)/order/pre-arrival/actions';
const now = new Date('2026-10-12T12:00:00Z');
function valid() {
  return {
    ...emptyPreArrival,
    firstName: 'Aarav',
    lastName: 'Sharma',
    email: 'preview@example.test',
    phone: '+880 17123 45678',
    arrivalDate: '14 / 11 / 2099',
    city: 'Vancouver',
    passportNumber: 'TEST123',
    birthDate: '15 / 04 / 1995',
    confirmEmail: 'preview@example.test',
    phoneModel: 'iPhone 15',
    contactConsent: true,
    terms: true,
    passportFile: { name: 'passport.png', type: 'image/png', size: 100 },
    permitFile: { name: 'permit.pdf', type: 'application/pdf', size: 100 },
  };
}
describe('pre-arrival preview', () => {
  it('validates international details without inventing a minimum age', () => {
    expect(
      preArrivalSchemas(now).all.safeParse({
        ...valid(),
        firstName: 'সামির',
        birthDate: '11 / 10 / 2026',
      }).success,
    ).toBe(true);
    expect(checkPreArrivalPreview(valid(), 'preview-rogers-plus', now)).toEqual({
      status: 'preview',
      previewOnly: true,
    });
  });
  it('keeps step-one validation independent of missing documents', () => {
    expect(
      preArrivalSchemas(now).one.safeParse({ ...valid(), passportFile: null, permitFile: null })
        .success,
    ).toBe(true);
    expect(preArrivalSchemas(now).all.safeParse({ ...valid(), passportFile: null }).success).toBe(
      false,
    );
  });
  it('requires a country code and validates calendar dates', () => {
    for (const overrides of [
      { phone: '98765 43210' },
      { arrivalDate: '31 / 02 / 2099' },
      { arrivalDate: '11 / 10 / 2026' },
      { birthDate: '13 / 10 / 2026' },
      { birthDate: '29 / 02 / 2001' },
    ])
      expect(preArrivalSchemas(now).all.safeParse({ ...valid(), ...overrides }).success).toBe(
        false,
      );
  });
  it('checks email confirmation and separate consents', () => {
    for (const overrides of [
      { confirmEmail: 'different@example.test' },
      { contactConsent: false },
      { terms: false },
    ])
      expect(preArrivalSchemas(now).all.safeParse({ ...valid(), ...overrides }).success).toBe(
        false,
      );
    expect(
      preArrivalSchemas(now).all.safeParse({ ...valid(), confirmEmail: 'PREVIEW@EXAMPLE.TEST' })
        .success,
    ).toBe(true);
  });
  it('bounds document metadata and rejects unsupported types', () => {
    expect(
      documentMetadataSchema.safeParse({ name: 'p.png', size: 10 * 1024 * 1024, type: 'image/png' })
        .success,
    ).toBe(true);
    for (const file of [
      { name: 'p.exe', size: 10, type: 'application/x-msdownload' },
      { name: 'p.png', size: 0, type: 'image/png' },
      { name: 'p.png', size: 10 * 1024 * 1024 + 1, type: 'image/png' },
    ])
      expect(documentMetadataSchema.safeParse(file).success).toBe(false);
  });
  it('fails closed on unknown input, plan IDs and audience mismatches', () => {
    for (const input of [null, [], {}, 'text'])
      expect(checkPreArrivalPreview(input, 'preview-rogers-plus', now).status).toBe('invalid');
    expect(checkPreArrivalPreview(valid(), 'made-up', now).status).toBe('invalid');
    expect(
      checkPreArrivalPreview({ ...valid(), audience: 'visitor' }, 'preview-rogers-plus', now)
        .status,
    ).toBe('invalid');
  });
  it('restores incomplete versioned drafts without trusting corrupt or unbounded data', () => {
    const draft = {
      version: 1,
      planId: 'preview-rogers-plus',
      step: 'two',
      values: { ...emptyPreArrival, firstName: 'Aarav' },
    };
    expect(parsePreArrivalDraft(JSON.stringify(draft))).toEqual(draft);
    for (const raw of [
      '{',
      null,
      JSON.stringify({ ...draft, version: 2 }),
      JSON.stringify({ ...draft, planId: 'fake' }),
      JSON.stringify({ ...draft, values: { ...draft.values, email: 'x'.repeat(301) } }),
    ])
      expect(parsePreArrivalDraft(raw)).toBeUndefined();
  });
  it('server stub returns only a preview status or generic errors', async () => {
    expect(await preArrivalPreviewAction(valid(), 'preview-rogers-plus')).toEqual({
      status: 'preview',
      previewOnly: true,
    });
    const bad = await preArrivalPreviewAction(null, 'preview-rogers-plus');
    expect(bad.status).toBe('invalid');
    expect(JSON.stringify(bad)).not.toContain('preview@example.test');
    expect(bad).not.toHaveProperty('reference');
  });
});
