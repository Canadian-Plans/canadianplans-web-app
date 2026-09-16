import type { Server } from 'node:http';
import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';
import { apiErrorResponseSchema } from '@canadian-plans/contracts';

import { requestId } from '../src/requestId.js';
import { createOrderRouter, type WebsiteRouteDependencies } from '../src/routes/website.js';
import { generateServiceSecret } from '../src/website/credential.js';

const WORKSPACE = '10000000-0000-4000-8000-000000000513';
const CREDENTIAL = '20000000-0000-4000-8000-000000000513';
const QUOTE = '30000000-0000-4000-8000-000000000513';
const { secret: SECRET, secretHash: SECRET_HASH } = generateServiceSecret();

const requestBody = {
  quoteId: QUOTE,
  termsVersion: 'terms-1',
  form: { schemaVersion: 1, payload: {} },
  consent: { termsVersion: 'terms-1', marketingOptIn: false },
};

function dependencies(
  submit: NonNullable<WebsiteRouteDependencies['orders']>['service']['submit'],
): WebsiteRouteDependencies {
  return {
    auth: {
      resolveCredential: async (hash) =>
        hash === SECRET_HASH
          ? {
              credentialId: CREDENTIAL,
              workspaceId: WORKSPACE,
              scopes: ['orders:create'],
              revoked: false,
            }
          : undefined,
      rateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
      botCheck: async () => true,
    },
    leads: {
      store: {
        createLead: async () => {
          throw new Error('unused');
        },
        updateLead: async () => {
          throw new Error('unused');
        },
        listLeads: async () => ({ leads: [], page: { page: 1, pageSize: 25, total: 0 } }),
      },
    },
    orders: { service: { submit } },
  };
}

describe('POST /api/v1/orders', () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    server = undefined;
  });

  async function start(submit: Parameters<typeof dependencies>[0]) {
    const app = express();
    app.use(requestId);
    app.use(express.json());
    app.use('/api/v1', createOrderRouter(dependencies(submit)));
    server = app.listen(0);
    await new Promise<void>((resolve) => server?.once('listening', resolve));
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('expected TCP server');
    return `http://127.0.0.1:${address.port}`;
  }

  async function post(baseUrl: string) {
    return fetch(`${baseUrl}/api/v1/orders`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${SECRET}`,
        'content-type': 'application/json',
        'idempotency-key': 'synthetic-order-key',
        'x-draft-grant': 'cpldg_synthetic-order-route-grant',
      },
      body: JSON.stringify(requestBody),
    });
  }

  it('returns a retryable 503 and never success when persistence is unavailable', async () => {
    const baseUrl = await start(async () => {
      throw new Error('database unavailable');
    });
    const response = await post(baseUrl);
    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('2');
    const error = apiErrorResponseSchema.parse(await response.json());
    expect(error.error.code).toBe('persistence_unavailable');
    expect(error.error.details).toEqual({ retryable: true });
  });

  it('maps a conflicting payload under a completed key to 409', async () => {
    const baseUrl = await start(async () => ({ status: 'idempotency_conflict' }));
    const response = await post(baseUrl);
    expect(response.status).toBe(409);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe(
      'idempotency_conflict',
    );
  });

  it('maps a submission against an already-submitted draft to 409 draft_already_submitted', async () => {
    const baseUrl = await start(async () => ({ status: 'draft_already_submitted' }));
    const response = await post(baseUrl);
    expect(response.status).toBe(409);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe(
      'draft_already_submitted',
    );
  });
});
