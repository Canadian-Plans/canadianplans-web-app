import { createHash } from 'node:crypto';
import type { CommercialOffer } from '@canadian-plans/contracts';

type CanonicalJson =
  null | boolean | number | string | CanonicalJson[] | { [key: string]: CanonicalJson };

function canonicalize(value: unknown): CanonicalJson {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new Error('Commercial payload contains a non-finite number.');
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
  throw new Error('Commercial payload contains an unsupported value.');
}

export function canonicalCommercialJson(content: CommercialOffer): string {
  return JSON.stringify(canonicalize(content));
}

export function commercialContentHash(content: CommercialOffer): string {
  return `sha256:${createHash('sha256').update(canonicalCommercialJson(content)).digest('hex')}`;
}
