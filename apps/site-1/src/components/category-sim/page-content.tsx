import {
  CpAsset,
  CpBreadcrumb,
  CpButton,
  CpImageSlot,
  CpLinkPill,
  CpReviewCard,
  CpSectionHeading,
} from '@canadian-plans/ui/canadian-plans';
import { Footer, PromoStrip, UtilityBar } from '@/components/shared/chrome';
import {
  categorySimAssets,
  categorySimChrome,
  categorySimFooter,
  categorySimPages,
  type CategoryPageKey,
  type CategorySimPageContent,
} from '@content/category-sim';
import { CategoryNavigation, CategoryPlanPicker } from './interactive';

function ImageSlot({
  caption,
  label,
  tone = 'light',
}: {
  caption: string;
  label: string;
  tone?: 'light' | 'on-blue';
}) {
  return (
    <CpImageSlot
      tone={tone}
      icon={tone === 'on-blue' ? categorySimAssets.imageBlue : categorySimAssets.imageLight}
      label={label}
      caption={caption}
    />
  );
}

function BoardingPass({ page }: { page: CategorySimPageContent }) {
  const pass = page.hero.boardingPass;
  return (
    <article
      className="cp-catsim-pass"
      aria-label={pass.title}
      data-node-id={page.path.endsWith('/students') ? '151:55' : '162:55'}
    >
      <div className="cp-catsim-pass-top">
        <div className="cp-catsim-pass-brand">
          <span>{pass.brand}</span>
        </div>
        <span className="cp-catsim-pass-tag">{pass.tag}</span>
      </div>
      <div className="cp-catsim-pass-route">
        <div>
          <span>{pass.fromLabel}</span>
          <strong>{pass.fromCode}</strong>
          <small>{pass.from}</small>
        </div>
        <span className="cp-catsim-pass-arrow" aria-hidden="true">
          {page.ui.routeArrow}
        </span>
        <div>
          <span>{pass.toLabel}</span>
          <strong>{pass.toCode}</strong>
          <small>{pass.to}</small>
        </div>
      </div>
      <div className="cp-catsim-pass-fields">
        <div>
          <span>{pass.passengerLabel}</span>
          <strong>{page.hero.passenger}</strong>
        </div>
        <div>
          <span>{pass.planLabel}</span>
          <strong>{pass.planValue}</strong>
        </div>
        <div>
          <span>{pass.numberLabel}</span>
          <strong>{pass.numberValue}</strong>
        </div>
        <div>
          <span>{pass.statusLabel}</span>
          <strong className="cp-catsim-pass-status">
            <span>{pass.statusValue}</span>
          </strong>
        </div>
      </div>
      <div className="cp-catsim-pass-perforation" aria-hidden="true">
        <span />
        <CpAsset asset={categorySimAssets.passPerforation} />
        <CpAsset asset={categorySimAssets.passPerforation} />
      </div>
      <div className="cp-catsim-pass-stub">
        <span className="cp-catsim-barcode" aria-hidden="true" />
        <span>{page.ui.passStub}</span>
      </div>
    </article>
  );
}

