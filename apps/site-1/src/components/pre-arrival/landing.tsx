import {
  preArrivalLandingPage,
  preArrivalLandingShared,
  preArrivalPlanGroups,
} from '@content/pre-arrival-landing';
import { LandingKitPageShell } from '@/components/landing-kit/page';
import { PlanCards } from '@/components/landing-kit/landing';

/**
 * /pre-arrival-sim on the category landing kit: two plan groups as the catalogue sells
 * them (monthly Rogers/Fido for stays over 90 days, prepaid Chatr for visitors), each
 * button straight into /order.
 */
export function PreArrivalLanding() {
  return (
    <LandingKitPageShell
      shared={preArrivalLandingShared}
      page={preArrivalLandingPage}
      plans={
        <div className="cp-lp-plan-groups">
          {preArrivalPlanGroups.map((group) => (
            <section
              key={group.id}
              className="cp-lp-plan-group"
              aria-labelledby={`plans-${group.id}-title`}
            >
              <div className="cp-lp-plan-group-head">
                <h3 id={`plans-${group.id}-title`}>{group.title}</h3>
                <p>{group.description}</p>
              </div>
              <PlanCards cards={group.cards} label={group.title} />
            </section>
          ))}
        </div>
      }
    />
  );
}
