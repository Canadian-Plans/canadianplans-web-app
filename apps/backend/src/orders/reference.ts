import { randomBytes } from 'node:crypto';

/** 96 random bits; short enough to read, too large to enumerate as a tracking secret. */
export function generateOrderReference(): string {
  return `CP-${randomBytes(12).toString('base64url').toUpperCase()}`;
}
