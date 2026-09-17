import type { Server } from 'node:http';
import express from 'express';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  apiErrorResponseSchema,
  listWebsiteOffersResponseSchema,
  type CommercialOffer,
} from '@canadian-plans/contracts';
import type { WebsiteCredentialResolution } from '@canadian-plans/db';

import type { PublishedOfferRow } from '../src/catalogue/store.js';
import type { LeadStore } from '../src/leads/store.js';
import { requestId } from '../src/requestId.js';
import { createWebsiteRouter } from '../src/routes/website.js';
import { generateServiceSecret } from '../src/website/credential.js';
import type { WebsiteAuthDependencies } from '../src/website/session.js';

const WORKSPACE = '10000000-0000-4000-8000-000000000901';
const CREDENTIAL = '80000000-0000-4000-8000-000000000901';
const FIRST_PRODUCT = '30000000-0000-4000-8000-000000000901';
const FIRST_VERSION = '60000000-0000-4000-8000-000000000901';
const SECOND_PRODUCT = '30000000-0000-4000-8000-000000000902';
const SECOND_VERSION = '60000000-0000-4000-8000-000000000902';

// A valid, well-formed credential secret and its stored hash.
const { secret: VALID_SECRET, secretHash: VALID_HASH } = generateServiceSecret();

function commercial(productKey: string, offerName: string): CommercialOffer {
  return {
    productKey,
    productTitle: 'Rogers SIM',
    productType: 'sim',
    offerName,
    currency: 'CAD',
    recurringChargeAmountMinor: 3_500,
    oneTimeFees: [{ label: 'Activation', amountMinor: 1_000 }],
    amountPayableTodayMinor: 4_500,
    paymentRequired: true,
    documentChecklist: ['passport'],
    eligibility: 'Synthetic eligibility',
    availability: 'Synthetic availability',
    billingParty: 'Synthetic carrier',
    contractTerms: [{ _type: 'block', children: [] }],
    termsVersion: 'test-terms-1',
    specs: { carrier: 'Synthetic', dataAllowance: '5 GB' },
  };
}

const FIRST_ROW: PublishedOfferRow = {
  productId: FIRST_PRODUCT,
  productKey: 'rogers-sim-5gb',
  offerVersionId: FIRST_VERSION,
  lastSyncedAt: new Date('2026-09-14T00:00:00.000Z'),
  content: commercial('rogers-sim-5gb', 'Rogers 5GB'),
};

const SECOND_ROW: PublishedOfferRow = {
  productId: SECOND_PRODUCT,
  productKey: 'rogers-sim-10gb',
  offerVersionId: SECOND_VERSION,
  lastSyncedAt: null,
  content: commercial('rogers-sim-10gb', 'Rogers 10GB'),
};

class FakeLeadStore implements LeadStore {
  async createLead(): Promise<never> {
    throw new Error('leads are not used by the offers route');
  }

  async updateLead(): Promise<never> {
    throw new Error('leads are not used by the offers route');
  }

  async listLeads(): Promise<never> {
    throw new Error('leads are not used by the offers route');
  }
}

class FakeCatalogueStore {
  readonly calls: { workspaceId: string; actorId: string }[] = [];
  rows: readonly PublishedOfferRow[] = [];
  fail = false;

  async listPublishedOffers(
    workspaceId: string,
    actorId: string,
  ): Promise<readonly PublishedOfferRow[]> {
    this.calls.push({ workspaceId, actorId });
    if (this.fail) throw new Error('database unavailable');
    return this.rows;
  }
}

describe('GET /api/v1/website/offers', () => {
  let server: Server;
  let baseUrl: string;
  let store: FakeCatalogueStore;
  let resolution: WebsiteCredentialResolution;

  beforeEach(async () => {
    store = new FakeCatalogueStore();
    resolution = {
      credentialId: CREDENTIAL,
      workspaceId: WORKSPACE,
      scopes: ['quotes:create'],
      revoked: false,
    };
    const auth: WebsiteAuthDependencies = {
      resolveCredential: async (secretHash) => (secretHash === VALID_HASH ? resolution : undefined),
      rateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
      botCheck: () => true,
    };
    const app = express();
    app.use(requestId);
    app.use(
      '/api/v1/website',
      createWebsiteRouter({
        auth,
        leads: { store: new FakeLeadStore() },
        catalogue: { store },
      }),
    );
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('expected TCP server');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  function get(headers: Record<string, string> = {}) {
    return fetch(`${baseUrl}/api/v1/website/offers`, { headers });
  }

  it('returns exactly the workspace offers and reads them with the credential context', async () => {
    store.rows = [FIRST_ROW, SECOND_ROW];

    const response = await get({ authorization: `Bearer ${VALID_SECRET}` });
    expect(response.status).toBe(200);
    const body = listWebsiteOffersResponseSchema.parse(await response.json());
    expect(body.offers).toEqual([
      {
        productId: FIRST_PRODUCT,
        offerVersionId: FIRST_VERSION,
        lastSyncedAt: '2026-09-14T00:00:00.000Z',
        commercial: FIRST_ROW.content,
      },
      {
        productId: SECOND_PRODUCT,
        offerVersionId: SECOND_VERSION,
        lastSyncedAt: null,
        commercial: SECOND_ROW.content,
      },
    ]);
    expect(store.calls).toEqual([{ workspaceId: WORKSPACE, actorId: CREDENTIAL }]);
  });

  it('omits a row whose commercial content fails validation', async () => {
    store.rows = [
      FIRST_ROW,
      { ...SECOND_ROW, content: { productKey: 'broken', productType: 'sim' } },
    ];

    const response = await get({ authorization: `Bearer ${VALID_SECRET}` });
    expect(response.status).toBe(200);
    const body = listWebsiteOffersResponseSchema.parse(await response.json());
    expect(body.offers).toHaveLength(1);
    expect(body.offers[0]?.productId).toBe(FIRST_PRODUCT);
    expect(store.calls).toEqual([{ workspaceId: WORKSPACE, actorId: CREDENTIAL }]);
  });

  it('refuses a credential that lacks the quotes:create scope', async () => {
    resolution = { ...resolution, scopes: ['leads:write'] };

    const response = await get({ authorization: `Bearer ${VALID_SECRET}` });
    expect(response.status).toBe(403);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('scope_denied');
    expect(store.calls).toHaveLength(0);
  });

  it('refuses a request with no credential', async () => {
    const response = await get();
    expect(response.status).toBe(401);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe(
      'missing_credential',
    );
    expect(store.calls).toHaveLength(0);
  });

  it('returns 500 internal_error when the store fails', async () => {
    store.fail = true;

    const response = await get({ authorization: `Bearer ${VALID_SECRET}` });
    expect(response.status).toBe(500);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe('internal_error');
  });
});
