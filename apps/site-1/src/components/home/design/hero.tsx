'use client';

import { useId, useState } from 'react';
import { usePlanFinder } from '@/components/shared/plan-finder-provider';
import { homeRedesign } from '@content/home-redesign';

type Audience = keyof typeof homeRedesign.hero.audiences;
/** Slide order: the export opens on residents; the carousel and tabs move together. */
const slides = ['resident', 'newcomer'] as const satisfies readonly Audience[];

/** Final homepage hero: audience tabs, plan finder, photo card and a two-slide carousel. */
export function HomeHero() {
  const h = homeRedesign.hero;
  const [index, setIndex] = useState(0);
  const audience = slides[index] ?? 'resident';
  const a = h.audiences[audience];
  const openFinder = usePlanFinder();
  const needId = useId();
  const fieldId = useId();
  const step = (delta: number) => setIndex((i) => (i + delta + slides.length) % slides.length);
  return (
    <section className="cp-hd-section cp-hd-hero" aria-labelledby="home-title">
      <div className="cp-hd-hero-card" data-audience={audience}>
        <div className="cp-hd-hero-copy">
          <div className="cp-hd-tabs" role="group" aria-label={h.toggleLabel}>
            {slides.map((key, i) => (
              <button
                key={key}
                type="button"
                className="cp-hd-tab"
                aria-pressed={i === index}
                onClick={() => setIndex(i)}
              >
                {h.audiences[key].tab}
              </button>
            ))}
          </div>
          <p className="cp-hd-hero-dealer">{a.eyebrow}</p>
          <h1 id="home-title" className="cp-hd-h cp-hd-hero-title">
            {a.title}
          </h1>
          <p className="cp-hd-hero-lead">{a.description}</p>
          <div className="cp-hd-hero-price">
            <strong>{a.price}</strong>
            {a.chips.map((chip) => (
              <span key={chip} className="cp-hd-chip">
                {chip}
              </span>
            ))}
          </div>
          <form
            className="cp-hd-finder"
            onSubmit={(event) => {
              event.preventDefault();
              openFinder();
            }}
          >
            <label className="cp-hd-field cp-hd-field-need" htmlFor={needId}>
              {h.needLabel}
              <select id={needId}>
                {a.needs.map((need) => (
                  <option key={need}>{need}</option>
                ))}
              </select>
            </label>
            <label className="cp-hd-field cp-hd-field-detail" htmlFor={fieldId}>
              {a.fieldLabel}
              <input id={fieldId} type="text" placeholder={a.fieldHint} />
            </label>
            <button type="submit" className="cp-hd-btn cp-hd-btn-ink cp-hd-finder-submit">
              {a.cta}
            </button>
          </form>
          <div className="cp-hd-hero-trust">
            {h.assurances.map((item) => (
              <span key={item}>
                <span className="cp-hd-tick" aria-hidden="true">
                  ✓
                </span>{' '}
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="cp-hd-hero-visual" aria-hidden="true">
          <div className="cp-hd-photo cp-hd-hero-photo">{a.photo}</div>
          <div className="cp-hd-hero-badge">
            <span>{a.badgeTop}</span>
            <strong className="cp-hd-num">{a.badgePrice}</strong>
            <span>{h.badgeSuffix}</span>
          </div>
          <span className="cp-hd-hero-sticker">{h.sticker}</span>
          <div className="cp-hd-plan">
            <div className="cp-hd-plan-head">
              <span>{h.plan.label}</span>
              <span className="cp-hd-plan-status">{h.plan.status}</span>
            </div>
            <strong className="cp-hd-h">{h.plan.title}</strong>
            <span>{h.plan.renewal}</span>
            <span className="cp-hd-usage">
              <span />
            </span>
            <span className="cp-hd-plan-usage">{h.plan.usage}</span>
          </div>
        </div>
      </div>
      <div className="cp-hd-carousel">
        <button type="button" aria-label={h.carousel.previous} onClick={() => step(-1)}>
          ‹
        </button>
        {slides.map((key, i) => (
          <button
            key={key}
            type="button"
            className="cp-hd-dot"
            aria-label={`${h.carousel.slide} ${i + 1}: ${h.audiences[key].tab}`}
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
          />
        ))}
        <button type="button" aria-label={h.carousel.next} onClick={() => step(1)}>
          ›
        </button>
      </div>
    </section>
  );
}
