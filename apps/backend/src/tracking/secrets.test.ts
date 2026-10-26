import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { sealTrackingEmail } from './cipher.js';
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
const OTHER_WORKSPACE = '33333333-3333-4333-8333-333333333333';

describe('tracking hashing', () => {
  it('binds the email and code hash to workspace and normalized email', () => {
    const a = emailBindingHash(SECRET, WORKSPACE, 'a@b.co');
    expect(a).toBe(emailBindingHash(SECRET, WORKSPACE, 'a@b.co'));
    expect(a).not.toBe(emailBindingHash(SECRET, WORKSPACE, 'c@d.co'));
    expect(a).not.toBe(emailBindingHash(SECRET, OTHER_WORKSPACE, 'a@b.co'));
    expect(codeBindingHash(SECRET, WORKSPACE, 'a@b.co', '123456')).not.toBe(
      codeBindingHash(SECRET, WORKSPACE, 'a@b.co', '654321'),
    );
    expect(codeBindingHash(SECRET, WORKSPACE, 'a@b.co', '123456')).not.toBe(
      codeBindingHash(SECRET, OTHER_WORKSPACE, 'a@b.co', '123456'),
    );
    expect(emailRateBucket(SECRET, WORKSPACE, 'a@b.co', 'otp')).not.toContain('a@b.co');
    // Requesting, verifying and writing never share a counter.
    expect(emailRateBucket(SECRET, WORKSPACE, 'a@b.co', 'otp')).toMatch(/^email:otp:/);
    expect(emailRateBucket(SECRET, WORKSPACE, 'a@b.co', 'verify')).toMatch(/^email:verify:/);
    expect(emailRateBucket(SECRET, WORKSPACE, 'a@b.co', 'write')).toMatch(/^email:write:/);
  });

  it('generates a six-digit code and compares hashes in constant time', () => {
    expect(generateOtpCode()).toMatch(/^\d{6}$/);
    const hash = codeBindingHash(SECRET, WORKSPACE, 'a@b.co', '000000');
    expect(hashesEqual(hash, hash)).toBe(true);
    expect(hashesEqual(hash, codeBindingHash(SECRET, WORKSPACE, 'a@b.co', '000001'))).toBe(false);
  });
});

describe('tracking grant', () => {
  const NOW = Date.parse('2026-10-25T12:00:00.000Z');

  it('signs a 30-minute grant that proves the workspace and email', () => {
    const grant = signTrackingGrant(
      SECRET,
      { workspaceId: WORKSPACE, normalizedEmail: 'jane@example.test' },
      NOW,
    );
    expect(Date.parse(grant.expiresAt) - NOW).toBe(30 * 60 * 1_000);
    // The address is sealed, never readable in the token.
    expect(Buffer.from(grant.token.split('.')[0]!, 'base64url').toString('utf8')).not.toContain(
      'jane@example.test',
    );

    expect(verifyTrackingGrant(SECRET, grant.token, NOW + 60_000)).toEqual({
      workspaceId: WORKSPACE,
      normalizedEmail: 'jane@example.test',
      emailHash: emailBindingHash(SECRET, WORKSPACE, 'jane@example.test'),
    });
  });

  it('rejects an expired or tampered grant', () => {
    const grant = signTrackingGrant(
      SECRET,
      { workspaceId: WORKSPACE, normalizedEmail: 'jane@example.test' },
      NOW,
    );
    expect(verifyTrackingGrant(SECRET, grant.token, NOW + 31 * 60_000)).toBeUndefined();
    expect(verifyTrackingGrant(SECRET, `${grant.token}x`, NOW)).toBeUndefined();
    expect(
      verifyTrackingGrant('another-secret-value-long-enough-00', grant.token, NOW),
    ).toBeUndefined();
    expect(verifyTrackingGrant(SECRET, 'garbage', NOW)).toBeUndefined();
  });

  /** Re-signs an edited body, as an attacker who somehow held the key would. */
  function resign(body: Record<string, unknown>): string {
    const encoded = Buffer.from(JSON.stringify(body), 'utf8').toString('base64url');
    return `${encoded}.${createHmac('sha256', SECRET).update(encoded).digest('base64url')}`;
  }

  it('refuses a grant whose sealed email does not match its email hash', () => {
    const emailHash = emailBindingHash(SECRET, WORKSPACE, 'jane@example.test');
    const swapped = sealTrackingEmail(
      SECRET,
      { workspaceId: WORKSPACE, emailHash },
      'mallory@example.test',
    );
    const token = resign({
      v: 2,
      workspaceId: WORKSPACE,
      emailHash,
      sealedEmail: swapped,
      exp: NOW + 60_000,
    });
    expect(verifyTrackingGrant(SECRET, token, NOW)).toBeUndefined();
  });

  it('refuses a sealed email moved to another workspace', () => {
    const grant = signTrackingGrant(
      SECRET,
      { workspaceId: WORKSPACE, normalizedEmail: 'jane@example.test' },
      NOW,
    );
    const body = z
      .record(z.string(), z.unknown())
      .parse(JSON.parse(Buffer.from(grant.token.split('.')[0]!, 'base64url').toString('utf8')));
    const token = resign({
      ...body,
      workspaceId: OTHER_WORKSPACE,
      emailHash: emailBindingHash(SECRET, OTHER_WORKSPACE, 'jane@example.test'),
    });
    expect(verifyTrackingGrant(SECRET, token, NOW)).toBeUndefined();
  });

  it('refuses a grant from before email-only tracking (bound to one order)', () => {
    const token = resign({
      workspaceId: WORKSPACE,
      orderId: '22222222-2222-4222-8222-222222222222',
      emailHash: 'abc',
      exp: NOW + 60_000,
    });
    expect(verifyTrackingGrant(SECRET, token, NOW)).toBeUndefined();
  });
});

describe('loadTrackingSecret', () => {
  it('requires a sufficiently long secret', () => {
    expect(loadTrackingSecret({})).toBeUndefined();
    expect(loadTrackingSecret({ TRACKING_HASH_SECRET: 'short' })).toBeUndefined();
    expect(loadTrackingSecret({ TRACKING_HASH_SECRET: SECRET })).toBe(SECRET);
  });
});
