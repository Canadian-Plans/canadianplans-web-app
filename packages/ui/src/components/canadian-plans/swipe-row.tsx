'use client';

import { Children, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Horizontal snap carousel on narrow screens, normal grid above the breakpoint.
 * The scroll region is self-contained (no document overflow) and keyboard focusable.
 */
export function CpSwipeRow({
  label,
  hint,
  children,
}: {
  label: string;
  /** e.g. "Swipe to see all"; shown only on narrow screens. */
  hint?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const count = Children.count(children);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const first = el.firstElementChild;
      if (!(first instanceof HTMLElement)) return;
      const step =
        first.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap || '0');
      setActive(Math.max(0, Math.min(count - 1, Math.round(el.scrollLeft / step))));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [count]);

  return (
    <div className="cp-swipe">
      <div ref={ref} className="cp-swipe-track" role="region" aria-label={label} tabIndex={0}>
        {children}
      </div>
      <div className="cp-swipe-hint" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <span key={i} className="cp-swipe-dot" data-active={i === active} />
        ))}
        {hint ? <span className="cp-swipe-hint-label">{hint}</span> : null}
      </div>
    </div>
  );
}
