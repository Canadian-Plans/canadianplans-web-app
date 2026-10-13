import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import {
  CpAsset,
  CpBreadcrumb,
  CpImageSlot,
  CpSectionHeading,
  CpFaqAccordion,
  CpLinkPill,
  CpReviewCard,
} from '@canadian-plans/ui/canadian-plans';
import {
  internetCopy,
  internetAssets,
  internetChrome,
  internetChromeAssets,
  internetFooter,
  internetReviews,
  internetEquipmentAssets,
} from '@content/home-internet';
import { Footer, PromoStrip, UtilityBar } from '@/components/shared/chrome';
import {
  InternetPreviewProvider,
  InternetNavigation,
  AddressCheckForm,
  SpeedFinder,
  InternetSpeedCards,
  InternetAction,
} from '@/components/home-internet/interactive';

export const metadata: Metadata = pageMetadata('/home-internet', {
  title: internetCopy.title,
  robots: { index: false, follow: false },
});

function ImageSlot({
  caption,
  tone = 'light',
  className,
}: {
  caption: string;
  tone?: 'light' | 'on-blue';
  className?: string;
}) {
  return (
    <CpImageSlot
      icon={internetAssets[tone === 'light' ? '106-34-imgIcon' : '106-34-imgIcon1']}
      label={internetCopy.controls.image}
      caption={caption}
      tone={tone}
      className={className}
    />
  );
}

export default function HomeInternetPage() {
  const copy = internetCopy;
  return (
    <InternetPreviewProvider>
      <a href="#internet-main" className="cp-internet-skip">
        {copy.skip}
      </a>
      <UtilityBar content={internetChrome} assets={internetChromeAssets} planHref="#speed-finder" />
      <InternetNavigation />
      <PromoStrip content={internetChrome} />
      <main id="internet-main" tabIndex={-1}>
        <div className="cp-internet-breadcrumb cp-container">
          <CpBreadcrumb
            items={copy.breadcrumb}
            label={copy.breadcrumbLabel}
            separator={copy.separator}
          />
        </div>
        <section className="cp-internet-hero">
          <div className="cp-internet-hero-card">
            <div className="cp-internet-hero-copy">
              <p className="cp-internet-eyebrow">{copy.hero.eyebrow}</p>
              <h1>{copy.hero.title}</h1>
              <p className="cp-internet-hero-description">{copy.hero.description}</p>
              <div className="cp-internet-hero-price">
                <strong>{copy.hero.price}</strong>
                <p>{copy.hero.priceNote}</p>
              </div>
            </div>
            <AddressCheckForm />
            <ul className="cp-internet-hero-trust">
              {copy.hero.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        </section>
        <section className="cp-internet-quick">
          <div className="cp-container">
            <div className="cp-internet-quick-box">
              <span aria-hidden="true" />
              <div>
                <p className="cp-internet-eyebrow">{copy.quick.eyebrow}</p>
                <h2>{copy.quick.title}</h2>
                <p>{copy.quick.description}</p>
              </div>
            </div>
          </div>
        </section>
        <SpeedFinder />
        <section id="internet-plans" className="cp-internet-plans cp-internet-section">
          <div className="cp-container">
            <div className="cp-internet-plans-heading">
              <CpSectionHeading content={copy.plans.heading} />
              <p className="cp-internet-note">{copy.plans.date}</p>
            </div>
            <InternetSpeedCards />
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
        <section className="cp-internet-tv cp-internet-section">
          <div className="cp-container">
            <div className="cp-internet-tv-card">
              <ImageSlot caption={copy.tv.caption} />
              <div>
                <p className="cp-internet-eyebrow">{copy.tv.eyebrow}</p>
                <h2>{copy.tv.title}</h2>
                <p>{copy.tv.description}</p>
              </div>
              <InternetAction label={copy.tv.button} tone="outline" view="tv" />
            </div>
          </div>
        </section>
        <section id="installation" className="cp-internet-equipment cp-internet-section">
          <div className="cp-container">
            <article className="cp-internet-box">
              <ImageSlot caption={copy.equipment.caption} />
              <h2>{copy.equipment.title}</h2>
              <ul>
                {copy.equipment.items.map((item, index) => (
                  <li key={item.title}>
                    <span>
                      <CpAsset
                        asset={
                          [
                            internetEquipmentAssets.router,
                            internetEquipmentAssets.wifi,
                            internetEquipmentAssets.wrench,
                          ][index] ?? internetEquipmentAssets.router
                        }
                      />
                    </span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
            <article className="cp-internet-timeline">
              <ImageSlot tone="on-blue" caption={copy.timeline.caption} />
              <h2>{copy.timeline.title}</h2>
              <ol>
                {copy.timeline.steps.map((step) => (
                  <li key={step.time}>
                    <CpAsset
                      asset={
                        internetAssets[
                          step.tone === 'sun' ? '106-34-imgEllipse2' : '106-34-imgEllipse1'
                        ]
                      }
                    />
                    <div>
                      <p className="cp-internet-eyebrow">{step.time}</p>
                      <h3>{step.title}</h3>
                      <p>{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </article>
          </div>
        </section>
        <section id="coverage" className="cp-internet-coverage cp-internet-section">
          <div className="cp-container">
            <CpSectionHeading content={copy.coverage.heading} />
            <div className="cp-internet-provinces">
              {copy.coverage.provinces.map((province) => (
                <article key={province.title}>
                  <h3>{province.title}</h3>
                  <div>
                    {province.cities.map((city) => (
                      <CpLinkPill key={city} href="#address-check">
                        {city}
                      </CpLinkPill>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            <p className="cp-internet-note">{copy.coverage.note}</p>
          </div>
        </section>
        <section className="cp-internet-reviews cp-internet-section">
          <div className="cp-container">
            <div className="cp-internet-review-score">
              <p className="cp-internet-eyebrow">{copy.reviews.eyebrow}</p>
              <h2>
                {copy.reviews.title.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </h2>
              <strong>{copy.reviews.score}</strong>
              <p>{copy.reviews.stars}</p>
              <p>{copy.reviews.count}</p>
            </div>
            <div className="cp-internet-review-cards">
              {internetReviews.map((review) => (
                <CpReviewCard key={review.id} content={review} />
              ))}
            </div>
          </div>
        </section>
        <section id="faq" className="cp-internet-faq cp-internet-section">
          <div className="cp-container">
            <div>
              <CpSectionHeading content={copy.faq.heading} />
              <InternetAction label={copy.faq.button} tone="outline" view="advisor" />
            </div>
            <CpFaqAccordion
              items={copy.faq.items}
              name=""
              defaultOpenIds={['install', 'credit']}
              symbols={{ expand: copy.faq.expand, collapse: copy.faq.collapse }}
            />
          </div>
        </section>
        <section className="cp-internet-final cp-internet-section">
          <div className="cp-container">
            <div className="cp-internet-final-card">
              <h2>{copy.final.title}</h2>
              <p>{copy.final.description}</p>
              <div>
                <InternetAction label={copy.final.primary} tone="sun" />
                <InternetAction
                  label={copy.final.secondary}
                  tone="outline-inverse"
                  view="advisor"
                />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer
        brand={internetChrome.brand}
        content={internetFooter}
        assets={internetChromeAssets}
        brandHref="/"
      />
    </InternetPreviewProvider>
  );
}
