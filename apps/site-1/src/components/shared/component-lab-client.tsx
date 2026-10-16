'use client';

import { createContext, useActionState, useContext, useRef, useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@canadian-plans/ui';
import {
  CpAsset,
  CpBadge,
  CpButton,
  CpChip,
  CpLinkPill,
  CpPlanCard,
  CpStickyCta,
  type CpButtonTone,
  type PlanCardContent,
} from '@canadian-plans/ui/canadian-plans';
import type { ChromeContent, ComponentAssets, ComponentCopy } from '@content/components';
import { selectedStickyContent } from '@content/components';
import { isValidPreviewSearch, type PreviewSearchState } from '@/lib/preview-search';
import { previewSearchAction } from '@/app/(component-lab)/dev/components/actions';
import { usePlanFinder } from './plan-finder-provider';
import { SiteSearchForm } from './site-search-form';
import { BrandMark } from './brand-mark';

interface LabContextValue {
  selectedId?: string;
  select: (id: string) => void;
  openPreview: () => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  overlayOpen: boolean;
}
const LabContext = createContext<LabContextValue | undefined>(undefined);
function useLab() {
  const context = useContext(LabContext);
  if (!context) throw new Error('Component lab provider missing');
  return context;
}

export function ComponentLabProvider({
  children,
  copy,
}: {
  children: ReactNode;
  copy: ComponentCopy;
}) {
  const [selectedId, select] = useState<string>();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const previewTrigger = useRef<HTMLElement | null>(null);
  function openPreview() {
    previewTrigger.current = menuOpen
      ? document.querySelector<HTMLButtonElement>(
          '.cp-nav-mobile-actions [data-slot="sheet-trigger"]',
        )
      : document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setMenuOpen(false);
    setPreviewOpen(true);
  }
  return (
    <LabContext
      value={{
        selectedId,
        select,
        openPreview,
        menuOpen,
        setMenuOpen,
        overlayOpen: previewOpen || menuOpen,
      }}
    >
      {children}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent
          className="cp-design cp-preview-dialog"
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            previewTrigger.current?.focus();
          }}
        >
          <DialogTitle>{copy.dialogTitle}</DialogTitle>
          <DialogDescription>{copy.dialogDescription}</DialogDescription>
          <DialogClose asChild>
            <CpButton>{copy.dialogClose}</CpButton>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </LabContext>
  );
}

function SearchPreview({ content, assets }: { content: ChromeContent; assets: ComponentAssets }) {
  const initialState: PreviewSearchState = { status: 'idle' };
  const [state, action, pending] = useActionState(previewSearchAction, initialState);
  const [clientError, setClientError] = useState(false);
  const invalid = clientError || state.status === 'invalid';
  return (
    <form
      className="cp-search"
      action={action}
      onSubmit={(event) => {
        const value = new FormData(event.currentTarget).get('query');
        if (!isValidPreviewSearch(value)) {
          event.preventDefault();
          setClientError(true);
        } else setClientError(false);
      }}
    >
      <input
        name="query"
        aria-label={content.searchLabel}
        placeholder={content.searchPlaceholder}
        aria-invalid={invalid}
        aria-describedby="search-preview-feedback"
        required
        minLength={2}
        maxLength={80}
        autoComplete="off"
        onChange={() => setClientError(false)}
      />
      <button type="submit" aria-label={content.searchLabel} disabled={pending}>
        <CpAsset asset={assets.search} />
      </button>
      <p
        id="search-preview-feedback"
        role="status"
        className={
          state.status === 'idle' && !clientError && !pending ? 'sr-only' : 'cp-search-feedback'
        }
      >
        {pending
          ? content.searchPending
          : invalid
            ? content.searchError
            : state.status === 'preview'
              ? content.searchResult
              : null}
      </p>
    </form>
  );
}

