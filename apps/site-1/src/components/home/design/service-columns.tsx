'use client';

import { useRef, useState } from 'react';
import { categoryHrefs, homeRedesign } from '@content/home-redesign';
import { HomeArt } from './art';

/** Four price columns; a snap-scrolling card row with a dot indicator on phones. */
export function HomeServiceColumns() {
  const c = homeRedesign.columns;
  const grid = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  function onScroll() {
    const el = grid.current;
    const first = el?.firstElementChild;
    if (!el || !first) return;
    const width = first.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const next = Math.round(el.scrollLeft / (width + gap));
    setActive(Math.max(0, Math.min(c.items.length - 1, next)));
  }
  return (
    <section className="cp-hd-section cp-hd-columns" aria-label={c.label}>
      <div className="cp-hd-inner">
        <ul ref={grid} className="cp-hd-columns-grid" onScroll={onScroll}>
          {c.items.map((item) => (
            <li key={item.key} className="cp-hd-column" data-category={item.key}>
              <span className="cp-hd-column-icon">
                <HomeArt name={item.icon} />
              </span>
              <h3>{item.title}</h3>
              <div className="cp-hd-column-price">
                {'quote' in item ? (
                  <span className="cp-hd-column-amount">
                    <span className="cp-hd-column-dollars">{item.quote}</span>
                  </span>
                ) : (
                  <>
                    <span className="cp-hd-column-from">{c.from}</span>
                    <span className="cp-hd-column-amount">
                      <span className="cp-hd-column-currency">{c.currency}</span>
                      <span className="cp-hd-column-dollars">{item.dollars}</span>
                      <span className="cp-hd-column-cents">
                        <span>{item.cents}</span>
                        <span>{c.period}</span>
                      </span>
                    </span>
                  </>
                )}
              </div>
              <ul className="cp-hd-ticks">
                {item.features.map((feature) => (
                  <li key={feature}>
                    <span aria-hidden="true">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <a className="cp-hd-outline-pill" href={categoryHrefs[item.key]}>
                {c.action}
              </a>
            </li>
          ))}
        </ul>
        <div className="cp-hd-swipehint" aria-hidden="true">
          {c.items.map((item, i) => (
            <span key={item.key} className="cp-hd-swipedot" data-active={i === active} />
          ))}
          <span>{c.hint}</span>
        </div>
      </div>
    </section>
  );
}
