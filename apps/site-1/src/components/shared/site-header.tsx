'use client';

import { useState } from 'react';
import type { ChromeContent } from '@content/components';
import { componentAssets } from '@content/components';
import { Navigation } from './component-lab-client';
import { PromoStrip, UtilityBar } from './chrome';

/**
 * Site-wide header for redesigned pages (15 October 2026): utility bar, navigation and
 * promo strip from one content source. The chat button goes to the contact page.
 */
export function SiteHeader({
  content,
  planHref,
  chatHref = content.contact.href,
  promo = true,
}: {
  content: ChromeContent;
  planHref: string;
  /** Where the mobile chat button goes; the contact page points it at its own options. */
  chatHref?: string;
  /** The home page has no promo strip (final homepage design, 16 October 2026). */
  promo?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <UtilityBar content={content} assets={componentAssets} planHref={planHref} />
      <Navigation
        content={content}
        assets={componentAssets}
        brandHref="/"
        menuOpen={menuOpen}
        onMenuOpenChange={setMenuOpen}
        onAction={() => {
          setMenuOpen(false);
          window.location.assign(planHref);
        }}
        onContact={() => window.location.assign(chatHref)}
      />
      {promo ? <PromoStrip content={content} /> : null}
    </>
  );
}
