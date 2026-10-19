'use client';

import { useId, useState } from 'react';
import { homeRedesign, homeRedesignFaq } from '@content/home-redesign';

/** "Questions, answered" — help card beside a one-open-at-a-time accordion. */
export function HomeFaq() {
  const f = homeRedesign.faq;
  const [open, setOpen] = useState<string | null>(homeRedesignFaq[0]?.id ?? null);
  const base = useId();
  return (
    <section className="cp-hd-section cp-hd-faq" id="faq" aria-labelledby="faq-title">
      <div className="cp-hd-inner cp-hd-faq-layout">
        <div className="cp-hd-faq-intro">
          <p className="cp-hd-eyebrow">{f.eyebrow}</p>
          <h2 id="faq-title" className="cp-hd-h cp-hd-section-title">
            {f.title}
          </h2>
          <p className="cp-hd-faq-lead">{f.description}</p>
          <div className="cp-hd-faq-help">
            <strong>{f.helpTitle}</strong>
            <span>{f.helpBody}</span>
            <a className="cp-hd-pill-btn cp-hd-pill-brand" href={f.helpAction.href}>
              {f.helpAction.label}
            </a>
          </div>
        </div>
        <div className="cp-hd-faq-list">
          {homeRedesignFaq.map((item) => {
            const isOpen = open === item.id;
            const panelId = `${base}-${item.id}`;
            return (
              <div key={item.id} className="cp-hd-faq-item">
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : item.id)}
                  >
                    <span>{item.question}</span>
                    <span className="cp-hd-faq-toggle" aria-hidden="true">
                      {f.symbols.expand}
                    </span>
                  </button>
                </h3>
                <p id={panelId} hidden={!isOpen}>
                  {item.answer}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
