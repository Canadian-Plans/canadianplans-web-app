import { chromeAccessibility } from '@content/metadata';
import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import {
  CpBreadcrumb,
  CpButton,
  CpImageSlot,
  CpSectionHeading,
  CpFaqAccordion,
  CpReviewCard,
} from '@canadian-plans/ui/canadian-plans';
import {
  mobileCopy as copy,
  mobileAssets,
  mobileChrome,
  mobileChromeAssets,
  mobileFooter,
  mobileReviews,
} from '@content/mobile-plans';
import { UtilityBar, PromoStrip, Footer } from '@/components/shared/chrome';
import {
  MobilePlansProvider,
  MobilePlansNavigation,
  MobilePlanBrowser,
  MobilePreviewAction,
  ExploreNeeds,
} from '@/components/mobile-plans/interactive';

export const metadata: Metadata = pageMetadata('/mobile-plans', {
  title: copy.title,
  robots: { index: false, follow: false },
});
function ImageSlot({ caption, tone = 'light' }: { caption: string; tone?: 'light' | 'on-blue' }) {
  return (
    <CpImageSlot
      icon={mobileAssets[tone === 'light' ? '106-65-imgIcon1' : '106-65-imgIcon']}
      label={copy.preview.image}
      caption={caption}
      tone={tone}
    />
  );
}
export default function MobilePlansPage() {
  return (
    <MobilePlansProvider>
      <a className="cp-mobile-skip" href="#main">
        {copy.skip}
      </a>
      <UtilityBar content={mobileChrome} assets={mobileChromeAssets} planHref="#mobile-plans" />
      <MobilePlansNavigation />
      <PromoStrip content={mobileChrome} />
      <main id="main">
        <div className="cp-mobile-breadcrumb cp-container">
          <CpBreadcrumb
            items={copy.breadcrumb}
            label={copy.breadcrumbLabel}
            separator={copy.separator}
          />
        </div>
        <section className="cp-mobile-hero">
          <div className="cp-mobile-hero-card">
            <div className="cp-mobile-hero-copy">
              <p className="cp-mobile-eyebrow">{copy.hero.eyebrow}</p>
              <h1>{copy.hero.title}</h1>
              <p className="cp-mobile-hero-price">
                {copy.hero.pricePrefix} <strong>{copy.hero.price}</strong> {copy.hero.priceSuffix}
              </p>
              <p className="cp-mobile-hero-description">{copy.hero.description}</p>
              <div className="cp-mobile-hero-actions">
                <CpButton asChild tone="sun" scale="large">
                  <a href="#mobile-plans">{copy.hero.primary}</a>
                </CpButton>
                <MobilePreviewAction label={copy.hero.secondary} />
              </div>
              <ul className="cp-mobile-hero-trust">
                {copy.hero.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
            <div className="cp-mobile-carrier-stack">
              {copy.hero.carriers.map((carrier) => (
                <article key={carrier.id} data-tone={carrier.tone}>
                  <span className="cp-mobile-carrier-logo">{carrier.name}</span>
                  <div>
                    <h2>{carrier.name}</h2>
                    <p>{carrier.description}</p>
                  </div>
                  <p className="cp-mobile-carrier-price">
                    <span>{copy.hero.from}</span>
                    <strong>{carrier.amount}</strong>
                    <span>{copy.hero.period}</span>
                  </p>
                </article>
              ))}
              <p>{copy.hero.network}</p>
            </div>
          </div>
        </section>
        <section className="cp-mobile-quick">
          <div className="cp-container">
            <div className="cp-mobile-quick-card">
              <div>
                <p className="cp-mobile-eyebrow">{copy.quick.eyebrow}</p>
                <h2>{copy.quick.title}</h2>
                <p>{copy.quick.description}</p>
              </div>
            </div>
          </div>
        </section>
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
        <section id="brand-comparison" className="cp-mobile-section cp-mobile-comparison">
          <div className="cp-container">
            <CpSectionHeading
              content={{ title: [copy.comparison.title], description: copy.comparison.description }}
            />
            <div className="cp-mobile-brand-table" role="table" aria-label={copy.comparison.title}>
              <div role="row" className="cp-mobile-brand-table-head">
                <span role="columnheader" className="cp-mobile-brand-label">
                  <span className="sr-only">{chromeAccessibility.comparisonFeature}</span>
                </span>
                {copy.comparison.brands.map((brand) => (
                  <strong role="columnheader" key={brand}>
                    {brand}
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
        <section className="cp-mobile-section cp-mobile-payment">
          <div className="cp-container">
            <CpSectionHeading
              content={{ eyebrow: copy.payment.eyebrow, title: [copy.payment.title] }}
            />
            <div className="cp-mobile-payment-cards">
              {copy.payment.cards.map((card) => (
                <article key={card.title} data-tone={card.tone}>
                  <h3>{card.title}</h3>
                  <h4>{card.subtitle}</h4>
                  <ul>
                    {card.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <div className="cp-mobile-tip">
              <ImageSlot caption={copy.payment.caption} tone="on-blue" />
              <div>
                <p className="cp-mobile-eyebrow">{copy.payment.tipTitle}</p>
                <p>{copy.payment.tip}</p>
              </div>
            </div>
          </div>
        </section>
        <section id="switching" className="cp-mobile-section cp-mobile-switching">
          <div className="cp-container">
            <CpSectionHeading content={{ title: [copy.switching.title] }} />
            <ImageSlot caption={copy.switching.caption} />
            <ol className="cp-mobile-switch-steps">
              {copy.switching.steps.map((step) => (
                <li key={step.number} data-tone={step.tone}>
                  <span>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>
            <MobilePreviewAction label={copy.switching.button} tone="primary" />
            <p className="cp-mobile-note">{copy.switching.note}</p>
          </div>
        </section>
        <section className="cp-mobile-explore">
          <div className="cp-container">
            <h2>{copy.explore.title}</h2>
            <ExploreNeeds />
          </div>
        </section>
        <section className="cp-mobile-section cp-mobile-reviews">
          <div className="cp-container">
            <div className="cp-mobile-review-score">
              <p className="cp-mobile-eyebrow">{copy.reviews.eyebrow}</p>
              <h2>
                {copy.reviews.title.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </h2>
              <strong>{copy.reviews.score}</strong>
              <p>{copy.reviews.stars}</p>
              <p>{copy.reviews.count}</p>
            </div>
            <div className="cp-mobile-review-cards">
              {mobileReviews.map((review) => (
                <CpReviewCard content={review} key={review.id} />
              ))}
            </div>
          </div>
        </section>
        <section id="faq" className="cp-mobile-section cp-mobile-faq">
          <div className="cp-container">
            <div className="cp-mobile-faq-intro">
              <CpSectionHeading
                content={{
                  eyebrow: copy.faq.eyebrow,
                  title: copy.faq.title,
                  description: copy.faq.description,
                }}
              />
              <MobilePreviewAction label={copy.faq.button} tone="outline" />
              <ImageSlot caption={copy.faq.caption} />
            </div>
            <CpFaqAccordion
              items={copy.faq.items}
              name="mobile-faq"
              defaultOpenId="mobile-faq-0"
              symbols={{ expand: copy.faq.expand, collapse: copy.faq.collapse }}
            />
          </div>
        </section>
        <section className="cp-mobile-final">
          <div className="cp-container">
            <div className="cp-mobile-final-card">
              <div>
                <h2>{copy.final.title}</h2>
                <p>{copy.final.description}</p>
                <div className="cp-mobile-hero-actions">
                  <CpButton asChild tone="sun" scale="large">
                    <a href="#mobile-plans">{copy.final.primary}</a>
                  </CpButton>
                  <MobilePreviewAction label={copy.final.secondary} />
                </div>
              </div>
              <ImageSlot caption={copy.final.caption} tone="on-blue" />
            </div>
          </div>
        </section>
      </main>
      <Footer
        brand={mobileChrome.brand}
        content={mobileFooter}
        assets={mobileChromeAssets}
        brandHref="/"
      />
    </MobilePlansProvider>
  );
}
