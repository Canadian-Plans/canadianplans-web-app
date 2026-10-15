'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/shared/component-lab-client';
import { businessAssets, businessChrome } from '@content/business-internet';

export function BusinessNavigation() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <Navigation
      content={businessChrome}
      assets={businessAssets}
      brandHref="/"
      menuOpen={open}
      onMenuOpenChange={setOpen}
      onAction={() => {
        setOpen(false);
        document.getElementById('quote')?.scrollIntoView();
        document.getElementById('business-businessName')?.focus({ preventScroll: true });
      }}
      onContact={() => router.push('/contact#contact-options')}
    />
  );
}
