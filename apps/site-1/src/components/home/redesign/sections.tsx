import { CpButton, CpCtaBand, CpFeatureRow, CpSwipeRow } from '@canadian-plans/ui/canadian-plans';
import {
  categoryHrefs,
  homeRedesign,
  homeRedesignFaq,
  type RedesignCategory,
} from '@content/home-redesign';
import { RedesignFaqSection } from '@/components/category-redesign/faq';
import { CategorySupport, categoryAsset as asset } from '@/components/category-redesign/support';
import { ExplorerNav } from './explorer-nav';
import { FinderLink } from '@/components/shared/finder-link';

const sectionId = (key: string) => `cat-${key}`;

/* ---------- What are you looking for? ---------- */
export function CategoryPicker() {
  const p = homeRedesign.picker;
  return (
    <section className="cp-rd-section cp-container" aria-labelledby="picker-title">
      <div className="cp-rd-centered">
        <p className="cp-rd-pill-eyebrow">{p.eyebrow}</p>
        <h2 id="picker-title" className="cp-rd-display">
          {p.title}
        </h2>
        <p className="cp-rd-lead">{p.description}</p>
      </div>
      <ul className="cp-rd-picker">
        {p.cards.map((card) => (
          <li key={card.key}>
            <a className="cp-rd-picker-card" href={categoryHrefs[card.key]}>
              <span className="cp-rd-picker-art">{asset(card.icon)}</span>
              <strong>{card.title}</strong>
              <span className="cp-rd-picker-price">{card.price}</span>
              <span className="cp-rd-picker-more">{p.more}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="cp-rd-bundle">
        {p.bundleLead} <a href="/contact">{p.bundleLink}</a>
      </p>
    </section>
  );
}

/* ---------- Service columns (swipe on mobile) ---------- */
export function ServiceColumns() {
  const c = homeRedesign.columns;
  return (
    <section className="cp-rd-section cp-container">
      {/* The swipe row is the labelled region; a second landmark with the same name fails axe. */}
      <CpSwipeRow label={c.label} hint={c.hint}>
        {c.items.map((item) => (
          <div key={item.key} className="cp-rd-column">
            <span className="cp-rd-column-icon">{asset(item.icon)}</span>
            <h3>{item.title}</h3>
            <p className="cp-rd-column-price">
              <span className="cp-rd-column-from">{c.from}</span>
              <span className="cp-rd-column-amount">
                <span>{c.currency}</span>
                <strong>{item.dollars}</strong>
                <span className="cp-rd-column-cents">
                  <span>{item.cents}</span>
                  <span>{c.period}</span>
                </span>
              </span>
            </p>
            <ul>
              {item.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <CpButton asChild tone="outline">
              <a href={categoryHrefs[item.key]}>{c.action}</a>
            </CpButton>
          </div>
        ))}
      </CpSwipeRow>
    </section>
  );
}

/* ---------- Category explorer ---------- */
function CategoryBlock({ category }: { category: RedesignCategory }) {
  return (
    <div className="cp-rd-catsec" id={sectionId(category.key)}>
      <CpFeatureRow
        art={asset(category.art)}
        tone={category.tone}
        eyebrow={category.banner.eyebrow}
        title={category.feature.title}
        body={category.feature.body}
        action={{ label: category.banner.action, href: categoryHrefs[category.key] }}
        price={category.banner.price}
        pricePrefix={category.banner.pricePrefix}
        priceSuffix={category.banner.priceSuffix}
      />
      <CategorySupport category={category} />
      <CpCtaBand tone={category.tone} content={category.cta} icon={asset(category.cta.icon)} />
    </div>
  );
}

export function CategoryExplorer() {
  const e = homeRedesign.explorer;
  return (
    <section className="cp-rd-section cp-container" aria-labelledby="explorer-title">
      <h2 id="explorer-title" className="cp-rd-display cp-rd-centered-text">
        {e.title}
      </h2>
      <div className="cp-rd-explorer">
        <div className="cp-rd-explorer-aside">
          <ExplorerNav
            label={e.navLabel}
            items={homeRedesign.categories.map((c) => ({ id: sectionId(c.key), label: c.nav }))}
          />
          <div className="cp-rd-explorer-info">
            <strong>{e.info.title}</strong>
            <p>{e.info.body}</p>
            <CpButton asChild tone="outline">
              <a href={e.info.href}>{e.info.action}</a>
            </CpButton>
          </div>
        </div>
        <div className="cp-rd-explorer-main">
          {homeRedesign.categories.map((category) => (
            <CategoryBlock key={category.key} category={category} />
          ))}
          <p className="cp-rd-help-pill">
            <span>{e.help.lead}</span>
            {e.help.links.map((link) =>
              'finder' in link && link.finder ? (
                <FinderLink key={link.label} href={link.href}>
                  {link.label}
                </FinderLink>
              ) : (
                <a key={link.label} href={link.href}>
                  {link.label}
                </a>
              ),
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------- Testimonials ---------- */
export function Testimonials() {
  const t = homeRedesign.testimonials;
  return (
    <section className="cp-rd-band-warm" aria-labelledby="stories-title">
      <div className="cp-container cp-rd-section">
        <div className="cp-rd-split-heading">
          <div>
            <p className="cp-rd-eyebrow cp-rd-eyebrow-mint">{t.eyebrow}</p>
            <h2 id="stories-title" className="cp-rd-heading">
              {t.title}
            </h2>
          </div>
          <CpButton asChild tone="outline-brand">
            <a href={t.more.href}>{t.more.label}</a>
          </CpButton>
        </div>
        <div className="cp-rd-stories">
          {t.items.map((item) => (
            <figure key={item.id} className="cp-rd-story">
              <div className="cp-rd-story-media">
                {item.photo ? (
                  <img src={item.photo} alt={item.alt} />
                ) : (
                  <span className="cp-rd-photo">{item.photoHint}</span>
                )}
                <span className="cp-rd-story-tag" data-tone={item.tone}>
                  {item.category}
                </span>
              </div>
              <div className="cp-rd-story-body">
                <blockquote>{item.quote}</blockquote>
                <figcaption>
                  <strong>{item.name}</strong>
                  <span>{item.meta}</span>
                </figcaption>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */
export function RedesignFaq() {
  return (
    <RedesignFaqSection
      intro={homeRedesign.faq}
      items={homeRedesignFaq}
      name="home-faq"
      defaultOpenId="carrier"
    />
  );
}

/* ---------- Final CTA ---------- */
export function FinalCta() {
  const f = homeRedesign.final;
  return (
    <section className="cp-rd-section cp-container" aria-labelledby="final-title">
      <div className="cp-rd-final">
        <span className="cp-rd-final-glow" aria-hidden="true" />
        <div className="cp-rd-final-head">
          <p className="cp-rd-eyebrow cp-rd-eyebrow-mint">{f.eyebrow}</p>
          <h2 id="final-title" className="cp-rd-display">
            {f.title}
          </h2>
          <p className="cp-rd-final-lead">{f.description}</p>
        </div>
        <ul className="cp-rd-tiles">
          {f.tiles.map((tile) => (
            <li key={tile.key}>
              <a className="cp-rd-tile" href={categoryHrefs[tile.key]} data-category={tile.key}>
                <span className="cp-rd-tile-icon">{asset(tile.icon)}</span>
                <span className="cp-rd-tile-copy">
                  <span>{tile.ask}</span>
                  <strong>{tile.title}</strong>
                </span>
                <span className="cp-rd-tile-go" aria-hidden="true">
                  →
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="cp-rd-final-unsure">
          <span>{f.unsure}</span> <a href={f.advisor.href}>{f.advisor.label}</a>
        </p>
      </div>
    </section>
  );
}
