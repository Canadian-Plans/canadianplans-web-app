import type { Server } from 'node:http';
import express from 'express';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { requestId } from '../src/requestId.js';
import {
  buildUnsubscribeToken,
  createEmailRouter,
  type EmailRouteDependencies,
} from '../src/routes/email.js';
import { hashContact } from '../src/email/hash.js';
import type {
  ApplyProviderEventOutcome,
  DeliveryStatusRow,
  DeliverySummary,
  EmailStore,
  ProviderEventInput,
  QueueEmailMessageInput,
} from '../src/email/store.js';

const WORKSPACE = '11111111-1111-4111-8111-111111111111';
const LEAD = '22222222-2222-4222-8222-222222222222';
const SECRET = 'a-sufficiently-long-contact-hash-secret';
const WEBHOOK_SECRET = 'a-webhook-shared-secret';

class FakeEmailStore implements EmailStore {
  unsubscribed: Array<{ contactHash: string; leadId?: string }> = [];
  events: ProviderEventInput[] = [];
  private readonly seenEventIds = new Set<string>();

  async checkTransactional() {
    return { eligible: true };
  }
  async checkMarketing() {
    return { eligible: true };
  }
  async queueMessage(_input: QueueEmailMessageInput): Promise<void> {}
  async applyProviderEvent(input: ProviderEventInput): Promise<ApplyProviderEventOutcome> {
    if (this.seenEventIds.has(input.providerEventId)) return 'duplicate';
    this.seenEventIds.add(input.providerEventId);
    this.events.push(input);
    return 'applied';
  }
  async listDelivery(): Promise<DeliveryStatusRow[]> {
    return [];
  }
  async deliverySummary(): Promise<DeliverySummary> {
    return { sent: 0, delivered: 0, failed: 0, uncertain: 0 };
  }
  async recordUnsubscribe(input: { contactHash: string; leadId?: string }): Promise<void> {
    this.unsubscribed.push({ contactHash: input.contactHash, leadId: input.leadId });
  }
}

describe('email routes', () => {
  let server: Server;
  let baseUrl: string;
  let store: FakeEmailStore;

  beforeEach(async () => {
    store = new FakeEmailStore();
    const dependencies: EmailRouteDependencies = {
      store,
      sessionVerifier: { verify: async () => undefined },
      contactHashSecret: () => SECRET,
      unsubscribeConsentVersion: 'test-1',
      webhookSharedSecret: WEBHOOK_SECRET,
      authorizeDeliveryView: async () => true,
    };
    const app = express();
    app.use(requestId);
    app.use(express.json());
    app.use('/api/v1/email', createEmailRouter(dependencies));
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('expected TCP server');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('unsubscribes without any login given a valid signed token', async () => {
    const contactHash = hashContact('lead@example.com', SECRET);
    const token = buildUnsubscribeToken(SECRET, { workspaceId: WORKSPACE, contactHash, leadId: LEAD });

    const response = await fetch(`${baseUrl}/api/v1/email/unsubscribe?token=${encodeURIComponent(token)}`);

    expect(response.status).toBe(200);
    expect(store.unsubscribed).toEqual([{ contactHash, leadId: LEAD }]);
  });

  it('rejects a tampered unsubscribe token', async () => {
    const contactHash = hashContact('lead@example.com', SECRET);
    const token = buildUnsubscribeToken(SECRET, { workspaceId: WORKSPACE, contactHash, leadId: LEAD });
    const tampered = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');

    const response = await fetch(`${baseUrl}/api/v1/email/unsubscribe?token=${encodeURIComponent(tampered)}`);

    expect(response.status).toBe(400);
    expect(store.unsubscribed).toHaveLength(0);
  });

  it('rejects an invalid provider event body', async () => {
    const response = await fetch(`${baseUrl}/api/v1/email/webhook/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-email-webhook-secret': WEBHOOK_SECRET },
      body: JSON.stringify({ eventType: 'not_a_real_type', workspaceId: WORKSPACE, providerEventId: 'evt-1' }),
    });

    expect(response.status).toBe(400);
    expect(store.events).toHaveLength(0);
  });

  it('rejects a provider event without the shared secret', async () => {
    const response = await fetch(`${baseUrl}/api/v1/email/webhook/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ eventType: 'bounce', workspaceId: WORKSPACE, providerEventId: 'evt-1' }),
    });

    expect(response.status).toBe(401);
    expect(store.events).toHaveLength(0);
  });

  it('applies a valid bounce event exactly once even if the provider redelivers it', async () => {
    const body = JSON.stringify({
      eventType: 'bounce',
      workspaceId: WORKSPACE,
      providerEventId: 'evt-dup-1',
      toAddress: 'bounced@example.com',
    });
    const headers = { 'content-type': 'application/json', 'x-email-webhook-secret': WEBHOOK_SECRET };

    const first = await fetch(`${baseUrl}/api/v1/email/webhook/events`, { method: 'POST', headers, body });
    const second = await fetch(`${baseUrl}/api/v1/email/webhook/events`, { method: 'POST', headers, body });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await first.json()).toEqual({ status: 'applied' });
    expect(await second.json()).toEqual({ status: 'duplicate' });
    expect(store.events).toHaveLength(1);
  });
});
