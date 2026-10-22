/**
 * SEO/indexability helpers (REQ 10). The canonical base URL follows the
 * deployment via `NEXT_PUBLIC_SITE_URL`; only a real production deployment is
 * indexable, so preview and local builds are excluded from search indexes
 * (REQ 10, §16 gate 12). These run server-side (layout, robots.ts, sitemap.ts).
 */

const DEFAULT_BASE_URL = 'http://localhost:3001';

/**
 * Launch step 6.1 switch: while false every commercial page stays noindex and
 * off the sitemap; flip to true (one deploy) to open the storefront to search.
 * Order, tracking, search, dev, Studio, legacy plan and business pages are never
 * listed regardless of this flag.
 */
export const STOREFRONT_INDEXING_OPEN = false;

export const INDEXABLE_PATHS: readonly string[] = [
  '/',
  '/about',
  '/contact',
  '/faq',
  '/guides',
  '/home-internet',
  '/home-internet/vancouver',
  '/home-internet/ontario',
  '/mobile-plans',
  '/pre-arrival-sim',
  '/pre-arrival-sim/students',
  '/pre-arrival-sim/from-india',
  '/pre-arrival-sim/toronto-pearson',
  '/accessibility',
];

/** Per-page robots metadata: undefined lets the root layout decide once indexing is open. */
export function publicRobots(path: string): { index: boolean; follow: boolean } | undefined {
  const listed = INDEXABLE_PATHS.includes(path) || path.startsWith('/guides/');
  return STOREFRONT_INDEXING_OPEN && listed ? undefined : { index: false, follow: false };
}

/** Absolute origin used for canonical URLs, the sitemap and robots. No trailing slash. */
export function siteBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  // Production safety net: Vercel exposes the project's production host, so a
  // missing NEXT_PUBLIC_SITE_URL no longer silently emits localhost canonicals.
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const candidate =
    raw ||
    (process.env.VERCEL_ENV === 'production' && vercelHost ? `https://${vercelHost}` : undefined);
  if (!candidate) return DEFAULT_BASE_URL;
  try {
    const url = new URL(candidate);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/'
    )
      return DEFAULT_BASE_URL;
    return url.origin;
  } catch {
    return DEFAULT_BASE_URL;
  }
}

/**
 * True only on the production deployment. Vercel sets `VERCEL_ENV` to
 * `production` | `preview` | `development`; anything else (previews, local) is
 * treated as not indexable so drafts and previews never reach an index.
 */
export function isIndexable(): boolean {
  const base = new URL(siteBaseUrl());
  return (
    process.env.VERCEL_ENV === 'production' &&
    base.protocol === 'https:' &&
    !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
  );
}
