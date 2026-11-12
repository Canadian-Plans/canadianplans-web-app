import type { ProvinceCode } from '@canadian-plans/contracts';
import { isOfferSoldIn } from '@canadian-plans/contracts';
import { z } from 'zod';

import type { WebsiteOffer } from '@/lib/offers';
import { parseOrderDetails, type OrderDetailsInput, type OrderCategory } from './details';

/** What the order page keeps of a SIM order's draft read back from the CRM. */
export interface SavedOrderDraft {
  /** The CRM plan the draft was saved for. */
  productId: string;
  contact: { fullName?: string; email?: string; phone?: string; countryCode?: string };
  form: { schemaVersion: number; payload: Record<string, unknown> } | null;
}

/** The `sim_order` form as `buildOrderForm` writes it; only a SIM order is a draft. */
const storedSchema = z.object({
  arrivalDate: z.string(),
  canadaAddress: z.string(),
  currentCountry: z.string().optional(),
});

/** Decode only this form version, then apply the same validation as a new save. */
export function restoreOrderDetails(
  draft: SavedOrderDraft,
  offer: WebsiteOffer,
): OrderDetailsInput | undefined {
  if (draft.form?.schemaVersion !== 1 || draft.productId !== offer.productId) return undefined;
  if (offer.commercial.productType !== 'sim') return undefined;
  const parsed = storedSchema.safeParse(draft.form.payload);
  if (!parsed.success) return undefined;
  const details: OrderDetailsInput = {
    category: 'sim',
    fullName: draft.contact.fullName ?? '',
    email: draft.contact.email ?? '',
    phone: draft.contact.phone ?? '',
    countryCode: draft.contact.countryCode ?? '',
    currentCountry: parsed.data.currentCountry ?? '',
    destination: parsed.data.canadaAddress,
    arrivalDate: parsed.data.arrivalDate,
  };
  return parseOrderDetails(details).ok ? details : undefined;
}

/** Explicit navigation choices take precedence over a previous saved selection. */
export function selectOrderDraft(input: {
  offers: readonly WebsiteOffer[];
  draft: SavedOrderDraft | undefined;
  requestedPlan: string | undefined;
  category: OrderCategory | undefined;
  province: ProvinceCode | undefined;
}): {
  selected: WebsiteOffer | undefined;
  details: OrderDetailsInput | undefined;
  province: ProvinceCode | undefined;
} {
  const matches = (offer: WebsiteOffer) =>
    (!input.category || offer.commercial.productType === input.category) &&
    (!input.province || isOfferSoldIn(offer.commercial.regions, input.province));
  const saved = input.draft
    ? input.offers.find((offer) => offer.productId === input.draft?.productId && matches(offer))
    : undefined;
  // Static pages link by the catalogue's stable productKey; the plan list links by productId.
  const selected =
    input.requestedPlan !== undefined
      ? input.offers.find(
          (offer) =>
            (offer.productId === input.requestedPlan ||
              offer.commercial.productKey === input.requestedPlan) &&
            matches(offer),
        )
      : saved;
  const details = selected && input.draft ? restoreOrderDetails(input.draft, selected) : undefined;
  return { selected, details, province: input.province };
}
