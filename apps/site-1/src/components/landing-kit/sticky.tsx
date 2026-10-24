'use client';

import { CpStickyCta } from '@canadian-plans/ui/canadian-plans';

/** Phone-only sticky bar that appears once the plans block has scrolled out of view. */
export function LandingStickyCta({
  title,
  detail,
  button,
}: {
  title: string;
  detail: string;
  button: string;
}) {
  return (
    <aside className="cp-lp-sticky" aria-label={title}>
      <CpStickyCta
        content={{ title, detail, button }}
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
