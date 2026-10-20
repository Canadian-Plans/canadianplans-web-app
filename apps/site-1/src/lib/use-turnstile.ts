'use client';

import { useCallback, useEffect, useRef } from 'react';

import { createTokenSource, turnstileSiteKey } from './turnstile';

/**
 * Gives a form a way to get a fresh bot-check token before each call that
 * writes. Attach `containerRef` to an empty element near the form; Cloudflare
 * draws a challenge there only when it needs to. Without a configured site key
 * `getToken` resolves `undefined`, and the backend decides whether to admit the
 * call.
 */
export function useTurnstile() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<ReturnType<typeof createTokenSource> | undefined>(undefined);

  useEffect(
    () => () => {
      sourceRef.current?.destroy();
      sourceRef.current = undefined;
    },
    [],
  );

  const getToken = useCallback(async (): Promise<string | undefined> => {
    const siteKey = turnstileSiteKey();
    const container = containerRef.current;
    if (!siteKey || !container) return undefined;
    sourceRef.current ??= createTokenSource(container, siteKey);
    return sourceRef.current.getToken();
  }, []);

  return { containerRef, getToken };
}