export function Navigation({
  content,
  assets,
  menuOpen,
  onMenuOpenChange,
  brandHref = '#components',
  searchEnabled = true,
}: {
  content: ChromeContent;
  assets: ComponentAssets;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onAction: () => void;
  brandHref?: string;
  onContact?: () => void;
  searchEnabled?: boolean;
}) {
  const openFinder = usePlanFinder();
  const finderOpening = useRef(false);
  function findMyPlan() {
    const target = menuOpen
      ? document.querySelector<HTMLElement>('.cp-nav-mobile-actions [data-slot="sheet-trigger"]')
      : document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    finderOpening.current = menuOpen;
    onMenuOpenChange(false);
    openFinder(target);
  }
  return (
    <header className="cp-nav" data-component="navigation">
      <div className="cp-nav-inner">
        <div className="cp-nav-left">
          <a href={brandHref} className="cp-brand" aria-label={`${content.brand} home`}>
            <BrandMark />
          </a>
          <nav className="cp-nav-links" aria-label={content.navigationLabel}>
            {content.navigation.map((link) => (
              <a key={link.label} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="cp-nav-desktop-actions">
          {searchEnabled ? (
            <a href="/search" className="cp-nav-search" aria-label={content.searchLabel}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-4-4" />
              </svg>
            </a>
          ) : (
            <SearchPreview content={content} assets={assets} />
          )}
          <CpButton className="cp-nav-finder" onClick={findMyPlan}>
            {content.finderLabel}
          </CpButton>
        </div>
        <div className="cp-nav-mobile-actions">
          <CpButton className="cp-nav-finder" onClick={findMyPlan}>
            {content.finderLabel}
          </CpButton>
          <Sheet open={menuOpen} onOpenChange={onMenuOpenChange}>
            <SheetTrigger asChild>
              <CpButton tone="ghost" scale="icon" aria-label={content.menuLabel}>
                <CpAsset asset={assets.menu} />
              </CpButton>
            </SheetTrigger>
            <SheetContent
              className="cp-design cp-mobile-menu"
              showCloseButton={false}
              onCloseAutoFocus={(event) => {
                if (finderOpening.current) {
                  event.preventDefault();
                  finderOpening.current = false;
                }
              }}
            >
              <SheetTitle>{content.mobileNavigationLabel}</SheetTitle>
              {searchEnabled && <SiteSearchForm compact />}
              <nav aria-label={content.mobileNavigationLabel}>
                {content.navigation.map((link) => (
                  <a key={link.label} href={link.href} onClick={() => onMenuOpenChange(false)}>
                    {link.label}
                  </a>
                ))}
              </nav>
              <CpButton tone="ink" onClick={findMyPlan}>
                {content.finderLabel}
              </CpButton>
              <SheetClose asChild>
                <CpButton tone="outline">{content.closeLabel}</CpButton>
              </SheetClose>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function NavigationExample({
  content,
  assets,
}: {
  content: ChromeContent;
  assets: ComponentAssets;
}) {
  const lab = useLab();
  return (
    <Navigation
      content={content}
      assets={assets}
      menuOpen={lab.menuOpen}
      onMenuOpenChange={lab.setMenuOpen}
      searchEnabled={false}
      onAction={lab.openPreview}
    />
  );
}

export function ButtonExamples({
  examples,
  disabledLabel,
}: {
  examples: readonly { tone: CpButtonTone; label: string }[];
  disabledLabel: string;
}) {
  const { openPreview } = useLab();
  return (
    <div className="cp-lab-button-grid">
      {examples.map((example) => (
        <div
          key={example.tone}
          className="cp-lab-button-cell"
          data-inverse={example.tone === 'outline-inverse'}
        >
          <CpButton tone={example.tone} scale="large" onClick={openPreview}>
            {example.label}
          </CpButton>
        </div>
      ))}
      <div className="cp-lab-button-cell">
        <CpButton disabled>{disabledLabel}</CpButton>
      </div>
    </div>
  );
}

export function ChipExamples({ copy }: { copy: ComponentCopy }) {
  const [audience, setAudience] = useState(copy.chips[0]);
  return (
    <div className="cp-lab-stack">
      <div className="cp-lab-wrap" role="group" aria-label={copy.chipLabel}>
        {copy.chips.map((chip) => (
          <CpChip key={chip} selected={audience === chip} onClick={() => setAudience(chip)}>
            {chip}
          </CpChip>
        ))}
      </div>
      <div className="cp-lab-wrap">
        {copy.badgeLabels.map((label, index) => (
          <CpBadge
            key={label}
            tone={index === 0 ? 'blush' : index === 1 ? 'sun' : index === 2 ? 'sky' : 'ink'}
          >
            {label}
          </CpBadge>
        ))}
      </div>
      <div className="cp-lab-wrap">
        {copy.linkLabels.map((label) => (
          <CpLinkPill key={label} href="#plans">
            {label}
          </CpLinkPill>
        ))}
      </div>
    </div>
  );
}

export function PlanExamples({
  plans,
  copy,
}: {
  plans: readonly PlanCardContent[];
  copy: ComponentCopy;
}) {
  const { selectedId, select } = useLab();
  const selected = plans.find((plan) => plan.id === selectedId);
  return (
    <>
      <div className="cp-lab-plan-grid">
        {plans.map((plan) => (
          <CpPlanCard
            key={plan.id}
            content={plan}
            featured={Boolean(plan.badge)}
            selected={plan.id === selectedId}
            onSelect={() => select(plan.id)}
          />
        ))}
      </div>
      <p className="cp-lab-status" role="status">
        {selected ? `${copy.selectedPrefix} ${selected.carrier}` : copy.selectedEmpty}
      </p>
    </>
  );
}

export function MainAction({ label }: { label: string }) {
  const { openPreview } = useLab();
  return (
    <CpButton id="component-main-action" tone="sun" onClick={openPreview}>
      {label}
    </CpButton>
  );
}

export function StickyExamples({
  copy,
  plans,
}: {
  copy: ComponentCopy;
  plans: readonly PlanCardContent[];
}) {
  const { selectedId, overlayOpen, openPreview } = useLab();
  const selected = plans.find((plan) => plan.id === selectedId);
  const selectedSummary = selected ? selectedStickyContent(selected) : copy.stickyBrowsing;
  const [enabled, setEnabled] = useState(false);
  return (
    <>
      <div className="cp-sticky-gallery">
        <CpStickyCta content={copy.stickyBrowsing} onAction={openPreview} />
        <CpStickyCta content={copy.stickySelected} selected onAction={openPreview} />
      </div>
      <div className="cp-container cp-sticky-controls">
        <label>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.currentTarget.checked)}
          />
          {copy.stickyToggle}
        </label>
        <p>{copy.stickyNote}</p>
      </div>
      {enabled ? (
        <CpStickyCta
          content={selectedSummary}
          selected={Boolean(selected)}
          floating
          anchorId="component-main-action"
          suppressed={overlayOpen}
          onAction={openPreview}
        />
      ) : null}
    </>
  );
}
