import { createHmac } from 'node:crypto';
import type { Server } from 'node:http';
import express from 'express';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MachineRegistry } from '../src/machines/registry.js';
import { requestId } from '../src/requestId.js';
import { createSanityWebhookRouter } from '../src/routes/sanity-webhook.js';

const WORKSPACE = '10000000-0000-4000-8000-000000000451';
const SECRET = 'sanity-webhook-secret-for-tests';
const NOW = Date.parse('2026-09-16T00:00:00.000Z');
const TIMESTAMP = String(NOW / 1_000);

function signature(body: string): string {
  return `t=${TIMESTAMP},v1=${createHmac('sha256', SECRET)
    .update(`${TIMESTAMP}.${body}`)
    .digest('base64url')}`;
}

describe('POST /api/v1/webhooks/sanity', () => {
  let server: Server;
  let baseUrl: string;
  const accepted: unknown[] = [];

  beforeEach(async () => {
    accepted.length = 0;
    const registry = new MachineRegistry(
      {
        webhooks: [
          {
            selector: 'site-1-sanity',
            provider: 'sanity',
            providerAccount: 'project-site-1',
            workspaceId: WORKSPACE,
            verificationSecret: SECRET,
            revoked: false,
          },
        ],
        schedulers: [],
      },
      () => NOW,
    );
    const app = express();
    app.use(requestId);
    app.use(
      '/api/v1/webhooks/sanity',
      express.raw({ type: 'application/json', limit: '64kb' }),
      createSanityWebhookRouter({
        registry,
        store: {
          acceptEvent: async (input) => {
            accepted.push(input);
            return {
              eventId: '50000000-0000-4000-8000-000000000451',
              duplicate: false,
            };
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

  async function post(providerAccount: string, overrides: { signature?: string } = {}) {
    const body = JSON.stringify({ documentId: 'sanity-offer-1', ignoredPrice: 1 });
    return fetch(`${baseUrl}/api/v1/webhooks/sanity`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-webhook-selector': 'site-1-sanity',
        'x-provider-account': providerAccount,
        'sanity-webhook-signature': overrides.signature ?? signature(body),
        'idempotency-key': 'delivery-451',
      },
      body,
    });
  }

  it('verifies the raw signature before storing a scoped inbox event and returns 200', async () => {
    const response = await post('project-site-1');
    expect(response.status).toBe(200);
    expect(accepted).toHaveLength(1);
    expect(accepted[0]).toMatchObject({
      workspaceId: WORKSPACE,
      providerAccount: 'project-site-1',
      documentId: 'sanity-offer-1',
    });
  });

  it('denies a mismatched provider account before writing the inbox', async () => {
    const response = await post('project-other');
    expect(response.status).toBe(401);
    expect(accepted).toHaveLength(0);
    expect(await response.json()).toMatchObject({
      error: { code: 'machine_account_mismatch' },
    });
  });

  it('rejects a correctly signed delivery whose timestamp is older than five minutes', async () => {
    const body = JSON.stringify({ documentId: 'sanity-offer-1', ignoredPrice: 1 });
    const staleTimestamp = String((NOW - 6 * 60_000) / 1_000);
    const staleSignature = `t=${staleTimestamp},v1=${createHmac('sha256', SECRET)
      .update(`${staleTimestamp}.${body}`)
      .digest('base64url')}`;

    const response = await post('project-site-1', { signature: staleSignature });
    expect(response.status).toBe(401);
    expect(accepted).toHaveLength(0);
    expect(await response.json()).toMatchObject({
      error: { code: 'machine_signature_invalid' },
    });
  });

  it('rejects a signature header that omits the signed value', async () => {
    // Timestamp present but no `v1=` component: the signed value is missing.
    const response = await post('project-site-1', { signature: `t=${TIMESTAMP}` });
    expect(response.status).toBe(401);
    expect(accepted).toHaveLength(0);
    expect(await response.json()).toMatchObject({
      error: { code: 'machine_signature_invalid' },
    });
  });
});
