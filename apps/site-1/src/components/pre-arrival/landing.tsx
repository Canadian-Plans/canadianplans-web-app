import {
  preArrivalLandingPage,
  preArrivalLandingShared,
  preArrivalPlanGroups,
} from '@content/pre-arrival-landing';
import { LandingKitPageShell } from '@/components/landing-kit/page';
import { PlanTabs } from '@/components/landing-kit/plan-tabs';

/**
 * /pre-arrival-sim on the category landing kit: a pill toggle between the two plan groups
 * the catalogue sells (monthly Rogers/Fido for permits and PRs, prepaid Chatr for
 * visitors), each button straight into /order.
 */
export function PreArrivalLanding() {
  return (
    <LandingKitPageShell
      shared={preArrivalLandingShared}
      page={preArrivalLandingPage}
      plans={
        <PlanTabs groups={preArrivalPlanGroups} label={preArrivalLandingPage.plans.cardsLabel} />
      }
    />
  );
}
