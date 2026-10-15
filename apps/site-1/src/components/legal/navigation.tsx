'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/shared/component-lab-client';
import { legalAssets, legalChrome } from '@content/legal';
export function LegalNavigation() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <Navigation
      content={legalChrome}
      assets={legalAssets}
      brandHref="/"
      menuOpen={open}
      onMenuOpenChange={setOpen}
      onAction={() => router.push('/pre-arrival-sim#plans')}
      onContact={() => router.push('/contact#contact-options')}
    />
  );
}
