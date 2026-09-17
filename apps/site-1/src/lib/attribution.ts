import type { RawAttribution } from '@canadian-plans/contracts';

/**
 * Captures attribution from the order URL and the referrer header into the
 * backend's allowlisted key shape (REQ 35).
 *
 * The backend (`apps/backend/src/leads/attribution.ts`) is the enforcer: it
 * re-truncates, drops unapproved referrer hosts and unrecognized landing paths,
 * and rejects anything that looks like a token, email or phone number. This
 * module mirrors that allowlist so the storefront never *sends* a raw query
 * string or an arbitrary path in the first place; if the two ever drift, the
 * backend still wins. Raw `utm_*` query values are read one key at a time —
 * the whole query string is never forwarded.
 */

/** Mirrors the backend's approved referrer origins. Keep in sync deliberately. */
const APPROVED_REFERRER_HOSTS = new Set([
  'google.com',
  'www.google.com',
  'bing.com',
  'www.bing.com',
  'facebook.com',
  'm.facebook.com',
  'l.facebook.com',
  'instagram.com',
  'tiktok.com',
  'youtube.com',
  't.co',
]);

const UTM_MAX = 120;
const PARTNER_CODE_MAX = 64;
const LANDING_PATH_MAX = 512;
const PARTNER_QUERY_KEYS = ['partner', 'ref', 'partner_code'] as const;

const UTM_KEYS: readonly (readonly [string, string])[] = [
  ['utm_source', 'utmSource'],
  ['utm_medium', 'utmMedium'],
  ['utm_campaign', 'utmCampaign'],
  ['utm_term', 'utmTerm'],
  ['utm_content', 'utmContent'],
];

export type SearchParams = Record<string, string | string[] | undefined>;

export interface AttributionSources {
  searchParams: SearchParams;
  /** The `Referer` request header, if the browser sent one. */
  referrer: string | undefined;
  /** This storefront's own origin, so same-site referrers become landing paths. */
  origin: string | undefined;
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function bounded(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return undefined;
  return trimmed;
}

/** Rejects a value that carries a query separator, an email or a phone-like run. */
function safeAttributionValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/[?#&=]/.test(value)) return undefined;
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value)) return undefined;
  if (/(?:access[_-]?token|auth[_-]?token|session[_-]?token|secret|password)/i.test(value)) {
    return undefined;
  }
  if (/^\+?[\d ()-]{7,}$/.test(value)) return undefined;
  return value;
}

function landingPathFromReferrer(referrer: string | undefined, origin: string | undefined) {
  if (!referrer) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(referrer);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
  // A same-site referrer becomes the landing path (query/fragment stripped).
  if (origin && parsed.origin === origin) {
    const path = bounded(parsed.pathname, LANDING_PATH_MAX);
    return path && path.startsWith('/') ? path : undefined;
  }
  return undefined;
}

function referrerHostFor(referrer: string | undefined, origin: string | undefined) {
  if (!referrer) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(referrer);
  } catch {
    return undefined;
  }
  if (origin && parsed.origin === origin) return undefined;
  const host = parsed.hostname.toLowerCase();
  return APPROVED_REFERRER_HOSTS.has(host) ? host : undefined;
}

/**
 * Builds the attribution object submitted with the lead. Only known keys are
 * emitted; every value is bounded and pre-screened. An empty result is `{}`.
 */
export function captureRawAttribution(sources: AttributionSources): RawAttribution {
  const attribution: Record<string, string> = {};

  for (const [queryKey, field] of UTM_KEYS) {
    const value = safeAttributionValue(bounded(first(sources.searchParams[queryKey]), UTM_MAX));
    if (value) attribution[field] = value;
  }

  const partnerCode = PARTNER_QUERY_KEYS.map((key) => first(sources.searchParams[key])).find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );
  const boundedPartner = safeAttributionValue(bounded(partnerCode, PARTNER_CODE_MAX));
  if (boundedPartner) attribution['partnerCode'] = boundedPartner;

  const landingPath = landingPathFromReferrer(sources.referrer, sources.origin) ?? '/order';
  attribution['landingPath'] = landingPath;

  const referrerHost = referrerHostFor(sources.referrer, sources.origin);
  if (referrerHost) attribution['referrerHost'] = referrerHost;

  return attribution;
}
