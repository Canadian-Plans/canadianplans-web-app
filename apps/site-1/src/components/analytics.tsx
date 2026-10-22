'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { siteConfig } from '../site.config';
import { useCookieConsent } from './shared/cookie-consent';
import { hasAnalyticsConsent } from '@/lib/cookie-consent';

/**
 * Umami integration (T20, REQ 35). Page views are the only client-side event
 * tracked here; `plan_selected` lives in `../lib/analytics` and the lead/order
 * conversion events are emitted once by the backend outbox, so nothing is
 * counted twice. The script is loaded with search and hash excluded and
 * auto-track disabled, so a page view never carries a raw URL or query
 * parameters.
 */

/** Editor and design-preview routes are never measured (README: Studio has no analytics). */
function isUntrackedPath(pathname: string): boolean {
  return pathname === '/studio' || pathname.startsWith('/studio/') || pathname.startsWith('/dev/');
}

export function Analytics() {
  const { scriptUrl, websiteId } = siteConfig.analytics;
  const pathname = usePathname();
  const analyticsAllowed = (useCookieConsent()?.analytics ?? false) && !isUntrackedPath(pathname);
  const [ready, setReady] = useState(false);
  const lastTracked = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!analyticsAllowed) {
      lastTracked.current = undefined;
      return;
    }
    if (!ready || !window.umami || !hasAnalyticsConsent()) return;
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;
    // Defensive: a stubbed/partial umami global (e.g. a test double, or a
    // script that hasn't finished self-initializing) may expose `window.umami`
    // without a callable `track`. An uncaught throw here, inside an effect that
    // runs on every page via the shared layout, takes down the whole client
    // render tree — never let a third-party script shape crash the app.
    window.umami.track?.();
  }, [ready, pathname, analyticsAllowed]);

  if (!scriptUrl || !websiteId || !analyticsAllowed) return null;

  return (
    <Script
      id="umami"
      src={scriptUrl}
      strategy="afterInteractive"
      data-website-id={websiteId}
      data-exclude-search="true"
      data-exclude-hash="true"
      data-do-not-track="true"
      data-auto-track="false"
      onReady={() => setReady(true)}
    />
  );
}
