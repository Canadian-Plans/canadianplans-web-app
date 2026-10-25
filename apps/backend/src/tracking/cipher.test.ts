import { describe, expect, it } from 'vitest';
import {
  openTrackingCode,
  openTrackingEmail,
  sealTrackingCode,
  sealTrackingEmail,
} from './cipher.js';

const secret = 'a-long-enough-tracking-encryption-secret';
const binding = { workspaceId: 'workspace-a', challengeId: 'challenge-a' };
describe('encrypted tracking delivery code', () => {
  it('decrypts only with its secret and exact tenant/challenge binding', () => {
    const sealed = sealTrackingCode(secret, binding, '123456');
    expect(openTrackingCode(secret, binding, sealed)).toBe('123456');
    expect(openTrackingCode('other-key', binding, sealed)).toBeUndefined();
    for (const field of ['workspaceId', 'challengeId'] as const) {
      expect(openTrackingCode(secret, { ...binding, [field]: 'foreign' }, sealed)).toBeUndefined();
    }
    const tampered = (sealed[0] === 'A' ? 'B' : 'A') + sealed.slice(1);
    expect(openTrackingCode(secret, binding, tampered)).toBeUndefined();
    expect(openTrackingCode(secret, binding, 'malformed')).toBeUndefined();
    expect(sealTrackingCode(secret, binding, '123456')).not.toBe(sealed);
  });
});

describe('encrypted grant email', () => {
  const emailBinding = { workspaceId: 'workspace-a', emailHash: 'a'.repeat(64) };
  it('opens only under the same workspace and email hash, and never as a code', () => {
    const sealed = sealTrackingEmail(secret, emailBinding, 'jane@example.test');
    expect(openTrackingEmail(secret, emailBinding, sealed)).toBe('jane@example.test');
    expect(
      openTrackingEmail(secret, { ...emailBinding, workspaceId: 'workspace-b' }, sealed),
    ).toBeUndefined();
    expect(
      openTrackingEmail(secret, { ...emailBinding, emailHash: 'b'.repeat(64) }, sealed),
    ).toBeUndefined();
    // Separate keys per purpose: a sealed email is not a sealed code.
    expect(
      openTrackingCode(secret, { workspaceId: 'workspace-a', challengeId: 'a'.repeat(64) }, sealed),
    ).toBeUndefined();
  });
});
