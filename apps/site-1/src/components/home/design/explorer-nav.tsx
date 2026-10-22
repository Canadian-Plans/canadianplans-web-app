'use client';

import { useEffect, useRef, useState } from 'react';

export interface HomeExplorerNavItem {
  readonly id: string;
  readonly label: string;
}

/**
 * Sticky category nav with scroll-spy (final homepage design). The active link gets the
 * "→" marker; below 900px it becomes a sticky, swipeable chip row.
 */

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function HomeExplorerNav({
  items,
  label,
}: {
  items: readonly HomeExplorerNavItem[];
  label: string;
}) {
  const [active, setActive] = useState(items[0]?.id ?? '');
  const lockUntil = useRef(0);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < lockUntil.current) return;
        const hit = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: 0 },
    );
    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    const nav = navRef.current;
    const chip = nav?.querySelector<HTMLElement>(`[data-target="${active}"]`);
    if (nav && chip && nav.scrollWidth > nav.clientWidth) {
      nav.scrollTo({
        left: chip.offsetLeft - nav.clientWidth / 2 + chip.clientWidth / 2,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }
  }, [active]);

  return (
    <nav ref={navRef} className="cp-hd-catnav" aria-label={label}>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          data-target={item.id}
          className="cp-hd-catlink"
          aria-current={active === item.id ? 'true' : undefined}
          onClick={(event) => {
            event.preventDefault();
            const section = document.getElementById(item.id);
            section?.scrollIntoView({
              behavior: prefersReducedMotion() ? 'auto' : 'smooth',
              block: 'start',
            });
            // Keyboard and screen-reader users land in the section they chose,
            // and the URL reflects it, as a normal in-page link would.
            section?.focus({ preventScroll: true });
            history.replaceState(null, '', `#${item.id}`);
            lockUntil.current = Date.now() + 900;
            setActive(item.id);
          }}
        >
          <span className="cp-hd-catlink-arrow" aria-hidden="true">
            →{' '}
          </span>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
