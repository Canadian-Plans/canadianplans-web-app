import 'server-only';

/**
 * Editor-only draft preview (REQ 08, IMPLEMENTATION_PLAN.md §6): drafts must
 * never appear on public pages, search indexes or pricing, and preview is
 * restricted to allowlisted routes with caching disabled. The Studio-issued
 * preview session is verified by `next-sanity`'s `defineEnableDraftMode`
 * (see `../app/api/draft-mode/enable/route.ts`); this module additionally
 * restricts which paths draft mode may ever be enabled for.
 */

const ALLOWED_PREVIEW_EXACT_PATHS: readonly string[] = ['/', '/privacy', '/terms'];
const ALLOWED_PREVIEW_PATH_PREFIXES: readonly string[] = ['/plans'];

export function isAllowedPreviewPath(pathname: string): boolean {
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return false;
  if (ALLOWED_PREVIEW_EXACT_PATHS.includes(pathname)) return true;
  return ALLOWED_PREVIEW_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export interface SanityPreviewConfig {
  projectId: string;
  dataset: string;
  /** Read-only, site-scoped token. Never exposed to the browser. */
  token: string;
}

/** Read lazily: pages/routes that don't need preview can render without this configured. */
export function getSanityPreviewConfig(): SanityPreviewConfig | undefined {
  const projectId = process.env['NEXT_PUBLIC_SANITY_PROJECT_ID']?.trim();
  const dataset = process.env['NEXT_PUBLIC_SANITY_DATASET']?.trim();
  const token = process.env['SITE_1_SANITY_PREVIEW_TOKEN']?.trim();
  if (!projectId || !dataset || !token) return undefined;
  return { projectId, dataset, token };
}
