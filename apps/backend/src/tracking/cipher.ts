import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

/** What a queued code is bound to: one challenge of one workspace. */
export interface TrackingCodeBinding {
  workspaceId: string;
  challengeId: string;
}

/** What a grant's sealed email is bound to: one workspace and the email's keyed hash. */
export interface TrackingEmailBinding {
  workspaceId: string;
  emailHash: string;
}

function key(secret: string, purpose: string): Buffer {
  return createHmac('sha256', secret).update(purpose).digest();
}

function seal(secret: string, purpose: string, aad: unknown[], plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(secret, purpose), iv);
  cipher.setAAD(Buffer.from(JSON.stringify(aad)));
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [iv, encrypted, cipher.getAuthTag()].map((part) => part.toString('base64url')).join('.');
}

function open(secret: string, purpose: string, aad: unknown[], sealed: string): string | undefined {
  const parts = sealed.split('.');
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return undefined;
  const [iv, encrypted, tag] = parts.map((part) => Buffer.from(part, 'base64url'));
  if (iv!.length !== 12 || tag!.length !== 16) return undefined;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key(secret, purpose), iv!);
    decipher.setAAD(Buffer.from(JSON.stringify(aad)));
    decipher.setAuthTag(tag!);
    return Buffer.concat([decipher.update(encrypted!), decipher.final()]).toString('utf8');
  } catch {
    return undefined;
  }
}

const CODE_PURPOSE = 'canadian-plans:tracking-outbox:v2';
const EMAIL_PURPOSE = 'canadian-plans:tracking-grant-email:v1';

/** The queue needs a recoverable code for delivery, but never stores it in plaintext. */
export function sealTrackingCode(
  secret: string,
  binding: TrackingCodeBinding,
  code: string,
): string {
  if (!/^\d{6}$/.test(code)) throw new Error('invalid_tracking_code');
  return seal(secret, CODE_PURPOSE, [binding.workspaceId, binding.challengeId], code);
}

export function openTrackingCode(
  secret: string,
  binding: TrackingCodeBinding,
  sealed: string,
): string | undefined {
  if (sealed.length > 100) return undefined;
  const code = open(secret, CODE_PURPOSE, [binding.workspaceId, binding.challengeId], sealed);
  return code && /^\d{6}$/.test(code) ? code : undefined;
}

/** Seals the verified email into a grant so the browser never holds it readable. */
export function sealTrackingEmail(
  secret: string,
  binding: TrackingEmailBinding,
  normalizedEmail: string,
): string {
  return seal(secret, EMAIL_PURPOSE, [binding.workspaceId, binding.emailHash], normalizedEmail);
}

export function openTrackingEmail(
  secret: string,
  binding: TrackingEmailBinding,
  sealed: string,
): string | undefined {
  const email = open(secret, EMAIL_PURPOSE, [binding.workspaceId, binding.emailHash], sealed);
  return email && email.length <= 254 ? email : undefined;
}