function Hero({ page }: { page: CategorySimPageContent }) {
  return (
    <>
      <div className="cp-catsim-breadcrumb-band">
        <div className="cp-container">
          <div className="cp-catsim-breadcrumb">
            <CpBreadcrumb
              items={page.breadcrumb}
              label={page.ui.breadcrumbLabel}
              separator={page.ui.breadcrumbSeparator}
            />
          </div>
        </div>
      </div>
      <section
        className="cp-catsim-hero"
        data-node-id={page.path.endsWith('/students') ? '151:41' : '162:41'}
      >
        <div className="cp-container">
          <div className="cp-catsim-hero-grid">
            <div className="cp-catsim-hero-copy">
              <p className="cp-catsim-eyebrow">{page.hero.eyebrow}</p>
              <h1>{page.hero.title}</h1>
              <p className="cp-catsim-hero-description">{page.hero.description}</p>
              <div className="cp-catsim-price-from">
                <strong>{page.hero.price}</strong>
                <span>
                  {page.hero.priceDetails} · <del>{page.hero.retailPrice}</del>{' '}
                  {page.hero.retailPriceContext}
                </span>
              </div>
              <div className="cp-catsim-hero-actions">
                <CpButton asChild tone="primary" scale="large">
                  <a href="#plans">{page.hero.primary}</a>
                </CpButton>
                <CpButton asChild tone="outline-brand" scale="large">
                  <a className="cp-catsim-phone-ready" href="#documents">
                    {page.hero.secondary}
                  </a>
                </CpButton>
              </div>
              <ul className="cp-catsim-hero-features">
                {page.hero.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
            <div className="cp-catsim-pass-wrap">
              <BoardingPass page={page} />
              <div
                className="cp-catsim-price-sticker"
                aria-label={`${page.ui.priceCircleLabel} ${page.ui.priceCircleAmount} ${page.priceSuffix}`}
              >
                <p>{page.ui.priceCircleLabel}</p>
                <strong>{page.ui.priceCircleAmount}</strong>
                <p>{page.priceSuffix}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function MetaBar({ page }: { page: CategorySimPageContent }) {
  return (
    <section
      className="cp-catsim-meta"
      aria-label={page.meta.title}
      data-node-id={page.path.endsWith('/students') ? '151:125' : '162:125'}
    >
      <div className="cp-container">
        <div className="cp-catsim-byline">
          <span className="cp-catsim-avatar cp-catsim-avatar-author">
            <CpAsset asset={categorySimAssets.authorAvatar} alt="" />
          </span>
          <span>
            <strong>{page.meta.author}</strong>
            <small>{page.meta.authorDetail}</small>
          </span>
          <span className="cp-catsim-avatar cp-catsim-avatar-reviewer">
            <CpAsset asset={categorySimAssets.reviewerAvatar} alt="" />
          </span>
          <span>
            <strong>{page.meta.reviewer}</strong>
            <small>{page.meta.reviewerDetail}</small>
          </span>
          <span className="cp-catsim-meta-updated">
            {page.meta.updated} · {page.meta.readingTime}
          </span>
        </div>
        <nav className="cp-catsim-on-this-page" aria-label={page.meta.title}>
          <strong>{page.meta.title}</strong>
          {page.meta.pageLinks.map((item) => (
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}

function QuickAnswer({ page }: { page: CategorySimPageContent }) {
  return (
    <section
      className={`cp-catsim-quick${page.countryFacts ? ' cp-catsim-quick-india' : ''}`}
      data-node-id={page.path.endsWith('/students') ? '152:2' : '162:2'}
    >
      <div className="cp-container">
        <article className="cp-catsim-quick-card">
          <p className="cp-catsim-eyebrow">{page.quickAnswerLabel}</p>
          <h2>{page.quickAnswer.question}</h2>
          <p>{page.quickAnswer.answer}</p>
        </article>
      </div>
    </section>
  );
}

function CountryFacts({ page }: { page: CategorySimPageContent }) {
  if (!page.countryFacts) return null;
  return (
    <section
      className="cp-catsim-country-facts-section cp-catsim-section"
      aria-label={page.ui.countryFactsLabel}
      data-node-id="314:1920"
    >
      <div className="cp-container">
        <div className="cp-catsim-country-facts">
          {page.countryFacts.map((fact) => (
            <article key={fact.label}>
              <p>{fact.label}</p>
              <strong>{fact.value}</strong>
              <span>{fact.detail}</span>
            </article>
          ))}
        </div>
        {page.countryFactsNote ? (
          <p className="cp-catsim-country-facts-note">{page.countryFactsNote}</p>
        ) : null}
      </div>
    </section>
  );
}

function Countdown({ page }: { page: CategorySimPageContent }) {
  return (
    <section
      id="countdown"
      className="cp-catsim-countdown cp-catsim-section"
      data-node-id={page.path.endsWith('/students') ? '152:4' : '162:160'}
    >
      <div className="cp-container">
        <CpSectionHeading
          content={{ eyebrow: page.countdown.eyebrow, title: [page.countdown.title] }}
        />
        <ImageSlot caption={page.countdown.caption} label={page.imageLabel} tone="on-blue" />
        <ol className="cp-catsim-timeline">
          {page.countdown.steps.map((step) => (
            <li key={step.number} data-tone={step.tone}>
              <span className="cp-catsim-step-number">{step.number}</span>
              <div>
                <p className="cp-catsim-eyebrow">{step.timing}</p>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Requirements({ page }: { page: CategorySimPageContent }) {
  return (
    <section
      id="documents"
      className="cp-catsim-requirements cp-catsim-section"
      data-node-id={page.path.endsWith('/students') ? '152:105' : '162:260'}
    >
      <div className="cp-container cp-catsim-requirements-grid">
        <article className="cp-catsim-requirement-card">
          <h2>{page.requirements.title}</h2>
          <ul>
            {page.requirements.items.map((item) => (
              <li key={item.title}>
                <span aria-hidden="true">✓</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>
        <article className="cp-catsim-esim-card">
          <h2>{page.requirements.esimTitle}</h2>
          <p>{page.requirements.esimDescription}</p>
          <ImageSlot caption={page.requirements.imageCaption} label={page.imageLabel} />
          <dl>
            <div>
              <dt>{page.ui.phoneLabels[0]}</dt>
              <dd>{page.requirements.iPhone}</dd>
            </div>
            <div>
              <dt>{page.ui.phoneLabels[1]}</dt>
              <dd>{page.requirements.android}</dd>
            </div>
            <div>
              <dt>{page.ui.phoneLabels[2]}</dt>
              <dd>{page.requirements.unsure}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  );
}

function CallingIndia({ page }: { page: CategorySimPageContent }) {
  const copy = page.callingIndia;
  if (!copy) return null;
  return (
    <section
      id="calling-india"
      className="cp-catsim-calling cp-catsim-section"
      data-node-id="162:503"
    >
      <div className="cp-container">
        <CpSectionHeading content={{ title: [copy.title], description: copy.description }} />
        <div className="cp-catsim-calling-grid">
          <div className="cp-catsim-calling-options">
            <ImageSlot caption={copy.imageCaption} label={page.imageLabel} />
            {copy.options.map((option) => (
              <article key={option.title}>
                <span>{option.label}</span>
                <div>
                  <h3>{option.title}</h3>
                  <p>{option.description}</p>
                </div>
              </article>
            ))}
          </div>
          <article className="cp-catsim-keep-number">
            <h3>{copy.keepTitle}</h3>
            <p>{copy.keepDescription}</p>
            <ul>
              {copy.keepTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}

function Guide({ page }: { page: CategorySimPageContent }) {
  return (
    <section
      id="guide"
      className="cp-catsim-guide cp-catsim-section"
      data-node-id={page.path.endsWith('/students') ? '153:2' : '162:299'}
    >
      <div className="cp-container cp-catsim-guide-grid">
        <article className="cp-catsim-guide-copy">
          <CpSectionHeading content={{ eyebrow: page.guide.eyebrow, title: [page.guide.title] }} />
          {page.guide.questions[0] ? (
            <div>
              <h3>{page.guide.questions[0].question}</h3>
              <p>{page.guide.questions[0].answer}</p>
            </div>
          ) : null}
          <ImageSlot caption={page.guide.imageCaption} label={page.imageLabel} />
          {page.guide.questions.slice(1).map((item) => (
            <div key={item.question}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </div>
          ))}
        </article>
        <div className="cp-catsim-key-facts">
          <h2>{page.guide.factsTitle}</h2>
          <dl>
            {page.guide.facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
          <p>{page.meta.updated}</p>
        </div>
      </div>
    </section>
  );
}

function Reviews({ page }: { page: CategorySimPageContent }) {
  return (
    <section
      className="cp-catsim-reviews cp-catsim-section"
      aria-label={page.ui.reviewSectionLabel}
      data-node-id={page.path.endsWith('/students') ? '153:35' : '162:330'}
    >
      <div className="cp-container cp-catsim-reviews-grid">
        <div className="cp-catsim-review-score">
          <p className="cp-catsim-eyebrow">{page.reviews.eyebrow}</p>
          <h2>
            {page.reviews.title.map((line) => (
              <span key={line}>{line} </span>
            ))}
          </h2>
          <strong>{page.reviews.score}</strong>
          <span className="cp-catsim-score-stars" aria-label={page.ui.starRatingLabel}>
            {page.reviews.stars}
          </span>
          <p>{page.reviews.count}</p>
        </div>
        <div className="cp-catsim-review-cards">
          {page.reviews.items.map((review) => (
            <CpReviewCard key={review.id} content={review} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ({ page }: { page: CategorySimPageContent }) {
  return (
    <section
      id="faq"
      className="cp-catsim-faq cp-catsim-section"
      data-node-id={page.path.endsWith('/students') ? '154:2' : '162:391'}
    >
      <div className="cp-container cp-catsim-faq-grid">
        <div>
          <CpSectionHeading
            content={{
              eyebrow: page.ui.faqEyebrow,
              title: page.faq.title,
              description: page.faq.description,
            }}
          />
          <CpButton asChild tone="outline" scale="large">
            <a className="cp-catsim-advisor-link" href="#contact">
              {page.faq.advisor}
            </a>
          </CpButton>
        </div>
        <div className="cp-faq-accordion">
          {page.faq.items.map((item) => (
            <details
              key={item.id}
              className="cp-faq-item"
              open={page.faq.openByDefault.includes(item.id)}
            >
              <summary>
                <span className="cp-faq-question">{item.question}</span>
                <span className="cp-faq-toggle" aria-hidden="true">
                  <span className="cp-faq-expand">{page.ui.faqExpand}</span>
                  <span className="cp-faq-collapse">{page.ui.faqCollapse}</span>
                </span>
              </summary>
              <p className="cp-faq-answer">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Explore({ page }: { page: CategorySimPageContent }) {
  return (
    <section
      className="cp-catsim-explore cp-catsim-section"
      data-node-id={page.path.endsWith('/students') ? '155:2' : '162:414'}
    >
      <div className="cp-container">
        <h2>{page.explore.title}</h2>
        <div className="cp-catsim-explore-grid">
          {page.explore.groups.map((group) => (
            <article key={group.title}>
              <h3>{group.title}</h3>
              <div>
                {group.links.map((item) => (
                  <CpLinkPill key={item.label} href={item.href}>
                    {item.label} {page.ui.exploreArrow}
                  </CpLinkPill>
                ))}
              </div>
            </article>
          ))}
        </div>
        <p className="cp-catsim-source-note">{page.sourceNote}</p>
      </div>
    </section>
  );
}

function FinalAction({ page }: { page: CategorySimPageContent }) {
  return (
    <section className="cp-catsim-final cp-catsim-section">
      <div className="cp-container">
        <div className="cp-catsim-final-card">
          <h2>{page.final.title}</h2>
          <p>{page.final.description}</p>
          <div>
            <CpButton asChild tone="sun">
              <a href="#plans">{page.final.primary}</a>
            </CpButton>
            <CpButton asChild tone="outline-inverse">
              <a href="#contact">{page.final.secondary}</a>
            </CpButton>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CategorySimPage({ pageKey }: { pageKey: CategoryPageKey }) {
  const page = categorySimPages[pageKey];
  return (
    <>
      <a className="cp-catsim-skip" href="#catsim-main">
        {page.skip}
      </a>
      <UtilityBar content={categorySimChrome} assets={categorySimAssets} planHref="#plans" />
      <CategoryNavigation
        content={categorySimChrome}
        assets={categorySimAssets}
        dialogCopy={{
          title: page.faq.dialogTitle,
          description: page.faq.dialogDescription,
          close: page.faq.dialogClose,
        }}
      />
      <PromoStrip content={categorySimChrome} />
      <main id="catsim-main" tabIndex={-1} className="cp-catsim-main">
        <Hero page={page} />
        <MetaBar page={page} />
        <QuickAnswer page={page} />
        <CountryFacts page={page} />
        <Countdown page={page} />
        <CategoryPlanPicker content={{ path: page.path, plans: page.plans }} />
        <Requirements page={page} />
        <CallingIndia page={page} />
        <Guide page={page} />
        <Reviews page={page} />
        <FAQ page={page} />
        <Explore page={page} />
        <FinalAction page={page} />
      </main>
      <Footer
        brand="Canadian Plans"
        content={categorySimFooter}
        assets={categorySimAssets}
        brandHref="/"
      />
    </>
  );
}
