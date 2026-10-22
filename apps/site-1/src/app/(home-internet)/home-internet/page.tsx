import { pageMetadata } from '@/lib/page-metadata';
import { publicRobots } from '@/lib/seo';
import type { Metadata } from 'next';
import { CpSectionHeading } from '@canadian-plans/ui/canadian-plans';
import { internetCopy, internetChrome, internetChromeAssets } from '@content/home-internet';
import { categoryPages, redesignCategory } from '@content/category-redesign';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import { siteChrome, siteFooter } from '@content/site-chrome';
import { InternetProvinceCards } from '@/components/home-internet/interactive';
import { CategoryTemplate } from '@/components/category-redesign/template';

export const metadata: Metadata = pageMetadata('/home-internet', {
  title: internetCopy.title,
  robots: publicRobots('/home-internet'),
});

/**
 * Electric Blue category template (14 October 2026). One card per province opens that
 * province's plans in /order; the speed comparison explains what each speed feels like.
 */
export default function HomeInternetPage() {
  const copy = internetCopy;
  const page = categoryPages['home-internet'];
  return (
    <>
      <a href={`#${page.mainId}`} className="cp-internet-skip">
        {copy.skip}
      </a>
      <SiteHeader
        planHref="#internet-plans"
        content={{
          ...siteChrome,
          promo: internetChrome.promo,
          promoLink: internetChrome.promoLink,
          promoMobileLabel: internetChrome.promoMobileLabel,
        }}
      />
      <CategoryTemplate
        category={redesignCategory('home-internet')}
        page={page}
        faqItems={copy.faq.items}
        plans={
          <>
            <section className="cp-container cp-cat-address" aria-labelledby="address-intro-title">
              <div className="cp-cat-address-copy">
                <p className="cp-rd-eyebrow cp-rd-eyebrow-mint">{copy.hero.eyebrow}</p>
                <h2 id="address-intro-title" className="cp-rd-heading">
                  {copy.hero.title}
                </h2>
                <p className="cp-cat-address-price">
                  <strong>{copy.hero.price}</strong> {copy.hero.priceNote}
                </p>
                <ul className="cp-cat-address-trust">
                  {copy.hero.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </div>
            </section>
            <section id="internet-plans" className="cp-internet-plans cp-internet-section">
              <div className="cp-container">
                <div className="cp-internet-plans-heading">
                  <CpSectionHeading content={copy.plans.heading} />
                  <p className="cp-internet-note">{copy.plans.date}</p>
                </div>
                <InternetProvinceCards />
                <div className="cp-internet-includes">
                  <strong>{copy.plans.includesTitle}</strong>
                  <ul>
                    {copy.plans.includes.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          </>
        }
        afterPlans={
          <section id="compare" className="cp-internet-comparison cp-internet-section">
            <div className="cp-container">
              <CpSectionHeading content={copy.comparison.heading} />
              <div className="cp-internet-table" role="table" aria-label={copy.comparison.label}>
                <div className="cp-internet-table-header" role="row">
                  <span className="cp-internet-feature-column" role="columnheader">
                    <span className="sr-only">{copy.comparison.featureLabel}</span>
                  </span>
                  {copy.comparison.columns.map((column, index) => (
                    <span key={column} role="columnheader" data-highlight={index === 1}>
                      {column}
                    </span>
                  ))}
                </div>
                {copy.comparison.rows.map((row) => (
                  <div key={row.label} className="cp-internet-table-row" role="row">
                    <strong role="rowheader">{row.label}</strong>
                    {row.values.map((value, index) => (
                      <span
                        key={copy.comparison.columns[index]}
                        role="cell"
                        data-highlight={index === 1}
                      >
                        {value}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
              <p className="cp-internet-note">{copy.comparison.note}</p>
            </div>
          </section>
        }
      />
      <Footer
        brand={internetChrome.brand}
        content={siteFooter}
        assets={internetChromeAssets}
        brandHref="/"
      />
    </>
  );
}
