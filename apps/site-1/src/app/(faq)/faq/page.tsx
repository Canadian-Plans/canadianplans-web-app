import { pageMetadata } from '@/lib/page-metadata';
import { publicRobots } from '@/lib/seo';
import type { Metadata } from 'next';
import { SkipLink } from '@canadian-plans/ui';
import { CpBreadcrumb, CpButton, CpCtaBand } from '@canadian-plans/ui/canadian-plans';
import { faqAssets, faqCopy, faqGroups } from '@content/faq';
import { homeRedesign } from '@content/home-redesign';
import { siteChrome, siteFooter } from '@content/site-chrome';
import { buildFaqPageSchema, serializeFaqPageSchema } from '@/lib/faq-content';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import { categoryAsset } from '@/components/category-redesign/support';
import {
  FaqEmptyState,
  FaqFilteredGroup,
  FaqSearchControls,
  FaqSearchProvider,
} from '@/components/faq/interactive';

export const metadata: Metadata = pageMetadata('/faq', {
  title: faqCopy.title,
  description: faqCopy.description,
  robots: publicRobots('/faq'),
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
      <SiteHeader
        planHref="/pre-arrival-sim#plans"
        content={{
          ...siteChrome,
          help: { ...siteChrome.help, href: '#faq-main' },
          promoLink: { ...siteChrome.promoLink, href: '/pre-arrival-sim#plans' },
        }}
      />
      <main id="faq-main" tabIndex={-1}>
        <div className="cp-container cp-cat-page-breadcrumb">
          <CpBreadcrumb
            items={faqCopy.breadcrumb.items}
            label={faqCopy.breadcrumb.label}
            separator={faqCopy.breadcrumb.separator}
          />
        </div>
        <section className="cp-faq-page-hero cp-container" aria-labelledby="faq-page-title">
          <p className="cp-faq-page-eyebrow">{faqCopy.hero.eyebrow}</p>
          <h1 id="faq-page-title">{faqCopy.hero.title}</h1>
          <p className="cp-faq-page-intro">{faqCopy.hero.description}</p>
          <FaqSearchControls />
        </section>
        <div id="faq-results">
          {faqGroups.map((group) => (
            <FaqFilteredGroup key={group.id} group={group}>
              <p className="cp-rd-eyebrow cp-rd-eyebrow-mint">{group.heading.eyebrow}</p>
              <h2 className="cp-rd-heading">{group.heading.title.join(' ')}</h2>
              {group.heading.description ? (
                <p className="cp-rd-lead">{group.heading.description}</p>
              ) : null}
              {group.id === 'faq-eligibility' ? (
                <div className="cp-rd-faq-help">
                  <strong>{homeRedesign.faq.helpTitle}</strong>
                  <span>{homeRedesign.faq.helpBody}</span>
                  <CpButton asChild>
                    <a href={faqCopy.destinations.advisor}>{faqCopy.controls.advisor}</a>
                  </CpButton>
                </div>
              ) : null}
            </FaqFilteredGroup>
          ))}
          <FaqEmptyState />
        </div>
        <div className="cp-container cp-faq-page-cta">
          <CpCtaBand tone="blue" content={faqCopy.final} icon={categoryAsset('cta-mobile')} />
        </div>
      </main>
      <Footer brand="Canadian Plans" content={siteFooter} assets={faqAssets} brandHref="/" />
    </FaqSearchProvider>
  );
}
