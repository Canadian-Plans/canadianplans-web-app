import Image from 'next/image';
import {
  CpAsset,
  CpBreadcrumb,
  CpButton,
  CpCtaBand,
  CpFaqAccordion,
  CpPlanCard,
  CpStepTimeline,
} from '@canadian-plans/ui/canadian-plans';
import { redesignAssets, type RedesignAssetKey } from '@content/home-redesign';
import {
  internetLandingShared as shared,
  internetProvinceCards,
  internetProvinceGroups,
  type InternetPageContent,
  type LandingImage,
  type LandingShowcaseRow,
} from '@content/home-internet-landing';
import { buildLandingSchema, serializeLandingSchema } from '@/lib/landing-schema';
import { siteBaseUrl } from '@/lib/seo';

const art = (key: RedesignAssetKey, alt = '') => <CpAsset asset={redesignAssets[key]} alt={alt} />;

/**
 * Home internet landing page composition (23 October 2026), shared by /home-internet and
 * /home-internet/<province>: hero → proof strip → plans (province cards, or a province's
 * plans) → what's included → image rows → speed guide → how it works → TV → who it's for →
 * who you buy from → FAQ → final CTA. Server-rendered; only the sticky bar is a client
 * component. Copy lives in content/home-internet-landing.ts.
 */
export function InternetLanding({ page }: { page: InternetPageContent }) {
  const schema = buildLandingSchema(siteBaseUrl(), page.breadcrumb, page.faq);
  return (
    <main id={shared.mainId} tabIndex={-1} className="cp-hi-main">
      <script
        id="home-internet-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeLandingSchema(schema) }}
      />
      <div className="cp-hi-section cp-hi-breadcrumb">
        <div className="cp-hi-inner">
          <CpBreadcrumb
            items={page.breadcrumb}
            label={shared.breadcrumbLabel}
            separator={shared.separator}
          />
        </div>
      </div>
      <Hero page={page} />
      <Proof />
      <Plans page={page} />
      <Included />
      <Showcase />
      <Speed />
      <How />
      <Tv />
      <Who />
      <About />
      <Faq page={page} />
      <Final page={page} />
    </main>
  );
}

function SectionHead({
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
    <div className="cp-hi-head" data-align={align}>
      <p className="cp-hi-eyebrow">{eyebrow}</p>
      <h2 id={`${id}-title`} className="cp-hi-h cp-hi-title">
        {title}
      </h2>
      {lead ? <p className="cp-hi-lead">{lead}</p> : null}
    </div>
  );
}

function Tick() {
  return (
    <span className="cp-hi-tick" aria-hidden="true">
      ✓
    </span>
  );
}

