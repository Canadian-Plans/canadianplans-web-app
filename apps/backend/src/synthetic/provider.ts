import { commercialOfferSchema, type PublishedOffer } from '@canadian-plans/contracts';
import type { CatalogueProvider } from '../catalogue/service.js';

/**
 * The synthetic order check (REQ 40) runs the real lead→quote→order→cancel
 * flow, but the synthetic workspace has no Sanity project of its own — it
 * exists only to be ordered from and immediately cancelled every 15 minutes,
 * so standing up and paying for a whole CMS project for it would be pure
 * overhead. `CatalogueProvider` is already an injectable interface
 * (`CatalogueService` takes a `CatalogueProviderResolver` function, not a
 * concrete Sanity client — see `providerResolverFromRegistry`), so this is a
 * second, fixed implementation of the same seam rather than a special case
 * bolted onto the Sanity one.
 *
 * The fixture is intentionally the cheapest possible offer to check out:
 * `paymentRequired: false` and an empty `documentChecklist`, so the check
 * never depends on a payment provider or document upload/verification being
 * configured — those are exercised by the real customer flow and its own
 * tests, not by this check.
 */
export const SYNTHETIC_PRODUCT_KEY = 'synthetic-check';

export function syntheticPublishedOffer(): PublishedOffer {
  return {
    documentId: 'synthetic-check-offer',
    revisionId: 'synthetic-check-v1',
    commercial: commercialOfferSchema.parse({
      productKey: SYNTHETIC_PRODUCT_KEY,
      productTitle: 'Synthetic check (internal)',
      // Reuses the only product type the schema currently defines; this
      // offer is never shown to a customer, only ordered and cancelled by
      // the internal check.
      productType: 'sim',
      offerName: 'Synthetic check (internal)',
      currency: 'CAD',
      recurringChargeAmountMinor: 1,
      oneTimeFees: [],
      amountPayableTodayMinor: 1,
      paymentRequired: false,
      documentChecklist: [],
      eligibility: 'Internal synthetic monitoring fixture — never a real offer.',
      availability: 'Internal only; not sold.',
      billingParty: 'Canadian Plans',
      contractTerms: [{ note: 'Internal synthetic monitoring fixture.' }],
      termsVersion: 'synthetic-check-v1',
      specs: { carrier: 'Internal', dataAllowance: 'n/a' },
    }),
  };
}

export function createSyntheticCatalogueProvider(): CatalogueProvider {
  return {
    account: 'synthetic-check',
    catalogue: {
      async fetchPublishedByDocumentId() {
        return syntheticPublishedOffer();
      },
      // Echo the provisioned row's key: issueQuote upserts by the offer's key
      // and compares the product id, so a fixed key made any other
      // provisioned product_key fail every run with product_not_found.
      async fetchPublishedByProductKey(productKey: string) {
        const offer = syntheticPublishedOffer();
        return { ...offer, commercial: { ...offer.commercial, productKey } };
      },
      async listPublished() {
        return [syntheticPublishedOffer()];
      },
    },
    revalidator: {
      async revalidate() {
        // No storefront serves the synthetic workspace; nothing to revalidate.
      },
    },
  };
}
