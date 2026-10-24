import {
  mobileLandingPage,
  mobileLandingShared,
  mobilePlanCards,
} from '@content/mobile-plans-landing';
import { LandingKitPageShell } from '@/components/landing-kit/page';
import { PlanCards } from '@/components/landing-kit/landing';

/** /mobile-plans on the category landing kit: the three catalogue plans, each button into /order. */
export function MobileLanding() {
  return (
    <LandingKitPageShell
      shared={mobileLandingShared}
      page={mobileLandingPage}
      plans={<PlanCards cards={mobilePlanCards} label={mobileLandingPage.plans.cardsLabel} />}
    />
  );
}
