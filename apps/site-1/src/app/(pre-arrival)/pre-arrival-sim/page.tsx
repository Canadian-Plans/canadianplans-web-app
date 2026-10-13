import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import {
  CpBreadcrumb,
  CpButton,
  CpImageSlot,
  CpSectionHeading,
  CpFaqAccordion,
  CpLinkPill,
  CpReviewCard,
} from '@canadian-plans/ui/canadian-plans';
import {
  arrivalCopy,
  arrivalAssets,
  arrivalChrome,
  arrivalChromeAssets,
  arrivalFooter,
  arrivalReviews,
} from '@content/pre-arrival';
import { UtilityBar, PromoStrip, Footer } from '@/components/shared/chrome';
import {
  ArrivalNavigation,
  AdvisorPreview,
  PlanPicker,
} from '@/components/pre-arrival/interactive';
import { EsimArt } from '@/components/pre-arrival/esim-art';
import { categoryTemplateLinks } from '@content/category-links';

export const metadata: Metadata = pageMetadata('/pre-arrival-sim', {
  title: arrivalCopy.title,
  robots: { index: false, follow: false },
});

function ImageSlot({ caption, className }: { caption: string; className?: string }) {
  return (
    <CpImageSlot
      icon={arrivalAssets['108-112-imgIcon']}
      label={arrivalCopy.controls.image}
      caption={caption}
      className={className}
    />
  );
}

