'use client';

import { useRef, useState } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@canadian-plans/ui';
import { CpButton, CpChip, CpPlanCard, CpSectionHeading } from '@canadian-plans/ui/canadian-plans';
import {
  arrivalCopy,
  arrivalChrome,
  arrivalChromeAssets,
  arrivalPlans,
  type ArrivalAudience,
} from '@content/pre-arrival';
import { Navigation } from '@/components/shared/component-lab-client';
import { preArrivalOrderCopy } from '@content/pre-arrival-order';

export function AdvisorPreview({
  label,
  tone = 'primary',
}: {
  label: string;
  tone?: 'primary' | 'outline' | 'outline-inverse';
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <CpButton tone={tone} scale="large">
          {label}
        </CpButton>
      </DialogTrigger>
      <DialogContent className="cp-design cp-arrival-dialog" showCloseButton={false}>
        <DialogTitle>{arrivalCopy.controls.contactTitle}</DialogTitle>
        <DialogDescription>{arrivalCopy.controls.contactDescription}</DialogDescription>
        <DialogClose asChild>
          <CpButton>{arrivalCopy.controls.close}</CpButton>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

export function ArrivalNavigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  return (
    <>
      <Navigation
        content={arrivalChrome}
        assets={arrivalChromeAssets}
        brandHref="/"
        menuOpen={menuOpen}
        onMenuOpenChange={setMenuOpen}
        onAction={() => {
          setMenuOpen(false);
          document.getElementById('plans')?.scrollIntoView({ behavior: 'instant' });
          document.getElementById('arrival-student')?.focus({ preventScroll: true });
        }}
        onContact={() => {
          trigger.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
          setContactOpen(true);
        }}
      />
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent
          className="cp-design cp-arrival-dialog"
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <DialogTitle>{arrivalCopy.controls.contactTitle}</DialogTitle>
          <DialogDescription>{arrivalCopy.controls.contactDescription}</DialogDescription>
          <DialogClose asChild>
            <CpButton>{arrivalCopy.controls.close}</CpButton>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** One owner for the audience and chosen plan; checkout receives only fixture IDs. */
export function PlanPicker() {
  const copy = arrivalCopy.picker;
  const [audience, setAudience] = useState<ArrivalAudience>('student');
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
          <CpSectionHeading content={copy.heading} />
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
                    `${copy.selectedAnnouncement}: ${plan.summaryName}, ${plan.allowance}, ${plan.amount}${copy.period}.`,
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
                {copy.period}
                <span className="cp-arrival-selection-detail">
                  {selected.period.replace('/mo', '')} · {copy.due}
                </span>
              </p>
            </div>
            <CpButton asChild>
              <a
                href={`${preArrivalOrderCopy.destinations.order}?plan=${encodeURIComponent(selected.id)}&audience=${audience}`}
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
