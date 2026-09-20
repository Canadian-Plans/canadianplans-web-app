'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { siteConfig } from '../site.config';

/**
 * Umami integration (T20, REQ 35). Page views are the only client-side event
 * tracked here; `plan_selected` lives in `../lib/analytics` and the lead/order
 * conversion events are emitted once by the backend outbox, so nothing is
 * counted twice. The script is loaded with search and hash excluded and
 * auto-track disabled, so a page view never carries a raw URL or query
 * parameters.
 */

export function Analytics() {
  const { scriptUrl, websiteId } = siteConfig.analytics;
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const lastTracked = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!ready || !window.umami) return;
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;
    window.umami.track();
  }, [ready, pathname]);

  if (!scriptUrl || !websiteId) return null;

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
