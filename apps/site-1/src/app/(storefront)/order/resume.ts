import type { LeadDraft, WebsiteOffer, ProvinceCode } from '@canadian-plans/contracts';
import { isOfferSoldIn, provinceCodeSchema } from '@canadian-plans/contracts';
import { z } from 'zod';
import { MOBILE_PROVIDERS } from '@content/order-forms';
import { parseOrderDetails, type OrderDetailsInput, type OrderCategory } from './details';

const addressSchema = z.object({
  street: z.string(),
  unit: z.string().optional(),
  city: z.string(),
  postalCode: z.string(),
});
const storedSchema = z.discriminatedUnion('category', [
  z.object({
    category: z.literal('sim'),
    currentCountry: z.string(),
    destination: z.string(),
    arrivalDate: z.string(),
  }),
  z.object({
    category: z.literal('internet'),
    province: provinceCodeSchema,
    dateOfBirth: z.string(),
    address: addressSchema,
    currentProvider: z.string().optional(),
    preferredInstallationTime: z.string().optional(),
  }),
  z.object({
    category: z.literal('mobile'),
    lines: z.number().int(),
    currentProvider: z.enum(MOBILE_PROVIDERS),
    keepNumber: z.boolean(),
    simType: z.enum(['esim', 'physical']),
    address: addressSchema,
  }),
]);

/** Decode only this form version, then apply the same validation as a new save. */
export function restoreOrderDetails(
  draft: LeadDraft,
  offer: WebsiteOffer,
): OrderDetailsInput | undefined {
  if (draft.form?.schemaVersion !== 1 || draft.productId !== offer.productId) return undefined;
  const fields = draft.form.payload;
  const parsed = storedSchema.safeParse({ ...fields, category: fields['category'] ?? 'sim' });
  if (!parsed.success || parsed.data.category !== offer.commercial.productType) return undefined;
  const value = parsed.data;
  const contact = {
    fullName: draft.contact.fullName ?? '',
    email: draft.contact.email ?? '',
    phone: draft.contact.phone ?? '',
  };
  let details: OrderDetailsInput;
  if (value.category === 'sim') {
    details = { ...value, ...contact, countryCode: draft.contact.countryCode ?? '' };
  } else {
    const address = {
      streetAddress: value.address.street,
      aptUnit: value.address.unit ?? '',
      city: value.address.city,
      postalCode: value.address.postalCode,
    };
    if (value.category === 'internet') {
      details = {
        category: 'internet',
        ...contact,
        ...address,
        province: value.province,
        dateOfBirth: value.dateOfBirth,
        currentProvider: value.currentProvider ?? '',
        preferredInstallationTime: value.preferredInstallationTime ?? '',
      };
    } else {
      details = {
        category: 'mobile',
        ...contact,
        ...address,
        lines: String(value.lines),
        currentProvider: value.currentProvider,
        keepNumber: value.keepNumber ? 'yes' : 'no',
        simType: value.simType,
        creditCheckConsent: true,
      };
    }
  }
  if (!parseOrderDetails(details).ok) return undefined;
  // The restored form always asks the customer to consent again before saving.
  return details.category === 'mobile' ? { ...details, creditCheckConsent: false } : details;
}

/** Explicit navigation choices take precedence over a previous saved selection. */
export function selectOrderDraft(input: {
  offers: readonly WebsiteOffer[];
  draft: LeadDraft | undefined;
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
  const restored = selected && input.draft ? restoreOrderDetails(input.draft, selected) : undefined;
  // A province change must not silently put the saved address under a new price.
  const details =
    restored?.category === 'internet' && input.province && restored.province !== input.province
      ? undefined
      : restored;
  return {
    selected,
    details,
    province:
      input.province ??
      (details?.category === 'internet' ? provinceCodeSchema.parse(details.province) : undefined),
  };
}
