'use client';

import { useState } from 'react';
import { homeRedesign } from '@content/home-redesign';
import { FinderLink } from '@/components/shared/finder-link';

/** "Getting connected is easy" — three expandable steps beside a photo with an overlay. */
export function HomeHowItWorks() {
  const how = homeRedesign.how;
  const [step, setStep] = useState(0);
  const current = how.steps[step];
  return (
    <section className="cp-hd-section cp-hd-how" id="how-it-works" aria-labelledby="how-title">
      <div className="cp-hd-inner">
        <div className="cp-hd-how-head">
          <h2 id="how-title" className="cp-hd-how-title">
            {how.title}
          </h2>
          <p>{how.description}</p>
          <div className="cp-hd-how-actions">
            <FinderLink className="cp-hd-pill-btn cp-hd-pill-brand" href={how.primary.href}>
              {how.primary.label}
            </FinderLink>
            <a className="cp-hd-pill-btn cp-hd-pill-outline" href={how.secondary.href}>
              {how.secondary.label}
            </a>
          </div>
        </div>
        <div className="cp-hd-how-body">
          <ol className="cp-hd-how-list" aria-label={how.listLabel}>
            {how.steps.map((item, i) => (
              <li key={item.title}>
                <button
                  type="button"
                  className="cp-hd-how-step"
                  aria-expanded={i === step}
                  onClick={() => setStep(i)}
                >
                  <span className="cp-hd-how-number">
                    <span>{how.stepLabel}</span>
                    <span>{i + 1}</span>
                  </span>
                  <span className="cp-hd-how-text">
                    <span className="cp-hd-how-step-title">{item.title}</span>
                    {i === step ? <span className="cp-hd-how-step-body">{item.body}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="cp-hd-photo cp-hd-how-media" aria-hidden="true">
            <span className="cp-hd-how-caption">{current?.photo}</span>
            <span className="cp-hd-how-overlay">{current?.overlay}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
