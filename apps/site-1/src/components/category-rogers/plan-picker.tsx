'use client';

import { useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@canadian-plans/ui';
import { CpAsset } from '@canadian-plans/ui/canadian-plans';
import { categoryRogers, categoryRogersAssets } from '@content/category-rogers';

export function RogersPlanPicker() {
  const [sort, setSort] = useState('Price');
  const [selected, setSelected] = useState<string | null>(null);
  const plans = useMemo(
    () =>
      [...categoryRogers.plans.items].sort((a, b) =>
        sort === 'Data'
          ? b.data - a.data
          : sort === 'Plan'
            ? a.name.localeCompare(b.name)
            : a.price - b.price,
      ),
    [sort],
  );
  const selectedPlan = plans.find((plan) => plan.id === selected);
  const selectionTrigger = useRef<HTMLButtonElement | null>(null);
  function selectPlan(id: string, trigger: HTMLButtonElement) {
    selectionTrigger.current = trigger;
    setSelected(id);
  }
  function closeSelection() {
    setSelected(null);
    if (selectionTrigger.current?.isConnected) selectionTrigger.current.focus();
  }
  return (
    <>
      <div className="cp-catrog-section-heading">
        <h2>{categoryRogers.plans.title}</h2>
        <div className="cp-catrog-sort" role="group" aria-label={categoryRogers.ui.sortLabel}>
          <span>{categoryRogers.plans.sort}</span>
          {categoryRogers.plans.options.map((option) => (
            <button
              type="button"
              aria-pressed={sort === option}
              key={option}
              onClick={() => setSort(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="cp-catrog-plan-table-wrap">
        <table className="cp-catrog-plan-table">
          <thead>
            <tr>
              {categoryRogers.plans.headers.map((header) => (
                <th scope="col" key={header}>
                  {header}
                </th>
              ))}
              <th scope="col">
                <span className="sr-only">{categoryRogers.plans.choose}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => {
              const popular = plan.id === 'popular';
              return (
                <tr key={plan.id} className={popular ? 'is-popular' : undefined}>
                  <th scope="row">
                    {plan.name}
                    {popular ? (
                      <span className="cp-catrog-badge">{categoryRogers.plans.popularLabel}</span>
                    ) : null}
                  </th>
                  <td>{plan.dataLabel}</td>
                  <td>{plan.talk}</td>
                  <td>{plan.network}</td>
                  <td>{plan.us}</td>
                  <td>
                    <strong>{plan.priceLabel}</strong>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={(event) => selectPlan(plan.id, event.currentTarget)}
                    >
                      {categoryRogers.plans.choose}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="cp-catrog-plan-cards">
        {plans.map((plan) => {
          const popular = plan.id === 'popular';
          return (
            <article
              key={plan.id}
              className={popular ? 'cp-catrog-plan-card is-popular' : 'cp-catrog-plan-card'}
            >
              <div className="cp-catrog-plan-card-top">
                <h3>{plan.name}</h3>
                {popular ? (
                  <span className="cp-catrog-badge">{categoryRogers.plans.popularLabel}</span>
                ) : null}
              </div>
              <p className="cp-catrog-data">
                <span>{categoryRogers.plans.headers[1]}</span>
                <strong>{plan.dataLabel}</strong>
              </p>
              <p className="cp-catrog-mobile-price">
                <strong>{plan.priceLabel.replace(categoryRogers.ui.perMonth, '')}</strong>
                <span>
                  {categoryRogers.ui.perMonth}
                  {categoryRogers.ui.tax}
                </span>
              </p>
              <ul>
                <li>
                  <CpAsset asset={categoryRogersAssets.check} />
                  {plan.talk}
                  {categoryRogers.ui.talkSuffix}
                </li>
                <li>
                  <CpAsset asset={categoryRogersAssets.check} />
                  {plan.network}
                  {categoryRogers.ui.networkSuffix}
                </li>
                <li>
                  <CpAsset asset={categoryRogersAssets.check} />
                  {categoryRogers.ui.usUse}
                  {plan.us.toLowerCase()}
                </li>
              </ul>
              <button type="button" onClick={(event) => selectPlan(plan.id, event.currentTarget)}>
                {categoryRogers.plans.choose}
              </button>
            </article>
          );
        })}
      </div>
      {selectedPlan ? (
        <div className="cp-catrog-selected" role="status" aria-live="polite">
          <div>
            <strong>
              {categoryRogers.ui.selectedPlanLabel}: {selectedPlan.name}
            </strong>
            <p>{categoryRogers.ui.previewBody}</p>
          </div>
          <button type="button" onClick={closeSelection}>
            {categoryRogers.ui.close}
          </button>
        </div>
      ) : null}
      <p className="cp-catrog-plan-note">{categoryRogers.plans.footnote}</p>
    </>
  );
}

export function RogersAdvisorButton({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <>
      <button
        className="cp-catrog-advisor-button"
        type="button"
        onClick={(event) => {
          returnFocus.current = event.currentTarget;
          setOpen(true);
        }}
      >
        {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="cp-catrog-dialog"
          showCloseButton={false}
          onEscapeKeyDown={() => setOpen(false)}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current?.focus();
          }}
        >
          <DialogTitle>{categoryRogers.ui.advisorTitle}</DialogTitle>
          <DialogDescription>{categoryRogers.ui.advisorDescription}</DialogDescription>
          <DialogClose asChild>
            <button type="button" className="cp-catrog-dialog-close">
              {categoryRogers.ui.advisorClose}
            </button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  );
}