export default function PreArrivalPage() {
  const copy = arrivalCopy;
  return (
    <>
      <a className="cp-arrival-skip" href="#arrival-main">
        {copy.skip}
      </a>
      <UtilityBar content={arrivalChrome} assets={arrivalChromeAssets} planHref="#plans" />
      <ArrivalNavigation />
      <PromoStrip content={arrivalChrome} />
      <main id="arrival-main" tabIndex={-1}>
        <div className="cp-container cp-arrival-breadcrumb">
          <CpBreadcrumb
            items={copy.breadcrumb}
            label={copy.breadcrumbLabel}
            separator={copy.separator}
          />
        </div>
        <section className="cp-arrival-hero">
          <div className="cp-arrival-hero-card">
            <div className="cp-arrival-hero-copy">
              <p className="cp-arrival-eyebrow">{copy.hero.eyebrow}</p>
              <h1>{copy.hero.title}</h1>
              <div className="cp-arrival-price-anchor">
                <strong>{copy.hero.price}</strong>
                <p>{copy.hero.saving}</p>
              </div>
              <p className="cp-arrival-hero-description">
                <span className="cp-arrival-desktop-prose">{copy.hero.description}</span>
                <span className="cp-arrival-mobile-prose">
                  {copy.hero.mobileDescription.map((line) => (
                    <span key={line}>{line} </span>
                  ))}
                </span>
              </p>
              <ul className="cp-arrival-hero-features">
                {copy.hero.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <div className="cp-arrival-hero-actions">
                <CpButton asChild tone="sun" scale="large">
                  <a href="#plans">{copy.hero.primary}</a>
                </CpButton>
                <CpButton asChild tone="outline-inverse" scale="large">
                  <a href="#how-it-works">{copy.hero.secondary}</a>
                </CpButton>
              </div>
            </div>
            <EsimArt />
          </div>
        </section>
        <section className="cp-arrival-quick">
          <div className="cp-container">
            <div className="cp-arrival-quick-box">
              <span aria-hidden="true" />
              <div>
                <p className="cp-arrival-eyebrow">{copy.quick.eyebrow}</p>
                <h2>{copy.quick.title}</h2>
                <p>
                  <span className="cp-arrival-desktop-prose">{copy.quick.description}</span>
                  <span className="cp-arrival-mobile-prose">
                    {copy.quick.mobileDescription.map((line) => (
                      <span key={line}>{line} </span>
                    ))}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </section>
        <PlanPicker />
        <section className="cp-arrival-why cp-arrival-section">
          <div className="cp-container">
            <CpSectionHeading content={copy.why.heading} />
            <div className="cp-arrival-benefits">
              {copy.why.cards.map((card) => (
                <article key={card.id} data-tone={card.tone}>
                  <ImageSlot caption={card.caption} />
                  <h3>{card.title}</h3>
                  <h4>{card.subtitle}</h4>
                  <p>{card.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
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
        <section id="how-it-works" className="cp-arrival-how cp-arrival-section">
          <div className="cp-container">
            <CpSectionHeading content={copy.how.heading} />
            <ol>
              {copy.how.steps.map((step) => (
                <li key={step.number}>
                  <span className="cp-arrival-step-number" data-tone={step.tone}>
                    {step.number}
                  </span>
                  <h3>{step.title}</h3>
                  <p className="cp-arrival-eyebrow">{step.duration}</p>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section id="requirements" className="cp-arrival-requirements cp-arrival-section">
          <div className="cp-container">
            <article>
              <h2>{copy.requirements.title}</h2>
              <p>{copy.requirements.description}</p>
              <ImageSlot caption={copy.requirements.caption} />
              <ul>
                {copy.requirements.items.map((item) => (
                  <li key={item.title}>
                    <span aria-hidden="true">{copy.requirements.check}</span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
            <article>
              <h2>{copy.requirements.audienceTitle}</h2>
              <p>{copy.requirements.audienceDescription}</p>
              <div className="cp-arrival-pills">
                {copy.requirements.audiences.map((label) => (
                  <CpLinkPill key={label} href={categoryTemplateLinks[label] ?? '#plans'}>
                    {label}
                  </CpLinkPill>
                ))}
              </div>
              <h3>{copy.requirements.popular}</h3>
              <div className="cp-arrival-pills">
                {copy.requirements.countries.map((label) => (
                  <CpLinkPill key={label} href={categoryTemplateLinks[label] ?? '#plans'}>
                    {label}
                  </CpLinkPill>
                ))}
              </div>
              <p className="cp-arrival-tip">{copy.requirements.tip}</p>
            </article>
          </div>
        </section>
        <section className="cp-arrival-reviews cp-arrival-section">
          <div className="cp-container">
            <div className="cp-arrival-review-score">
              <p className="cp-arrival-eyebrow">{copy.reviews.eyebrow}</p>
              <h2>
                {copy.reviews.title.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </h2>
              <strong>{copy.reviews.score}</strong>
              <p>{copy.reviews.stars}</p>
              <p>{copy.reviews.count}</p>
            </div>
            <div className="cp-arrival-review-cards">
              {arrivalReviews.map((review) => (
                <CpReviewCard key={review.id} content={review} />
              ))}
            </div>
          </div>
        </section>
        <section id="faq" className="cp-arrival-faq cp-arrival-section">
          <div className="cp-container">
            <div className="cp-arrival-faq-intro">
              <CpSectionHeading content={copy.faq.heading} />
              <AdvisorPreview label={copy.faq.button} tone="outline" />
              <ImageSlot caption={copy.faq.caption} />
            </div>
            <CpFaqAccordion
              items={copy.faq.items}
              name="pre-arrival-faq"
              defaultOpenId="arrival-faq-0"
              symbols={{ expand: copy.faq.expand, collapse: copy.faq.collapse }}
            />
          </div>
        </section>
        <section className="cp-arrival-final cp-arrival-section">
          <div className="cp-container">
            <div className="cp-arrival-final-card">
              <h2>{copy.final.title}</h2>
              <p>{copy.final.description}</p>
              <div>
                <CpButton asChild tone="sun" scale="large">
                  <a href="#plans">{copy.final.primary}</a>
                </CpButton>
                <AdvisorPreview label={copy.final.secondary} tone="outline-inverse" />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer
        brand={arrivalChrome.brand}
        content={arrivalFooter}
        assets={arrivalChromeAssets}
        brandHref="/"
      />
    </>
  );
}
