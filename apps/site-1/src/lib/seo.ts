/**
 * SEO/indexability helpers (REQ 10). The canonical base URL follows the
 * deployment via `NEXT_PUBLIC_SITE_URL`; only a real production deployment is
 * indexable, so preview and local builds are excluded from search indexes
 * (REQ 10, §16 gate 12). These run server-side (layout, robots.ts, sitemap.ts).
 */

const DEFAULT_BASE_URL = 'http://localhost:3001';

/** Absolute origin used for canonical URLs, the sitemap and robots. No trailing slash. */
export function siteBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return DEFAULT_BASE_URL;
  try {
    const url = new URL(raw);
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
