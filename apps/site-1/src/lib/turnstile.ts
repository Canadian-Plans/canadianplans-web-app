/**
 * Browser side of the backend's bot check. The backend requires a fresh,
 * single-use Cloudflare Turnstile token (action `lead-submit`) on every call that
 * writes, so the form asks for one right before each such call. The widget runs
 * in `execute` mode and only shows a challenge when Cloudflare needs one.
 */

export const TURNSTILE_ACTION = 'lead-submit';
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const TOKEN_TIMEOUT_MS = 60_000;

export interface TurnstileRenderOptions {
  sitekey: string;
  action: string;
  execution: 'execute';
  appearance: 'interaction-only';
  callback: (token: string) => void;
  'error-callback': () => void;
  'expired-callback': () => void;
  'timeout-callback': () => void;
}

export interface TurnstileApi {
  /** `container` is an element or a CSS selector, as Cloudflare accepts both. */
  render: (container: HTMLElement | string, options: TurnstileRenderOptions) => string;
  execute: (widgetId: string) => void;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** The public site key, or undefined when the bot check is not configured. */
export function turnstileSiteKey(): string | undefined {
  const key = process.env['NEXT_PUBLIC_TURNSTILE_SITE_KEY']?.trim();
  return key ? key : undefined;
}

let scriptPromise: Promise<TurnstileApi> | undefined;

/** Loads Cloudflare's script once and resolves with its API. */
export function loadTurnstile(): Promise<TurnstileApi> {
  if (typeof window === 'undefined') return Promise.reject(new Error('turnstile_unavailable'));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile_unavailable'));
    script.onerror = () => {
      scriptPromise = undefined;
      reject(new Error('turnstile_unavailable'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * One reusable widget in `container`. `getToken()` runs a fresh check and
 * resolves with its token; each token works once, so call it before every write.
 * It resolves `undefined` when no site key is configured, and rejects when the
 * check fails or times out, so the caller can tell the visitor to try again.
 */
export function createTokenSource(
  container: HTMLElement | string,
  siteKey: string,
  load: () => Promise<TurnstileApi> = loadTurnstile,
): { getToken: () => Promise<string>; destroy: () => void } {
  let widgetId: string | undefined;
  let api: TurnstileApi | undefined;
  let pending: { resolve: (token: string) => void; reject: (error: Error) => void } | undefined;

  const settle = (result: { token: string } | { error: Error }) => {
    const current = pending;
    pending = undefined;
    if (!current) return;
    if ('token' in result) current.resolve(result.token);
    else current.reject(result.error);
  };

  async function ensureWidget(): Promise<{ api: TurnstileApi; id: string }> {
    api ??= await load();
    if (widgetId === undefined) {
      widgetId = api.render(container, {
        sitekey: siteKey,
        action: TURNSTILE_ACTION,
        execution: 'execute',
        appearance: 'interaction-only',
        callback: (token) => settle({ token }),
        'error-callback': () => settle({ error: new Error('turnstile_failed') }),
        'expired-callback': () => settle({ error: new Error('turnstile_expired') }),
        'timeout-callback': () => settle({ error: new Error('turnstile_timeout') }),
      });
    }
    return { api, id: widgetId };
  }

  return {
    async getToken() {
      const { api: ready, id } = await ensureWidget();
      // A new request replaces any unfinished one; its token would be stale anyway.
      settle({ error: new Error('turnstile_superseded') });
      ready.reset(id);
      return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(
          () => settle({ error: new Error('turnstile_timeout') }),
          TOKEN_TIMEOUT_MS,
        );
        pending = {
          resolve: (token) => {
            clearTimeout(timer);
            resolve(token);
          },
          reject: (error) => {
            clearTimeout(timer);
            reject(error);
          },
        };
        ready.execute(id);
      });
    },
    destroy() {
      settle({ error: new Error('turnstile_destroyed') });
      if (api && widgetId !== undefined) api.remove(widgetId);
      widgetId = undefined;
    },
  };
}
