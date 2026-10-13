import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import {
  CpAsset,
  CpBadge,
  CpButton,
  CpFaqAccordion,
  CpImageSlot,
  CpLinkPill,
  CpPriceCircle,
  CpReviewCard,
} from '@canadian-plans/ui/canadian-plans';
import { componentAssets, componentCopy, faqExamples, reviewExamples } from '@content/components';
import { homeAssets, homeChrome, homeCopy, homeFooter } from '@content/home';
import { Footer, PromoStrip, UtilityBar } from '@/components/shared/chrome';
import {
  HomeNavigation,
  JourneyCarousel,
  PopularPlans,
  PostalCodePreview,
  PreviewContact,
  ReviewCarousel,
} from '@/components/home/interactive';
import { InternetArt } from '@/components/home/internet-art';

export const metadata: Metadata = pageMetadata('/', {
  title: homeCopy.title,
  robots: { index: false, follow: false },
});

function PhotoSlot({ caption, className }: { caption: string; className?: string }) {
  return (
    <CpImageSlot
      className={className}
      icon={componentAssets.imageLight}
      label={homeCopy.controls.image}
      caption={caption}
    />
  );
}

function CategoryPrice({ price }: { price: string }) {
  return (
    <p className="cp-home-category-price">
      {homeCopy.controls.from} <strong>{price}</strong> {homeCopy.controls.period}
    </p>
  );
}
function CategoryArrow({ href, label }: { href: string; label: string }) {
  return (
    <CpButton asChild scale="icon">
      <a href={href} aria-label={label}>
        {homeCopy.controls.arrow}
      </a>
    </CpButton>
  );
}

