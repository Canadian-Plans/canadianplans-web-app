import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

/**
 * Tracking secrets and hashing (T22, REQ 05). Every stored value is a keyed hash
 * bound to the workspace, order and normalized email, so the six-digit code is
 * never persisted in plaintext and a hash from one binding cannot be replayed
 * against another. The `tracking:otp` grant is a stateless HMAC-signed token.
 */

/** Normalization used for matching and hashing; never store the raw email in the challenge. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hmac(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

/** The keyed binding hash of the normalized email for one workspace + order. */
export function emailBindingHash(
  secret: string,
  workspaceId: string,
  orderId: string,
  normalizedEmail: string,
): string {
  return hmac(secret, `email\n${workspaceId}\n${orderId}\n${normalizedEmail}`);
}

/** The keyed hash of one code for one workspace + order + normalized email. */
export function codeBindingHash(
  secret: string,
  workspaceId: string,
  orderId: string,
  normalizedEmail: string,
  code: string,
): string {
  return hmac(secret, `code\n${workspaceId}\n${orderId}\n${normalizedEmail}\n${code}`);
}

/** A per-email rate-limit bucket key that does not put the email into the bucket row. */
export function emailRateBucket(
  secret: string,
  workspaceId: string,
  normalizedEmail: string,
): string {
  return `email:${hmac(secret, `rate\n${workspaceId}\n${normalizedEmail}`)}`;
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

const grantPayloadSchema = z.object({
  workspaceId: z.uuid(),
  orderId: z.uuid(),
  emailHash: z.string().min(1),
  exp: z.int().positive(),
});
export type TrackingGrantPayload = z.infer<typeof grantPayloadSchema>;

const GRANT_TTL_MS = 30 * 60 * 1_000;

/** Signs a stateless 30-minute grant bound to workspace + order + email hash. */
export function signTrackingGrant(
  secret: string,
  input: { workspaceId: string; orderId: string; emailHash: string },
  nowMs: number,
): { token: string; expiresAt: string } {
  const exp = nowMs + GRANT_TTL_MS;
  const body = Buffer.from(JSON.stringify({ ...input, exp }), 'utf8').toString('base64url');
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return { token: `${body}.${signature}`, expiresAt: new Date(exp).toISOString() };
}

/** Verifies a grant token and returns its payload, or `undefined` when invalid/expired. */
export function verifyTrackingGrant(
  secret: string,
  token: string,
  nowMs: number,
): TrackingGrantPayload | undefined {
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
  return parsed.data;
}

/** Loads the tracking HMAC secret. Unset or weak means tracking is unavailable. */
export function loadTrackingSecret(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const secret = env.TRACKING_HASH_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : undefined;
}
