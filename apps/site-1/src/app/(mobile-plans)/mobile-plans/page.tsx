import { chromeAccessibility } from '@content/metadata';
import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import { CpSectionHeading } from '@canadian-plans/ui/canadian-plans';
import { mobileCopy as copy, mobileChrome, mobileChromeAssets } from '@content/mobile-plans';
import { categoryPages, redesignCategory } from '@content/category-redesign';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import { siteChrome, siteFooter } from '@content/site-chrome';
import { MobilePlanBrowser } from '@/components/mobile-plans/interactive';
import { CategoryTemplate } from '@/components/category-redesign/template';

export const metadata: Metadata = pageMetadata('/mobile-plans', {
  title: copy.title,
  robots: { index: false, follow: false },
});

/** Electric Blue category template (14 October 2026) with the catalogue's three BYOD plans. */
export default function MobilePlansPage() {
  const page = categoryPages.mobile;
  return (
    <>
      <a className="cp-mobile-skip" href={`#${page.mainId}`}>
        {copy.skip}
      </a>
      <SiteHeader
        planHref={page.planHref}
        content={{
          ...siteChrome,
          promo: mobileChrome.promo,
          promoLink: mobileChrome.promoLink,
          promoMobileLabel: mobileChrome.promoMobileLabel,
        }}
      />
      <CategoryTemplate
        category={redesignCategory('mobile')}
        page={page}
        faqItems={copy.faq.items}
        plans={
          <section id="mobile-plans" className="cp-mobile-list">
            <div className="cp-container">
              <div className="cp-mobile-list-heading">
                <CpSectionHeading
                  content={{ eyebrow: copy.plans.eyebrow, title: [copy.plans.title] }}
                />
                <p className="cp-mobile-note">{copy.plans.date}</p>
              </div>
              <MobilePlanBrowser />
            </div>
          </section>
        }
        afterPlans={
          <section id="brand-comparison" className="cp-mobile-section cp-mobile-comparison">
            <div className="cp-container">
              <CpSectionHeading
                content={{
                  title: [copy.comparison.title],
                  description: copy.comparison.description,
                }}
              />
              <div
                className="cp-mobile-brand-table"
                role="table"
                aria-label={copy.comparison.title}
              >
                <div role="row" className="cp-mobile-brand-table-head">
                  <span role="columnheader" className="cp-mobile-brand-label">
                    <span className="sr-only">{chromeAccessibility.comparisonFeature}</span>
                  </span>
                  {copy.comparison.columns.map((column) => (
                    <strong role="columnheader" key={column}>
                      {column}
                    </strong>
                  ))}
                </div>
                {copy.comparison.rows.map((row) => (
                  <div role="row" className="cp-mobile-brand-row" key={row.label}>
                    <strong role="rowheader">{row.label}</strong>
                    <div className="cp-mobile-brand-values">
                      {row.values.map((value, index) => (
                        <p role="cell" key={`${row.label}-${index}`}>
                          {value}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="cp-mobile-note">{copy.comparison.note}</p>
            </div>
          </section>
        }
      />
      <Footer
        brand={mobileChrome.brand}
        content={siteFooter}
        assets={mobileChromeAssets}
        brandHref="/"
      />
    </>
  );
}
