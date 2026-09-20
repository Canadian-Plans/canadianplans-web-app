import { describe, expect, it } from 'vitest';

import {
  codeBindingHash,
  emailBindingHash,
  emailRateBucket,
  generateOtpCode,
  hashesEqual,
  loadTrackingSecret,
  signTrackingGrant,
  verifyTrackingGrant,
} from './secrets.js';

const SECRET = 'test-secret-value-that-is-long-enough-32';
const WORKSPACE = '11111111-1111-4111-8111-111111111111';
const ORDER = '22222222-2222-4222-8222-222222222222';

describe('tracking hashing', () => {
  it('binds the email and code hash to workspace, order and normalized email', () => {
    const a = emailBindingHash(SECRET, WORKSPACE, ORDER, 'a@b.co');
    expect(a).toBe(emailBindingHash(SECRET, WORKSPACE, ORDER, 'a@b.co'));
    expect(a).not.toBe(emailBindingHash(SECRET, WORKSPACE, ORDER, 'c@d.co'));
    expect(a).not.toBe(
      emailBindingHash(SECRET, '33333333-3333-4333-8333-333333333333', ORDER, 'a@b.co'),
    );
    expect(codeBindingHash(SECRET, WORKSPACE, ORDER, 'a@b.co', '123456')).not.toBe(
      codeBindingHash(SECRET, WORKSPACE, ORDER, 'a@b.co', '654321'),
    );
    expect(emailRateBucket(SECRET, WORKSPACE, 'a@b.co')).not.toContain('a@b.co');
  });

  it('generates a six-digit code and compares hashes in constant time', () => {
    expect(generateOtpCode()).toMatch(/^\d{6}$/);
    const hash = codeBindingHash(SECRET, WORKSPACE, ORDER, 'a@b.co', '000000');
    expect(hashesEqual(hash, hash)).toBe(true);
    expect(hashesEqual(hash, codeBindingHash(SECRET, WORKSPACE, ORDER, 'a@b.co', '000001'))).toBe(
      false,
    );
  });
});

describe('tracking grant', () => {
  const NOW = Date.parse('2026-09-20T12:00:00.000Z');

  it('signs a 30-minute grant that verifies within its window', () => {
    const grant = signTrackingGrant(
      SECRET,
      { workspaceId: WORKSPACE, orderId: ORDER, emailHash: 'abc' },
      NOW,
    );
    expect(Date.parse(grant.expiresAt) - NOW).toBe(30 * 60 * 1_000);

    const payload = verifyTrackingGrant(SECRET, grant.token, NOW + 60_000);
    expect(payload).toMatchObject({ workspaceId: WORKSPACE, orderId: ORDER });
  });

  it('rejects an expired or tampered grant', () => {
    const grant = signTrackingGrant(
      SECRET,
      { workspaceId: WORKSPACE, orderId: ORDER, emailHash: 'abc' },
      NOW,
    );
    expect(verifyTrackingGrant(SECRET, grant.token, NOW + 31 * 60_000)).toBeUndefined();
    expect(verifyTrackingGrant(SECRET, `${grant.token}x`, NOW)).toBeUndefined();
    expect(
      verifyTrackingGrant('another-secret-value-long-enough-00', grant.token, NOW),
    ).toBeUndefined();
    expect(verifyTrackingGrant(SECRET, 'garbage', NOW)).toBeUndefined();
  });
});

describe('loadTrackingSecret', () => {
  it('requires a sufficiently long secret', () => {
    expect(loadTrackingSecret({})).toBeUndefined();
    expect(loadTrackingSecret({ TRACKING_HASH_SECRET: 'short' })).toBeUndefined();
    expect(loadTrackingSecret({ TRACKING_HASH_SECRET: SECRET })).toBe(SECRET);
  });
});
