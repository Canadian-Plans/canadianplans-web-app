'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@canadian-plans/ui';
import {
  CpButton,
  CpChip,
  CpPlanCard,
  CpSectionHeading,
  type SectionHeadingContent,
} from '@canadian-plans/ui/canadian-plans';
import {
  arrivalCopy,
  arrivalPlans,
  preArrivalProductKeys,
  type ArrivalAudience,
} from '@content/pre-arrival';

/**
 * One owner for the audience and chosen plan; Continue opens that catalogue plan in /order.
 * Landing pages reuse it with their own heading and starting audience.
 */
export function PlanPicker({
  defaultAudience = 'student',
  heading,
}: {
  defaultAudience?: ArrivalAudience;
  heading?: SectionHeadingContent;
} = {}) {
  const copy = arrivalCopy.picker;
  const [audience, setAudience] = useState<ArrivalAudience>(defaultAudience);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const plans = arrivalPlans.filter((plan) => plan.audiences.includes(audience));
  const selected = plans.find((plan) => plan.id === selectedId);
  const audienceLabel = copy.audiences.find((option) => option.id === audience)?.label;
  function changeAudience(next: ArrivalAudience) {
    const nextPlans = arrivalPlans.filter((plan) => plan.audiences.includes(next));
    setAudience(next);
    if (!nextPlans.some((plan) => plan.id === selectedId)) setSelectedId(null);
    setAnnouncement(
      `${nextPlans.length} ${copy.filterAnnouncement} ${copy.audiences.find((option) => option.id === next)?.label}.`,
    );
  }
  return (
    <section id="plans" className="cp-arrival-picker" aria-label={copy.regionLabel}>
      <div className="cp-container">
        <div className="cp-arrival-picker-heading">
          <span>{copy.step}</span>
          <CpSectionHeading content={heading ?? copy.heading} />
        </div>
        <div className="cp-arrival-controls">
          <fieldset>
            <legend>{copy.audienceLabel}</legend>
            <div>
              {copy.audiences.map((option) => (
                <CpChip
                  id={`arrival-${option.id}`}
                  key={option.id}
                  selected={audience === option.id}
                  onClick={() => changeAudience(option.id)}
                  aria-controls="arrival-plan-results"
                >
                  {option.label}
                </CpChip>
              ))}
            </div>
          </fieldset>
          <div className="cp-arrival-phone">
            <strong>{copy.phoneLabel}</strong>
            <span>
              <span className="cp-chip" data-selected="true">
                {copy.phone}
              </span>
            </span>
            <Dialog>
              <DialogTrigger asChild>
                <button className="cp-arrival-text-link" type="button">
                  {copy.compatibility}
                </button>
              </DialogTrigger>
              <DialogContent className="cp-design cp-arrival-dialog" showCloseButton={false}>
                <DialogTitle>{arrivalCopy.controls.compatibilityTitle}</DialogTitle>
                <DialogDescription>
                  {arrivalCopy.controls.compatibilityDescription}
                </DialogDescription>
                <DialogClose asChild>
                  <CpButton>{arrivalCopy.controls.close}</CpButton>
                </DialogClose>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <p className="sr-only" role="status">
          {announcement}
        </p>
        <div id="arrival-plan-results" className="cp-arrival-plans">
          {plans.length ? (
            plans.map((plan) => (
              <CpPlanCard
                key={plan.id}
                content={plan}
                variant="pre-arrival"
                selected={selectedId === plan.id}
                onSelect={() => {
                  setSelectedId(plan.id);
                  setAnnouncement(
                    `${copy.selectedAnnouncement}: ${plan.summaryName}, ${plan.allowance}, ${plan.amount}${plan.term}.`,
                  );
                }}
              />
            ))
          ) : (
            <p>{copy.empty}</p>
          )}
        </div>
        <div className="cp-arrival-includes">
          <strong>{copy.includesTitle}</strong>
          <ul>
            {copy.includes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <p className="cp-arrival-note">{copy.note}</p>
        {selected ? (
          <div className="cp-arrival-selection" data-selected-plan={selected.id}>
            <div className="cp-arrival-selection-summary">
              <span>{copy.yourPlan}</span>
              <strong>
                {selected.summaryName} · {selected.allowance}
                <span className="cp-arrival-selection-audience">
                  {' '}
                  · {copy.phone} · {audienceLabel}
                </span>
              </strong>
              <p>
                {selected.amount}
                {selected.term}
                <span className="cp-arrival-selection-detail">
                  {selected.period.replace(selected.term, '')} · {copy.due}
                </span>
              </p>
            </div>
            <CpButton asChild>
              <a
                href={`/order?plan=${encodeURIComponent(preArrivalProductKeys[selected.id] ?? selected.id)}&category=sim`}
              >
                {copy.continue}
              </a>
            </CpButton>
          </div>
        ) : null}
      </div>
    </section>
  );
}
