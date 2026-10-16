import type { ChromeContent, ComponentAssets, FooterContent } from '@content/components';
import { CookieSettingsTrigger } from './cookie-consent';
import { cookieCopy, systemCopy } from '@content/system';
import { chromeAccessibility } from '@content/metadata';
import { categoryTemplateLinks } from '@content/category-links';
import { BrandMark } from './brand-mark';
import { FinderLink } from './finder-link';
import { FooterNewsletter } from './footer-newsletter';

/** Dark utility bar from the final homepage design: dealer line, then phone and help links. */
export function UtilityBar({
  content,
}: {
  content: ChromeContent;
  assets?: ComponentAssets;
  planHref?: string;
}) {
  return (
    <nav
      className="cp-utility"
      data-component="utility-bar"
      aria-label={chromeAccessibility.utility}
    >
      <div className="cp-chrome-container">
        <p className="cp-utility-dealer">{content.dealer}</p>
        <div className="cp-utility-links">
          <a href={content.phone.href} className="cp-utility-phone">
            {content.phone.label}
          </a>
          <div className="cp-utility-secondary">
            <a href={content.track.href}>{content.track.label}</a>
            <a href={content.contact.href} className="cp-utility-contact">
              {content.contact.label}
            </a>
            <a href={content.help.href}>{content.help.label}</a>
          </div>
        </div>
      </div>
    </nav>
  );
}

export function PromoStrip({ content }: { content: ChromeContent }) {
  return (
    <section
      className="cp-promo"
      data-component="promo-strip"
      aria-label={chromeAccessibility.promo}
    >
      <p>{content.promo}</p>
      <a href={content.promoLink.href}>
        <span className="cp-promo-desktop-label">{content.promoLink.label}</span>
        <span className="cp-promo-mobile-label">{content.promoMobileLabel}</span>
      </a>
    </section>
  );
}

/**
 * Site footer laid out as in the final homepage design (16 October 2026): brand column,
 * link columns and the email sign-up, then the legal bar.
 */
export function Footer({
  brand,
  content,
  brandHref = '#components',
}: {
  brand: string;
  content: FooterContent;
  /** Kept for callers; the footer logo is now the shared BrandMark. */
  assets?: ComponentAssets;
  brandHref?: string;
}) {
  const contactLines = content.contactLines ?? [content.address, content.contactLine];
  return (
    <footer className="cp-footer" data-component="footer">
      <div className="cp-chrome-container cp-footer-container">
        <div className="cp-footer-top">
          <div className="cp-footer-about">
            <a href={brandHref} className="cp-brand cp-brand-inverse" aria-label={`${brand} home`}>
              <BrandMark />
            </a>
            <p>{content.description}</p>
            <div className="cp-footer-contact" id="contact">
              {contactLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            {content.social?.length ? (
              <ul className="cp-footer-social">
                {content.social.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} aria-label={item.label}>
                      {item.short}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {content.groups.map((group) => (
            <div className="cp-footer-group" key={group.title}>
              <p className="cp-footer-heading">{group.title}</p>
              <ul>
                {group.links.map((link) => (
                  <li key={link.label}>
                    {link.finder ? (
                      <FinderLink href={link.href}>{link.label}</FinderLink>
                    ) : (
                      <a href={categoryTemplateLinks[link.label] ?? link.href}>{link.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {content.newsletter ? <FooterNewsletter content={content.newsletter} /> : null}
        </div>
        <div className="cp-footer-bottom">
          <p>{content.copyright}</p>
          <nav aria-label={content.legalLabel}>
            <ul>
              {content.legal.map((link, index) => (
                <li key={link.label}>
                  {index > 0 ? (
                    <span className="cp-footer-legal-separator" aria-hidden="true">
                      {content.legalSeparator}
                    </span>
                  ) : null}
                  {link.label === cookieCopy.settings ? (
                    <CookieSettingsTrigger>{link.label}</CookieSettingsTrigger>
                  ) : (
                    <a
                      href={
                        link.label === systemCopy.accessibilityLabel ? '/accessibility' : link.href
                      }
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
