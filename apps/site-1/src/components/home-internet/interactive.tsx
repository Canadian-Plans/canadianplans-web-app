import { CpPlanCard } from '@canadian-plans/ui/canadian-plans';
import {
  internetOrderHref,
  internetPlansByProvince,
  internetProvinceCards,
  type InternetProvince,
} from '@content/home-internet';

/** One card per province; each opens that province's plan list in /order. */
export function InternetProvinceCards() {
  return (
    <div className="cp-internet-speed-cards">
      {internetProvinceCards.map((card) => (
        <CpPlanCard
          key={card.id}
          content={card}
          variant="internet"
          href={internetOrderHref(card.province)}
        />
      ))}
    </div>
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
