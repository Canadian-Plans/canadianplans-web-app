import type { Server } from 'node:http';
import express from 'express';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiErrorResponseSchema } from '@canadian-plans/contracts';

import type { CatalogueService } from '../src/catalogue/service.js';
import { requestId } from '../src/requestId.js';
import { createQuoteRouter } from '../src/routes/website.js';
import { generateServiceSecret } from '../src/website/credential.js';

const WORKSPACE = '10000000-0000-4000-8000-000000000461';
const CREDENTIAL = '20000000-0000-4000-8000-000000000461';
const DRAFT = '30000000-0000-4000-8000-000000000461';
const PRODUCT = '40000000-0000-4000-8000-000000000461';
const { secret: SECRET, secretHash: SECRET_HASH } = generateServiceSecret();

describe('POST /api/v1/quotes', () => {
  let server: Server;
  let baseUrl: string;
  let outcome: Awaited<ReturnType<CatalogueService['createQuote']>>;
  let received: Parameters<CatalogueService['createQuote']>[0] | undefined;

  beforeEach(async () => {
    outcome = { status: 'cms_unavailable' };
    received = undefined;
    const app = express();
    app.use(requestId);
    app.use(express.json());
    app.use(
      '/api/v1',
      createQuoteRouter({
        auth: {
          resolveCredential: async (hash) =>
            hash === SECRET_HASH
              ? {
                  credentialId: CREDENTIAL,
                  workspaceId: WORKSPACE,
                  scopes: ['quotes:create'],
                  revoked: false,
                }
              : undefined,
          rateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
          botCheck: async () => true,
        },
        leads: {
          store: {
            readLead: async () => {
              throw new Error('unused');
            },
            createLead: async () => {
              throw new Error('unused');
            },
            updateLead: async () => {
              throw new Error('unused');
            },
            listLeads: async () => ({ leads: [], page: { page: 1, pageSize: 25, total: 0 } }),
          },
        },
        quotes: {
          service: {
            createQuote: async (input) => {
              received = input;
              return outcome;
            },
          },
        },
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

  it('returns the actionable unpriced-callback error when CMS verification fails', async () => {
    const response = await fetch(`${baseUrl}/api/v1/quotes`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${SECRET}`,
        'content-type': 'application/json',
        'x-draft-grant': 'cpldg_valid-quote-route-grant',
      },
      body: JSON.stringify({ leadId: DRAFT, productId: PRODUCT }),
    });
    expect(response.status).toBe(503);
    const body = apiErrorResponseSchema.parse(await response.json());
    expect(body.error.code).toBe('unpriced_lead_required');
    expect(body.error.details).toEqual({ canSaveUnpricedLead: true });
  });

  function post(body: Record<string, unknown>) {
    return fetch(`${baseUrl}/api/v1/quotes`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${SECRET}`,
        'content-type': 'application/json',
        'x-draft-grant': 'cpldg_valid-quote-route-grant',
      },
      body: JSON.stringify(body),
    });
  }

  it('passes the chosen province to the quote service', async () => {
    outcome = { status: 'offer_unavailable' };
    await post({ leadId: DRAFT, productId: PRODUCT, province: 'SK' });
    expect(received?.province).toBe('SK');
  });

  it('answers 409 region_not_served when the plan is not sold in the province', async () => {
    outcome = { status: 'region_not_served' };
    const response = await post({ leadId: DRAFT, productId: PRODUCT, province: 'MB' });
    expect(response.status).toBe(409);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe(
      'region_not_served',
    );
  });

  it('rejects an invalid province before calling the service', async () => {
    for (const province of ['CA', 'Saskatchewan', 'XX']) {
      const response = await post({ leadId: DRAFT, productId: PRODUCT, province });
      expect(response.status).toBe(400);
    }
    expect(received).toBeUndefined();
  });
});
