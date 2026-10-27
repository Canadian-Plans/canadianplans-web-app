import type { ReactNode } from 'react';

/**
 * Padding for screens that keep their pre-CRM card layout inside the new frame.
 * Each screen drops it when it moves to the CRM layout (roadmap Phase 6).
 */
export function PageBody({ children }: { children: ReactNode }) {
  return <div className="flex-1 p-6">{children}</div>;
}
