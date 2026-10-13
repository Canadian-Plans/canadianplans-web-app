import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import { SkipLink } from '@canadian-plans/ui';
import { CpAsset, CpImageSlot } from '@canadian-plans/ui/canadian-plans';
import { contactAssets, contactChrome, contactCopy, contactFooter } from '@content/contact';
import { Footer, PromoStrip, UtilityBar } from '@/components/shared/chrome';
import {
  ContactDirections,
  ContactMessageAndHelp,
  ContactNavigation,
  ContactOptionAction,
  ContactPreviewProvider,
  ContactTrackingForm,
} from '@/components/contact/interactive';

export const metadata: Metadata = pageMetadata('/contact', {
  title: contactCopy.title,
  robots: { index: false, follow: false },
});

export default function ContactPage() {
  return (
    <ContactPreviewProvider>
      <SkipLink className="cp-contact-skip" href="#contact-main">
        {contactCopy.skip}
      </SkipLink>
      <UtilityBar
        content={contactChrome}
        assets={contactAssets}
        planHref="/pre-arrival-sim#plans"
      />
      <ContactNavigation />
      <PromoStrip content={contactChrome} />
      <main id="contact-main" tabIndex={-1}>
        <section className="cp-contact-hero cp-container" aria-labelledby="contact-title">
          <p className="cp-contact-eyebrow">{contactCopy.hero.eyebrow}</p>
          <h1 id="contact-title">{contactCopy.hero.title}</h1>
          <p className="cp-contact-hero-description">{contactCopy.hero.description}</p>
          <p className="cp-contact-trust">
            <CpAsset asset={contactAssets.trust} />
            <span>{contactCopy.hero.trust}</span>
          </p>
        </section>
        <div id="contact-options" className="cp-contact-options cp-container">
          {contactCopy.options.map((option) => (
            <article
              key={option.id}
              className="cp-contact-option cp-contact-panel"
              data-tone={option.tone}
            >
              <p className="cp-contact-eyebrow">{option.label}</p>
              <h2>{option.title}</h2>
              <p className="cp-contact-option-description">{option.description}</p>
              <ContactOptionAction id={option.id} label={option.action} tone={option.buttonTone} />
            </article>
          ))}
        </div>
        <div className="cp-contact-track-office cp-contact-columns cp-container">
          <ContactTrackingForm />
          <section
            className="cp-contact-office cp-contact-panel"
            aria-labelledby="contact-office-title"
          >
            <CpImageSlot
              icon={contactAssets.imageLight}
              label={contactCopy.office.image}
              caption={contactCopy.office.caption}
              className="cp-contact-office-image"
            />
            <h2 id="contact-office-title">{contactCopy.office.title}</h2>
            <address>
              {contactCopy.office.address.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </address>
            <ContactDirections />
            <dl className="cp-contact-hours">
              {contactCopy.office.hours.map((row) => (
                <div key={row.day}>
                  <dt>{row.day}</dt>
                  <dd>{row.time}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
        <div className="cp-contact-message-area cp-contact-columns cp-container">
          <ContactMessageAndHelp />
        </div>
      </main>
      <Footer
        brand={contactChrome.brand}
        content={contactFooter}
        assets={contactAssets}
        brandHref="/"
      />
    </ContactPreviewProvider>
  );
}
