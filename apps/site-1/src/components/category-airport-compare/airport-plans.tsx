'use client';

import { useState } from 'react';
import type { airportCopy } from '@content/category-airport-compare';

type Plan = (typeof airportCopy.plans.plans)[number];

export function AirportPlans({
  plans,
  labels,
}: {
  plans: readonly Plan[];
  labels: typeof airportCopy.plans;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = plans.find((plan) => plan.id === selectedId);
  return (
    <>
      <div className="cp-catac-airport-plan-list" aria-label={labels.featuresLabel}>
        {plans.map((plan) => (
          <article
            className="cp-catac-airport-plan"
            data-selected={selectedId === plan.id}
            data-featured={plan.badge ? 'true' : undefined}
            data-mobile-rank={plan.mobileRank}
            key={plan.id}
          >
            <label className="cp-catac-airport-plan-select">
              <input
                type="radio"
                name="airport-plan"
                value={plan.id}
                checked={selectedId === plan.id}
                onChange={() => setSelectedId(plan.id)}
                aria-label={`${labels.choose}: ${plan.carrier}, ${plan.allowance}, ${plan.amount}${plan.period}`}
              />
              <span aria-hidden="true" className="cp-catac-airport-radio" />
              <span className="cp-catac-airport-plan-carrier">{plan.carrier}</span>
              <span className="cp-catac-airport-plan-data">{plan.allowance}</span>
              <span className="cp-catac-airport-plan-good">
                <span>{plan.goodForLabel}</span>
                {plan.goodFor}
              </span>
              <span className="cp-catac-airport-plan-features">{plan.features}</span>
              <span className="cp-catac-airport-plan-price">
                <strong>{plan.amount}</strong>
                <span>{plan.period}</span>
                {plan.previous ? <small>{plan.previous}</small> : null}
              </span>
              <span className="cp-catac-airport-plan-action" aria-hidden="true">
                {selectedId === plan.id ? labels.selected : labels.choose}
              </span>
            </label>
            {plan.badge ? <span className="cp-catac-airport-badge">{plan.badge}</span> : null}
          </article>
        ))}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {selected ? `${selected.carrier} ${selected.allowance} selected.` : labels.empty}
      </p>
      {selected ? (
        <p className="cp-catac-airport-plan-continue">
          <a href={`/order/pre-arrival?plan=${encodeURIComponent(selected.id)}&audience=student`}>
            {labels.continue}
          </a>
        </p>
      ) : null}
    </>
  );
}
