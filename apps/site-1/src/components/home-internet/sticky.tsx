'use client';

import { CpStickyCta } from '@canadian-plans/ui/canadian-plans';
import { internetLandingShared } from '@content/home-internet-landing';

/** Phone-only sticky bar that appears once the plans block has scrolled out of view. */
export function InternetStickyCta({ title, detail }: { title: string; detail: string }) {
  return (
    <aside className="cp-hi-sticky" aria-label={title}>
      <CpStickyCta
        content={{ title, detail, button: internetLandingShared.stickyButton }}
        floating
        anchorId="plans"
        onAction={() => {
          document.getElementById('plans')?.scrollIntoView({ block: 'start' });
          window.location.hash = 'plans';
        }}
      />
    </aside>
  );
}
