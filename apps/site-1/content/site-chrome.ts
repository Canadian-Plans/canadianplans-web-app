import { chromeContent, footerContent, type ChromeContent, type FooterContent } from './components';

/**
 * One header for every redesigned page (15 October 2026). `planHref` and the promo are the
 * only per-page parts; everything else links to real pages.
 */
export const siteChrome: ChromeContent = {
  ...chromeContent,
  phone: { ...chromeContent.phone, href: '/contact' },
  track: { ...chromeContent.track, href: '/track-order' },
  contact: { ...chromeContent.contact, href: '/contact' },
  help: { ...chromeContent.help, href: '/faq' },
  navigationLabel: 'Main navigation',
  mobileNavigationLabel: 'Canadian Plans menu',
  navigation: [
    { label: 'Pre-arrival SIM', href: '/pre-arrival-sim' },
    { label: 'Home Internet', href: '/home-internet' },
    { label: 'Mobile Plans', href: '/mobile-plans' },
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
 * One footer for every redesigned page (15 October 2026): real destinations instead of the
 * per-page `#plans` / `#contact` placeholders. Links only to pages that exist.
 */
export const siteFooter: FooterContent = {
  ...footerContent,
  groups: [
    {
      title: 'Pre-arrival SIM',
      links: [
        { label: 'All SIM plans', href: '/pre-arrival-sim' },
        { label: 'Students', href: '/pre-arrival-sim/students' },
        { label: 'From India', href: '/pre-arrival-sim/from-india' },
        { label: 'Toronto Pearson', href: '/pre-arrival-sim/toronto-pearson' },
      ],
    },
    {
      title: 'Home Internet',
      links: [
        { label: 'All plans', href: '/home-internet' },
        { label: 'Vancouver', href: '/home-internet/vancouver' },
        { label: 'Ontario', href: '/home-internet/ontario' },
        { label: 'Business internet', href: '/business-internet' },
      ],
    },
    {
      title: 'Mobile Plans',
      links: [
        { label: 'All plans', href: '/mobile-plans' },
        { label: 'Rogers', href: '/mobile-plans/rogers' },
        { label: 'Rogers vs Fido', href: '/compare/rogers-vs-fido' },
      ],
    },
    {
      title: 'Help',
      links: [
        { label: 'Guides', href: '/guides' },
        { label: 'FAQ', href: '/faq' },
        { label: 'Track order', href: '/track-order' },
        { label: 'Contact', href: '/contact' },
        { label: 'About us', href: '/about' },
      ],
    },
  ],
  legalLabel: 'Legal links',
  legal: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Accessibility', href: '/accessibility' },
    { label: 'Cookie settings', href: '#cookie-settings' },
  ],
};
