'use client';

import { useActionState, useRef, useState, type ReactNode } from 'react';
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
  CpImageSlot,
  CpPlanCard,
  CpSectionHeading,
} from '@canadian-plans/ui/canadian-plans';
import { homeCopy, homeChrome, type HomeCopy } from '@content/home';
import { componentAssets, planExamples } from '@content/components';
import { Navigation } from '@/components/shared/component-lab-client';
import { isValidPostalCode, type PostalPreviewState } from '@/lib/postal-preview';
import { postalPreviewAction } from '@/app/(home)/actions';

export function HomeNavigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  function goToPlans() {
    setMenuOpen(false);
    document.getElementById('popular-plans')?.scrollIntoView({ behavior: 'instant' });
    document.getElementById('plan-tab-arrival')?.focus({ preventScroll: true });
  }
  return (
    <>
      <Navigation
        content={homeChrome}
        brandHref="/"
        assets={componentAssets}
        menuOpen={menuOpen}
        onMenuOpenChange={setMenuOpen}
        onAction={goToPlans}
        onContact={() => {
          trigger.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
          setContactOpen(true);
        }}
      />
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent
          className="cp-design cp-preview-dialog"
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <DialogTitle>{homeCopy.controls.contactTitle}</DialogTitle>
          <DialogDescription>{homeCopy.controls.contactDescription}</DialogDescription>
          <DialogClose asChild>
            <CpButton>{homeCopy.plans.close}</CpButton>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PreviewContact({
  label,
  tone = 'primary',
  className,
}: {
  label: string;
  tone?: 'primary' | 'outline-inverse' | 'ink' | 'sun';
  className?: string;
}) {
  return (
    <Dialog>
      <DialogContentPortalTrigger label={label} tone={tone} className={className} />
    </Dialog>
  );
}

function DialogContentPortalTrigger({
  label,
  tone,
  className,
}: {
  label: string;
  tone: 'primary' | 'outline-inverse' | 'ink' | 'sun';
  className?: string;
}) {
  return (
    <>
      <DialogTrigger asChild>
        <CpButton tone={tone} scale="large" className={className}>
          {label}
        </CpButton>
      </DialogTrigger>
      <DialogContent className="cp-design cp-preview-dialog" showCloseButton={false}>
        <DialogTitle>{homeCopy.controls.contactTitle}</DialogTitle>
        <DialogDescription>{homeCopy.controls.contactDescription}</DialogDescription>
        <DialogClose asChild>
          <CpButton>{homeCopy.plans.close}</CpButton>
        </DialogClose>
      </DialogContent>
    </>
  );
}

export function PopularPlans() {
  const [active, setActive] = useState('arrival');
  const [selectedId, setSelected] = useState<string>();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = planExamples.find((plan) => plan.id === selectedId);
  function activate(index: number) {
    const tab = homeCopy.plans.tabs[index];
    if (tab) {
      setActive(tab.id);
      buttons.current[index]?.focus();
    }
  }
  return (
    <section id="popular-plans" className="cp-home-plans cp-home-section">
      <div className="cp-container cp-home-stack">
        <div className="cp-home-plan-heading">
          <CpSectionHeading content={homeCopy.plans.heading} />
          <div role="tablist" aria-label={homeCopy.plans.heading.eyebrow} className="cp-home-tabs">
            {homeCopy.plans.tabs.map((tab, index) => (
              <button
                key={tab.id}
                id={`plan-tab-${tab.id}`}
                ref={(element) => {
                  buttons.current[index] = element;
                }}
                role="tab"
                type="button"
                aria-selected={active === tab.id}
                aria-controls={`plan-panel-${tab.id}`}
                tabIndex={active === tab.id ? 0 : -1}
                onClick={() => setActive(tab.id)}
                onKeyDown={(event) => {
                  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                  event.preventDefault();
                  const count = homeCopy.plans.tabs.length;
                  activate(
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? count - 1
                        : (index + (event.key === 'ArrowRight' ? 1 : count - 1)) % count,
                  );
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {homeCopy.plans.tabs.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`plan-panel-${tab.id}`}
            aria-labelledby={`plan-tab-${tab.id}`}
            hidden={active !== tab.id}
            tabIndex={0}
          >
            {tab.id === 'internet' ? (
              <div className="cp-home-planned">
                <p>{homeCopy.plans.internetMessage}</p>
                <CpButton asChild>
                  <a href="#internet">{homeCopy.plans.internetButton}</a>
                </CpButton>
              </div>
            ) : (
              <>
                {tab.id === 'mobile' ? (
                  <p className="cp-home-plan-message">{homeCopy.plans.mobileMessage}</p>
                ) : null}
                <div className="cp-home-plan-grid">
                  {planExamples.map((plan) => (
                    <div key={plan.id} data-featured={Boolean(plan.badge)}>
                      <CpPlanCard
                        content={plan}
                        featured={Boolean(plan.badge)}
                        selected={selectedId === plan.id}
                        onSelect={() => setSelected(plan.id)}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
        <div className="cp-home-includes">
          <strong>{homeCopy.plans.includesTitle}</strong>
          <div>
            {homeCopy.plans.includes.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>
        <p className="cp-home-plan-note">{homeCopy.plans.note}</p>
        <p className="sr-only" role="status">
          {selected
            ? `${homeCopy.plans.selectedTitle}: ${selected.carrier}, ${selected.allowance}. ${homeCopy.plans.selectedDescription}`
            : null}
        </p>
      </div>
    </section>
  );
}

export function JourneyCarousel({ content }: { content: HomeCopy['journey'] }) {
  const rail = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const orderedCards = [...content.cards.slice(rotation), ...content.cards.slice(0, rotation)];
  function goTo(target: number) {
    const next = (target + content.cards.length) % content.cards.length;
    if (rail.current && rail.current.scrollWidth <= rail.current.clientWidth + 1) {
      setRotation(next);
      setIndex(next);
      return;
    }
    const card = rail.current?.children.item(
      (next - rotation + content.cards.length) % content.cards.length,
    );
    const first = rail.current?.firstElementChild;
    if (card instanceof HTMLElement && first instanceof HTMLElement && rail.current) {
      rail.current.scrollTo({
        left: card.offsetLeft - first.offsetLeft,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
      setIndex(next);
    }
  }
  return (
    <section id="journey" className="cp-home-journey cp-home-section">
      <div className="cp-container cp-home-stack">
        <div className="cp-home-journey-heading">
          <div>
            <p className="cp-home-eyebrow">{content.eyebrow}</p>
            <h2>
              {content.title.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h2>
            <p>{content.description}</p>
          </div>
          <div className="cp-home-journey-actions">
            <CpButton asChild tone="sun" scale="large">
              <a href="#popular-plans">{content.button}</a>
            </CpButton>
            <div className="cp-home-carousel-arrows">
              <CpButton
                tone="outline-inverse"
                scale="icon"
                aria-label={content.previous}
                onClick={() => goTo(index - 1)}
              >
                {homeCopy.controls.back}
              </CpButton>
              <CpButton
                tone="ghost"
                scale="icon"
                aria-label={content.next}
                onClick={() => goTo(index + 1)}
              >
                {homeCopy.controls.arrow}
              </CpButton>
            </div>
          </div>
        </div>
        <div
          className="cp-home-journey-rail"
          ref={rail}
          role="region"
          aria-label={content.label}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
              event.preventDefault();
              goTo(index + (event.key === 'ArrowRight' ? 1 : -1));
            }
          }}
          onScroll={() => {
            const element = rail.current;
            if (!element) return;
            const first = element.firstElementChild;
            if (!(first instanceof HTMLElement) || element.scrollWidth <= element.clientWidth + 1)
              return;
            let nearest = 0;
            let distance = Infinity;
            Array.from(element.children).forEach((child, i) => {
              if (child instanceof HTMLElement) {
                const current = Math.abs(child.offsetLeft - first.offsetLeft - element.scrollLeft);
                if (current < distance) {
                  nearest = i;
                  distance = current;
                }
              }
            });
            setIndex((nearest + rotation) % content.cards.length);
          }}
        >
          {orderedCards.map((card) => (
            <article key={card.id} className="cp-home-journey-card" data-tone={card.tone}>
              <CpImageSlot
                icon={componentAssets.imageLight}
                label={homeCopy.controls.image}
                caption={card.caption}
              />
              <p className="cp-home-tag">{card.tag}</p>
              <h3>{card.title}</h3>
              <p className="cp-home-card-description">{card.description}</p>
              <strong>{card.detail}</strong>
            </article>
          ))}
        </div>
        <div className="cp-home-carousel-dots" role="group" aria-label={content.label}>
          {content.cards.map((card, i) => (
            <button
              key={card.id}
              type="button"
              aria-label={`${content.stepLabel} ${i + 1}`}
              aria-pressed={index === i}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          {content.cards[index]?.tag}
        </p>
      </div>
    </section>
  );
}

export function ReviewCarousel({ children }: { children: ReactNode }) {
  const rail = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  function goTo(next: number) {
    const first = rail.current?.firstElementChild;
    const child = rail.current?.children.item(next);
    if (first instanceof HTMLElement && child instanceof HTMLElement) {
      rail.current?.scrollTo({ left: child.offsetLeft - first.offsetLeft, behavior: 'instant' });
      setIndex(next);
    }
  }
  return (
    <div className="cp-home-review-carousel">
      <div
        ref={rail}
        className="cp-home-review-strip"
        role="region"
        aria-label={homeCopy.reviews.label}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            goTo((index + (event.key === 'ArrowRight' ? 1 : 2)) % 3);
          }
        }}
        onScroll={() => {
          const first = rail.current?.firstElementChild;
          const second = rail.current?.children.item(1);
          if (first instanceof HTMLElement && second instanceof HTMLElement && rail.current) {
            const stride = second.offsetLeft - first.offsetLeft;
            setIndex(Math.min(2, Math.round(rail.current.scrollLeft / stride)));
          }
        }}
      >
        {children}
      </div>
      <div className="cp-home-review-dots">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`${homeCopy.reviews.show} ${i + 1}`}
            aria-pressed={index === i}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  );
}

export function PostalCodePreview() {
  const [postalCode, setPostalCode] = useState('');
  const [state, action, pending] = useActionState(postalPreviewAction, {
    status: 'idle',
  } satisfies PostalPreviewState);
  const [invalid, setInvalid] = useState(false);
  const content = homeCopy.internet;
  return (
    <div className="cp-home-address">
      <h3>
        {content.heading.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </h3>
      <p>{content.intro}</p>
      <form
        action={action}
        onSubmit={(event) => {
          if (!isValidPostalCode(new FormData(event.currentTarget).get('postalCode'))) {
            event.preventDefault();
            setInvalid(true);
          } else setInvalid(false);
        }}
      >
        <label htmlFor="postal-code">{content.label}</label>
        <div className="cp-home-postal-input">
          <input
            id="postal-code"
            name="postalCode"
            value={postalCode}
            autoComplete="postal-code"
            maxLength={7}
            required
            placeholder={content.placeholder}
            aria-invalid={invalid || state.status === 'invalid'}
            aria-describedby="postal-preview-result"
            onChange={(event) => {
              setPostalCode(event.currentTarget.value);
              setInvalid(false);
            }}
          />
          <CpButton type="submit" disabled={pending}>
            {content.button}
          </CpButton>
        </div>
      </form>
      <p
        id="postal-preview-result"
        role="status"
        className="cp-home-postal-status"
        data-error={invalid || state.status === 'invalid'}
      >
        {pending
          ? content.pending
          : invalid || state.status === 'invalid'
            ? content.invalid
            : state.status === 'preview'
              ? content.result
              : content.initial}
      </p>
      <div className="cp-home-provinces">
        <span>{content.serving}</span>
        {content.provinces.map((province) => (
          <span key={province}>{province}</span>
        ))}
      </div>
    </div>
  );
}
