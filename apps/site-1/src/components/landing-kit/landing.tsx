import Image from 'next/image';
import type { ReactNode } from 'react';
import {
  CpAsset,
  CpBreadcrumb,
  CpButton,
  CpCtaBand,
  CpFaqAccordion,
  CpStepTimeline,
} from '@canadian-plans/ui/canadian-plans';
import { redesignAssets, type RedesignAssetKey } from '@content/home-redesign';
import type {
  LandingImage,
  LandingKitPage,
  LandingKitShared,
  LandingPlanCard,
} from '@content/landing-kit';
import { buildLandingSchema, serializeLandingSchema } from '@/lib/landing-schema';
import { siteBaseUrl } from '@/lib/seo';

export const landingArt = (key: RedesignAssetKey, alt = '') => (
  <CpAsset asset={redesignAssets[key]} alt={alt} />
);

/**
 * Category landing page composition (24 October 2026), shared by home internet, mobile and
 * pre-arrival: hero → proof strip → plans (supplied by the page) → what's included → image
 * rows → table → how it works → spotlight → who it's for → who you buy from → FAQ → final CTA.
 * Server-rendered; only the sticky bar is a client component. Styles: src/app/landing-kit.css.
 */
export function CategoryLanding({
  shared,
  page,
  plans,
}: {
  shared: LandingKitShared;
  page: LandingKitPage;
  /** The plan cards for this page (province cards, a province's plans, mobile plans…). */
  plans: ReactNode;
}) {
  const schema = buildLandingSchema(siteBaseUrl(), page.breadcrumb, page.faq);
  return (
    <main id={shared.mainId} tabIndex={-1} className="cp-lp-main">
      <script
        id={`${shared.key}-schema`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeLandingSchema(schema) }}
      />
      <div className="cp-lp-section cp-lp-breadcrumb">
        <div className="cp-lp-inner">
          <CpBreadcrumb
            items={page.breadcrumb}
            label={shared.breadcrumbLabel}
            separator={shared.separator}
          />
        </div>
      </div>
      <Hero page={page} />
      <Proof shared={shared} />
      <Plans page={page}>{plans}</Plans>
      <Included shared={shared} />
      <Showcase shared={shared} />
      {shared.table ? <Table table={shared.table} /> : null}
      <How shared={shared} />
      {shared.spotlight ? <Spotlight spotlight={shared.spotlight} /> : null}
      <Who shared={shared} />
      <About shared={shared} />
      <Faq shared={shared} page={page} />
      <Final shared={shared} page={page} />
    </main>
  );
}

export function SectionHead({
  id,
  eyebrow,
  title,
  lead,
  align = 'start',
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  align?: 'start' | 'center';
}) {
  return (
    <div className="cp-lp-head" data-align={align}>
      <p className="cp-lp-eyebrow">{eyebrow}</p>
      <h2 id={`${id}-title`} className="cp-lp-h cp-lp-title">
        {title}
      </h2>
      {lead ? <p className="cp-lp-lead">{lead}</p> : null}
    </div>
  );
}

export function Tick() {
  return (
    <span className="cp-lp-tick" aria-hidden="true">
      ✓
    </span>
  );
}

/**
 * One plan card on the Mobbin pricing pattern. As a link (`asLink`) the whole card opens
 * `href`; otherwise only the button does, straight into /order.
 */
export function PlanCard({ card, asLink = false }: { card: LandingPlanCard; asLink?: boolean }) {
  const body = (
    <>
      {card.tag ? (
        <span className="cp-lp-card-tag" data-featured={card.featured}>
          {card.tag}
        </span>
      ) : null}
      {card.eyebrow ? <span className="cp-lp-card-eyebrow">{card.eyebrow}</span> : null}
      {asLink ? (
        <span className="cp-lp-card-name">{card.name}</span>
      ) : (
        <h3 className="cp-lp-card-name">{card.name}</h3>
      )}
      <span className="cp-lp-card-context">{card.context}</span>
      <span className="cp-lp-card-price">
        {card.fromLabel ? <span className="cp-lp-card-from">{card.fromLabel}</span> : null}
        <span className="cp-lp-card-amount">
          <span className="cp-lp-card-currency">{card.currency}</span>
          <strong className="cp-lp-num">{card.price}</strong>
          <span className="cp-lp-card-period">{card.period}</span>
        </span>
        <span className="cp-lp-card-note">{card.priceNote}</span>
      </span>
      {asLink ? (
        <span className="cp-lp-card-action" data-featured={card.featured}>
          {card.action}
        </span>
      ) : (
        <CpButton
          asChild
          tone={card.featured ? 'primary' : 'outline'}
          scale="large"
          className="cp-lp-card-button"
        >
          <a href={card.href}>{card.action}</a>
        </CpButton>
      )}
      <span className="cp-lp-card-includes-title">{card.includesTitle}</span>
      <ul className="cp-lp-card-includes">
        {card.includes.map((item) => (
          <li key={item}>
            <Tick />
            {item}
          </li>
        ))}
      </ul>
    </>
  );
  return asLink ? (
    <a className="cp-lp-card" href={card.href} data-featured={card.featured} data-plan={card.id}>
      {body}
    </a>
  ) : (
    <article className="cp-lp-card" data-featured={card.featured} data-plan={card.id}>
      {body}
    </article>
  );
}

