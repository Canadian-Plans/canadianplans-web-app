import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import { SkipLink } from '@canadian-plans/ui';
import { CpButton, CpImageSlot, CpSectionHeading } from '@canadian-plans/ui/canadian-plans';
import { faqAssets, faqChrome, faqCopy, faqFooter, faqGroups } from '@content/faq';
import { buildFaqPageSchema, serializeFaqPageSchema } from '@/lib/faq-content';
import { Footer, PromoStrip, UtilityBar } from '@/components/shared/chrome';
import {
  FaqEmptyState,
  FaqFilteredGroup,
  FaqNavigation,
  FaqSearchControls,
  FaqSearchProvider,
} from '@/components/faq/interactive';

export const metadata: Metadata = pageMetadata('/faq', {
  title: faqCopy.title,
  description: faqCopy.hero.description,
  robots: { index: false, follow: false },
});

export default function FaqPage() {
  return (
    <FaqSearchProvider>
      <script
        id="faq-page-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeFaqPageSchema(buildFaqPageSchema(faqGroups)) }}
      />
      <SkipLink href="#faq-main" className="cp-faq-page-skip">
        {faqCopy.skip}
      </SkipLink>
      <UtilityBar content={faqChrome} assets={faqAssets} planHref="/pre-arrival-sim#plans" />
      <FaqNavigation />
      <PromoStrip content={faqChrome} />
      <main id="faq-main" tabIndex={-1}>
        <section className="cp-faq-page-hero cp-container" aria-labelledby="faq-page-title">
          <p className="cp-faq-page-eyebrow">{faqCopy.hero.eyebrow}</p>
          <h1 id="faq-page-title">{faqCopy.hero.title}</h1>
          <p className="cp-faq-page-intro">{faqCopy.hero.description}</p>
          <FaqSearchControls />
        </section>
        <div id="faq-results">
          {faqGroups.map((group) => (
            <FaqFilteredGroup key={group.id} group={group}>
              <CpSectionHeading content={group.heading} />
              {group.id === 'faq-eligibility' ? (
                <CpButton asChild tone="outline" className="cp-faq-page-advisor">
                  <a href={faqCopy.destinations.whatsapp}>{faqCopy.controls.advisor}</a>
                </CpButton>
              ) : null}
              {group.imageCaption ? (
                <CpImageSlot
                  icon={faqAssets.imageLight}
                  label={faqCopy.controls.image}
                  caption={group.imageCaption}
                  className="cp-faq-page-image"
                />
              ) : null}
            </FaqFilteredGroup>
          ))}
          <FaqEmptyState />
        </div>
        <section className="cp-faq-page-final" aria-labelledby="faq-page-final-title">
          <div className="cp-faq-page-final-card cp-container">
            <h2 id="faq-page-final-title">{faqCopy.final.title}</h2>
            <p>{faqCopy.final.description}</p>
            <div className="cp-faq-page-final-actions">
              <CpButton asChild tone="sun" scale="large">
                <a href={faqCopy.destinations.plans}>{faqCopy.final.primary}</a>
              </CpButton>
              <CpButton asChild tone="outline-inverse" scale="large">
                <a href={faqCopy.destinations.contact}>{faqCopy.final.secondary}</a>
              </CpButton>
            </div>
          </div>
        </section>
      </main>
      <Footer brand={faqChrome.brand} content={faqFooter} assets={faqAssets} brandHref="/" />
    </FaqSearchProvider>
  );
}
