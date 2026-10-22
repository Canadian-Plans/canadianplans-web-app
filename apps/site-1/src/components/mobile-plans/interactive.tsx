import { CpPlanCard } from '@canadian-plans/ui/canadian-plans';
import { mobileCopy, mobilePlans } from '@content/mobile-plans';

/** The catalogue's bring-your-own-device plans; each card opens that plan in /order. */
export function MobilePlanBrowser() {
  return (
    <>
      <p className="cp-mobile-includes">
        <strong>{mobileCopy.plans.includesTitle}</strong> {mobileCopy.plans.includes}
      </p>
      <div className="cp-mobile-plan-cards">
        {mobilePlans.map((plan) => (
          <div key={plan.id} className="cp-mobile-plan-wrap" data-featured={plan.featured}>
            <CpPlanCard
              content={plan}
              featured={plan.featured}
              variant="mobile"
              href={`/order?plan=${plan.id}&category=mobile`}
            />
          </div>
        ))}
      </div>
      <p className="cp-mobile-note">{mobileCopy.plans.note}</p>
    </>
  );
}
