import type {
  MobileBrand,
  MobileDataBand,
  MobilePayType,
  MobilePlan,
  MobileSort,
} from '@content/mobile-plans';

export interface MobileFilters {
  readonly brand: 'all' | MobileBrand;
  readonly pay: 'any' | MobilePayType;
  readonly data: MobileDataBand;
  readonly bringOwnPhone: boolean;
}
export const defaultMobileFilters: MobileFilters = {
  brand: 'all',
  pay: 'any',
  data: 'any',
  bringOwnPhone: true,
};

/** Pure preview-data query. No commercial offer or eligibility inference. */
export function filterMobilePlans(
  plans: readonly MobilePlan[],
  filters: MobileFilters,
  sort: MobileSort,
): readonly MobilePlan[] {
  const matching = plans.filter(
    (plan) =>
      (filters.brand === 'all' || plan.brand === filters.brand) &&
      (filters.pay === 'any' || plan.payType === filters.pay) &&
      (!filters.bringOwnPhone || plan.bringOwnPhone) &&
      (filters.data === 'any' ||
        (filters.data === 'under20' && plan.dataGb < 20) ||
        (filters.data === '20to60' && plan.dataGb >= 20 && plan.dataGb <= 60) ||
        (filters.data === 'over60' && plan.dataGb > 60)),
  );
  if (sort === 'price-low') return matching.sort((a, b) => a.priceCad - b.priceCad);
  if (sort === 'price-high') return matching.sort((a, b) => b.priceCad - a.priceCad);
  if (sort === 'data-high') return matching.sort((a, b) => b.dataGb - a.dataGb);
  // Reference order is retained; CSS promotes the featured plan on mobile only.
  return matching;
}
