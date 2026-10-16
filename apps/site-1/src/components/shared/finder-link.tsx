'use client';

import type { AnchorHTMLAttributes } from 'react';
import { usePlanFinder } from './plan-finder-provider';

/**
 * A "Find my plan" link that opens the global plan finder. Without JavaScript it falls back
 * to its href (the pre-arrival plan list).
 */
export function FinderLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const openFinder = usePlanFinder();
  return (
    <a
      {...props}
      onClick={(event) => {
        event.preventDefault();
        openFinder(event.currentTarget);
      }}
    />
  );
}
