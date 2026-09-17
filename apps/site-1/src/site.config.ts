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
  legal: {
    /**
     * Disclosure/consent version recorded when a draft lead is saved (REQ 17).
     * TEST placeholder: real terms/privacy content and its versioning land with
     * T21, and the accepted *terms* version for an order always comes from the
     * server-issued quote, never from here.
     */
    consentVersion: 'TEST-disclosure-v1',
  },
};
