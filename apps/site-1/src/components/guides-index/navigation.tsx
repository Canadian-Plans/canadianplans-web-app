'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CpButton } from '@canadian-plans/ui/canadian-plans';
import { guideCopy, guidesIndexAssets, guidesIndexChrome, guidesIndexCopy } from '@content/guides';
import { Navigation } from '@/components/shared/component-lab-client';
import { usePlanFinder } from '@/components/shared/plan-finder-provider';

export function GuidesIndexNavigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  return (
    <Navigation
      content={guidesIndexChrome}
      assets={guidesIndexAssets}
      brandHref="/"
      menuOpen={menuOpen}
      onMenuOpenChange={setMenuOpen}
      onAction={() => router.push(guideCopy.destinations.advisor)}
      onContact={() => router.push(guideCopy.destinations.contact)}
    />
  );
}
export function GuidesIndexFinderButton() {
  const open = usePlanFinder();
  return (
    <CpButton tone="sun" scale="large" onClick={(event) => open(event.currentTarget)}>
      {guidesIndexCopy.final.primary}
    </CpButton>
  );
}