/** A row of plan cards; `asLink` makes every card a link (province cards). */
export function PlanCards({
  cards,
  label,
  asLink = false,
}: {
  cards: readonly LandingPlanCard[];
  label: string;
  asLink?: boolean;
}) {
  return (
    <ul className="cp-lp-cards" data-count={cards.length} aria-label={label}>
      {cards.map((card) => (
        <li key={card.id}>
          <PlanCard card={card} asLink={asLink} />
        </li>
      ))}
    </ul>
  );
}

function Hero({ page }: { page: LandingKitPage }) {
  const h = page.hero;
  return (
    <section className="cp-lp-section cp-lp-hero" aria-labelledby="landing-title">
      <div className="cp-lp-hero-card">
        <div className="cp-lp-hero-copy">
          <p className="cp-lp-hero-eyebrow">{h.eyebrow}</p>
          <h1 id="landing-title" className="cp-lp-h cp-lp-hero-title">
            {h.title}
          </h1>
          <p className="cp-lp-hero-lead">{h.lead}</p>
          {h.bullets.length ? (
            <ul className="cp-lp-hero-bullets">
              {h.bullets.map((item) => (
                <li key={item}>
                  <Tick />
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="cp-lp-hero-price">
            <span>{h.priceLabel}</span>
            <strong className="cp-lp-num">{h.price}</strong>
            <span>{h.priceSuffix}</span>
            {h.chips.map((chip) => (
              <span key={chip} className="cp-lp-chip">
                ✓ {chip}
              </span>
            ))}
          </p>
          <div className="cp-lp-hero-actions">
            <CpButton asChild tone="ink" scale="large">
              <a href={h.primary.href}>{h.primary.label}</a>
            </CpButton>
            <a className="cp-lp-link" href={h.secondary.href}>
              {h.secondary.label} ›
            </a>
          </div>
        </div>
        <div className="cp-lp-hero-visual">
          <div className="cp-lp-hero-art">{landingArt(h.art, h.artLabel)}</div>
          <div className="cp-lp-hero-badge" aria-hidden="true">
            <span>{h.badge.top}</span>
            <strong className="cp-lp-num">{h.badge.price}</strong>
            <span>{h.badge.suffix}</span>
          </div>
          <span className="cp-lp-hero-sticker" aria-hidden="true">
            {h.sticker}
          </span>
        </div>
      </div>
    </section>
  );
}

function Proof({ shared }: { shared: LandingKitShared }) {
  return (
    <section className="cp-lp-section cp-lp-proof" aria-label="What every plan promises">
      <ul className="cp-lp-inner cp-lp-proof-grid">
        {shared.proof.map((item) => (
          <li key={item.title}>
            <span className="cp-lp-proof-mark" aria-hidden="true">
              ✓
            </span>
            <strong>{item.title}</strong>
            <span>{item.body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Plans({ page, children }: { page: LandingKitPage; children: ReactNode }) {
  const p = page.plans;
  return (
    <section id="plans" className="cp-lp-section cp-lp-plans" aria-labelledby="plans-title">
      <div className="cp-lp-inner cp-lp-plans-block">
        <SectionHead id="plans" eyebrow={p.eyebrow} title={p.title} lead={p.lead} />
        {p.promo ? (
          <p className="cp-lp-promo">
            <strong>{p.promoLabel}</strong>
            <span>{p.promo}</span>
          </p>
        ) : null}
        {children}
        <p className="cp-lp-plans-date">{p.date}</p>
        <div className="cp-lp-includes">
          <strong>{p.includesTitle}</strong>
          <ul>
            {p.includes.map((item) => (
              <li key={item}>
                <Tick />
                {item}
              </li>
            ))}
          </ul>
        </div>
        {p.aside ? (
          <div className="cp-lp-aside-card">
            <div>
              <strong>{p.aside.title}</strong>
              <span>{p.aside.body}</span>
            </div>
            <CpButton asChild tone="outline">
              <a href={p.aside.action.href}>{p.aside.action.label}</a>
            </CpButton>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Included({ shared }: { shared: LandingKitShared }) {
  const i = shared.included;
  return (
    <section id={i.id} className="cp-lp-section cp-lp-included" aria-labelledby={`${i.id}-title`}>
      <div className="cp-lp-inner">
        <SectionHead id={i.id} eyebrow={i.eyebrow} title={i.title} />
        <ul className="cp-lp-included-grid">
          {i.items.map((item) => (
            <li key={item.id} className="cp-lp-included-card">
              <span className="cp-lp-included-icon" aria-hidden="true">
                {landingArt(item.icon)}
              </span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** A photo the owner has supplied, or a labelled slot until then. */
function Photo({ image }: { image: LandingImage }) {
  if (image.src) {
    return (
      <Image
        src={image.src}
        alt={image.alt ?? ''}
        fill
        sizes="(max-width: 760px) 100vw, 50vw"
        className="cp-lp-photo-img"
      />
    );
  }
  return <span className="cp-lp-photo-caption">{image.caption}</span>;
}

/** Alternating rows: heading, body and button on one side, an image on the other. */
function Showcase({ shared }: { shared: LandingKitShared }) {
  return (
    <section className="cp-lp-section cp-lp-showcase" aria-label={shared.showcaseLabel}>
      <div className="cp-lp-inner cp-lp-showcase-rows">
        {shared.showcase.map((row) => (
          <article
            key={row.id}
            className="cp-lp-showcase-row"
            data-reverse={row.reverse ?? false}
            aria-labelledby={`showcase-${row.id}-title`}
          >
            <div className="cp-lp-showcase-copy">
              <p className="cp-lp-eyebrow">{row.eyebrow}</p>
              <h2 id={`showcase-${row.id}-title`} className="cp-lp-h cp-lp-title">
                {row.title}
              </h2>
              <p className="cp-lp-lead">{row.body}</p>
              <CpButton asChild tone="ink">
                <a href={row.action.href}>{row.action.label}</a>
              </CpButton>
            </div>
            <div className="cp-lp-photo" aria-hidden={!row.image.src}>
              <Photo image={row.image} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Table({ table: t }: { table: NonNullable<LandingKitShared['table']> }) {
  return (
    <section
      id={t.id}
      className="cp-lp-section cp-lp-table-section"
      aria-labelledby={`${t.id}-title`}
    >
      <div className="cp-lp-inner">
        <SectionHead id={t.id} eyebrow={t.eyebrow} title={t.title} lead={t.lead} />
        <div className="cp-lp-table-wrap" role="region" aria-label={t.caption} tabIndex={0}>
          <table className="cp-lp-table">
            <caption className="sr-only">{t.caption}</caption>
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">{t.rowHeaderLabel}</span>
                </th>
                {t.columns.map((column, index) => (
                  <th scope="col" key={column} data-recommended={index === t.recommended}>
                    <span>{column}</span>
                    {index === t.recommended ? (
                      <span className="cp-lp-table-tag">{t.recommendedLabel}</span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {row.values.map((value, index) => (
                    <td key={t.columns[index]} data-recommended={index === t.recommended}>
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="cp-lp-table-foot">
          <p className="cp-lp-note">{t.note}</p>
          <CpButton asChild tone="outline">
            <a href={t.action.href}>{t.action.label}</a>
          </CpButton>
        </div>
      </div>
    </section>
  );
}

function How({ shared }: { shared: LandingKitShared }) {
  const h = shared.how;
  return (
    <section id={h.id} className="cp-lp-section cp-lp-how" aria-labelledby={`${h.id}-title`}>
      <div className="cp-lp-inner">
        <SectionHead id={h.id} eyebrow={h.eyebrow} title={h.title} lead={h.lead} align="center" />
        <div className="cp-lp-how-steps">
          <CpStepTimeline tone="mint" label={h.label} steps={h.steps} />
        </div>
        <div className="cp-lp-aside-card cp-lp-aside-card-blue">
          <div>
            <strong>{h.aside.title}</strong>
            <span>{h.aside.body}</span>
          </div>
          <CpButton asChild tone="primary">
            <a href={h.aside.action.href}>{h.aside.action.label}</a>
          </CpButton>
        </div>
      </div>
    </section>
  );
}

function Spotlight({ spotlight: s }: { spotlight: NonNullable<LandingKitShared['spotlight']> }) {
  return (
    <section id={s.id} className="cp-lp-section cp-lp-spotlight" aria-labelledby={`${s.id}-title`}>
      <div className="cp-lp-inner cp-lp-spotlight-card">
        <div className="cp-lp-spotlight-copy">
          <p className="cp-lp-eyebrow">{s.eyebrow}</p>
          <h2 id={`${s.id}-title`} className="cp-lp-h cp-lp-title">
            {s.title}
          </h2>
          <p className="cp-lp-lead">{s.body}</p>
          <CpButton asChild tone="mint">
            <a href={s.action.href}>{s.action.label}</a>
          </CpButton>
        </div>
        <dl className="cp-lp-spotlight-facts">
          {s.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Who({ shared }: { shared: LandingKitShared }) {
  const w = shared.who;
  return (
    <section id={w.id} className="cp-lp-section cp-lp-who" aria-labelledby={`${w.id}-title`}>
      <div className="cp-lp-inner">
        <SectionHead id={w.id} eyebrow={w.eyebrow} title={w.title} />
        <ul className="cp-lp-who-grid">
          {w.items.map((item) => (
            <li key={item.id} className="cp-lp-who-card">
              <span className="cp-lp-who-icon" aria-hidden="true">
                {landingArt(item.icon)}
              </span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function About({ shared }: { shared: LandingKitShared }) {
  const a = shared.about;
  return (
    <section id={a.id} className="cp-lp-section cp-lp-about" aria-labelledby={`${a.id}-title`}>
      <div className="cp-lp-inner cp-lp-about-card">
        <div className="cp-lp-about-copy">
          <p className="cp-lp-eyebrow">{a.eyebrow}</p>
          <h2 id={`${a.id}-title`} className="cp-lp-h cp-lp-title">
            {a.title}
          </h2>
          <p className="cp-lp-lead">{a.body}</p>
          <ul className="cp-lp-about-points">
            {a.points.map((point) => (
              <li key={point}>
                <Tick />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div className="cp-lp-about-contact">
          <strong>{a.contactTitle}</strong>
          <ul>
            {a.contactLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
            <li>{a.hours}</li>
          </ul>
          <div className="cp-lp-about-actions">
            <CpButton asChild tone="ink">
              <a href={a.action.href}>{a.action.label}</a>
            </CpButton>
            <a className="cp-lp-link" href={a.secondary.href}>
              {a.secondary.label} ›
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Faq({ shared, page }: { shared: LandingKitShared; page: LandingKitPage }) {
  const f = shared.faqIntro;
  return (
    <section id={f.id} className="cp-lp-section cp-lp-faq" aria-labelledby={`${f.id}-title`}>
      <div className="cp-lp-inner cp-lp-faq-layout">
        <div className="cp-lp-faq-intro">
          <SectionHead id={f.id} eyebrow={f.eyebrow} title={f.title} lead={f.lead} />
          <div className="cp-lp-faq-help">
            <strong>{f.helpTitle}</strong>
            <span>{f.helpBody}</span>
            <CpButton asChild tone="primary">
              <a href={f.helpAction.href}>{f.helpAction.label}</a>
            </CpButton>
          </div>
        </div>
        <div className="cp-lp-faq-list">
          <CpFaqAccordion
            items={page.faq}
            name={`${shared.key}-faq`}
            defaultOpenId={page.faq[0]?.id}
            symbols={f.symbols}
          />
        </div>
      </div>
    </section>
  );
}

function Final({ shared, page }: { shared: LandingKitShared; page: LandingKitPage }) {
  const f = page.final;
  return (
    <section className="cp-lp-section cp-lp-final" aria-label={f.title}>
      <div className="cp-lp-inner">
        <CpCtaBand
          tone="navy"
          content={{
            title: f.title,
            subtitle: f.subtitle,
            primary: f.primary,
            secondary: shared.final.secondary,
          }}
          icon={landingArt(shared.final.icon)}
        />
        {page.moreLinks ? (
          <nav className="cp-lp-related" aria-label={page.moreLinks.title}>
            <strong>{page.moreLinks.title}</strong>
            <ul>
              {page.moreLinks.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        <nav className="cp-lp-related" aria-label={shared.related.title}>
          <strong>{shared.related.title}</strong>
          <ul>
            {shared.related.links.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
