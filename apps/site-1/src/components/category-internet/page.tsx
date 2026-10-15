import type { ReactNode } from 'react';
import { Card } from '@canadian-plans/ui';
import {
  CpAsset,
  CpBreadcrumb,
  CpButton,
  CpFaqAccordion,
  CpImageSlot,
  CpLinkPill,
  CpReviewCard,
} from '@canadian-plans/ui/canadian-plans';
import {
  categoryAssets,
  categoryFooterContent,
  categoryPageLabels as labels,
  categoryEditorialAssets,
  type CategoryAreaCard,
  type CategoryCityCard,
  type CategoryInternetContent,
} from '@content/category-internet';
import { componentAssets, chromeContent } from '@content/components';
import { internetChrome, internetChromeAssets } from '@content/home-internet';
import { Footer, PromoStrip, UtilityBar } from '@/components/shared/chrome';
import { CategoryAddressCheck, CategoryNavigation } from './interactive';

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
}) {
  return (
    <div className="cp-catnet-section-heading">
      {eyebrow ? <p className="cp-catnet-eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

function CoverageMap({ content }: { readonly content: CategoryInternetContent }) {
  const assets = categoryAssets[content.slug];
  return (
    <div className="cp-catnet-map-wrap" aria-label={content.region}>
      <div
        className="cp-catnet-map"
        data-region={content.slug}
        role="img"
        aria-label={content.mapAlt}
      >
        <span className="cp-catnet-map-backdrop cp-catnet-map-desktop">
          <CpAsset asset={assets.mapBackdrop} />
        </span>
        <span className="cp-catnet-map-backdrop cp-catnet-map-mobile">
          <CpAsset asset={assets.mobileBackdrop} />
        </span>
        <span className="cp-catnet-map-swoop" aria-hidden="true">
          <span />
        </span>
        <span className="cp-catnet-map-park" aria-hidden="true" />
        <span className="cp-catnet-map-park-second" aria-hidden="true" />
        <span className="cp-catnet-map-roads" aria-hidden="true" />
        <div className="cp-catnet-map-coverage cp-catnet-map-fill">
          <span className="cp-catnet-map-asset cp-catnet-map-desktop">
            <CpAsset asset={assets.coverageFill} />
          </span>
          <span className="cp-catnet-map-asset cp-catnet-map-mobile">
            <CpAsset asset={assets.mobileFill} />
          </span>
        </div>
        <div className="cp-catnet-map-coverage">
          <span className="cp-catnet-map-asset cp-catnet-map-desktop">
            <CpAsset asset={assets.coverageRing} />
          </span>
          <span className="cp-catnet-map-asset cp-catnet-map-mobile">
            <CpAsset asset={assets.mobileRing} />
          </span>
        </div>
        {Array.from({ length: 4 }, (_, index) => (
          <span className="cp-catnet-map-dot" data-dot={index} key={index}>
            <span className="cp-catnet-map-desktop">
              <CpAsset asset={assets.mapDot} />
            </span>
            <span className="cp-catnet-map-mobile">
              <CpAsset asset={assets.mobileDot} />
            </span>
          </span>
        ))}
        <p className="cp-catnet-map-name">{content.region}</p>
        <div className="cp-catnet-map-status">
          <CpAsset asset={assets.statusDot} />
          <span>
            <strong>{content.mapStatusTitle}</strong>
            <small>{content.mapStatusDetail}</small>
          </span>
        </div>
      </div>
      <div
        className="cp-catnet-price-sticker"
        aria-label={`${content.priceSticker.eyebrow} ${content.priceSticker.amount} ${content.priceSticker.note}`}
      >
        <span>{content.priceSticker.eyebrow}</span>
        <strong>{content.priceSticker.amount}</strong>
        <small>{content.priceSticker.note}</small>
      </div>
    </div>
  );
}

function AreaCard({ area }: { readonly area: CategoryAreaCard }) {
  return (
    <article className="cp-catnet-area">
      <h3>{area.name}</h3>
      <p>{area.postalPrefixes}</p>
      <strong>{area.speed}</strong>
      <div className="cp-catnet-network-tags">
        {area.networks.map((network) => (
          <span key={network}>{network}</span>
        ))}
      </div>
      <p>{area.install}</p>
    </article>
  );
}

function CityCard({ city }: { readonly city: CategoryCityCard }) {
  return (
    <article className="cp-catnet-city">
      <h3>{city.name}</h3>
      <p>{city.postalPrefixes}</p>
      <p>{city.price}</p>
      <div className="cp-catnet-network-tags">
        {city.networks.map((network) => (
          <span key={network}>{network}</span>
        ))}
      </div>
      <a href={city.href}>
        {city.name} {labels.arrow}
      </a>
    </article>
  );
}

function Directory({ content }: { readonly content: CategoryInternetContent }) {
  const areas = content.areas;
  const cities = content.cities;
  return (
    <section id="coverage" className="cp-catnet-section cp-catnet-directory">
      <div className="cp-catnet-container">
        <SectionHeading title={content.directoryTitle} description={content.directoryDescription} />
        {content.networkLegend ? (
          <div className="cp-catnet-network-tags cp-catnet-network-legend">
            {content.networkLegend.map((network) => (
              <span key={network}>{network}</span>
            ))}
          </div>
        ) : null}
        {areas ? (
          <>
            <div className="cp-catnet-area-grid cp-catnet-directory-all">
              {areas.map((area) => (
                <AreaCard key={area.name} area={area} />
              ))}
            </div>
            <div className="cp-catnet-directory-mobile">
              <div className="cp-catnet-area-grid">
                {areas.slice(0, 4).map((area) => (
                  <AreaCard key={area.name} area={area} />
                ))}
              </div>
              <details className="cp-catnet-more">
                <summary>{content.showAll}</summary>
                <div className="cp-catnet-area-grid">
                  {areas.slice(4).map((area) => (
                    <AreaCard key={area.name} area={area} />
                  ))}
                </div>
              </details>
            </div>
          </>
        ) : (
          <>
            <div className="cp-catnet-city-grid cp-catnet-directory-all">
              {cities?.map((city) => (
                <CityCard key={city.name} city={city} />
              ))}
            </div>
            <div className="cp-catnet-directory-mobile">
              <div className="cp-catnet-city-grid">
                {cities?.slice(0, 4).map((city) => (
                  <CityCard key={city.name} city={city} />
                ))}
              </div>
              <details className="cp-catnet-more">
                <summary>{content.showAll}</summary>
                <div className="cp-catnet-city-grid">
                  {cities?.slice(4).map((city) => (
                    <CityCard key={city.name} city={city} />
                  ))}
                </div>
              </details>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function HomeTips({ content }: { readonly content: CategoryInternetContent }) {
  return (
    <section className="cp-catnet-section cp-catnet-tips-section">
      <div className="cp-catnet-container">
        <SectionHeading title={content.tipsTitle} />
        <div className="cp-catnet-tips" role="region" aria-label={content.tipsTitle} tabIndex={0}>
          {content.tips.map((tip) => (
            <article className="cp-catnet-tip" key={tip.title}>
              <CpImageSlot
                icon={componentAssets.imageLight}
                label={labels.image}
                caption={tip.alt}
              />
              <h3>{tip.title}</h3>
              <p>{tip.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlanExamples({ content }: { readonly content: CategoryInternetContent }) {
  const plans = [...content.plans].sort(
    (left, right) => Number(Boolean(right.popular)) - Number(Boolean(left.popular)),
  );
  const assets = categoryEditorialAssets(content.slug);
  return (
    <section id="plans" className="cp-catnet-section cp-catnet-plan-section">
      <div className="cp-catnet-container">
        <div className="cp-catnet-plan-heading">
          <SectionHeading title={content.planTitle} description={content.planNote} />
          <ul className="cp-catnet-includes">
            <li>
              <strong>{labels.everyPlan}</strong>
            </li>
            {content.planIncludes.map((feature) => (
              <li key={feature}>
                <CpAsset asset={assets.includes} />
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <div className="cp-catnet-plans">
          {plans.map((plan) => (
            <Card className="cp-catnet-plan" data-featured={Boolean(plan.popular)} key={plan.id}>
              {plan.popular ? (
                <span className="cp-catnet-preview-tag">{labels.popular}</span>
              ) : null}
              <h3>{plan.speed}</h3>
              <p className="cp-catnet-plan-price">
                <strong>{plan.price.replace('/mo', '')}</strong>
                <span>{labels.perMonth}</span>
              </p>
              <div className="cp-catnet-plan-details">
                <p>
                  <CpAsset asset={assets.planDetail} />
                  {labels.bestFor} {plan.audience}
                </p>
                <p>
                  <CpAsset asset={assets.planDetail} />
                  {plan.streams} {labels.streams}
                </p>
                <p>
                  <CpAsset asset={assets.planDetail} />
                  {labels.download} {plan.download}
                </p>
              </div>
              <CpButton asChild tone={plan.popular ? 'primary' : 'outline'}>
                <a href={`/order/home-internet?plan=${encodeURIComponent(plan.id)}`}>
                  {labels.choose} {plan.speed}
                </a>
              </CpButton>
            </Card>
          ))}
        </div>
        <div className="cp-catnet-plan-table" role="table" aria-label={content.planTitle}>
          <div className="cp-catnet-plan-table-row cp-catnet-plan-table-head" role="row">
            {content.planTableHeaders.map((header) => (
              <strong role="columnheader" key={header}>
                {header}
              </strong>
            ))}
            <span role="columnheader" className="sr-only">
              {labels.choose}
            </span>
          </div>
          {content.plans.map((plan) => (
            <div
              className="cp-catnet-plan-table-row"
              data-featured={Boolean(plan.popular)}
              role="row"
              key={plan.id}
            >
              <strong role="cell">{plan.speed}</strong>
              <span role="cell">{plan.price}</span>
              <span role="cell">{plan.audience}</span>
              <span role="cell">{plan.streams}</span>
              <span role="cell">{plan.download}</span>
              <span role="cell">
                <CpButton asChild tone={plan.popular ? 'primary' : 'outline'}>
                  <a href={`/order/home-internet?plan=${encodeURIComponent(plan.id)}`}>
                    {labels.choose}
                  </a>
                </CpButton>
              </span>
            </div>
          ))}
        </div>
        <p className="cp-catnet-preview-note">{content.planFootnote}</p>
      </div>
    </section>
  );
}

function StepCards({ content }: { readonly content: CategoryInternetContent }) {
  return (
    <section className="cp-catnet-steps-section">
      <div className="cp-catnet-container">
        <h2>{content.stepsTitle}</h2>
        <div className="cp-catnet-steps">
          {content.steps.map((step) => (
            <article className="cp-catnet-step" key={step.number}>
              <span>{step.number}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Guide({ content }: { readonly content: CategoryInternetContent }) {
  return (
    <section id="guide" className="cp-catnet-section cp-catnet-guide-section">
      <div className="cp-catnet-container cp-catnet-guide">
        <article className="cp-catnet-guide-main">
          <SectionHeading eyebrow={content.guideEyebrow} title={content.guideTitle} />
          <CpImageSlot
            icon={componentAssets.imageLight}
            label={labels.image}
            caption={content.guideAlt}
          />
          <div className="cp-catnet-guide-copy">
            {content.guideQuestions.map((item) => (
              <div key={item.question}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </div>
            ))}
          </div>
        </article>
        <div className="cp-catnet-facts-card">
          <h3>{content.factsTitle}</h3>
          <dl className="cp-catnet-facts">
            {content.facts.map((fact) => (
              <div className="cp-catnet-fact" key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
          <p>{labels.installationUpdated}</p>
        </div>
      </div>
    </section>
  );
}

function ReviewSection({ content }: { readonly content: CategoryInternetContent }) {
  const assets = categoryEditorialAssets(content.slug);
  return (
    <section className="cp-catnet-section cp-catnet-reviews-section">
      <div className="cp-catnet-container cp-catnet-reviews-layout">
        <div className="cp-catnet-review-score">
          <p className="cp-catnet-eyebrow">{content.reviewsEyebrow}</p>
          <h2>{content.reviewsTitle}</h2>
          <strong>{content.reviewScore}</strong>
          <p className="cp-catnet-review-stars" aria-label={labels.stars}>
            {labels.starSymbols}
          </p>
          <p>{content.reviewCount}</p>
        </div>
        <div className="cp-catnet-reviews">
          {content.reviews.map((review, index) => {
            const avatar = assets.reviews[index];
            return avatar ? (
              <CpReviewCard
                key={review.name}
                content={{
                  id: review.name,
                  stars: labels.starSymbols,
                  ratingLabel: labels.stars,
                  quote: review.quote,
                  name: review.name,
                  detail: review.context,
                  avatar,
                }}
              />
            ) : null;
          })}
        </div>
      </div>
    </section>
  );
}

function Explore({ content }: { readonly content: CategoryInternetContent }) {
  const nearby = content.nearby;
  return (
    <section className="cp-catnet-section cp-catnet-explore-section">
      <div className="cp-catnet-container">
        <SectionHeading title={content.exploreTitle} />
        <div className="cp-catnet-explore">
          <article className="cp-catnet-explore-card">
            <h3>{content.nearbyTitle}</h3>
            <div className="cp-catnet-pills">
              {nearby.map((item) => (
                <CpLinkPill href={item.href} key={item.label}>
                  {item.label} {labels.arrow}
                </CpLinkPill>
              ))}
            </div>
          </article>
          {content.exploreGroups.map((group) => (
            <article className="cp-catnet-explore-card" key={group.title}>
              <h3>{group.title}</h3>
              <div className="cp-catnet-pills">
                {group.links.map((item) => (
                  <CpLinkPill href={item.href} key={item.label}>
                    {item.label} {labels.arrow}
                  </CpLinkPill>
                ))}
              </div>
            </article>
          ))}
        </div>
        <p className="cp-catnet-preview-note">{labels.sources}</p>
      </div>
    </section>
  );
}

function PreviewNotice({ children }: { readonly children: ReactNode }) {
  return (
    <div className="cp-catnet-preview-banner" role="note">
      <strong>{labels.preview}</strong>
      <p>{children}</p>
    </div>
  );
}

export function CategoryInternetPage({ content }: { readonly content: CategoryInternetContent }) {
  const editorialAssets = categoryEditorialAssets(content.slug);
  const promoContent = {
    ...internetChrome,
    promo: content.promo,
    promoLink: { label: content.promoAction, href: '#address-check' },
    promoMobileLabel: `${content.promoAction} ${labels.arrow}`,
  };
  const breadcrumb = content.breadcrumbs.map((item) => ({ label: item.label, href: item.href }));
  return (
    <>
      <a href="#catnet-main" className="cp-catnet-skip">
        {labels.skip}
      </a>
      <UtilityBar content={internetChrome} assets={internetChromeAssets} planHref="#plans" />
      <CategoryNavigation />
      <PromoStrip content={promoContent} />
      <main id="catnet-main" tabIndex={-1} data-region={content.slug}>
        <div className="cp-catnet-container cp-catnet-breadcrumb">
          <CpBreadcrumb items={breadcrumb} label={labels.breadcrumb} separator={labels.separator} />
        </div>
        <section className="cp-catnet-hero">
          <div className="cp-catnet-hero-inner">
            <div className="cp-catnet-hero-copy">
              <p className="cp-catnet-eyebrow">{content.eyebrow}</p>
              <h1>{content.title}</h1>
              <p className="cp-catnet-hero-description">{content.description}</p>
              <p className="cp-catnet-price-pill">
                <span>{content.priceSticker.eyebrow}</span>{' '}
                <strong>{content.priceSticker.amount}</strong>{' '}
                <span>{content.priceSticker.note}</span>
              </p>
              <CategoryAddressCheck
                content={{ slug: content.slug, postalPlaceholder: content.postalPlaceholder }}
              />
              <a href="#contact" className="cp-catnet-contact-link">
                {labels.talk}
              </a>
              <ul className="cp-catnet-badges">
                {content.heroBadges.map((badge) => (
                  <li key={badge}>
                    {labels.check} {badge}
                  </li>
                ))}
              </ul>
            </div>
            <CoverageMap content={content} />
          </div>
        </section>
        <section className="cp-catnet-meta" aria-label={labels.pageInformation}>
          <div className="cp-catnet-container">
            <div className="cp-catnet-author">
              <div>
                <CpAsset asset={editorialAssets.author} />
                <div>
                  <strong>{labels.author}</strong>
                  <p>{labels.authorDescription(content.region)}</p>
                </div>
              </div>
              <div>
                <CpAsset asset={editorialAssets.reviewer} />
                <div>
                  <strong>{labels.reviewByName}</strong>
                  <p>{labels.reviewerDescription}</p>
                </div>
              </div>
              <strong>{labels.updated}</strong>
            </div>
            <nav className="cp-catnet-onpage" aria-label={labels.onPage}>
              <strong>{labels.onPage}</strong>
              {labels.onPageLinks.map((link) => (
                <a href={link.href} key={link.href}>
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </section>
        <section id="local-stats" className="cp-catnet-section cp-catnet-stats-section">
          <div className="cp-catnet-container">
            <div className="cp-catnet-quick-answer">
              <span aria-hidden="true" />
              <div>
                <p className="cp-catnet-eyebrow">{content.quickAnswer.eyebrow}</p>
                <h2>{content.quickAnswer.title}</h2>
                <p>{content.quickAnswer.description}</p>
              </div>
            </div>
            <div className="cp-catnet-stats">
              {content.metrics.map((metric) => (
                <article className="cp-catnet-stat" key={metric.label}>
                  <p>{metric.label}</p>
                  <strong>{metric.value}</strong>
                  <small>{metric.note}</small>
                </article>
              ))}
            </div>
          </div>
        </section>
        <Directory content={content} />
        <HomeTips content={content} />
        <PlanExamples content={content} />
        <StepCards content={content} />
        <Guide content={content} />
        <ReviewSection content={content} />
        <section id="faq" className="cp-catnet-section cp-catnet-faq-section">
          <div className="cp-catnet-container cp-catnet-faq">
            <div>
              <SectionHeading eyebrow={labels.faq} title={content.faqTitle} />
              <p className="cp-catnet-faq-intro">{content.faqIntro}</p>
              <CpButton asChild tone="outline">
                <a href="#contact">{labels.whatsapp}</a>
              </CpButton>
            </div>
            <CpFaqAccordion
              items={content.faqs}
              name={`${content.slug}-faq`}
              defaultOpenId="installation"
              symbols={{ expand: labels.expand, collapse: labels.collapse }}
            />
          </div>
        </section>
        <Explore content={content} />
        <section className="cp-catnet-final cp-catnet-container">
          <div className="cp-catnet-final-card">
            <h2>{content.finalTitle}</h2>
            <p>{content.finalDescription}</p>
            <div className="cp-catnet-final-actions">
              <CpButton asChild tone="sun">
                <a href="#address-check">
                  {content.finalAddressAction} {labels.arrow}
                </a>
              </CpButton>
              <CpButton asChild tone="outline-inverse">
                <a href="#faq">{content.finalAdvisorAction}</a>
              </CpButton>
            </div>
          </div>
        </section>
        <PreviewNotice>{content.previewNotice}</PreviewNotice>
      </main>
      <Footer
        brand={chromeContent.brand}
        content={categoryFooterContent}
        assets={internetChromeAssets}
        brandHref="/"
      />
    </>
  );
}
