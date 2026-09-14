/** Public configuration only. Never import backend.config here or in Studio. */
export const siteConfig = {
  id: 'site-1',
  slug: 'site-1',
  name: 'SITE_1_NAME_PLACEHOLDER',
  currency: 'CAD',
  locale: 'en-CA',
  analytics: {
    scriptUrl: process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL?.trim() ?? '',
    websiteId: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim() ?? '',
  },
};
