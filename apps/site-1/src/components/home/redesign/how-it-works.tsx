'use client';

import { useState } from 'react';
import { CpButton } from '@canadian-plans/ui/canadian-plans';
import { homeRedesign } from '@content/home-redesign';

export function RedesignHowItWorks() {
  const how = homeRedesign.how;
  const [step, setStep] = useState(0);
  const current = how.steps[step];
  return (
    <section id="how-it-works" className="cp-rd-section cp-container" aria-labelledby="how-title">
      <div className="cp-rd-centered">
        <h2 id="how-title" className="cp-rd-display">
          {how.title}
        </h2>
        <p className="cp-rd-lead">{how.description}</p>
        <div className="cp-rd-actions-center">
          <CpButton asChild>
            <a href={how.primary.href}>{how.primary.label}</a>
          </CpButton>
          <CpButton asChild tone="outline-brand">
            <a href={how.secondary.href}>{how.secondary.label}</a>
          </CpButton>
        </div>
      </div>
      <div className="cp-rd-how">
        <ol className="cp-rd-how-list" aria-label={how.listLabel}>
          {how.steps.map((item, i) => (
            <li key={item.title}>
              <button
                type="button"
                className="cp-rd-how-step"
                aria-expanded={i === step}
                onClick={() => setStep(i)}
              >
                <span className="cp-rd-how-number">
                  <span>{how.stepLabel}</span>
                  <span>{i + 1}</span>
                </span>
                <span className="cp-rd-how-copy">
                  <span className="cp-rd-how-title">{item.title}</span>
                  {i === step ? <span className="cp-rd-how-body">{item.body}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className="cp-rd-photo cp-rd-how-photo" aria-live="polite">
          {current ? (
            <>
              <span className="cp-rd-how-photo-label">{current.photo}</span>
              <span className="cp-rd-how-overlay">{current.overlay}</span>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
