import { describe, it, expect } from 'vitest';
import {
  parseTrackingState,
  lookupTrackingFixture,
  checkTrackingChange,
  trackingChangeSchema,
} from './tracking-preview';
import { trackingFixtures, trackingStates, trackingCopy as copy } from '@content/track-order';
import { arrivalPlans } from '@content/pre-arrival';
import {
  trackingLookupAction,
  trackingChangeAction,
  trackingNoticeAction,
} from '@/app/(track-order)/track-order/actions';
describe('tracking preview', () => {
  it('has exactly one synthetic fixture for every allowed URL state', () => {
    expect(Object.keys(trackingFixtures)).toEqual([...trackingStates]);
    for (const state of trackingStates) {
      expect(parseTrackingState(state)).toBe(state);
      expect(trackingFixtures[state].key).toBe(state);
      expect(trackingFixtures[state].previewOnly).toBe(true);
    }
    for (const invalid of [undefined, ['esim-sent'], '<script>', 'unknown', {}, 5])
      expect(parseTrackingState(invalid)).toBe('lookup');
  });
  it('matches the fixture by reference and email or normalized phone', () => {
    for (const contact of ['AARAV@EXAMPLE.COM', '+91 98765 43210', '+919876543210'])
      expect(lookupTrackingFixture({ orderNumber: ' CP-2026-10482 ', contact })).toEqual({
        status: 'fixture',
        previewOnly: true,
        state: 'esim-sent',
      });
    expect(
      lookupTrackingFixture({ orderNumber: 'CP-2026-99999', contact: 'aarav@example.com' }),
    ).toEqual({ status: 'fixture', previewOnly: true, state: 'not-found' });
    expect(
      lookupTrackingFixture({ orderNumber: 'CP-2026-10482', contact: 'wrong@example.com' }),
    ).toEqual({ status: 'fixture', previewOnly: true, state: 'not-found' });
  });
  it('returns bounded generic validation errors without echoing input', () => {
    for (const input of [
      null,
      [],
      { orderNumber: 'private-invalid', contact: 'private-invalid' },
    ]) {
      const result = lookupTrackingFixture(input);
      expect(result.status).toBe('invalid');
      expect(JSON.stringify(result)).not.toContain('private-invalid');
    }
    expect(
      checkTrackingChange({ kind: 'private-invalid', value: 'private-invalid', note: '' }),
    ).toEqual({ status: 'invalid', previewOnly: true, errors: { kind: copy.change.valueError } });
  });
  it('validates change categories, email, calendar dates and registered plans', () => {
    const schema = trackingChangeSchema(new Date('2026-10-12T12:00:00Z'));
    for (const [kind, value] of [
      ['email', 'updated@example.com'],
      ['arrival', '12 / 10 / 2026'],
      ['plan', arrivalPlans[0]?.id],
      ['device', 'iPhone 15'],
      ['details', 'Corrected name'],
      ['other', 'Please review'],
    ])
      expect(schema.safeParse({ kind, value, note: '' }).success).toBe(true);
    for (const [kind, value] of [
      ['email', 'invalid'],
      ['arrival', '31 / 02 / 2099'],
      ['arrival', '11 / 10 / 2026'],
      ['plan', 'unregistered'],
      ['device', ''],
    ])
      expect(schema.safeParse({ kind, value, note: '' }).success).toBe(false);
    expect(
      schema.safeParse({ kind: 'email', value: 'updated@example.com', note: 'x'.repeat(2001) })
        .success,
    ).toBe(false);
  });
  it('stub actions report only preview results', async () => {
    expect(
      await trackingLookupAction({ orderNumber: 'CP-2026-10482', contact: 'aarav@example.com' }),
    ).toEqual({ status: 'fixture', previewOnly: true, state: 'esim-sent' });
    expect(
      await trackingChangeAction({ kind: 'email', value: 'updated@example.com', note: '' }),
    ).toEqual({ status: 'preview', previewOnly: true });
    expect(await trackingNoticeAction()).toEqual({ status: 'preview', previewOnly: true });
  });
});
