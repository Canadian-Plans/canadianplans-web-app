import type { Metadata } from 'next';
import {
  CpBreadcrumb,
  CpButton,
  CpFaqAccordion,
  CpImageSlot,
  CpSectionHeading,
} from '@canadian-plans/ui/canadian-plans';
import {
  categoryAssets,
  categoryChrome,
  categoryFooter,
  compareCopy as copy,
} from '@content/category-airport-compare';
import { pageMetadata } from '@/lib/page-metadata';
import { UtilityBar, PromoStrip, Footer } from '@/components/shared/chrome';
import { CategoryNavigation } from '@/components/category-airport-compare/navigation';
import { ComparisonPlans } from '@/components/category-airport-compare/comparison-plans';

export const metadata: Metadata = pageMetadata('/compare/rogers-vs-fido', {
  title: copy.metaTitle,
  robots: { index: false, follow: false },
});

export default function RogersVsFidoPage() {
  return (
    <>
      <a className="cp-catac-skip" href="#compare-main">
        {copy.skip}
      </a>
      <UtilityBar content={categoryChrome} assets={categoryAssets} planHref="#plans" />
      <CategoryNavigation content={categoryChrome} assets={categoryAssets} />
      <PromoStrip
        content={{
          ...categoryChrome,
          promo: copy.promo,
          promoLink: copy.promoLink,
          promoMobileLabel: copy.promoMobileLabel,
        }}
      />
      <main id="compare-main" tabIndex={-1} className="cp-catac-compare">
        <div className="cp-catac-compare-breadcrumb">
          <div className="cp-container">
            <CpBreadcrumb
              items={copy.breadcrumb}
              label={copy.breadcrumbLabel}
              separator={copy.breadcrumbSeparator}
            />
          </div>
        </div>
        <section className="cp-catac-compare-hero">
          <div className="cp-container cp-catac-compare-hero-inner">
            <div className="cp-catac-compare-hero-content">
              <p className="cp-catac-eyebrow">{copy.hero.eyebrow}</p>
              <h1>{copy.hero.title}</h1>
              <p className="cp-catac-compare-lede">{copy.hero.description}</p>
              <p className="cp-catac-compare-prices">
                <span>
                  {copy.hero.price[0].carrier} <strong>{copy.hero.price[0].amount}</strong>
                </span>
                <span>·</span>
                <span>
                  {copy.hero.price[1].carrier} <strong>{copy.hero.price[1].amount}</strong>
                </span>
                <span>{copy.hero.tax}</span>
              </p>
              <div className="cp-catac-compare-actions">
                <CpButton asChild scale="large">
                  <a href="#plans">{copy.hero.primary}</a>
                </CpButton>
                <CpButton asChild tone="outline" scale="large">
                  <a href="#faq">{copy.hero.secondary}</a>
                </CpButton>
              </div>
              <ul className="cp-catac-compare-trust">
                {copy.hero.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
            <article className="cp-catac-compare-spec-card">
              <h2>{copy.hero.specsTitle}</h2>
              <div className="cp-catac-compare-spec-head">
                <span aria-hidden="true" />
                {copy.hero.carrierLabels.map((label) => (
                  <strong key={label}>{label}</strong>
                ))}
              </div>
              {copy.hero.specs.map(([label, rogers, fido]) => (
                <div className="cp-catac-compare-spec-row" key={label}>
                  <span>{label}</span>
                  <strong>{rogers}</strong>
                  <strong>{fido}</strong>
                </div>
              ))}
            </article>
          </div>
        </section>
        <section className="cp-catac-compare-byline cp-container" aria-label={copy.article.label}>
          <div>
            <span>{copy.article.authorInitial}</span>
            <p>
              <strong>{copy.article.author}</strong>
              <small>{copy.article.authorDetail}</small>
            </p>
          </div>
          <div>
            <span>{copy.article.reviewerInitial}</span>
            <p>
              <strong>{copy.article.reviewer}</strong>
              <small>{copy.article.reviewerDetail}</small>
            </p>
          </div>
          <p>{copy.article.updated}</p>
        </section>
        <nav className="cp-catac-compare-onpage cp-container" aria-label={copy.article.navLabel}>
          <strong>{copy.article.contentsLabel}</strong>
          <ul>
            {copy.article.contents.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <section className="cp-catac-compare-quick cp-catac-section">
          <div className="cp-container">
            <p className="cp-catac-eyebrow">{copy.quick.eyebrow}</p>
            <h2>{copy.quick.title}</h2>
            <p>{copy.quick.answer}</p>
          </div>
        </section>
        <section className="cp-catac-compare-scorecard cp-catac-section">
          <div className="cp-container">
            <h2>{copy.scorecard.title}</h2>
            <div className="cp-catac-compare-scorecard-pick">
              <strong>{copy.scorecard.pick}</strong>
              <b>{copy.scorecard.pickLabel}</b>
            </div>
            <p>{copy.scorecard.summary}</p>
            <dl>
              {copy.scorecard.rows.map((row) => (
                <div key={row.label}>
                  <dt>
                    <strong>{row.label}</strong>
                    <span>{row.detail}</span>
                  </dt>
                  <dd data-winner={row.winner === 'Tie' ? 'tie' : 'carrier'}>{row.winner}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
        <section id="plans" className="cp-catac-compare-plans cp-catac-section">
          <div className="cp-container">
            <div className="cp-catac-compare-section-heading">
              <CpSectionHeading
                content={{
                  eyebrow: copy.plans.eyebrow,
                  title: [copy.plans.title],
                  description: copy.plans.description,
                }}
              />
            </div>
            <ComparisonPlans
              plans={copy.plans.cards}
              sortLabel={copy.plans.sortLabel}
              sortOptions={copy.plans.sortOptions}
              dataHeading={copy.plans.dataHeading}
              planCheck={categoryAssets.planCheck}
            />
            <div
              className="cp-catac-compare-table-wrap"
              role="region"
              aria-label={copy.plans.compareTableLabel}
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    {copy.plans.columns.map((col) => (
                      <th scope="col" key={col}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {copy.plans.rows.map((row) => (
                    <tr key={row[0]}>
                      {row.map((cell, index) =>
                        index === 0 ? (
                          <th scope="row" key={index}>
                            {cell}
                          </th>
                        ) : (
                          <td key={index}>{cell}</td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="cp-catac-compare-disclosure">{copy.plans.disclosure}</p>
          </div>
        </section>
        <section id="recommendations" className="cp-catac-compare-recommend cp-catac-section">
          <div className="cp-container">
            <CpSectionHeading
              content={{
                eyebrow: copy.recommendations.eyebrow,
                title: [copy.recommendations.title],
              }}
            />
            <div className="cp-catac-compare-recommend-grid">
              <article>
                <h3>{copy.recommendations.fidoTitle}</h3>
                <ul>
                  {copy.recommendations.fido.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </article>
              <article>
                <h3>{copy.recommendations.rogersTitle}</h3>
                <ul>
                  {copy.recommendations.rogers.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </section>
        <section className="cp-catac-compare-three cp-catac-section">
          <div className="cp-container">
            <CpSectionHeading
              content={{ eyebrow: copy.carrierCompare.eyebrow, title: [copy.carrierCompare.title] }}
            />
            <div
              className="cp-catac-compare-table-wrap"
              role="region"
              aria-label={copy.plans.threeCarrierTableLabel}
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    {copy.carrierCompare.columns.map((col) => (
                      <th scope="col" key={col}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {copy.carrierCompare.rows.map((row) => (
                    <tr key={row[0]}>
                      {row.map((cell, index) =>
                        index === 0 ? (
                          <th scope="row" key={index}>
                            {cell}
                          </th>
                        ) : (
                          <td key={index}>{cell}</td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>{copy.carrierCompare.note}</p>
          </div>
        </section>
        <section id="switching" className="cp-catac-compare-switch cp-catac-section">
          <div className="cp-container">
            <p className="cp-catac-eyebrow">{copy.switching.eyebrow}</p>
            <h2>{copy.switching.title}</h2>
            <p>{copy.switching.subtitle}</p>
            <ol>
              {copy.switching.steps.map(([number, title, text]) => (
                <li key={number}>
                  <span>{number}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section className="cp-catac-compare-guide cp-catac-section">
          <div className="cp-container cp-catac-compare-guide-grid">
            <div>
              <CpSectionHeading
                content={{ eyebrow: copy.guide.eyebrow, title: [copy.guide.title] }}
              />
              <CpImageSlot
                icon={categoryAssets.imageLight}
                label={copy.guide.imageLabel}
                caption={copy.guide.imageAlt}
              />
              {copy.guide.paragraphs.map(([heading, text]) => (
                <article key={heading}>
                  <h3>{heading}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            <div className="cp-catac-compare-facts">
              <h2>{copy.guide.factsTitle}</h2>
              <dl>
                {copy.guide.facts.map(([term, definition]) => (
                  <div key={term}>
                    <dt>{term}</dt>
                    <dd>{definition}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
        <section className="cp-catac-compare-reviews cp-catac-section">
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
        <section id="faq" className="cp-catac-compare-faq cp-catac-section">
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
              <CpImageSlot
                icon={categoryAssets.imageLight}
                label={copy.faq.imageLabel}
                caption={copy.faq.imageAlt}
              />
            </div>
            <CpFaqAccordion
              items={copy.faq.items}
              name="rogers-fido-faq"
              defaultOpenIds={['network']}
              symbols={{ expand: copy.faq.expand, collapse: copy.faq.collapse }}
            />
          </div>
        </section>
        <section className="cp-catac-compare-explore cp-catac-section">
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
            <p>{copy.explore.sourceNote}</p>
          </div>
        </section>
        <section className="cp-catac-compare-final cp-catac-section">
          <div className="cp-container">
            <h2>{copy.final.title}</h2>
            <p>{copy.final.description}</p>
            <div>
              <CpButton asChild tone="sun" scale="large">
                <a href={copy.plans.rogersLink}>{copy.final.primary}</a>
              </CpButton>
              <CpButton asChild tone="outline-inverse" scale="large">
                <a href="#faq">{copy.final.secondary}</a>
              </CpButton>
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
