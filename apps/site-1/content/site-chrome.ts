import { chromeContent, footerContent, type ChromeContent, type FooterContent } from './components';

/**
 * One header for every redesigned page (15 October 2026). `planHref` and the promo are the
 * only per-page parts; everything else links to real pages.
 */
export const siteChrome: ChromeContent = {
  ...chromeContent,
  phone: { ...chromeContent.phone, href: '/contact' },
  track: { ...chromeContent.track, href: '/track' },
  contact: { ...chromeContent.contact, href: '/contact' },
  help: { ...chromeContent.help, href: '/faq' },
  promoLink: { ...chromeContent.promoLink, href: '/pre-arrival-sim#plans' },
  navigationLabel: 'Main navigation',
  mobileNavigationLabel: 'Canadian Plans menu',
  navigation: [
    { label: 'Pre-arrival Plans', href: '/pre-arrival-sim' },
    { label: 'Home Internet', href: '/home-internet' },
    { label: 'Mobile Plans', href: '/mobile-plans' },
    { label: 'Business Internet', href: '/business-internet' },
    { label: 'Guides', href: '/guides' },
  ],
};

/** Header with a page-specific promo strip. */
export const siteChromeWithPromo = (
  promo: string,
  link: { readonly label: string; readonly href: string },
): ChromeContent => ({
  ...siteChrome,
  promo,
  promoLink: link,
  promoMobileLabel: link.label,
});

/**
 * One footer for every page, as in the final homepage design (16 October 2026):
 * Plans / Help / Company columns and the email sign-up (preview only, nothing is sent).
 * Only real destinations: Careers waits for a careers page, and WhatsApp is the only social link
 * (it goes to Contact until the business number is published).
 */
export const siteFooter: FooterContent = {
  ...footerContent,
  description:
    'Authorized Rogers, Fido & Chatr dealer. We help you pick the right plan and stay your contact afterwards.',
  contactLines: [
    '1-888-555-0199',
    'hello@canadianplans.ca',
    '12-3456 King George Blvd, Surrey, BC',
  ],
  social: [{ label: 'WhatsApp', short: 'wa', href: '/contact' }],
  groups: [
    {
      title: 'Plans',
      links: [
        { label: 'Pre-arrival Plans', href: '/pre-arrival-sim' },
        { label: 'Home Internet', href: '/home-internet' },
        { label: 'Mobile Plans', href: '/mobile-plans' },
        { label: 'Business Internet', href: '/business-internet' },
      ],
    },
    {
      title: 'Help',
      links: [
        { label: 'Find my plan', href: '/pre-arrival-sim#plans', finder: true },
        { label: 'FAQ', href: '/faq' },
        { label: 'Guides', href: '/guides' },
        { label: 'Contact us', href: '/contact' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About us', href: '/about' },
        { label: 'Why buy from a dealer', href: '/about#why-us' },
        { label: 'Reviews', href: '/#stories' },
      ],
    },
  ],
  newsletter: {
    title: 'Get plan deals by email',
    body: 'Occasional offers, no spam. Unsubscribe anytime.',
    label: 'Email address',
    placeholder: 'you@email.com',
    action: 'Sign up',
    invalid: 'Enter a valid email address.',
    preview: 'Thanks! Email sign-ups open soon. Nothing was sent or saved.',
  },
  copyright:
    '© 2026 Canadian Plans. Rogers, Fido and Chatr are trademarks of their respective owners.',
  legalLabel: 'Legal links',
  legal: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Accessibility', href: '/accessibility' },
    { label: 'Sitemap', href: '/sitemap.xml' },
    { label: 'Cookie settings', href: '#cookie-settings' },
  ],
};
