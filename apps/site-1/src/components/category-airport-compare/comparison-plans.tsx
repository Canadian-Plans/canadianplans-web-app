'use client';

import { useMemo, useState } from 'react';
import { CpAsset, type FigmaAsset } from '@canadian-plans/ui/canadian-plans';

type ComparisonPlan = {
  id: 'fido' | 'rogers';
  name: string;
  price: number;
  priceLabel: string;
  data: number;
  dataLabel: string;
  periodLabel: string;
  features: readonly string[];
  href: string;
  cta: string;
};

export function ComparisonPlans({
  plans,
  sortLabel,
  sortOptions,
  dataHeading,
  planCheck,
}: {
  plans: readonly ComparisonPlan[];
  sortLabel: string;
  sortOptions: readonly { label: string; value: 'price' | 'data' }[];
  dataHeading: string;
  planCheck: FigmaAsset;
}) {
  const [sort, setSort] = useState<'price' | 'data'>('price');
  const ordered = useMemo(() => {
    const list = [...plans];
    if (sort === 'price') return list.sort((a, b) => a.price - b.price);
    return list.sort((a, b) => b.data - a.data);
  }, [plans, sort]);
  return (
    <>
      <div className="cp-catac-compare-sort">
        <span>{sortLabel}</span>
        <span className="cp-catac-compare-sort-options" role="group" aria-label={sortLabel}>
          {sortOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              aria-pressed={sort === option.value}
              onClick={() => setSort(option.value)}
            >
              {option.label}
            </button>
          ))}
        </span>
      </div>
      <div className="cp-catac-compare-plan-grid" aria-live="polite">
        {ordered.map((plan) => (
          <article
            className={`cp-catac-compare-plan cp-catac-compare-plan-${plan.id}`}
            key={plan.id}
          >
            <h3>{plan.name}</h3>
            <div className="cp-catac-compare-plan-value">
              <p className="cp-catac-compare-plan-data">
                <span>{dataHeading}</span>
                <strong>{plan.dataLabel}</strong>
              </p>
              <p className="cp-catac-compare-plan-price">
                <strong>{plan.priceLabel}</strong>
                <span>{plan.periodLabel}</span>
              </p>
            </div>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <CpAsset asset={planCheck} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <a href={plan.href}>{plan.cta}</a>
          </article>
        ))}
      </div>
    </>
  );
}
