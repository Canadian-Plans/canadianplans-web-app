import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

import { openTrackingEmail, sealTrackingEmail } from './cipher.js';

/**
 * Tracking secrets and hashing (T22, REQ 05). Every stored value is a keyed hash
 * bound to the workspace and normalized email, so the six-digit code is never
 * persisted in plaintext and a hash from one website or email cannot be
 * replayed against another. The grant is a stateless HMAC-signed token that
 * carries the verified email sealed (AES-GCM), so the backend can list that
 * email's orders without the browser ever holding a readable address.
 */

/** Normalization used for matching and hashing; never store the raw email in the challenge. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hmac(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

/** The keyed binding hash of the normalized email within one workspace. */
export function emailBindingHash(
  secret: string,
  workspaceId: string,
  normalizedEmail: string,
): string {
  return hmac(secret, `email:v2\n${workspaceId}\n${normalizedEmail}`);
}

/** The keyed hash of one code for one workspace + normalized email. */
export function codeBindingHash(
  secret: string,
  workspaceId: string,
  normalizedEmail: string,
  code: string,
): string {
  return hmac(secret, `code:v2\n${workspaceId}\n${normalizedEmail}\n${code}`);
}

/**
 * A per-email rate-limit bucket key that does not put the email into the bucket
 * row. Requesting a code and verifying one count separately: a shared counter
 * let a few mistyped codes silently block the next code request.
 */
export function emailRateBucket(
  secret: string,
  workspaceId: string,
  normalizedEmail: string,
  purpose: 'otp' | 'verify' | 'write',
): string {
  return `email:${purpose}:${hmac(secret, `rate\n${purpose}\n${workspaceId}\n${normalizedEmail}`)}`;
}

/** A cryptographically random six-digit code. */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashesEqual(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

function constantTimeStringEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}

const grantPayloadSchema = z
  .object({
    v: z.literal(2),
    workspaceId: z.uuid(),
    emailHash: z.string().regex(/^[a-f0-9]{64}$/),
    sealedEmail: z.string().min(1).max(1_024),
    exp: z.int().positive(),
  })
  .strict();

/** What a valid grant proves: this workspace's visitor verified this email. */
export interface TrackingGrantIdentity {
  workspaceId: string;
  normalizedEmail: string;
  emailHash: string;
}

export const TRACKING_GRANT_TTL_MS = 30 * 60 * 1_000;

/** Signs a stateless 30-minute grant bound to workspace + verified email. */
export function signTrackingGrant(
  secret: string,
  input: { workspaceId: string; normalizedEmail: string },
  nowMs: number,
): { token: string; expiresAt: string } {
  const exp = nowMs + TRACKING_GRANT_TTL_MS;
  const emailHash = emailBindingHash(secret, input.workspaceId, input.normalizedEmail);
  const sealedEmail = sealTrackingEmail(
    secret,
    { workspaceId: input.workspaceId, emailHash },
    input.normalizedEmail,
  );
  const body = Buffer.from(
    JSON.stringify({ v: 2, workspaceId: input.workspaceId, emailHash, sealedEmail, exp }),
    'utf8',
  ).toString('base64url');
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return { token: `${body}.${signature}`, expiresAt: new Date(exp).toISOString() };
}

/**
 * Verifies a grant token and returns the verified identity, or `undefined`
 * when the signature, expiry, sealed email or email hash does not hold. Grants
 * from before email-only tracking (bound to one order) are refused.
 */
export function verifyTrackingGrant(
  secret: string,
  token: string,
  nowMs: number,
): TrackingGrantIdentity | undefined {
  const separator = token.lastIndexOf('.');
  if (separator < 1) return undefined;
  const body = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  if (!constantTimeStringEqual(signature, expected)) return undefined;

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return undefined;
  }
  const parsed = grantPayloadSchema.safeParse(decoded);
  if (!parsed.success || parsed.data.exp <= nowMs) return undefined;
  const { workspaceId, emailHash, sealedEmail } = parsed.data;
  const normalizedEmail = openTrackingEmail(secret, { workspaceId, emailHash }, sealedEmail);
  if (!normalizedEmail) return undefined;
  if (!hashesEqual(emailBindingHash(secret, workspaceId, normalizedEmail), emailHash))
    return undefined;
  return { workspaceId, normalizedEmail, emailHash };
}

/** Loads the tracking HMAC secret. Unset or weak means tracking is unavailable. */
export function loadTrackingSecret(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const secret = env.TRACKING_HASH_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : undefined;
}
