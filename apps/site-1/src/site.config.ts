/** Public configuration only. Never import backend.config here or in Studio. */
import { siteContent } from '@content/site';

export const siteConfig = {
  id: 'site-1',
  slug: 'site-1',
  name: siteContent.name,
  currency: 'CAD',
  locale: 'en-CA',
  analytics: {
    scriptUrl: process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL?.trim() ?? '',
    websiteId: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim() ?? '',
  },
  legal: {
    /**
     * Disclosure/consent version recorded when a draft lead is saved (REQ 17).
     * Identifies the current published privacy policy. The accepted terms
     * version for an order always comes from the server-issued quote.
     */
    consentVersion: 'privacy-2026-10-v2',
    /**
     * Version of the credit-check consent a mobile customer accepts, recorded with
     * the order (invariant 11). TEST placeholder until the owner approves the text.
     */
    creditCheckConsentVersion: 'TEST-credit-check-v1',
    /**
     * Version of the notice shown with the region wish list, recorded with the
     * address (ADR 0005, D5). TEST placeholder until the owner approves the text.
     */
    waitlistConsentVersion: 'privacy-2026-10-v2',
  },
};
