import type { InternetProvince } from '@content/home-internet';
import {
  internetLandingShared,
  internetProvinceCards,
  internetProvincePlanCards,
} from '@content/home-internet-landing';
import type { LandingKitPage } from '@content/landing-kit';
import { LandingKitPageShell } from '@/components/landing-kit/page';
import { PlanCards } from '@/components/landing-kit/landing';

/**
 * Home internet on the category landing kit: the overview page shows one card per province
 * (each opens that province's page); a province page shows every plan sold there, internet
 * first, then TV bundles, each button straight into /order.
 */
export function InternetLanding({
  page,
  province,
}: {
  page: LandingKitPage;
  province?: InternetProvince;
}) {
  return (
    <LandingKitPageShell
      shared={internetLandingShared}
      page={page}
      plans={
        province ? (
          <PlanCards cards={internetProvincePlanCards(province)} label={page.plans.cardsLabel} />
        ) : (
          <PlanCards cards={internetProvinceCards} label={page.plans.cardsLabel} asLink />
        )
      }
    />
  );
}
