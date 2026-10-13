import { CpAsset } from '@canadian-plans/ui/canadian-plans';
import type { ChromeContent, ComponentAssets, FooterContent } from '@content/components';
import { CookieSettingsTrigger } from './cookie-consent';
import { cookieCopy, systemCopy } from '@content/system';
import { chromeAccessibility } from '@content/metadata';
import { categoryTemplateLinks } from '@content/category-links';

export function UtilityBar({
  content,
  assets,
  planHref = '#plans',
}: {
  content: ChromeContent;
  assets: ComponentAssets;
  planHref?: string;
}) {
  return (
    <nav
      className="cp-utility"
      data-component="utility-bar"
      aria-label={chromeAccessibility.utility}
    >
      <div className="cp-chrome-container">
        <div className="cp-utility-audiences">
          <a href={planHref}>{content.moving}</a>
          <a href={planHref}>{content.living}</a>
        </div>
        <div className="cp-utility-links">
          <a href={content.phone.href} className="cp-utility-phone">
            <span className="cp-mobile-phone">
              <CpAsset asset={assets.phone} />
            </span>
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

export function Footer({
  brand,
  content,
  assets,
  brandHref = '#components',
}: {
  brand: string;
  content: FooterContent;
  assets: ComponentAssets;
  brandHref?: string;
}) {
  return (
    <footer className="cp-footer" data-component="footer">
      <div className="cp-chrome-container">
        <div className="cp-footer-top">
          <div className="cp-footer-about">
            <a href={brandHref} className="cp-brand cp-brand-inverse">
              <CpAsset asset={assets.footerLogo} />
              <span>{brand}</span>
            </a>
            <p>{content.description}</p>
            <div className="cp-footer-contact" id="contact">
              <p>{content.address}</p>
              <p>{content.contactLine}</p>
            </div>
          </div>
          <div className="cp-footer-groups">
            {content.groups.map((group) => (
              <div className="cp-footer-group" key={group.title}>
                <h2>{group.title}</h2>
                <ul>
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <a href={categoryTemplateLinks[link.label] ?? link.href}>{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
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
