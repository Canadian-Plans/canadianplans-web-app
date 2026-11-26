import type { RawAttribution } from '@canadian-plans/contracts';
import { z } from 'zod';

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
  /** The page a remembered campaign landed on (see `readCampaignCookie`); wins over the referrer. */
  landingPath?: string | undefined;
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

/** A bare same-site path (no query, fragment or scheme), or undefined. */
function screenedPath(value: string | undefined): string | undefined {
  const path = bounded(value, LANDING_PATH_MAX);
  if (!path || !path.startsWith('/') || path.startsWith('//') || /[?#\\]/.test(path)) {
    return undefined;
  }
  return path;
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

  const landingPath =
    screenedPath(sources.landingPath) ??
    landingPathFromReferrer(sources.referrer, sources.origin) ??
    '/order';
  attribution['landingPath'] = landingPath;

  const referrerHost = referrerHostFor(sources.referrer, sources.origin);
  if (referrerHost) attribution['referrerHost'] = referrerHost;

  return attribution;
}

/**
 * The campaign query parameters to carry onto the next `/order` address, rebuilt
 * from an already-captured attribution object (so every value has passed the
 * screening above). Choosing a category, a province or a plan moves the customer
 * to a new `/order` URL; without these the `utm_*` and partner code they landed
 * with would be lost before the lead is saved.
 */
export function campaignQueryParams(attribution: RawAttribution): [string, string][] {
  const params: [string, string][] = [];
  for (const [queryKey, field] of UTM_KEYS) {
    const value = attribution[field];
    if (typeof value === 'string' && value.length > 0) params.push([queryKey, value]);
  }
  const partner = attribution['partnerCode'];
  if (typeof partner === 'string' && partner.length > 0) params.push(['partner', partner]);
  return params;
}

/** An `/order` address with the given parameters plus the carried campaign parameters. */
export function orderHref(
  params: Record<string, string | undefined>,
  attribution: RawAttribution,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  for (const [key, value] of campaignQueryParams(attribution)) query.set(key, value);
  const text = query.toString();
  return text ? `/order?${text}` : '/order';
}

/**
 * Session cookie that remembers the campaign a visitor landed with on any page,
 * so an order placed later in the same visit is still attributed. It holds only
 * the screened utm and partner values and the landing path (no personal data),
 * has no expiry (the browser drops it when the session ends) and is set by
 * `src/proxy.ts`. Disclosed in the privacy policy, version 3, section 1.
 */
export const CAMPAIGN_COOKIE = 'cp_campaign';

const storedCampaignSchema = z.object({
  params: z.record(z.string(), z.unknown()),
  landingPath: z.unknown().optional(),
});

interface StoredCampaign {
  readonly params: Record<string, string>;
  readonly landingPath: string;
}

/** The cookie value for a landing URL that carries a campaign, or undefined when it carries none. */
export function campaignCookieValue(
  searchParams: SearchParams,
  pathname: string,
  existing?: string,
): string | undefined {
  // The same campaign again (the order form carries it in its links) keeps the
  // page it first landed on.
  if (rememberedCampaign(searchParams, existing) && hasCampaign(searchParams)) return undefined;
  const screened = captureRawAttribution({ searchParams, referrer: undefined, origin: undefined });
  const params = campaignQueryParams(screened);
  if (params.length === 0) return undefined;
  const stored: StoredCampaign = {
    params: Object.fromEntries(params),
    landingPath: screenedPath(pathname) ?? '/',
  };
  return JSON.stringify(stored);
}

function campaignKey(searchParams: SearchParams): string {
  const screened = captureRawAttribution({ searchParams, referrer: undefined, origin: undefined });
  return JSON.stringify(campaignQueryParams(screened));
}

/** True when the URL itself names a campaign. */
export function hasCampaign(searchParams: SearchParams): boolean {
  return campaignKey(searchParams) !== '[]';
}

/**
 * The remembered campaign that applies to this request: the cookie's, unless the
 * URL names a different campaign (a new link wins). The same campaign carried in
 * the URL by the order form keeps the remembered landing page.
 */
export function rememberedCampaign(
  searchParams: SearchParams,
  cookieValue: string | undefined,
): ReturnType<typeof readCampaignCookie> {
  const stored = readCampaignCookie(cookieValue);
  if (!stored) return undefined;
  if (!hasCampaign(searchParams)) return stored;
  return campaignKey(searchParams) === campaignKey(stored.searchParams) ? stored : undefined;
}

/**
 * Reads the remembered campaign back as query-shaped parameters plus its landing
 * path. Anything malformed or unknown is dropped; the values are screened again
 * by `captureRawAttribution`, so a hand-edited cookie gains nothing.
 */
export function readCampaignCookie(
  value: string | undefined,
): { searchParams: SearchParams; landingPath: string | undefined } | undefined {
  if (!value || value.length > 2048) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return undefined;
  }
  const stored = storedCampaignSchema.safeParse(parsed);
  if (!stored.success) return undefined;
  const allowed = new Set<string>([...UTM_KEYS.map(([key]) => key), 'partner']);
  const searchParams: SearchParams = {};
  for (const [key, raw] of Object.entries(stored.data.params)) {
    if (allowed.has(key) && typeof raw === 'string') searchParams[key] = raw;
  }
  if (Object.keys(searchParams).length === 0) return undefined;
  const path = stored.data.landingPath;
  return {
    searchParams,
    landingPath: screenedPath(typeof path === 'string' ? path : undefined),
  };
}
