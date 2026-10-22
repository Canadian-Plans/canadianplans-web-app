import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResendEmailAdapter } from './messaging.js';

afterEach(() => vi.unstubAllGlobals());
describe('Resend send correlation', () => {
  it('uses the stable logical id for retry idempotency and native event correlation', async () => {
    const send = vi.fn<typeof fetch>(async () => Response.json({ id: 'provider-email-id' }));
    vi.stubGlobal('fetch', send);
    const adapter = new ResendEmailAdapter({
      apiKey: 'synthetic-key',
      sender: { fromAddress: 'sender@example.test', fromName: 'Test' },
    });
    const message = {
      workspaceId: '11111111-1111-4111-8111-111111111111',
      messageId: '22222222-2222-4222-8222-222222222222',
      template: 'order_status' as const,
      toAddress: 'customer@example.test',
      reference: 'CP-TEST',
    };
    expect(await adapter.send(message)).toEqual({
      status: 'delivered',
      providerId: 'provider-email-id',
    });
    await adapter.send(message);
    const options = send.mock.calls.map((call) => call[1]!);
    expect(options.map((entry) => new Headers(entry.headers).get('Idempotency-Key'))).toEqual([
      `${message.workspaceId}/${message.messageId}`,
      `${message.workspaceId}/${message.messageId}`,
    ]);
    expect(JSON.parse(String(options[0]!.body))).toMatchObject({
      tags: [{ name: 'cp_message_id', value: message.messageId }],
    });
  });
});
