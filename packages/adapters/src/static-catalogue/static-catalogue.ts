import { createHash } from 'node:crypto';

import type { CommercialOffer, PublishedOffer } from '@canadian-plans/contracts';

import type { SanityCatalogue } from '../sanity.js';
import { OPEN_INPUT_PREFIX, site1CommercialOffers } from './site-1-plans.js';

/**
 * A catalogue read from code instead of a CMS. It implements the same three
 * read methods the catalogue sync uses for Sanity, so quotes, offer versions and
 * order snapshots are unchanged (ADR 0005, D1).
 */

/** A placeholder left in an offer for an owner decision that is still open. */
export interface OpenInput {
  productKey: string;
  field: 'billingParty' | 'specs.carrier' | 'eligibility' | 'termsVersion';
}

/** Lists every offer field that still carries a `TEST-` placeholder. */
export function findOpenInputs(offers: readonly CommercialOffer[]): OpenInput[] {
  const open: OpenInput[] = [];
  for (const offer of offers) {
    const fields: [OpenInput['field'], string][] = [
      ['billingParty', offer.billingParty],
      ['specs.carrier', offer.specs.carrier],
      ['eligibility', offer.eligibility],
      ['termsVersion', offer.termsVersion],
    ];
    for (const [field, value] of fields) {
      if (value.startsWith(OPEN_INPUT_PREFIX)) open.push({ productKey: offer.productKey, field });
    }
  }
  return open;
}

export interface StaticCatalogueOptions {
  /**
   * Publish offers that still carry `TEST-` placeholders. Left off in
   * production so an unanswered owner decision can never reach a customer; the
   * read then fails with `catalogue_open_inputs` and no offer is published.
   */
  allowOpenInputs: boolean;
}

/** Hash of the commercial payload, so a changed offer gets a new revision id. */
function revisionOf(offer: CommercialOffer): string {
  const hash = createHash('sha256').update(JSON.stringify(offer)).digest('hex');
  return `static-${hash.slice(0, 12)}`;
}

export class StaticCatalogue implements SanityCatalogue {
  private readonly offers: readonly PublishedOffer[];

  constructor(
    commercialOffers: readonly CommercialOffer[] = site1CommercialOffers,
    private readonly options: StaticCatalogueOptions = { allowOpenInputs: false },
  ) {
    const seen = new Set<string>();
    for (const offer of commercialOffers) {
      if (seen.has(offer.productKey)) throw new Error('ambiguous_product');
      seen.add(offer.productKey);
    }
    this.offers = commercialOffers.map((commercial) => ({
      documentId: `static:${commercial.productKey}`,
      revisionId: revisionOf(commercial),
      commercial,
    }));
  }

  /** The offers, or an error while open owner decisions would reach production. */
  private published(): readonly PublishedOffer[] {
    if (!this.options.allowOpenInputs) {
      const open = findOpenInputs(this.offers.map((offer) => offer.commercial));
      if (open.length > 0) throw new Error('catalogue_open_inputs');
    }
    return this.offers;
  }

  async fetchPublishedByDocumentId(documentId: string): Promise<PublishedOffer | undefined> {
    return this.published().find((offer) => offer.documentId === documentId);
  }

  async fetchPublishedByProductKey(productKey: string): Promise<PublishedOffer | undefined> {
    return this.published().find((offer) => offer.commercial.productKey === productKey);
  }

  async listPublished(): Promise<readonly PublishedOffer[]> {
    return this.published();
  }
}
