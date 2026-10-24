'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import type { LandingPlanCard } from '@content/landing-kit';
import { PlanCards } from './plan-cards';

export interface PlanTabGroup {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly cards: readonly LandingPlanCard[];
}

/**
 * A centred pill toggle over the plan cards: one tab per group (owner's reference,
 * 24 October 2026). Arrow keys move between tabs; the panel shows that group's cards.
 */
export function PlanTabs({ groups, label }: { groups: readonly PlanTabGroup[]; label: string }) {
  const [index, setIndex] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();
  const active = groups[index] ?? groups[0];
  if (!active) return null;

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, current: number) {
    const last = groups.length - 1;
    const next =
      event.key === 'ArrowRight'
        ? (current + 1) % groups.length
        : event.key === 'ArrowLeft'
          ? (current - 1 + groups.length) % groups.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    setIndex(next);
    tabs.current[next]?.focus();
  }

  return (
    <div className="cp-lp-plan-tabs">
      <div className="cp-lp-tabs" role="tablist" aria-label={label}>
        {groups.map((group, i) => (
          <button
            key={group.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${group.id}`}
            className="cp-lp-tab"
            aria-selected={i === index}
            aria-controls={`${base}-panel`}
            tabIndex={i === index ? 0 : -1}
            onClick={() => setIndex(i)}
            onKeyDown={(event) => onKeyDown(event, i)}
          >
            {group.title}
          </button>
        ))}
      </div>
      <div
        id={`${base}-panel`}
        role="tabpanel"
        aria-labelledby={`${base}-tab-${active.id}`}
        className="cp-lp-plan-tabpanel"
      >
        <p className="cp-lp-plan-tabs-note">{active.description}</p>
        <PlanCards cards={active.cards} label={active.title} />
      </div>
    </div>
  );
}
