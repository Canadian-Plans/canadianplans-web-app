import { pageMetadata } from '@/lib/page-metadata';
import { publicRobots } from '@/lib/seo';
import type { Metadata } from 'next';
import { CpSectionHeading } from '@canadian-plans/ui/canadian-plans';
import { arrivalCopy, arrivalChrome, arrivalChromeAssets } from '@content/pre-arrival';
import { categoryPages, redesignCategory } from '@content/category-redesign';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import { siteChrome, siteFooter } from '@content/site-chrome';
import { PlanPicker } from '@/components/pre-arrival/interactive';
import { CategoryTemplate } from '@/components/category-redesign/template';

export const metadata: Metadata = pageMetadata('/pre-arrival-sim', {
  title: arrivalCopy.title,
  robots: publicRobots('/pre-arrival-sim'),
});

/** Electric Blue category template (14 October 2026); plan picker and comparison unchanged. */
export default function PreArrivalPage() {
  const copy = arrivalCopy;
  const page = categoryPages['pre-arrival'];
  return (
    <>
      <a className="cp-arrival-skip" href={`#${page.mainId}`}>
        {copy.skip}
      </a>
      <SiteHeader
        planHref={page.planHref}
        content={{
          ...siteChrome,
          promo: arrivalChrome.promo,
          promoLink: { ...arrivalChrome.promoLink, href: '/home-internet' },
          promoMobileLabel: arrivalChrome.promoMobileLabel,
        }}
      />
      <CategoryTemplate
        category={redesignCategory('pre-arrival')}
        page={page}
        faqItems={copy.faq.items}
        plans={<PlanPicker />}
        afterPlans={
          <section id="compare" className="cp-arrival-comparison cp-arrival-section">
            <div className="cp-container">
              <CpSectionHeading content={copy.comparison.heading} />
              <div className="cp-arrival-table" role="table" aria-label={copy.comparison.label}>
                <div className="cp-arrival-table-header" role="row">
                  <span className="cp-arrival-feature-column" role="columnheader">
                    <span className="sr-only">{copy.comparison.featureLabel}</span>
                  </span>
                  {copy.comparison.columns.map((column) => (
                    <span key={column} role="columnheader">
                      {column}
                    </span>
                  ))}
                </div>
                {copy.comparison.rows.map((row) => (
                  <div key={row.feature} className="cp-arrival-table-row" role="row">
                    <strong role="rowheader">{row.feature}</strong>
                    {row.values.map((value, index) => (
                      <span role="cell" key={copy.comparison.columns[index]}>
                        {value}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
              <p className="cp-arrival-note">{copy.comparison.note}</p>
            </div>
          </section>
        }
      />
      <Footer
        brand={arrivalChrome.brand}
        content={siteFooter}
        assets={arrivalChromeAssets}
        brandHref="/"
      />
    </>
  );
}
