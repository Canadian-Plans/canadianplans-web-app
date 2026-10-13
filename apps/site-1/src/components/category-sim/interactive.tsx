'use client';

import { useRef, useState } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@canadian-plans/ui';
import { CpButton, CpStickyCta } from '@canadian-plans/ui/canadian-plans';
import { Navigation } from '@/components/shared/component-lab-client';
import type { CategorySimPageContent, CategoryPlan } from '@content/category-sim';
import type { ChromeContent, ComponentAssets } from '@content/components';
import { preArrivalOrderCopy } from '@content/pre-arrival-order';

export function CategoryNavigation({
  content,
  assets,
  dialogCopy,
}: {
  content: ChromeContent;
  assets: ComponentAssets;
  dialogCopy: { title: string; description: string; close: string };
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <>
      <Navigation
        content={content}
        assets={assets}
        menuOpen={menuOpen}
        onMenuOpenChange={setMenuOpen}
        brandHref="/"
        onAction={() => {
          setMenuOpen(false);
          returnFocus.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
          setContactOpen(true);
        }}
        onContact={() => {
          returnFocus.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
          setContactOpen(true);
        }}
      />
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent
          className="cp-design cp-catsim-dialog"
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current?.focus();
          }}
        >
          <DialogTitle>{dialogCopy.title}</DialogTitle>
          <DialogDescription>{dialogCopy.description}</DialogDescription>
          <DialogClose asChild>
            <CpButton>{dialogCopy.close}</CpButton>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  );
}

function planHref(plan: CategoryPlan) {
  return `${preArrivalOrderCopy.destinations.order}?plan=${encodeURIComponent(plan.id)}&audience=student`;
}

export function CategoryPlanPicker({
  content,
}: {
  content: Pick<CategorySimPageContent, 'path' | 'plans'>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const selected = content.plans.items.find((plan) => plan.id === selectedId);
  return (
    <>
      <section
        id="plans"
        className="cp-catsim-plans cp-catsim-section"
        aria-label={content.plans.screenReaderLabel}
        data-node-id={content.path.endsWith('/students') ? '152:45' : '162:231'}
      >
        <div className="cp-container">
          <div className="cp-catsim-section-heading">
            <h2>{content.plans.title}</h2>
            <p>{content.plans.description}</p>
          </div>
          <p className="cp-catsim-price-note">{content.plans.priceNote}</p>
          <div className="cp-catsim-plan-list">
            {content.plans.items.map((plan) => {
              const featured = Boolean(plan.badge);
              const planSelected = selectedId === plan.id;
              return (
                <article
                  key={plan.id}
                  className="cp-catsim-plan-card"
                  data-featured={featured}
                  data-selected={planSelected}
                  data-plan={plan.id}
                >
                  <div className="cp-catsim-plan-top">
                    <p className="cp-catsim-plan-carrier">{plan.carrier}</p>
                    {featured ? (
                      <span className="cp-catsim-plan-badge">{content.plans.popularLabel}</span>
                    ) : null}
                  </div>
                  <h3 className="cp-catsim-plan-allowance">{plan.allowance}</h3>
                  <p className="cp-catsim-plan-good-label">{plan.goodForLabel}</p>
                  <p className="cp-catsim-plan-good-for">{plan.goodFor}</p>
                  <p className="cp-catsim-plan-features">{plan.features.join(' · ')}</p>
                  <p className="cp-catsim-plan-price">
                    <strong>{plan.amount}</strong>
                    <span>{plan.period}</span>
                    {plan.originalPrice ? <del>{plan.originalPrice}</del> : null}
                    {plan.finePrint ? <span>{plan.finePrint}</span> : null}
                  </p>
                  <CpButton
                    tone={featured || planSelected ? 'primary' : 'outline'}
                    scale="large"
                    aria-pressed={planSelected}
                    aria-label={`${planSelected ? content.plans.selectedLabel : content.plans.chooseLabel}: ${plan.carrier}, ${plan.allowance}`}
                    className="cp-catsim-plan-select"
                    onClick={() => {
                      setSelectedId(plan.id);
                      setAnnouncement(
                        `${content.plans.selectedLabel}: ${plan.carrier}, ${plan.allowance}. ${content.plans.stickyDetail}.`,
                      );
                    }}
                  >
                    {planSelected ? content.plans.selectedLabel : content.plans.chooseLabel}
                  </CpButton>
                </article>
              );
            })}
          </div>
          <p className="sr-only" role="status" aria-live="polite">
            {announcement}
          </p>
          {selected ? (
            <div className="cp-catsim-plan-next">
              <p>
                <strong>{selected.carrier}</strong>
                <span>{selected.allowance}</span>
                <span>
                  {selected.amount}
                  {selected.period}
                </span>
              </p>
              <CpButton asChild>
                <a href={planHref(selected)}>{content.plans.stickyButton}</a>
              </CpButton>
            </div>
          ) : null}
        </div>
      </section>
      {selected ? (
        <CpStickyCta
          selected
          floating
          anchorId="plans"
          content={{
            title: `${selected.carrier} · ${selected.allowance}`,
            detail: `${selected.amount}${selected.period} · ${content.plans.stickyDetail}`,
            button: content.plans.stickyButton,
          }}
          onAction={() => window.location.assign(planHref(selected))}
        />
      ) : null}
    </>
  );
}
