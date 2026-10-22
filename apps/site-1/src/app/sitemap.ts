import type { MetadataRoute } from 'next';

import { guideArticles } from '@content/guides';

import { INDEXABLE_PATHS, STOREFRONT_INDEXING_OPEN, isIndexable, siteBaseUrl } from '../lib/seo';
import { getLegalPage, type LegalSlug } from '../lib/legal';

/**
 * REQ 10 sitemap. Lists the public storefront routes only; the Studio, the API
 * and not-yet-published dynamic plan pages are excluded. Empty on non-production
 * deployments so previews are not advertised for indexing.
 */
// Private order/lookup pages are never listed; commercial pages join once 6.1 opens indexing.
const publicRoutes: readonly string[] = STOREFRONT_INDEXING_OPEN
  ? [...INDEXABLE_PATHS, ...guideArticles.map((article) => `/guides/${article.slug}`)]
  : ['/accessibility'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isIndexable()) return [];
  const base = siteBaseUrl();
  const legalSlugs: readonly LegalSlug[] = ['privacy', 'terms'];
  const legal = await Promise.all(
    legalSlugs.map(async (slug) => {
      const page = await getLegalPage(slug);
      return page.source === 'test_placeholder' ? null : `/${slug}`;
    }),
  );
  const routes = [...publicRoutes, ...legal.filter((route): route is string => route !== null)];
  return routes.map((route) => ({
    url: `${base}${route}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));
}
