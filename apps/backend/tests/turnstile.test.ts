import { describe, expect, it, vi } from 'vitest';
import { createTurnstileVerifier } from '../src/website/turnstile.js';

const config = { secret: 'synthetic-secret', hostname: 'shop.example', action: 'lead-submit' };
const valid = { success: true, hostname: config.hostname, action: config.action };

describe('Turnstile server verification', () => {
  it('verifies each token with the provider, including replay attempts', async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(valid))
      .mockResolvedValueOnce(
        Response.json({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
      );
    const verify = createTurnstileVerifier(config, request);
    expect(await verify('challenge')).toBe(true);
    expect(await verify('challenge')).toBe(false);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0]?.[0]).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    );
    expect(JSON.parse(String(request.mock.calls[0]?.[1]?.body))).toEqual({
      secret: config.secret,
      response: 'challenge',
    });
  });

  it.each([
    { success: false },
    { ...valid, hostname: 'foreign.example' },
    { ...valid, action: 'login' },
    { success: true },
    { ...valid, success: 'true' },
  ])('denies invalid provider result %j', async (body) => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body));
    expect(await createTurnstileVerifier(config, request)('challenge')).toBe(false);
  });

  it('denies missing/oversize tokens and incomplete configuration without network calls', async () => {
    const request = vi.fn<typeof fetch>();
    expect(await createTurnstileVerifier(config, request)(undefined)).toBe(false);
    expect(await createTurnstileVerifier(config, request)('x'.repeat(2049))).toBe(false);
    expect(await createTurnstileVerifier({ action: 'lead-submit' }, request)('challenge')).toBe(
      false,
    );
    expect(
      await createTurnstileVerifier(
        { ...config, secret: '1x0000000000000000000000000000000AA' },
        request,
      )('challenge'),
    ).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });

  it('fails closed on network, HTTP and malformed JSON errors', async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('invalid JSON'));
    const verify = createTurnstileVerifier(config, request);
    expect(await verify('challenge')).toBe(false);
    expect(await verify('challenge')).toBe(false);
    expect(await verify('challenge')).toBe(false);
  });
});
