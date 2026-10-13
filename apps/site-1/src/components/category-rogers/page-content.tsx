import {
  CpAsset,
  CpBreadcrumb,
  CpFaqAccordion,
  CpImageSlot,
  CpSectionHeading,
} from '@canadian-plans/ui/canadian-plans';
import { categoryRogers as c, categoryRogersAssets } from '@content/category-rogers';
import { categorySimAssets } from '@content/category-sim';
import { RogersAdvisorButton, RogersPlanPicker } from './plan-picker';

function ImageSlot({ caption, tone = 'light' }: { caption: string; tone?: 'light' | 'on-blue' }) {
  return (
    <CpImageSlot
      tone={tone}
      icon={tone === 'on-blue' ? categorySimAssets.imageBlue : categorySimAssets.imageLight}
      label={c.ui.imageLabel}
      caption={caption}
    />
  );
}

export function RogersPageContent() {
  const breadcrumbItems = c.breadcrumb.map((label, index) => ({
    label,
    href: index < 2 ? (index === 0 ? '/' : '/mobile-plans') : undefined,
  }));
  return (
    <main className="cp-catrog-main">
      <div className="cp-catrog-breadcrumbbar">
        <div className="cp-catrog-container">
          <CpBreadcrumb items={breadcrumbItems} label={c.ui.breadcrumb} separator="/" />
        </div>
      </div>
      <section className="cp-catrog-hero">
        <div className="cp-catrog-container">
          <div className="cp-catrog-hero-grid">
            <div className="cp-catrog-hero-copy">
              <p className="cp-catrog-eyebrow">{c.eyebrow}</p>
              <h1>{c.headline}</h1>
              <p className="cp-catrog-intro">{c.intro}</p>
              <p className="cp-catrog-from">
                {c.ui.from} <strong>{c.from}</strong>
                {c.ui.taxUntilCall}
              </p>
              <div className="cp-catrog-actions">
                <a className="cp-catrog-primary" href="#plans">
                  {c.primaryAction}
                </a>
                <a className="cp-catrog-secondary" href="#comparison">
                  {c.compareAction}
                </a>
              </div>
              <ul className="cp-catrog-benefits">
                {c.benefits.map((benefit) => (
                  <li key={benefit}>
                    <span aria-hidden="true">{c.ui.checkMark}</span> {benefit}
                  </li>
                ))}
              </ul>
            </div>
            <div className="cp-catrog-spec">
              <div className="cp-catrog-spec-heading">
                <strong>{c.ui.logo}</strong>
                <span>{c.specTitle}</span>
              </div>
              {c.specs.map(([label, value]) => (
                <div className="cp-catrog-spec-row" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="cp-catrog-byline">
        <div className="cp-catrog-container">
          <div className="cp-catrog-meta-row">
            <div>
              <span className="cp-catrog-byline-avatar">
                <CpAsset asset={categoryRogersAssets.author} />
              </span>
              <span>
                <strong>{c.byline.author}</strong>
                <small>{c.byline.authorNote}</small>
              </span>
            </div>
            <div>
              <span className="cp-catrog-byline-avatar">
                <CpAsset asset={categoryRogersAssets.reviewer} />
              </span>
              <span>
                <strong>{c.byline.reviewer}</strong>
                <small>{c.byline.reviewerNote}</small>
              </span>
            </div>
            <small>{c.byline.updated}</small>
          </div>
          <nav aria-label={c.ui.toc}>
            <span>{c.tocLabel}</span>
            {c.toc.map((item) => (
              <a
                key={item}
                href={
                  item === 'At a glance'
                    ? '#glance'
                    : item === 'Plans'
                      ? '#plans'
                      : item === 'Pros & cons'
                        ? '#pros'
                        : item === 'FAQ'
                          ? '#faq'
                          : '#comparison'
                }
              >
                {item}
              </a>
            ))}
          </nav>
        </div>
      </section>
      <div className="cp-catrog-container">
        <section className="cp-catrog-quick">
          <div className="cp-catrog-quick-copy">
            <p>{c.quick.eyebrow}</p>
            <h2>{c.quick.title}</h2>
            <p>{c.quick.body}</p>
          </div>
        </section>
        <section id="glance" className="cp-catrog-glance">
          <div>
            <h2>{c.glance.title}</h2>
            <div className="cp-catrog-score">
              <strong>{c.glance.score}</strong>
              <span>{c.glance.scoreLabel}</span>
            </div>
            <p>
              {c.glance.note}{' '}
              <a className="cp-catrog-quick-link" href="#source">
                {c.glance.action}
              </a>
            </p>
          </div>
          <div className="cp-catrog-ratings" aria-label={c.ui.ratingLabel}>
            {c.glance.ratings.map(([label, detail, score]) => (
              <div className="cp-catrog-rating" key={label}>
                <strong>{label}</strong>
                {detail ? <span>{detail}</span> : null}
                <div
                  className={`cp-catrog-meter cp-catrog-meter-${score}`}
                  role="img"
                  aria-label={`${score}${c.ui.ratingOutOf}`}
                >
                  {Array.from({ length: 5 }, (_, index) => (
                    <span key={index} className={index < score ? 'is-filled' : undefined} />
                  ))}
                </div>
                <b>
                  {score}
                  {c.ui.ratingSuffix}
                </b>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section id="plans" className="cp-catrog-plans">
        <div className="cp-catrog-container">
          <RogersPlanPicker />
        </div>
      </section>
      <section id="pros" className="cp-catrog-pros">
        <div className="cp-catrog-container cp-catrog-pros-inner">
          <article>
            <h2>{c.pros.title}</h2>
            <ul>
              {c.pros.items.map((item) => (
                <li key={item}>
                  <span aria-hidden="true">{c.ui.checkMark}</span>
                  {item}
                </li>
              ))}
            </ul>
          </article>
          <article>
            <h2>{c.cons.title}</h2>
            <ul>
              {c.cons.items.map((item) => (
                <li key={item}>
                  <span aria-hidden="true">{c.ui.warningMark}</span>
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>
      <section id="comparison" className="cp-catrog-comparison">
        <div className="cp-catrog-container">
          <CpSectionHeading
            content={{ title: [c.comparison.title], description: c.comparison.description }}
          />
          <div className="cp-catrog-comparison-wrap">
            <table>
              <thead>
                <tr>
                  {c.comparison.headings.map((heading, index) => (
                    <th scope="col" key={heading}>
                      <span className={index === 0 ? 'sr-only' : undefined}>{heading}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.comparison.rows.map(([label, ...values]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {values.map((value, i) => (
                      <td key={`${label}-${i}`} className={i === 0 ? 'is-rogers' : undefined}>
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td />
                  <td className="is-rogers">{c.comparison.active}</td>
                  <td>
                    <a href="/mobile-plans#mobile-plans">{c.comparison.brandLinks[0]}</a>
                  </td>
                  <td>
                    <a href="/mobile-plans#mobile-plans">{c.comparison.brandLinks[1]}</a>
                  </td>
                </tr>
              </tfoot>
            </table>
            <div className="cp-catrog-comparison-mobile">
              {c.comparison.rows.map(([label, ...values]) => (
                <article key={label}>
                  <h3>{label}</h3>
                  <div>
                    {values.map((value, i) => (
                      <p className={i === 0 ? 'is-rogers' : undefined} key={`${label}-${i}`}>
                        <strong>{c.comparison.headings[i + 1]}</strong>
                        <span>{value}</span>
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
          <div className="cp-catrog-brand-links">
            <a href="/mobile-plans#mobile-plans">{c.comparison.brandLinks[0]}</a>
            <a href="/mobile-plans#mobile-plans">{c.comparison.brandLinks[1]}</a>
          </div>
        </div>
      </section>
      <section id="switch" className="cp-catrog-switch">
        <div className="cp-catrog-container">
          <h2>{c.steps.title}</h2>
          <div className="cp-catrog-steps">
            <ImageSlot caption={c.steps.imageCaption} tone="on-blue" />
            {c.steps.items.map(([number, title, description]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="cp-catrog-guide">
        <div className="cp-catrog-container cp-catrog-guide-grid">
          <div>
            <p className="cp-catrog-eyebrow">{c.guide.eyebrow}</p>
            <h2>{c.guide.title}</h2>
            <ImageSlot caption={c.guide.alt} />
            {c.guide.questions.map(([question, answer]) => (
              <article className="cp-catrog-guide-answer" key={question}>
                <h3>{question}</h3>
                <p>{answer}</p>
              </article>
            ))}
          </div>
          <div className="cp-catrog-guide-facts">
            <h3>{c.guide.factsTitle}</h3>
            {c.guide.facts.map(([label, value]) => (
              <p key={`${label}-${value}`}>
                <span>{label}</span>
                <strong>{value}</strong>
              </p>
            ))}
          </div>
        </div>
      </section>
      <section className="cp-catrog-reviews">
        <div className="cp-catrog-container cp-catrog-reviews-grid">
          <div>
            <p className="cp-catrog-eyebrow">{c.reviews.eyebrow}</p>
            <h2>
              {c.reviews.title.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h2>
            <strong className="cp-catrog-review-score">{c.reviews.score}</strong>
            <p className="cp-catrog-review-stars">{c.reviews.stars}</p>
            <p className="cp-catrog-review-count">{c.reviews.count}</p>
          </div>
          <div className="cp-catrog-review-cards">
            {c.reviews.items.map(([quote, name, detail]) => {
              const avatar =
                name === 'Aarav S.'
                  ? categoryRogersAssets.aarav
                  : name === 'Maria L.'
                    ? categoryRogersAssets.maria
                    : categoryRogersAssets.tanvir;
              return (
                <article key={name}>
                  <p aria-label={c.ui.reviewRating}>{c.reviews.stars}</p>
                  <blockquote>“{quote}”</blockquote>
                  <div className="cp-catrog-review-person">
                    <CpAsset asset={avatar} />
                    <span>
                      <strong>{name}</strong>
                      <small>{detail}</small>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <div className="cp-catrog-faq-block">
        <div className="cp-catrog-container">
          <section id="faq" className="cp-catrog-faq">
            <div>
              <p className="cp-catrog-eyebrow">{c.faq.eyebrow}</p>
              <h2>{c.faq.title}</h2>
              <p>{c.faq.intro}</p>
              <RogersAdvisorButton label={c.faq.advisor} />
              <ImageSlot caption={c.faq.advisorAlt} />
            </div>
            <CpFaqAccordion
              items={c.faq.items}
              name="rogers-plan-faq"
              defaultOpenId="credit"
              symbols={{ expand: '+', collapse: '−' }}
            />
          </section>
        </div>
      </div>
      <div className="cp-catrog-container">
        <section className="cp-catrog-explore">
          <h2>{c.exploreTitle}</h2>
          <div>
            {c.exploreGroups.map((group) => (
              <article key={group.title}>
                <h3>{group.title}</h3>
                {group.links.map(([label, href]) => (
                  <a href={href} key={label}>
                    {label}
                  </a>
                ))}
                {'desktopLink' in group ? (
                  <a className="cp-catrog-desktop-link" href={group.desktopLink[1]}>
                    {group.desktopLink[0]}
                  </a>
                ) : null}
              </article>
            ))}
          </div>
          <p id="source">{c.source}</p>
          <p className="cp-catrog-preview">{c.previewNotice}</p>
        </section>
      </div>
      <section className="cp-catrog-final">
        <div className="cp-catrog-container">
          <div className="cp-catrog-final-card">
            <ImageSlot caption={c.final.alt} tone="on-blue" />
            <h2>{c.final.title}</h2>
            <p>{c.final.description}</p>
            <div>
              <a href="#plans">{c.final.primary}</a>
              <RogersAdvisorButton label={c.final.secondary} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
