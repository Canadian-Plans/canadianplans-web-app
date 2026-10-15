'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { systemAssets, systemChrome } from '@content/system';
import { Navigation } from '@/components/shared/component-lab-client';
export function SystemNavigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  return (
    <Navigation
      content={systemChrome}
      assets={systemAssets}
      brandHref="/"
      menuOpen={menuOpen}
      onMenuOpenChange={setMenuOpen}
      onAction={() => router.push('/contact')}
      onContact={() => router.push('/contact#contact-options')}
    />
  );
}
