import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  TURNSTILE_ACTION,
  createTokenSource,
  type TurnstileApi,
  type TurnstileRenderOptions,
} from './turnstile';

function fakeApi() {
  let options: TurnstileRenderOptions | undefined;
  const api: TurnstileApi = {
    render: vi.fn((_container: HTMLElement | string, given: TurnstileRenderOptions) => {
      options = given;
      return 'widget-1';
    }),
    execute: vi.fn(),
    reset: vi.fn(),
    remove: vi.fn(),
  };
  const callbacks = () => {
    if (!options) throw new Error('widget was not rendered');
    return options;
  };
  return { api, callbacks };
}

const container = '#turnstile-widget';

afterEach(() => vi.useRealTimers());

describe('createTokenSource', () => {
  it('renders one widget for the lead-submit action and resolves with the token it reports', async () => {
    const { api, callbacks } = fakeApi();
    const source = createTokenSource(container, 'site-key', async () => api);
    const first = source.getToken();
    await vi.waitFor(() => expect(api.execute).toHaveBeenCalledTimes(1));
    expect(callbacks()).toMatchObject({
      sitekey: 'site-key',
      action: TURNSTILE_ACTION,
      execution: 'execute',
      appearance: 'interaction-only',
    });
    callbacks().callback('token-1');
    await expect(first).resolves.toBe('token-1');

    // A second call resets the same widget and asks for a new, different token.
    const second = source.getToken();
    await vi.waitFor(() => expect(api.execute).toHaveBeenCalledTimes(2));
    callbacks().callback('token-2');
    await expect(second).resolves.toBe('token-2');
    expect(api.render).toHaveBeenCalledTimes(1);
    expect(api.reset).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['error-callback', 'turnstile_failed'],
    ['expired-callback', 'turnstile_expired'],
    ['timeout-callback', 'turnstile_timeout'],
  ] as const)('rejects when the widget reports %s', async (name, message) => {
    const { api, callbacks } = fakeApi();
    const source = createTokenSource(container, 'site-key', async () => api);
    const pending = source.getToken();
    await vi.waitFor(() => expect(api.execute).toHaveBeenCalled());
    callbacks()[name]();
    await expect(pending).rejects.toThrow(message);
  });

  it('gives up after a minute with no answer', async () => {
    vi.useFakeTimers();
    const { api } = fakeApi();
    const source = createTokenSource(container, 'site-key', async () => api);
    const pending = source.getToken();
    const assertion = expect(pending).rejects.toThrow('turnstile_timeout');
    await vi.advanceTimersByTimeAsync(61_000);
    await assertion;
  });

  it('rejects when Cloudflare cannot be loaded', async () => {
    const source = createTokenSource(container, 'site-key', async () => {
      throw new Error('turnstile_unavailable');
    });
    await expect(source.getToken()).rejects.toThrow('turnstile_unavailable');
  });

  it('removes the widget and fails a pending request when destroyed', async () => {
    const { api } = fakeApi();
    const source = createTokenSource(container, 'site-key', async () => api);
    const pending = source.getToken();
    await vi.waitFor(() => expect(api.execute).toHaveBeenCalled());
    source.destroy();
    await expect(pending).rejects.toThrow('turnstile_destroyed');
    expect(api.remove).toHaveBeenCalledWith('widget-1');
  });
});
