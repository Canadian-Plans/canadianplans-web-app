'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { aboutAssets, aboutChrome, aboutCopy } from '@content/about';
import { Navigation } from '@/components/shared/component-lab-client';

export function AboutNavigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  return (
    <Navigation
      content={aboutChrome}
      assets={aboutAssets}
      brandHref="/"
      menuOpen={menuOpen}
      onMenuOpenChange={setMenuOpen}
      onAction={() => router.push(aboutCopy.destinations.advisor)}
      onContact={() => router.push(aboutCopy.destinations.whatsapp)}
    />
  );
}
