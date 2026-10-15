'use client';

import { useEffect, useRef, useState } from 'react';

export interface ExplorerNavItem {
  readonly id: string;
  readonly label: string;
}

/** Sticky category nav with scroll-spy; becomes a swipeable chip row on narrow screens. */
export function ExplorerNav({ items, label }: { items: readonly ExplorerNavItem[]; label: string }) {
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
      nav.scrollTo({ left: chip.offsetLeft - nav.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' });
    }
  }, [active]);

  return (
    <nav ref={navRef} className="cp-rd-catnav" aria-label={label}>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          data-target={item.id}
          className="cp-rd-catlink"
          aria-current={active === item.id ? 'true' : undefined}
          onClick={(event) => {
            event.preventDefault();
            document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            lockUntil.current = Date.now() + 900;
            setActive(item.id);
          }}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
