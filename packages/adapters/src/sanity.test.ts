import { describe, expect, it } from 'vitest';

import { SanityCatalogueAdapter, SanityProviderError } from './sanity.js';

/** A complete published offer document, shaped like the adapter's projection. */
const publishedOfferDocument = {
  _id: 'offer-rogers-sim-5gb',
  _rev: 'revision-7',
  product: { productKey: 'rogers-sim-5gb', title: 'Rogers SIM 5 GB', type: 'sim' },
  name: 'Rogers 5 GB',
  currency: 'CAD',
  recurringChargeAmountMinor: 4500,
  oneTimeFees: [{ label: 'Activation', amountMinor: 1000 }],
  amountPayableTodayMinor: 1000,
  paymentRequired: true,
  documentChecklist: ['passport', 'study_permit'],
  eligibility: 'New activations only.',
  availability: 'Canada-wide.',
  billingParty: 'Canadian Plans',
  contractTerms: [{ _type: 'block', children: [] }],
  termsVersion: 'terms-2026-09',
  specs: { carrier: 'Rogers', dataAllowance: '5 GB', speed: 'LTE' },
};

interface CapturedRequest {
  url: URL;
  init: RequestInit;
}

function requestUrl(input: Parameters<typeof fetch>[0]): URL {
  if (input instanceof URL) return input;
  if (typeof input === 'string') return new URL(input);
  return new URL(input.url);
}

/** Injected `fetch` that records each call and returns a fresh response. */
function respondingFetch(response: () => Response): {
  fetchImpl: typeof fetch;
  requests: CapturedRequest[];
} {
  const requests: CapturedRequest[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    requests.push({ url: requestUrl(input), init: init ?? {} });
    return response();
  };
  return { fetchImpl, requests };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function adapterConfig(timeoutMs?: number) {
  return {
    projectId: 'project1',
    dataset: 'production',
    apiVersion: '2026-09-01',
    readToken: 'read-token-1',
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  };
}

describe('SanityCatalogueAdapter', () => {
  it('maps a published document to a PublishedOffer', async () => {
    const { fetchImpl, requests } = respondingFetch(() =>
      jsonResponse({ result: publishedOfferDocument }),
    );
    const adapter = new SanityCatalogueAdapter(adapterConfig(), fetchImpl);

    const offer = await adapter.fetchPublishedByDocumentId('offer-rogers-sim-5gb');

    expect(offer?.documentId).toBe('offer-rogers-sim-5gb');
    expect(offer?.revisionId).toBe('revision-7');
    expect(offer?.commercial).toEqual({
      productKey: 'rogers-sim-5gb',
      productTitle: 'Rogers SIM 5 GB',
      productType: 'sim',
      offerName: 'Rogers 5 GB',
      currency: 'CAD',
      recurringChargeAmountMinor: 4500,
      oneTimeFees: [{ label: 'Activation', amountMinor: 1000 }],
      amountPayableTodayMinor: 1000,
      paymentRequired: true,
      documentChecklist: ['passport', 'study_permit'],
      eligibility: 'New activations only.',
      availability: 'Canada-wide.',
      billingParty: 'Canadian Plans',
      contractTerms: [{ _type: 'block', children: [] }],
      termsVersion: 'terms-2026-09',
      specs: { carrier: 'Rogers', dataAllowance: '5 GB', speed: 'LTE' },
    });

    const request = requests[0];
    expect(request?.url.toString()).toBe(
      'https://project1.api.sanity.io/v2026-09-01/data/query/production?perspective=published',
    );
    expect(request?.init.method).toBe('POST');
    expect(request?.init.redirect).toBe('error');
    expect(request?.init.signal).toBeInstanceOf(AbortSignal);
    expect(request?.init.headers).toMatchObject({
      accept: 'application/json',
      authorization: 'Bearer read-token-1',
    });
    const body = request?.init.body;
    expect(typeof body === 'string' ? JSON.parse(body) : undefined).toEqual({
      query: expect.stringContaining('$documentId'),
      params: { documentId: 'offer-rogers-sim-5gb' },
    });
  });

  it('returns undefined when the published document is missing', async () => {
    const { fetchImpl } = respondingFetch(() => jsonResponse({ result: null }));
    const adapter = new SanityCatalogueAdapter(adapterConfig(), fetchImpl);

    await expect(adapter.fetchPublishedByDocumentId('missing-offer')).resolves.toBeUndefined();
  });

  it('raises invalid_response for a malformed document', async () => {
    const { product: _product, ...documentWithoutProduct } = publishedOfferDocument;
    const { fetchImpl } = respondingFetch(() => jsonResponse({ result: documentWithoutProduct }));
    const adapter = new SanityCatalogueAdapter(adapterConfig(), fetchImpl);

    await expect(adapter.fetchPublishedByDocumentId('offer-rogers-sim-5gb')).rejects.toMatchObject({
      name: 'SanityProviderError',
      code: 'invalid_response',
    });
  });

  it('raises unavailable when the provider returns an error status', async () => {
    const { fetchImpl } = respondingFetch(() => jsonResponse({ error: 'unavailable' }, 503));
    const adapter = new SanityCatalogueAdapter(adapterConfig(), fetchImpl);

    await expect(adapter.fetchPublishedByDocumentId('offer-rogers-sim-5gb')).rejects.toBeInstanceOf(
      SanityProviderError,
    );
  });

  it('aborts at the configured timeout and raises unavailable', async () => {
    let observedSignal: AbortSignal | null | undefined;
    const fetchImpl: typeof fetch = (_input, init) => {
      const signal = init?.signal;
      observedSignal = signal;
      if (!signal) return Promise.reject(new Error('the adapter did not pass an abort signal'));
      return new Promise<never>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted by timeout')), {
          once: true,
        });
      });
    };
    const adapter = new SanityCatalogueAdapter(adapterConfig(20), fetchImpl);
    const startedAt = Date.now();

    await expect(adapter.fetchPublishedByDocumentId('offer-rogers-sim-5gb')).rejects.toMatchObject({
      name: 'SanityProviderError',
      code: 'unavailable',
    });

    expect(observedSignal?.aborted).toBe(true);
    expect(Date.now() - startedAt).toBeLessThan(2_000);
  });
});