export default function HomePage() {
  const h = homeCopy.hero;
  return (
    <>
      <a href="#main-content" className="cp-home-skip">
        {homeCopy.skip}
      </a>
      <UtilityBar content={homeChrome} assets={componentAssets} planHref="#popular-plans" />
      <HomeNavigation />
      <PromoStrip content={homeChrome} />
      <main id="main-content" tabIndex={-1}>
        <div
          className="cp-home-quick-links"
          role="region"
          aria-label={componentCopy.groups.chips}
          tabIndex={0}
        >
          {componentCopy.linkLabels.map((label, i) => (
            <CpLinkPill key={label} href={i === 2 ? '#internet' : '#popular-plans'}>
              {label}
            </CpLinkPill>
          ))}
        </div>
        <section className="cp-home-hero" aria-labelledby="home-title">
          <div className="cp-home-hero-card">
            <div className="cp-home-hero-copy">
              <p className="cp-home-eyebrow">{h.eyebrow}</p>
              <h1 id="home-title">
                <span className="cp-home-hero-title">{h.title}</span>{' '}
                <span className="cp-home-hero-subtitle">{h.subtitle}</span>{' '}
                <span className="cp-home-highlight-stage">
                  <span>{h.highlight}</span>
                </span>
              </h1>
              <p className="cp-home-hero-price">
                <span>{h.price}</span> {h.due}
              </p>
              <p className="cp-home-hero-description">{h.description}</p>
              <div className="cp-home-hero-actions">
                <CpButton id="home-primary-action" asChild tone="sun" scale="large">
                  <a href="#popular-plans">{h.primary}</a>
                </CpButton>
                <CpButton asChild tone="outline-inverse" scale="large">
                  <a href="#internet">{h.secondary}</a>
                </CpButton>
              </div>
              <p className="cp-home-hero-rating">{h.rating}</p>
            </div>
            <div className="cp-home-hero-visual">
              <div className="cp-home-hero-photo">
                {h.photo.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <div className="cp-home-usage-card">
                <p>{h.planLabel}</p>
                <h2>{h.planTitle}</h2>
                <p>{h.renewal}</p>
                <div className="cp-home-data-bar">
                  <span />
                </div>
                <strong>{h.usage}</strong>
              </div>
              <div className="cp-home-hero-circle">
                <CpPriceCircle
                  label={h.circleLabel}
                  amount={h.circleAmount}
                  suffix={h.circleSuffix}
                />
              </div>
              <div className="cp-home-sticker">{h.sticker}</div>
            </div>
          </div>
        </section>
        <section className="cp-home-trust cp-container" aria-label={h.eyebrow}>
          {homeCopy.trust.map((item) => (
            <div key={item.title}>
              <h2>{item.title}</h2>
              <p>{item.detail}</p>
            </div>
          ))}
        </section>
        <section className="cp-home-categories cp-home-section">
          <div className="cp-container">
            <div className="cp-home-centered-heading">
              <h2>{homeCopy.categories.title}</h2>
              <p>{homeCopy.categories.description}</p>
            </div>
            <div className="cp-home-category-grid">
              {homeCopy.categories.cards.map((card) => (
                <article key={card.id} className="cp-home-category-card" data-tone={card.tone}>
                  <PhotoSlot caption={card.caption} />
                  <div className="cp-home-category-head">
                    <CpBadge
                      tone={card.tone === 'sky' ? 'sky' : card.tone === 'lemon' ? 'sun' : 'blush'}
                    >
                      {card.tag}
                    </CpBadge>
                    <CategoryPrice price={card.price} />
                  </div>
                  <div className="cp-home-category-title-row">
                    <div className="cp-home-category-title">
                      <h3>{card.title}</h3>
                      <p>{card.subtitle}</p>
                    </div>
                    <CategoryArrow href={card.href} label={`${card.tag}: ${card.title}`} />
                  </div>
                  <ul>
                    {card.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <div className="cp-home-category-bottom">
                    <CategoryPrice price={card.price} />
                    <CategoryArrow href={card.href} label={`${card.tag}: ${card.title}`} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <PopularPlans />
        <section className="cp-home-esim cp-home-section">
          <div className="cp-container cp-home-esim-card">
            <PhotoSlot caption={homeCopy.esim.caption} />
            <div>
              <h2>{homeCopy.esim.title}</h2>
              <p>{homeCopy.esim.description}</p>
              <p>{homeCopy.esim.support}</p>
              <PreviewContact label={homeCopy.esim.button} tone="ink" />
            </div>
          </div>
        </section>
        <section id="how-it-works" className="cp-home-how cp-home-section">
          <div className="cp-container cp-home-stack">
            <div className="cp-home-how-heading">
              <p className="cp-home-eyebrow">{homeCopy.how.eyebrow}</p>
              <h2>{homeCopy.how.title}</h2>
              <p>{homeCopy.how.description}</p>
            </div>
            <div className="cp-home-step-grid">
              {homeCopy.how.steps.map((step, i) => (
                <article key={step.number} className="cp-home-step">
                  <div>
                    <span className="cp-home-step-icon" data-tone={step.tone}>
                      <CpAsset
                        asset={
                          i === 0
                            ? homeAssets['0-imgFrame']
                            : i === 1
                              ? homeAssets['0-imgFrame1']
                              : i === 2
                                ? homeAssets['0-imgFrame2']
                                : homeAssets['0-imgFrame3']
                        }
                      />
                    </span>
                    <strong>{step.number}</strong>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
            <div className="cp-home-who">
              <h3>{homeCopy.how.disclosureTitle}</h3>
              <p>{homeCopy.how.disclosure}</p>
            </div>
          </div>
        </section>
        <JourneyCarousel content={homeCopy.journey} />
        <section id="internet" className="cp-home-internet cp-home-section">
          <div className="cp-container">
            <div className="cp-home-centered-heading">
              <h2>{homeCopy.internet.title}</h2>
              <p>{homeCopy.internet.description}</p>
            </div>
            <div className="cp-home-spotlight">
              <InternetArt />
              <PostalCodePreview />
            </div>
          </div>
        </section>
        <section className="cp-home-benefits cp-home-section">
          <div className="cp-container cp-home-stack">
            <div className="cp-home-benefit-heading">
              <p className="cp-home-eyebrow">{homeCopy.benefits.eyebrow}</p>
              <h2 className="cp-home-benefit-title-desktop">
                {homeCopy.benefits.title.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </h2>
              <h2 className="cp-home-benefit-title-mobile">
                {homeCopy.benefits.mobileTitle.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </h2>
            </div>
            <div className="cp-home-benefit-grid">
              {homeCopy.benefits.cards.map((card) => (
                <article key={card.id} className="cp-home-benefit-card" data-tone={card.tone}>
                  <div>
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                  </div>
                  {card.id === 'advisor' ? (
                    <div className="cp-home-advisor-chat">
                      <div>
                        <CpAsset asset={homeAssets['0-imgEllipse4']} />
                        <strong>{card.advisor}</strong>
                      </div>
                      <p>{card.chat}</p>
                    </div>
                  ) : card.caption ? (
                    <PhotoSlot caption={card.caption} />
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="cp-home-reviews cp-home-section">
          <div className="cp-container cp-home-review-layout">
            <div className="cp-home-review-score">
              <p className="cp-home-eyebrow">{homeCopy.reviews.eyebrow}</p>
              <h2>
                {homeCopy.reviews.title.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </h2>
              <div className="cp-home-review-rating">
                <strong>{homeCopy.reviews.score}</strong>
                <div>
                  <p>{homeCopy.reviews.stars}</p>
                  <p>{homeCopy.reviews.count}</p>
                </div>
              </div>
            </div>
            <ReviewCarousel>
              {reviewExamples.map((review) => (
                <CpReviewCard key={review.id} content={review} />
              ))}
            </ReviewCarousel>
          </div>
        </section>
        <section id="faq" className="cp-home-faq cp-home-section">
          <div className="cp-container">
            <div className="cp-home-faq-intro">
              <p className="cp-home-eyebrow">{homeCopy.faq.eyebrow}</p>
              <h2>
                {homeCopy.faq.title.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </h2>
              <p>{homeCopy.faq.description}</p>
              <PreviewContact label={homeCopy.faq.button} />
              <PhotoSlot caption={homeCopy.faq.caption} />
            </div>
            <CpFaqAccordion
              items={faqExamples}
              name="home-faq"
              defaultOpenId="arrival"
              symbols={{ expand: componentCopy.plus, collapse: componentCopy.minus }}
            />
          </div>
        </section>
        <section className="cp-home-final cp-home-section">
          <div className="cp-container">
            <div>
              <h2>{homeCopy.final.title}</h2>
              <p>{homeCopy.final.description}</p>
              <div className="cp-home-final-actions">
                <CpButton asChild tone="sun" scale="large">
                  <a href="#popular-plans">{homeCopy.final.primary}</a>
                </CpButton>
                <PreviewContact label={homeCopy.final.secondary} tone="outline-inverse" />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer
        brand={homeChrome.brand}
        content={homeFooter}
        assets={componentAssets}
        brandHref="/"
      />
    </>
  );
}
