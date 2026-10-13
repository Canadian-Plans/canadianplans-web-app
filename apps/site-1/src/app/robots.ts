import type { MetadataRoute } from 'next';

import { isIndexable, siteBaseUrl } from '../lib/seo';

/**
 * REQ 10 robots controls. Production allows crawling of public pages but never
 * the embedded Studio or the internal API; preview and local deployments
 * disallow everything so drafts and previews stay out of search indexes.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteBaseUrl();
  if (!isIndexable()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/studio', '/api'] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
