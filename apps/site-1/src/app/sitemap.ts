import type { MetadataRoute } from 'next';

import { isIndexable, siteBaseUrl } from '../lib/seo';

/**
 * REQ 10 sitemap. Lists the public storefront routes only; the Studio, the API
 * and not-yet-published dynamic plan pages are excluded. Empty on non-production
 * deployments so previews are not advertised for indexing.
 */
const PUBLIC_ROUTES = ['/', '/plans', '/order', '/track', '/privacy', '/terms'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isIndexable()) return [];
  const base = siteBaseUrl();
  const lastModified = new Date();
  return PUBLIC_ROUTES.map((route) => ({
    url: `${base}${route}`,
    lastModified,
    changeFrequency: 'weekly',
    priority: route === '/' ? 1 : 0.7,
  }));
}
