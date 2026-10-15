'use client';

import { useId, useState } from 'react';
import { CpButton } from '@canadian-plans/ui/canadian-plans';
import { usePlanFinder } from '@/components/shared/plan-finder-provider';
import { homeRedesign } from '@content/home-redesign';

type Audience = keyof typeof homeRedesign.hero.audiences;
const audienceOrder = ['resident', 'newcomer'] as const satisfies readonly Audience[];

/** Hero with resident / newcomer toggle. The finder hands off to the existing plan finder. */
export function RedesignHero() {
  const h = homeRedesign.hero;
  const [audience, setAudience] = useState<Audience>('newcomer');
  const a = h.audiences[audience];
  const openFinder = usePlanFinder();
  const needId = useId();
  const fieldId = useId();
  return (
    <section className="cp-rd-hero cp-container" aria-labelledby="home-title">
      <div className="cp-rd-hero-card">
        <div className="cp-rd-hero-copy">
          <div className="cp-rd-toggle" role="group" aria-label={h.toggleLabel}>
            {audienceOrder.map((key) => (
              <button
                key={key}
                type="button"
                className="cp-rd-toggle-option"
                aria-pressed={audience === key}
                onClick={() => setAudience(key)}
              >
                {h.audiences[key].tab}
              </button>
            ))}
          </div>
          <p className="cp-rd-eyebrow">{a.eyebrow}</p>
          <h1 id="home-title" className="cp-rd-hero-title">
            {a.title}
          </h1>
          <p className="cp-rd-hero-description">{a.description}</p>
          <div className="cp-rd-hero-price">
            <strong>{a.price}</strong>
            {a.chips.map((chip) => (
              <span key={chip} className="cp-rd-chip-mint">
                {chip}
              </span>
            ))}
          </div>
          <form
            className="cp-rd-finder"
            onSubmit={(event) => {
              event.preventDefault();
              openFinder();
            }}
          >
            <div className="cp-rd-finder-field">
              <label htmlFor={needId}>{h.needLabel}</label>
              <select id={needId}>
                {a.needs.map((need) => (
                  <option key={need}>{need}</option>
                ))}
              </select>
            </div>
            <div className="cp-rd-finder-field cp-rd-finder-divider">
              <label htmlFor={fieldId}>{a.fieldLabel}</label>
              <input id={fieldId} placeholder={a.fieldHint} />
            </div>
            <CpButton type="submit" tone="ink" scale="large" className="cp-rd-finder-submit">
              {a.cta}
            </CpButton>
          </form>
          <div className="cp-rd-hero-trust">
            <span>{h.rating}</span>
            {h.assurances.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
        <div className="cp-rd-hero-visual" aria-hidden="true">
          <div className="cp-rd-photo cp-rd-hero-photo">{a.photo}</div>
          <div className="cp-rd-hero-badge">
            <span>{a.badgeTop}</span>
            <strong>{a.badgePrice}</strong>
            <span>{h.badgeSuffix}</span>
          </div>
          <span className="cp-rd-hero-sticker">{h.sticker}</span>
          <div className="cp-rd-plan-card">
            <div className="cp-rd-plan-card-head">
              <span>{h.plan.label}</span>
              <span className="cp-rd-plan-status">{h.plan.status}</span>
            </div>
            <strong>{h.plan.title}</strong>
            <span>{h.plan.renewal}</span>
            <span className="cp-rd-usage">
              <span />
            </span>
            <span className="cp-rd-plan-usage">{h.plan.usage}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
