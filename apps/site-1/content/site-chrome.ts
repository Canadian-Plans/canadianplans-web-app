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
 * One footer for every page, laid out as in the final homepage design (16 October 2026):
 * Plans / Help / Company columns. The design's email sign-up and social links wait for a
 * backend and real accounts; a Popular column keeps links to the landing pages instead.
 * Links only to pages that exist.
 */
export const siteFooter: FooterContent = {
  ...footerContent,
  description:
    'Authorized Rogers, Fido & Chatr dealer. We help you pick the right plan and stay your contact afterwards.',
  groups: [
    {
      // Not "Plans": /plans has that h1, and page headings should stay unique.
      title: 'Our plans',
      links: [
        { label: 'Pre-arrival Plans', href: '/pre-arrival-sim' },
        { label: 'Home Internet', href: '/home-internet' },
        { label: 'Mobile Plans', href: '/mobile-plans' },
        { label: 'Business Internet', href: '/business-internet' },
      ],
    },
    {
      title: 'Popular',
      links: [
        { label: 'Student SIM', href: '/pre-arrival-sim/students' },
        { label: 'SIM from India', href: '/pre-arrival-sim/from-india' },
        { label: 'Toronto Pearson SIM', href: '/pre-arrival-sim/toronto-pearson' },
        { label: 'Vancouver internet', href: '/home-internet/vancouver' },
        { label: 'Ontario internet', href: '/home-internet/ontario' },
        { label: 'Rogers plans', href: '/mobile-plans/rogers' },
        { label: 'Rogers vs Fido', href: '/compare/rogers-vs-fido' },
      ],
    },
    {
      title: 'Help',
      links: [
        { label: 'Track order', href: '/track' },
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
      ],
    },
  ],
  copyright:
    '© 2026 Canadian Plans. Rogers, Fido and Chatr are trademarks of their respective owners.',
  legalLabel: 'Legal links',
  legal: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Accessibility', href: '/accessibility' },
    { label: 'Cookie settings', href: '#cookie-settings' },
  ],
};
