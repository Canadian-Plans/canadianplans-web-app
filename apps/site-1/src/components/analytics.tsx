import Script from 'next/script';
import { siteConfig } from '../site.config';

export function Analytics() {
  const { scriptUrl, websiteId } = siteConfig.analytics;
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
    />
  );
}
