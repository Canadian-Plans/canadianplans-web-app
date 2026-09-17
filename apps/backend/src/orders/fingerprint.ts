import { createHash } from 'node:crypto';

type CanonicalJson =
  null | boolean | number | string | CanonicalJson[] | { [key: string]: CanonicalJson };

function canonicalize(value: unknown): CanonicalJson {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('invalid_request_fingerprint');
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === 'object') {
    const result: { [key: string]: CanonicalJson } = {};
    for (const [key, child] of Object.entries(value).sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      if (child !== undefined) result[key] = canonicalize(child);
    }
    return result;
  }
  throw new Error('invalid_request_fingerprint');
}

export function requestFingerprint(value: unknown): string {
  const canonical = JSON.stringify(canonicalize(value));
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}

export function idempotencyKeyHash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
