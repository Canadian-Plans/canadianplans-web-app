'use client';

import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@canadian-plans/ui';
import { chromeContent } from '@content/components';
import './plan-finder.css';

const FinderModal = dynamic(
  () => import('./plan-finder-modal').then((module) => module.PlanFinderModal),
  { ssr: false },
);
const Context = createContext<((trigger?: HTMLElement | null) => void) | null>(null);
export function usePlanFinder() {
  const open = useContext(Context);
  if (!open) throw new Error('Global plan finder provider missing');
  return open;
}
/** Like usePlanFinder, but null when no provider is mounted (links then follow their href). */
export function useOptionalPlanFinder() {
  return useContext(Context);
}

export function PlanFinderProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  function launch(element?: HTMLElement | null) {
    trigger.current =
      element ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setOpen(true);
  }
  return (
    <Context value={launch}>
      {children}
      {open ? (
        <FinderModal
          onClose={() => setOpen(false)}
          onReturnFocus={() => trigger.current?.focus()}
        />
      ) : null}
    </Context>
  );
}
export function PlanFinderTrigger() {
  const open = usePlanFinder();
  return (
    <Button variant="outline" onClick={(event) => open(event.currentTarget)}>
      {chromeContent.finderLabel}
    </Button>
  );
}
