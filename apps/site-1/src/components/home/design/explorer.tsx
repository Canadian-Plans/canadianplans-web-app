import {
  categoryHrefs,
  homeRedesign,
  type CategoryKey,
  type RedesignCategory,
} from '@content/home-redesign';
import { FinderLink } from '@/components/shared/finder-link';
import { HomeArt } from './art';
import { HomeExplorerNav } from './explorer-nav';

const sectionId = (key: CategoryKey) => `cat-${key}`;

function BlockHeading({
  title,
  aside,
}: {
  title: string;
  aside?: string | { readonly label: string; readonly href: string } | undefined;
}) {
  return (
    <div className="cp-hd-block-head">
      <h4 className="cp-hd-h">{title}</h4>
      {typeof aside === 'string' ? <span>{aside}</span> : null}
      {aside && typeof aside !== 'string' ? <a href={aside.href}>{aside.label}</a> : null}
    </div>
  );
}

function Steps({
  steps,
}: {
  steps: NonNullable<Extract<RedesignCategory, { steps: unknown }>['steps']>;
}) {
  return (
    <div className="cp-hd-block">
      <BlockHeading title={steps.title} aside={steps.aside} />
      <ol className="cp-hd-steps">
        {steps.items.map((item) => (
          <li key={item.id} className="cp-hd-step">
            <div className="cp-hd-step-top">
              <span className="cp-hd-step-marker" data-done={'done' in item || undefined}>
                {item.marker}
              </span>
              <span className="cp-hd-step-meta">{item.meta}</span>
            </div>
            <span className="cp-hd-step-art">
              <HomeArt name={item.art} />
            </span>
            <strong>{item.title}</strong>
            <span className="cp-hd-card-body">{item.body}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CategoryBlock({ category }: { category: RedesignCategory }) {
  const steps = 'steps' in category ? category.steps : undefined;
  const who = 'who' in category ? category.who : undefined;
  const cards = category.cards;
  const cardsAside = 'aside' in cards ? cards.aside : undefined;
  return (
    <div
      className="cp-hd-catsec"
      id={sectionId(category.key)}
      data-tone={category.tone}
      // Programmatic focus target for the category nav (not in the tab order).
      tabIndex={-1}
    >
      <div className="cp-hd-feature">
        <div className="cp-hd-feature-art" data-category={category.key}>
          <HomeArt name={category.art} />
        </div>
        <div className="cp-hd-feature-copy">
          <span className="cp-hd-feature-eyebrow">{category.banner.eyebrow}</span>
          <h3 className="cp-hd-h">{category.feature.title}</h3>
          <p>{category.feature.body}</p>
          <div className="cp-hd-feature-action">
            <a className="cp-hd-btn cp-hd-btn-sm cp-hd-btn-tone" href={categoryHrefs[category.key]}>
              {category.banner.action}
            </a>
            <span className="cp-hd-feature-price">
              {category.banner.pricePrefix}{' '}
              <strong className="cp-hd-num">{category.banner.price}</strong>
              {category.banner.priceSuffix}
            </span>
          </div>
        </div>
      </div>
      {steps ? <Steps steps={steps} /> : null}
      {who ? (
        <div className="cp-hd-block">
          <BlockHeading title={who.title} />
          <ul className="cp-hd-cards" data-variant="who">
            {who.items.map((item) => (
              <li key={item.id} className="cp-hd-card">
                <span className="cp-hd-who-icon">
                  <HomeArt name={item.icon} />
                </span>
                <strong>{item.title}</strong>
                <span className="cp-hd-card-body">{item.body}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="cp-hd-block">
        <BlockHeading title={cards.title} aside={cardsAside} />
        <ul className="cp-hd-cards" data-columns={cards.columns}>
          {cards.items.map((item) => (
            <li key={item.id} className="cp-hd-card">
              {'chip' in item ? (
                <div className="cp-hd-card-top">
                  <span className="cp-hd-card-icon">
                    <HomeArt name={item.icon} />
                  </span>
                  <span className="cp-hd-card-chip">{item.chip}</span>
                </div>
              ) : (
                <span className="cp-hd-card-icon">
                  <HomeArt name={item.icon} />
                </span>
              )}
              <strong>{item.title}</strong>
              <span className="cp-hd-card-body">{item.body}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="cp-hd-band">
        <span className="cp-hd-band-glow" aria-hidden="true" />
        <div className="cp-hd-band-copy">
          <span className="cp-hd-band-icon" aria-hidden="true">
            <HomeArt name={category.cta.icon} />
          </span>
          <div>
            <strong className="cp-hd-h">{category.cta.title}</strong>
            <span>{category.cta.subtitle}</span>
          </div>
        </div>
        <div className="cp-hd-band-actions">
          <a className="cp-hd-pill-btn cp-hd-band-primary" href={category.cta.primary.href}>
            {category.cta.primary.label}
          </a>
          <a className="cp-hd-band-link" href={category.cta.secondary.href}>
            {category.cta.secondary.label}
          </a>
        </div>
      </div>
    </div>
  );
}

/** "Discover everything we offer." — sticky category nav beside four category blocks. */
export function HomeExplorer() {
  const e = homeRedesign.explorer;
  const navItems = homeRedesign.categories.map((c) => ({ id: sectionId(c.key), label: c.nav }));
  return (
    <section className="cp-hd-section cp-hd-explorer" aria-labelledby="explorer-title">
      <div className="cp-hd-inner">
        <h2 id="explorer-title" className="cp-hd-h cp-hd-display cp-hd-explorer-title">
          {e.title}
        </h2>
        <div className="cp-hd-explorer-layout">
          <aside className="cp-hd-explorer-aside">
            <HomeExplorerNav items={navItems} label={e.navLabel} />
            <div className="cp-hd-catinfo">
              <strong>{e.info.title}</strong>
              <span>{e.info.body}</span>
              <a className="cp-hd-btn cp-hd-btn-sm cp-hd-btn-outline" href={e.info.href}>
                {e.info.action}
              </a>
            </div>
          </aside>
          <div className="cp-hd-catcol">
            {homeRedesign.categories.map((category) => (
              <CategoryBlock key={category.key} category={category} />
            ))}
            <p className="cp-hd-helppill">
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
      </div>
    </section>
  );
}
