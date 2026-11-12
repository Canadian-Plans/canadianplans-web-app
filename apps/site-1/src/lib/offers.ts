import type { WebsitePlan } from '@canadian-plans/crm-contracts';
import {
  NATIONAL_REGION,
  regionCodeSchema,
  type ProvinceCode,
  type RegionCode,
} from '@canadian-plans/contracts';

/**
 * A plan as the order form shows it. Plans are managed in the CRM admin
 * (Settings → Plans) and read through `GET /website/plans`; this is the
 * storefront's own view of one, so the pages do not depend on the API's shape.
 *
 * The CRM's plan carries a name, a price, a billing period and the documents
 * it needs. What else the storefront shows comes from the plan's custom
 * properties marked "Show on website", by key:
 *
 * | Property key           | Meaning                                              |
 * | ---------------------- | ---------------------------------------------------- |
 * | `custom_product_key`   | The stable key the static pages link with (`?plan=`). |
 * | `custom_regions`       | Province codes it is sold in, comma-separated; `CA` or absent = everywhere. |
 * | `custom_product_title` | The product family's heading.                         |
 * | `custom_best_for`      | One line: who the plan suits.                         |
 * | `custom_features`      | One feature per line.                                 |
 * | `custom_promotion`     | A promotion's headline.                               |
 */
export type OrderCategory = 'sim' | 'mobile' | 'internet';

export interface WebsiteOffer {
  /** The CRM plan's id; what an order names. */
  productId: string;
  commercial: {
    productKey: string;
    productType: OrderCategory;
    regions: RegionCode[];
    offerName: string;
    productTitle: string;
    currency: 'CAD';
    recurringChargeAmountMinor: number;
    billingPeriod?: 'month' | '30_days' | '90_days';
    documentChecklist: string[];
    presentation?: { bestFor?: string; features: string[] };
    promotion?: { headline: string };
  };
}

/** The CRM lead type each storefront category is saved as, and back. */
export const leadTypeByCategory = {
  sim: 'sim_order',
  mobile: 'mobility',
  internet: 'internet',
} as const satisfies Record<OrderCategory, WebsitePlan['leadType']>;

const categoryByLeadType: Record<WebsitePlan['leadType'], OrderCategory> = {
  sim_order: 'sim',
  mobility: 'mobile',
  internet: 'internet',
};

/** Only a SIM order is a resumable draft, so only it can take document uploads. */
export function isDraftCategory(category: OrderCategory): boolean {
  return category === 'sim';
}

function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function regionsFrom(value: unknown): RegionCode[] {
  const codes = (text(value) ?? '')
    .split(',')
    .map((code) => regionCodeSchema.safeParse(code.trim().toUpperCase()))
    .flatMap((parsed) => (parsed.success ? [parsed.data] : []));
  return codes.length > 0 ? codes : [NATIONAL_REGION];
}

function billingPeriodFrom(
  period: WebsitePlan['billingPeriod'],
): WebsiteOffer['commercial']['billingPeriod'] {
  return period === 'month' || period === '30_days' || period === '90_days' ? period : undefined;
}

/** One CRM plan as the order form's offer. A plan with no extras still orders. */
export function offerFromPlan(plan: WebsitePlan): WebsiteOffer {
  const category = categoryByLeadType[plan.leadType];
  const properties = plan.properties;
  const features = (text(properties['custom_features']) ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const bestFor = text(properties['custom_best_for']);
  const promotion = text(properties['custom_promotion']);
  const billingPeriod = billingPeriodFrom(plan.billingPeriod);
  return {
    productId: plan.id,
    commercial: {
      productKey: text(properties['custom_product_key']) ?? plan.id,
      productType: category,
      regions: regionsFrom(properties['custom_regions']),
      offerName: plan.name,
      productTitle: text(properties['custom_product_title']) ?? plan.name,
      currency: plan.currency,
      recurringChargeAmountMinor: plan.priceMinor,
      ...(billingPeriod ? { billingPeriod } : {}),
      // A one-shot order has no draft to attach a file to; staff collect its documents.
      documentChecklist: isDraftCategory(category) ? [...plan.requiredDocuments] : [],
      ...(bestFor || features.length > 0
        ? { presentation: { ...(bestFor ? { bestFor } : {}), features } }
        : {}),
      ...(promotion ? { promotion: { headline: promotion } } : {}),
    },
  };
}

export function offersFromPlans(plans: readonly WebsitePlan[]): WebsiteOffer[] {
  return plans.map(offerFromPlan);
}

/** Whether an offer is sold in a province (`CA` = everywhere). */
export function offerSoldIn(offer: WebsiteOffer, province: ProvinceCode | undefined): boolean {
  if (!province) return true;
  return (
    offer.commercial.regions.includes(NATIONAL_REGION) ||
    offer.commercial.regions.includes(province)
  );
}
