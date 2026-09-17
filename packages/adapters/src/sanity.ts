import { commercialOfferSchema, type PublishedOffer } from '@canadian-plans/contracts';
import { z } from 'zod';

const projectIdSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/)
  .max(80);
const datasetSchema = z
  .string()
  .regex(/^[a-zA-Z0-9_-]+$/)
  .max(80);

export interface SanityCatalogueConfig {
  projectId: string;
  dataset: string;
  apiVersion?: string;
  readToken?: string;
  timeoutMs?: number;
}

export interface SanityCatalogue {
  fetchPublishedByDocumentId(documentId: string): Promise<PublishedOffer | undefined>;
  fetchPublishedByProductKey(productKey: string): Promise<PublishedOffer | undefined>;
  listPublished(): Promise<readonly PublishedOffer[]>;
}

const rawOfferSchema = z.object({
  _id: z.string().min(1),
  _rev: z.string().min(1),
  product: z.object({
    productKey: z.string(),
    title: z.string(),
    type: z.string(),
  }),
  name: z.string(),
  currency: z.string(),
  recurringChargeAmountMinor: z.number(),
  oneTimeFees: z
    .array(z.object({ label: z.string(), amountMinor: z.number() }))
    .nullish()
    .transform((value) => value ?? []),
  amountPayableTodayMinor: z.number(),
  paymentRequired: z.boolean(),
  documentChecklist: z.array(z.string()),
  eligibility: z.string(),
  availability: z.string(),
  billingParty: z.string(),
  contractTerms: z.array(z.record(z.string(), z.unknown())),
  termsVersion: z.string(),
  specs: z.object({
    carrier: z.string(),
    dataAllowance: z.string(),
    speed: z.string().optional(),
    addressConditions: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const projection = `{
  _id, _rev, name, currency, recurringChargeAmountMinor, oneTimeFees[]{label, amountMinor},
  amountPayableTodayMinor, paymentRequired, documentChecklist, eligibility, availability,
  billingParty, contractTerms, termsVersion, specs,
  "product": product->{productKey, title, type}
}`;

function toPublishedOffer(raw: z.infer<typeof rawOfferSchema>): PublishedOffer {
  return {
    documentId: raw._id,
    revisionId: raw._rev,
    commercial: commercialOfferSchema.parse({
      productKey: raw.product.productKey,
      productTitle: raw.product.title,
      productType: raw.product.type,
      offerName: raw.name,
      currency: raw.currency,
      recurringChargeAmountMinor: raw.recurringChargeAmountMinor,
      oneTimeFees: raw.oneTimeFees,
      amountPayableTodayMinor: raw.amountPayableTodayMinor,
      paymentRequired: raw.paymentRequired,
      documentChecklist: raw.documentChecklist,
      eligibility: raw.eligibility,
      availability: raw.availability,
      billingParty: raw.billingParty,
      contractTerms: raw.contractTerms,
      termsVersion: raw.termsVersion,
      specs: raw.specs,
    }),
  };
}

export class SanityProviderError extends Error {
  constructor(readonly code: 'unavailable' | 'invalid_response' | 'ambiguous_product') {
    super(code);
    this.name = 'SanityProviderError';
  }
}

export class SanityCatalogueAdapter implements SanityCatalogue {
  private readonly projectId: string;
  private readonly dataset: string;
  private readonly apiVersion: string;
  private readonly readToken: string | undefined;
  private readonly timeoutMs: number;

  constructor(
    config: SanityCatalogueConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.projectId = projectIdSchema.parse(config.projectId);
    this.dataset = datasetSchema.parse(config.dataset);
    this.apiVersion = z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .parse(config.apiVersion ?? '2026-09-01');
    this.readToken = config.readToken;
    this.timeoutMs = config.timeoutMs ?? 5_000;
  }

  private async query(query: string, params: Record<string, string>): Promise<unknown> {
    const url = new URL(
      `https://${this.projectId}.api.sanity.io/v${this.apiVersion}/data/query/${this.dataset}`,
    );
    url.searchParams.set('perspective', 'published');
    try {
      const response = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          ...(this.readToken ? { authorization: `Bearer ${this.readToken}` } : {}),
        },
        body: JSON.stringify({ query, params }),
        redirect: 'error',
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) throw new SanityProviderError('unavailable');
      const envelope = z.object({ result: z.unknown() }).parse(await response.json());
      return envelope.result;
    } catch (error) {
      if (error instanceof SanityProviderError) throw error;
      if (error instanceof z.ZodError) throw new SanityProviderError('invalid_response');
      throw new SanityProviderError('unavailable');
    }
  }

  async fetchPublishedByDocumentId(documentId: string): Promise<PublishedOffer | undefined> {
    const result = await this.query(`*[_type == "offer" && _id == $documentId][0]${projection}`, {
      documentId,
    });
    if (result === null) return undefined;
    try {
      return toPublishedOffer(rawOfferSchema.parse(result));
    } catch {
      throw new SanityProviderError('invalid_response');
    }
  }

  async fetchPublishedByProductKey(productKey: string): Promise<PublishedOffer | undefined> {
    const result = await this.query(
      `*[_type == "offer" && product->productKey == $productKey] | order(_updatedAt desc) [0...2] ${projection}`,
      { productKey },
    );
    if (!Array.isArray(result)) throw new SanityProviderError('invalid_response');
    if (result.length === 0) return undefined;
    if (result.length > 1) throw new SanityProviderError('ambiguous_product');
    try {
      return toPublishedOffer(rawOfferSchema.parse(result[0]));
    } catch {
      throw new SanityProviderError('invalid_response');
    }
  }

  async listPublished(): Promise<readonly PublishedOffer[]> {
    const result = await this.query(`*[_type == "offer"] ${projection}`, {});
    if (!Array.isArray(result)) throw new SanityProviderError('invalid_response');
    try {
      return result.map((item) => toPublishedOffer(rawOfferSchema.parse(item)));
    } catch {
      throw new SanityProviderError('invalid_response');
    }
  }
}

export interface SiteRevalidator {
  revalidate(productKey: string): Promise<void>;
}

export class HttpSiteRevalidator implements SiteRevalidator {
  private readonly url: URL;

  constructor(
    url: string,
    private readonly secret: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = 5_000,
  ) {
    this.url = new URL(url);
    if (this.url.protocol !== 'https:' && this.url.hostname !== 'localhost') {
      throw new Error('Revalidate URL must use HTTPS.');
    }
  }

  async revalidate(productKey: string): Promise<void> {
    const response = await this.fetchImpl(this.url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.secret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ productKey }),
      redirect: 'error',
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error('revalidate_failed');
  }
}
