import type { Metadata } from 'next';
import {
  CpBreadcrumb,
  CpButton,
  CpFaqAccordion,
  CpImageSlot,
  CpSectionHeading,
} from '@canadian-plans/ui/canadian-plans';
import {
  airportCopy as copy,
  categoryAssets,
  categoryChrome,
  categoryFooter,
} from '@content/category-airport-compare';
import { pageMetadata } from '@/lib/page-metadata';
import { UtilityBar, PromoStrip, Footer } from '@/components/shared/chrome';
import { CategoryNavigation } from '@/components/category-airport-compare/navigation';
import { AirportPlans } from '@/components/category-airport-compare/airport-plans';

export const metadata: Metadata = pageMetadata('/pre-arrival-sim/toronto-pearson', {
  title: copy.metaTitle,
  robots: { index: false, follow: false },
});

export default function TorontoPearsonPage() {
  return (
    <>
      <a className="cp-catac-skip" href="#airport-main">
        {copy.skip}
      </a>
      <UtilityBar content={categoryChrome} assets={categoryAssets} planHref="#plans" />
      <CategoryNavigation content={categoryChrome} assets={categoryAssets} />
      <PromoStrip content={categoryChrome} />
      <main id="airport-main" tabIndex={-1} className="cp-catac-airport">
        <div className="cp-container cp-catac-breadcrumb">
          <CpBreadcrumb
            items={copy.breadcrumb}
            label={copy.breadcrumbLabel}
            separator={copy.breadcrumbSeparator}
          />
        </div>
        <section className="cp-catac-airport-hero">
          <div className="cp-container cp-catac-airport-hero-inner">
            <div className="cp-catac-airport-hero-copy">
              <p className="cp-catac-eyebrow">{copy.hero.eyebrow}</p>
              <h1>{copy.hero.title}</h1>
              <p className="cp-catac-airport-hero-description">{copy.hero.description}</p>
              <div className="cp-catac-airport-price-anchor">
                <strong>{copy.hero.price}</strong>
                <p>
                  {copy.hero.saving.lead} <del>{copy.hero.saving.amount}</del>{' '}
                  {copy.hero.saving.detail} <strong>{copy.hero.saving.emphasis}</strong>
                </p>
              </div>
              <div className="cp-catac-airport-hero-actions">
                <CpButton asChild scale="large">
                  <a href="#plans">{copy.hero.primary}</a>
                </CpButton>
                <CpButton asChild tone="outline" scale="large">
                  <a className="cp-catac-airport-secondary" href="#documents">
                    {copy.hero.secondary}
                  </a>
                </CpButton>
              </div>
              <p className="cp-catac-airport-landed">
                <strong>{copy.hero.landedLead}</strong> {copy.hero.landedText}
                <a href="#faq">{copy.hero.landedLink}</a>
              </p>
              <ul className="cp-catac-airport-hero-features">
                {copy.hero.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
            <article
              className="cp-catac-airport-boarding-pass"
              aria-label={copy.hero.boardingPass.ariaLabel}
            >
              <div className="cp-catac-airport-pass-head">
                <strong>{copy.hero.boardingPass.brand}</strong>
                <span>{copy.hero.boardingPass.terminal}</span>
              </div>
              <div className="cp-catac-airport-route">
                <div>
                  <span>{copy.hero.boardingPass.fromLabel}</span>
                  <strong>{copy.hero.boardingPass.from}</strong>
                  <small>{copy.hero.boardingPass.fromDetail}</small>
                </div>
                <span aria-hidden="true" className="cp-catac-airport-route-arrow">
                  →
                </span>
                <div>
                  <span>{copy.hero.boardingPass.toLabel}</span>
                  <strong>{copy.hero.boardingPass.to}</strong>
                  <small>{copy.hero.boardingPass.toDetail}</small>
                </div>
              </div>
              <dl className="cp-catac-airport-pass-details">
                <div>
                  <dt>{copy.hero.boardingPass.passengerLabel}</dt>
                  <dd>{copy.hero.boardingPass.passenger}</dd>
                </div>
                <div>
                  <dt>{copy.hero.boardingPass.planLabel}</dt>
                  <dd>{copy.hero.boardingPass.plan}</dd>
                </div>
                <div>
                  <dt>{copy.hero.boardingPass.numberLabel}</dt>
                  <dd>{copy.hero.boardingPass.number}</dd>
                </div>
                <div>
                  <dt>{copy.hero.boardingPass.statusLabel}</dt>
                  <dd className="cp-catac-airport-status">{copy.hero.boardingPass.status}</dd>
                </div>
              </dl>
              <div
                className="cp-catac-airport-pass-stub"
                aria-label={copy.hero.boardingPass.priceDetailsLabel}
              >
                <div className="cp-catac-airport-barcode" aria-hidden="true" />
                <p className="cp-catac-airport-pass-instruction">
                  {copy.hero.boardingPass.instruction}
                </p>
                <span className="cp-catac-airport-price-stamp" aria-hidden="true">
                  <small>{copy.hero.boardingPass.amountLabel}</small>
                  <strong>{copy.hero.boardingPass.amount}</strong>
                  <small>{copy.hero.boardingPass.period}</small>
                </span>
                <span className="cp-catac-airport-perforation" aria-hidden="true">
                  <img
                    alt=""
                    data-figma-asset="186:595"
                    width="28"
                    height="28"
                    src={copy.hero.boardingPass.perforation.src}
                  />
                </span>
                <span
                  className="cp-catac-airport-perforation cp-catac-airport-perforation-end"
                  aria-hidden="true"
                >
                  <img
                    alt=""
                    data-figma-asset="186:595"
                    width="28"
                    height="28"
                    src={copy.hero.boardingPass.perforation.src}
                  />
                </span>
              </div>
            </article>
          </div>
        </section>

        <section className="cp-catac-airport-byline cp-container" aria-label={copy.article.label}>
          <div className="cp-catac-airport-byline-person">
            <span>{copy.article.authorInitial}</span>
            <p>
              <strong>{copy.article.author}</strong>
              <small>{copy.article.authorDetail}</small>
            </p>
          </div>
          <div className="cp-catac-airport-byline-person">
            <span>{copy.article.reviewerInitial}</span>
            <p>
              <strong>{copy.article.reviewer}</strong>
              <small>{copy.article.reviewerDetail}</small>
            </p>
          </div>
          <p className="cp-catac-airport-updated">{copy.article.updated}</p>
        </section>
        <nav className="cp-catac-airport-onpage cp-container" aria-label={copy.article.navLabel}>
          <strong>{copy.article.contentsLabel}</strong>
          <ul>
            {copy.article.contents.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <section className="cp-catac-airport-quick cp-catac-section">
          <div className="cp-container cp-catac-airport-quick-inner">
            <div className="cp-catac-airport-quick-mark" aria-hidden="true" />
            <div>
              <p className="cp-catac-eyebrow">{copy.quick.eyebrow}</p>
              <h2>{copy.quick.title}</h2>
              <p>{copy.quick.answer}</p>
            </div>
          </div>
        </section>

        <section id="plans" className="cp-catac-airport-plans cp-catac-section">
          <div className="cp-container">
            <div className="cp-catac-airport-plans-heading">
              <CpSectionHeading
                content={{
                  eyebrow: copy.plans.eyebrow,
                  title: [copy.plans.heading],
                  description: copy.plans.description,
                }}
              />
              <p>{copy.plans.priceNote}</p>
            </div>
            <AirportPlans plans={copy.plans.plans} labels={copy.plans} />
          </div>
        </section>

        <section id="how-it-works" className="cp-catac-airport-how cp-catac-section">
          <div className="cp-container">
            <div className="cp-catac-airport-how-heading">
              <div>
                <p className="cp-catac-eyebrow">{copy.how.eyebrow}</p>
                <h2>{copy.how.heading[0]}</h2>
              </div>
            </div>
            <CpImageSlot
              tone="on-blue"
              icon={categoryAssets.imageBlue}
              label={copy.how.imageLabel}
              caption={copy.how.imageAlt}
              className="cp-catac-airport-how-image"
            />
            <ol className="cp-catac-airport-steps">
              {copy.how.steps.map((step) => (
                <li key={step.number}>
                  <span className="cp-catac-airport-step-number">{step.number}</span>
                  <p className="cp-catac-eyebrow">{step.when}</p>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="documents" className="cp-catac-airport-documents cp-catac-section">
          <div className="cp-container cp-catac-airport-document-grid">
            <article className="cp-catac-airport-document-card">
              <h2>{copy.documents.heading}</h2>
              <ul>
                {copy.documents.items.map((item) => (
                  <li key={item.title}>
                    <span aria-hidden="true">✓</span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <CpImageSlot
                icon={categoryAssets.imageLight}
                label={copy.documents.imageLabel}
                caption={copy.documents.imageAlt}
              />
            </article>
            <article className="cp-catac-airport-device-card">
              <h2>{copy.documents.phoneTitle}</h2>
              <p>{copy.documents.phoneIntro}</p>
              <dl>
                {copy.documents.devices.map((device) => (
                  <div key={device.name}>
                    <dt>{device.name}</dt>
                    <dd>{device.detail}</dd>
                  </div>
                ))}
              </dl>
              <p className="cp-catac-airport-device-help">
                <strong>{copy.documents.notSure}</strong> {copy.documents.help}
              </p>
            </article>
          </div>
        </section>

        <section id="arrival-guide" className="cp-catac-airport-guide cp-catac-section">
          <div className="cp-container cp-catac-airport-guide-grid">
            <div className="cp-catac-airport-guide-main">
              <CpSectionHeading
                content={{ eyebrow: copy.guide.eyebrow, title: [copy.guide.heading] }}
              />
              <CpImageSlot
                icon={categoryAssets.imageLight}
                label={copy.guide.imageLabel}
                caption={copy.guide.imageAlt}
                className="cp-catac-airport-guide-image"
              />
              <div className="cp-catac-airport-guide-answers">
                {copy.guide.questions.map((item) => (
                  <article key={item.question}>
                    <h3>{item.question}</h3>
                    <p>{item.answer}</p>
                  </article>
                ))}
              </div>
            </div>
            <div className="cp-catac-airport-facts">
              <h2>{copy.guide.factsTitle}</h2>
              <dl>
                {copy.guide.facts.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section className="cp-catac-airport-reviews cp-catac-section">
          <div className="cp-container cp-catac-airport-review-grid">
            <div className="cp-catac-airport-review-score">
              <p className="cp-catac-eyebrow">{copy.reviews.eyebrow}</p>
              <h2>
                {copy.reviews.title.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </h2>
              <strong>{copy.reviews.score}</strong>
              <p aria-label={copy.reviews.ratingLabel}>{copy.reviews.stars}</p>
              <small>{copy.reviews.count}</small>
            </div>
            <div className="cp-catac-airport-review-cards">
              {copy.reviews.items.map((review) => (
                <article key={review.name}>
                  <p aria-label={copy.reviews.ratingLabel}>{review.stars}</p>
                  <blockquote>{review.quote}</blockquote>
                  <strong>{review.name}</strong>
                  <small>{review.detail}</small>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="cp-catac-airport-faq cp-catac-section">
          <div className="cp-container cp-catac-airport-faq-grid">
            <div className="cp-catac-airport-faq-intro">
              <CpSectionHeading
                content={{
                  eyebrow: copy.faq.eyebrow,
                  title: copy.faq.title,
                  description: copy.faq.description,
                }}
              />
              <CpButton asChild tone="outline">
                <a href="#contact">{copy.faq.button}</a>
              </CpButton>
            </div>
            <CpFaqAccordion
              items={copy.faq.items}
              name="pearson-arrival-faq"
              defaultOpenIds={['arrival', 'landed']}
              symbols={{ expand: copy.faq.expand, collapse: copy.faq.collapse }}
            />
          </div>
        </section>

        <section className="cp-catac-airport-explore cp-catac-section">
          <div className="cp-container">
            <h2>{copy.explore.title}</h2>
            <div>
              {copy.explore.groups.map((group) => (
                <article key={group.title}>
                  <h3>{group.title}</h3>
                  <ul>
                    {group.links.map((link) => (
                      <li key={link.label}>
                        <a href={link.href}>{link.label}</a>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <p className="cp-catac-airport-source-note">{copy.explore.sourceNote}</p>
          </div>
        </section>

        <section className="cp-catac-airport-final cp-catac-section">
          <div className="cp-container">
            <div>
              <h2>{copy.final.title}</h2>
              <p>{copy.final.description}</p>
              <div>
                <CpButton asChild tone="sun" scale="large">
                  <a href="#plans">{copy.final.primary}</a>
                </CpButton>
                <CpButton asChild tone="outline-inverse" scale="large">
                  <a href="#faq">{copy.final.secondary}</a>
                </CpButton>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer
        brand={categoryChrome.brand}
        content={categoryFooter}
        assets={categoryAssets}
        brandHref="/"
      />
    </>
  );
}
