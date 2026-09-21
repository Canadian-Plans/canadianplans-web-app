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
  const value = raw && raw.length > 0 ? raw : DEFAULT_BASE_URL;
  return value.replace(/\/+$/, '');
}

/**
 * True only on the production deployment. Vercel sets `VERCEL_ENV` to
 * `production` | `preview` | `development`; anything else (previews, local) is
 * treated as not indexable so drafts and previews never reach an index.
 */
export function isIndexable(): boolean {
  return process.env.VERCEL_ENV === 'production';
}
