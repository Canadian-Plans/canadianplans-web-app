'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackingChrome, trackingAssets, trackingCopy } from '@content/track-order';
import { Navigation } from '@/components/shared/component-lab-client';
export function TrackingNavigation() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <Navigation
      content={trackingChrome}
      assets={trackingAssets}
      brandHref={trackingCopy.destinations.home}
      menuOpen={open}
      onMenuOpenChange={setOpen}
      onAction={() => router.push(trackingCopy.destinations.plans)}
      onContact={() => router.push(trackingCopy.destinations.contact)}
    />
  );
}
