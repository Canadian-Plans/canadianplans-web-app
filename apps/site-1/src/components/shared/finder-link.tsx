'use client';

import type { AnchorHTMLAttributes } from 'react';
import { useOptionalPlanFinder } from './plan-finder-provider';

/**
 * A "Find my plan" link that opens the global plan finder. Without JavaScript it falls back
 * to its href (the pre-arrival plan list), as it does where no finder provider is mounted.
 */
export function FinderLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const openFinder = useOptionalPlanFinder();
  return (
    <a
      {...props}
      onClick={(event) => {
        if (!openFinder) return;
        event.preventDefault();
        openFinder(event.currentTarget);
      }}
    />
  );
}
