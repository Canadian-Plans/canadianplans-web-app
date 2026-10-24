import { CpButton } from '@canadian-plans/ui/canadian-plans';
import type { LandingPlanCard } from '@content/landing-kit';

/** Plan cards on the Mobbin pricing pattern; no server-only imports, so client tabs can use them. */

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