function Hero({ page }: { page: InternetPageContent }) {
  const h = page.hero;
  return (
    <section className="cp-hi-section cp-hi-hero" aria-labelledby="internet-title">
      <div className="cp-hi-hero-card">
        <div className="cp-hi-hero-copy">
          <p className="cp-hi-hero-eyebrow">{h.eyebrow}</p>
          <h1 id="internet-title" className="cp-hi-h cp-hi-hero-title">
            {h.title}
          </h1>
          <p className="cp-hi-hero-lead">{h.lead}</p>
          {h.bullets.length ? (
            <ul className="cp-hi-hero-bullets">
              {h.bullets.map((item) => (
                <li key={item}>
                  <Tick />
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="cp-hi-hero-price">
            <span>{h.priceLabel}</span>
            <strong className="cp-hi-num">{h.price}</strong>
            <span>{h.priceSuffix}</span>
            {h.chips.map((chip) => (
              <span key={chip} className="cp-hi-chip">
                ✓ {chip}
              </span>
            ))}
          </p>
          <div className="cp-hi-hero-actions">
            <CpButton asChild tone="ink" scale="large">
              <a href={h.primary.href}>{h.primary.label}</a>
            </CpButton>
            <a className="cp-hi-link" href={h.secondary.href}>
              {h.secondary.label} ›
            </a>
          </div>
        </div>
        <div className="cp-hi-hero-visual">
          <div className="cp-hi-hero-art">{art(h.art, h.artLabel)}</div>
          <div className="cp-hi-hero-badge" aria-hidden="true">
            <span>{h.badge.top}</span>
            <strong className="cp-hi-num">{h.badge.price}</strong>
            <span>{h.badge.suffix}</span>
          </div>
          <span className="cp-hi-hero-sticker" aria-hidden="true">
            {h.sticker}
          </span>
        </div>
      </div>
    </section>
  );
}

function Proof() {
  return (
    <section className="cp-hi-section cp-hi-proof" aria-label="What every plan promises">
      <ul className="cp-hi-inner cp-hi-proof-grid">
        {shared.proof.map((item) => (
          <li key={item.title}>
            <span className="cp-hi-proof-mark" aria-hidden="true">
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

/** Landing page: one card per province, opening that province's page. */
function ProvinceCards({ label }: { label: string }) {
  return (
    <ul className="cp-hi-province-grid" aria-label={label}>
      {internetProvinceCards.map((card) => (
        <li key={card.province}>
          <a className="cp-hi-province-card" href={card.href} data-province={card.province}>
            <span className="cp-hi-province-badge">{card.badge}</span>
            <span className="cp-hi-province-name">{card.name}</span>
            <span className="cp-hi-province-price">
              <span>{card.fromLabel}</span>
              <strong className="cp-hi-num">{card.price}</strong>
              <span>{card.period}</span>
            </span>
            <ul className="cp-hi-province-bullets">
              {card.bullets.map((bullet) => (
                <li key={bullet}>
                  <Tick />
                  {bullet}
                </li>
              ))}
            </ul>
            <span className="cp-hi-province-action">{card.action}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Province page: every plan sold there, grouped as Internet and Internet + TV. */
function ProvincePlans({ page }: { page: InternetPageContent }) {
  const p = page.plans;
  if (!p.province) return null;
  const groups = internetProvinceGroups(p.province);
  return (
    <div className="cp-hi-province-plans">
      {p.promo ? (
        <p className="cp-hi-promo">
          <strong>{p.promoLabel}</strong>
          <span>{p.promo}</span>
        </p>
      ) : null}
      {(
        [
          ['internet', groups.internet],
          ['tv', groups.tv],
        ] as const
      ).map(([key, plans]) =>
        plans.length ? (
          <div key={key} className="cp-hi-plan-group">
            <h3 className="cp-hi-plan-group-title">{p.groups[key]}</h3>
            <div className="cp-hi-plan-cards" data-count={plans.length}>
              {plans.map((plan) => (
                <CpPlanCard
                  key={plan.id}
                  content={plan}
                  variant="internet"
                  featured={plan.badge !== undefined}
                  href={groups.href(plan)}
                />
              ))}
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
}

function Plans({ page }: { page: InternetPageContent }) {
  const p = page.plans;
  return (
    <section id="plans" className="cp-hi-section cp-hi-plans" aria-labelledby="plans-title">
      <div className="cp-hi-inner cp-hi-plans-picker">
        <SectionHead id="plans" eyebrow={p.eyebrow} title={p.title} lead={p.lead} />
        {p.province ? <ProvincePlans page={page} /> : <ProvinceCards label={p.cardsLabel} />}
        <p className="cp-hi-plans-date">{p.date}</p>
        <div className="cp-hi-includes">
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
        <div className="cp-hi-elsewhere">
          <div>
            <strong>{p.elsewhere.title}</strong>
            <span>{p.elsewhere.body}</span>
          </div>
          <CpButton asChild tone="outline">
            <a href={p.elsewhere.action.href}>{p.elsewhere.action.label}</a>
          </CpButton>
        </div>
      </div>
    </section>
  );
}

function Included() {
  const i = shared.included;
  return (
    <section id={i.id} className="cp-hi-section cp-hi-included" aria-labelledby={`${i.id}-title`}>
      <div className="cp-hi-inner">
        <SectionHead id={i.id} eyebrow={i.eyebrow} title={i.title} />
        <ul className="cp-hi-included-grid">
          {i.items.map((item) => (
            <li key={item.id} className="cp-hi-included-card">
              <span className="cp-hi-included-icon" aria-hidden="true">
                {art(item.icon)}
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
        className="cp-hi-photo-img"
      />
    );
  }
  return <span className="cp-hi-photo-caption">{image.caption}</span>;
}

/** Alternating rows: heading, body and button on one side, an image on the other. */
function Showcase() {
  return (
    <section className="cp-hi-section cp-hi-showcase" aria-label="Why home internet with us">
      <div className="cp-hi-inner cp-hi-showcase-rows">
        {shared.showcase.map((row: LandingShowcaseRow) => (
          <article
            key={row.id}
            className="cp-hi-showcase-row"
            data-reverse={row.reverse ?? false}
            aria-labelledby={`showcase-${row.id}-title`}
          >
            <div className="cp-hi-showcase-copy">
              <p className="cp-hi-eyebrow">{row.eyebrow}</p>
              <h2 id={`showcase-${row.id}-title`} className="cp-hi-h cp-hi-title">
                {row.title}
              </h2>
              <p className="cp-hi-lead">{row.body}</p>
              <CpButton asChild tone="ink">
                <a href={row.action.href}>{row.action.label}</a>
              </CpButton>
            </div>
            <div className="cp-hi-photo" aria-hidden={!row.image.src}>
              <Photo image={row.image} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Speed() {
  const s = shared.speed;
  return (
    <section id={s.id} className="cp-hi-section cp-hi-speed" aria-labelledby={`${s.id}-title`}>
      <div className="cp-hi-inner">
        <SectionHead id={s.id} eyebrow={s.eyebrow} title={s.title} lead={s.lead} />
        <div className="cp-hi-table-wrap" role="region" aria-label={s.caption} tabIndex={0}>
          <table className="cp-hi-table">
            <caption className="sr-only">{s.caption}</caption>
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">{s.usageLabel}</span>
                </th>
                {s.columns.map((column, index) => (
                  <th scope="col" key={column} data-recommended={index === s.recommended}>
                    <span>{column}</span>
                    {index === s.recommended ? (
                      <span className="cp-hi-table-tag">{s.recommendedLabel}</span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {row.values.map((value, index) => (
                    <td key={s.columns[index]} data-recommended={index === s.recommended}>
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="cp-hi-speed-foot">
          <p className="cp-hi-note">{s.note}</p>
          <CpButton asChild tone="outline">
            <a href={s.action.href}>{s.action.label}</a>
          </CpButton>
        </div>
      </div>
    </section>
  );
}

function How() {
  const h = shared.how;
  return (
    <section id={h.id} className="cp-hi-section cp-hi-how" aria-labelledby={`${h.id}-title`}>
      <div className="cp-hi-inner">
        <SectionHead id={h.id} eyebrow={h.eyebrow} title={h.title} lead={h.lead} align="center" />
        <div className="cp-hi-how-steps">
          <CpStepTimeline tone="mint" label={h.label} steps={h.steps} />
        </div>
        <div className="cp-hi-how-aside">
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

function Tv() {
  const t = shared.tv;
  return (
    <section id={t.id} className="cp-hi-section cp-hi-tv" aria-labelledby={`${t.id}-title`}>
      <div className="cp-hi-inner cp-hi-tv-card">
        <div className="cp-hi-tv-copy">
          <p className="cp-hi-eyebrow">{t.eyebrow}</p>
          <h2 id={`${t.id}-title`} className="cp-hi-h cp-hi-title">
            {t.title}
          </h2>
          <p className="cp-hi-lead">{t.body}</p>
          <CpButton asChild tone="mint">
            <a href={t.action.href}>{t.action.label}</a>
          </CpButton>
        </div>
        <dl className="cp-hi-tv-facts">
          {t.facts.map((fact) => (
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

function Who() {
  const w = shared.who;
  return (
    <section id={w.id} className="cp-hi-section cp-hi-who" aria-labelledby={`${w.id}-title`}>
      <div className="cp-hi-inner">
        <SectionHead id={w.id} eyebrow={w.eyebrow} title={w.title} />
        <ul className="cp-hi-who-grid">
          {w.items.map((item) => (
            <li key={item.id} className="cp-hi-who-card">
              <span className="cp-hi-who-icon" aria-hidden="true">
                {art(item.icon)}
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

function About() {
  const a = shared.about;
  return (
    <section id={a.id} className="cp-hi-section cp-hi-about" aria-labelledby={`${a.id}-title`}>
      <div className="cp-hi-inner cp-hi-about-card">
        <div className="cp-hi-about-copy">
          <p className="cp-hi-eyebrow">{a.eyebrow}</p>
          <h2 id={`${a.id}-title`} className="cp-hi-h cp-hi-title">
            {a.title}
          </h2>
          <p className="cp-hi-lead">{a.body}</p>
          <ul className="cp-hi-about-points">
            {a.points.map((point) => (
              <li key={point}>
                <Tick />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div className="cp-hi-about-contact">
          <strong>{a.contactTitle}</strong>
          <ul>
            {a.contactLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
            <li>{a.hours}</li>
          </ul>
          <div className="cp-hi-about-actions">
            <CpButton asChild tone="ink">
              <a href={a.action.href}>{a.action.label}</a>
            </CpButton>
            <a className="cp-hi-link" href={a.secondary.href}>
              {a.secondary.label} ›
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Faq({ page }: { page: InternetPageContent }) {
  const f = shared.faqIntro;
  return (
    <section id={f.id} className="cp-hi-section cp-hi-faq" aria-labelledby={`${f.id}-title`}>
      <div className="cp-hi-inner cp-hi-faq-layout">
        <div className="cp-hi-faq-intro">
          <SectionHead id={f.id} eyebrow={f.eyebrow} title={f.title} lead={f.lead} />
          <div className="cp-hi-faq-help">
            <strong>{f.helpTitle}</strong>
            <span>{f.helpBody}</span>
            <CpButton asChild tone="primary">
              <a href={f.helpAction.href}>{f.helpAction.label}</a>
            </CpButton>
          </div>
        </div>
        <div className="cp-hi-faq-list">
          <CpFaqAccordion
            items={page.faq}
            name="home-internet-faq"
            defaultOpenId={page.faq[0]?.id}
            symbols={f.symbols}
          />
        </div>
      </div>
    </section>
  );
}

function Final({ page }: { page: InternetPageContent }) {
  const f = page.final;
  return (
    <section className="cp-hi-section cp-hi-final" aria-label={f.title}>
      <div className="cp-hi-inner">
        <CpCtaBand
          tone="navy"
          content={{
            title: f.title,
            subtitle: f.subtitle,
            primary: f.primary,
            secondary: shared.final.secondary,
          }}
          icon={art(shared.final.icon)}
        />
        <nav className="cp-hi-related" aria-label={page.otherProvinces.title}>
          <strong>{page.otherProvinces.title}</strong>
          <ul>
            {page.otherProvinces.links.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <nav className="cp-hi-related" aria-label={shared.related.title}>
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
