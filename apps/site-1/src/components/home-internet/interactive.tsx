import { CpPlanCard } from '@canadian-plans/ui/canadian-plans';
import {
  internetOrderHref,
  internetPlansByProvince,
  internetProvinceCardCopy as copy,
  internetProvinceSummaries,
  type InternetProvince,
} from '@content/home-internet';

/**
 * One card per province: the lowest price, the headline facts and a link to that province's
 * page, where every plan and price is listed (owner request, 23 October 2026).
 */
export function InternetProvinceCards() {
  return (
    <ul className="cp-province-cards" aria-label={copy.label}>
      {internetProvinceSummaries.map((card) => (
        <li key={card.province}>
          <a className="cp-province-card" href={card.href} data-province={card.province}>
            <span className="cp-province-card-name">{card.name}</span>
            <span className="cp-province-card-price">
              <span>{copy.from}</span>
              <strong>${card.fromCad}</strong>
              <span>{copy.period}</span>
            </span>
            <ul className="cp-province-card-highlights">
              {card.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <span className="cp-province-card-action">
              {copy.action} <span aria-hidden="true">{copy.arrow}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** A province's plans, each linking straight to that plan in /order. */
export function InternetPlanCards({ province }: { province: InternetProvince }) {
  return (
    <div className="cp-internet-speed-cards">
      {internetPlansByProvince[province].map((plan) => (
        <CpPlanCard
          key={plan.id}
          content={plan}
          variant="internet"
          featured={plan.badge !== undefined}
          href={internetOrderHref(province, plan)}
        />
      ))}
    </div>
  );
}
