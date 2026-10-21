'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WebsiteBotAction } from '@canadian-plans/contracts';
import { verificationContent as copy } from '@content/verification';

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action: WebsiteBotAction;
      execution: 'execute';
      appearance: 'interaction-only';
      size: 'compact';
      callback(token: string): void;
      'error-callback'(): void;
      'expired-callback'(): void;
      'timeout-callback'(): void;
    },
  ): string;
  execute(widgetId: string): void;
  remove(widgetId: string): void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}
let scriptPromise: Promise<TurnstileApi> | undefined;
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    const failed = () => {
      clearTimeout(timer);
      script.remove();
      reject(new Error('verification_unavailable'));
    };
    const timer = setTimeout(failed, 15000);
    script.onerror = failed;
    script.onload = () => {
      clearTimeout(timer);
      if (window.turnstile) resolve(window.turnstile);
      else failed();
    };
    document.head.append(script);
  }).catch((error: unknown) => {
    scriptPromise = undefined;
    throw error;
  });
  return scriptPromise;
}

export interface VerificationFailure {
  ok: false;
  code: 'verification_failed';
  message: string;
  fieldErrors?: never;
}

/** A token belongs to one request. A retry creates a new widget/proof. No token caching. */
export function useHumanChallenge() {
  const container = useRef<HTMLDivElement>(null);
  const cancel = useRef<(() => void) | undefined>(undefined);
  const mounted = useRef(true);
  const [verifying, setVerifying] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancel.current?.();
    };
  }, []);
  const getToken = useCallback((action: WebsiteBotAction): Promise<string> => {
    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const host = container.current;
    if (!sitekey || !host || cancel.current)
      return Promise.reject(new Error('verification_unavailable'));
    setVerifying(true);
    return new Promise<string>((resolve, reject) => {
      let settled = false;
      let widgetId: string | undefined;
      let api: TurnstileApi | undefined;
      function finish(token?: string) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          if (widgetId) api?.remove(widgetId);
        } catch {
          /* Teardown must not prevent local settlement. */
        }
        cancel.current = undefined;
        if (mounted.current) setVerifying(false);
        if (token && token.length <= 2048) resolve(token);
        else reject(new Error('verification_failed'));
      }
      const timer = setTimeout(() => finish(), 90000);
      cancel.current = () => finish();
      void loadTurnstile()
        .then((loaded) => {
          if (settled) return;
          api = loaded;
          widgetId = api.render(host, {
            sitekey,
            action,
            execution: 'execute',
            appearance: 'interaction-only',
            size: 'compact',
            callback: (token) => finish(token),
            'error-callback': () => finish(),
            'expired-callback': () => finish(),
            'timeout-callback': () => finish(),
          });
          if (settled) api.remove(widgetId);
          else api.execute(widgetId);
        })
        .catch(() => finish());
    });
  }, []);
  const run = useCallback(
    async <T,>(
      action: WebsiteBotAction,
      request: (token: string) => Promise<T>,
    ): Promise<T | VerificationFailure> => {
      try {
        return await request(await getToken(action));
      } catch {
        return { ok: false, code: 'verification_failed', message: copy.failed };
      }
    },
    [getToken],
  );
  const challenge = (
    <div className="space-y-2" aria-live="polite">
      {verifying ? <p className="text-sm">{copy.checking}</p> : null}
      <div ref={container} role="group" aria-label={copy.label} data-testid="human-challenge" />
      {verifying ? (
        <button type="button" className="text-sm underline" onClick={() => cancel.current?.()}>
          {copy.cancel}
        </button>
      ) : null}
    </div>
  );
  return { run, challenge };
}
