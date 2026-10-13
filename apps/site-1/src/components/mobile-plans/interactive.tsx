'use client';

import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from '@canadian-plans/ui';
import {
  CpAsset,
  CpButton,
  CpChip,
  CpPlanCard,
  CpLinkPill,
  type CpButtonTone,
} from '@canadian-plans/ui/canadian-plans';
import {
  mobileCopy,
  mobilePlans,
  mobileAssets,
  mobileChrome,
  mobileChromeAssets,
  type MobilePlan,
  type MobileSort,
} from '@content/mobile-plans';
import {
  defaultMobileFilters,
  filterMobilePlans,
  type MobileFilters,
} from '@/lib/mobile-plan-filters';
import { Navigation } from '@/components/shared/component-lab-client';

interface PlansContext {
  readonly filters: MobileFilters;
  readonly setFilters: (value: MobileFilters) => void;
  readonly preview: (plan?: MobilePlan, description?: string) => void;
}
const Context = createContext<PlansContext | null>(null);
function usePlans() {
  const value = useContext(Context);
  if (!value) throw new Error('Mobile plans provider missing');
  return value;
}

export function MobilePlansProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState(defaultMobileFilters);
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<MobilePlan>();
  const [description, setDescription] = useState<string>();
  const trigger = useRef<HTMLElement | null>(null);
  function preview(next?: MobilePlan, text?: string) {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPlan(next);
    setDescription(text);
    setOpen(true);
  }
  return (
    <Context value={{ filters, setFilters, preview }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="cp-design cp-mobile-preview"
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <DialogTitle>
            {plan ? mobileCopy.preview.title : mobileCopy.preview.advisorTitle}
          </DialogTitle>
          <DialogDescription>
            {description ??
              (plan ? mobileCopy.preview.description : mobileCopy.preview.advisorDescription)}
          </DialogDescription>
          {plan ? (
            <p className="cp-mobile-preview-plan">
              {plan.carrier} · {plan.allowance} · {plan.amount}
              {plan.period}
            </p>
          ) : null}
          <DialogClose asChild>
            <CpButton>{mobileCopy.preview.close}</CpButton>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </Context>
  );
}

export function MobilePlansNavigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { preview } = usePlans();
  return (
    <Navigation
      content={mobileChrome}
      assets={mobileChromeAssets}
      brandHref="/"
      menuOpen={menuOpen}
      onMenuOpenChange={setMenuOpen}
      onAction={() => {
        setMenuOpen(false);
        document.getElementById('mobile-plans')?.scrollIntoView({ behavior: 'smooth' });
        document
          .querySelector<HTMLButtonElement>('.cp-mobile-filter-trigger')
          ?.focus({ preventScroll: true });
      }}
      onContact={() => preview()}
    />
  );
}
export function MobilePreviewAction({
  label,
  tone = 'outline-inverse',
}: {
  label: string;
  tone?: CpButtonTone;
}) {
  const { preview } = usePlans();
  return (
    <CpButton tone={tone} onClick={() => preview()}>
      {label}
    </CpButton>
  );
}
function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { readonly id: T; readonly label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="cp-mobile-filter-group">
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <CpChip
            key={option.id}
            selected={value === option.id}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </CpChip>
        ))}
      </div>
    </fieldset>
  );
}
function PhoneSwitch({ sheet = false }: { sheet?: boolean }) {
  const { filters, setFilters } = usePlans();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={filters.bringOwnPhone}
      className="cp-mobile-phone-switch"
      data-sheet={sheet}
      onClick={() => setFilters({ ...filters, bringOwnPhone: !filters.bringOwnPhone })}
    >
      <span className="cp-mobile-switch-graphic">
        {filters.bringOwnPhone ? (
          <CpAsset asset={mobileAssets['106-65-imgFrame']} />
        ) : (
          <span className="cp-mobile-switch-off" />
        )}
      </span>
      <span>{mobileCopy.filters.phone}</span>
    </button>
  );
}
function FilterGroups({ sheet = false }: { sheet?: boolean }) {
  const { filters, setFilters } = usePlans();
  const copy = mobileCopy.filters;
  return (
    <>
      <FilterGroup
        label={copy.brand}
        options={copy.brandOptions}
        value={filters.brand}
        onChange={(brand) => setFilters({ ...filters, brand })}
      />
      <FilterGroup
        label={sheet ? copy.payType : copy.pay}
        options={copy.payOptions}
        value={filters.pay}
        onChange={(pay) => setFilters({ ...filters, pay })}
      />
      <FilterGroup
        label={copy.data}
        options={copy.dataOptions}
        value={filters.data}
        onChange={(data) => setFilters({ ...filters, data })}
      />
      <PhoneSwitch sheet={sheet} />
    </>
  );
}

export function MobilePlanBrowser() {
  const { filters, setFilters, preview } = usePlans();
  const [sort, setSort] = useState<MobileSort>('recommended');
  const [sheetOpen, setSheetOpen] = useState(false);
  const matching = filterMobilePlans(mobilePlans, filters, sort);
  const copy = mobileCopy.filters;
  function clear() {
    setFilters(defaultMobileFilters);
  }
  const chips = [
    ...(filters.brand !== 'all'
      ? [
          {
            key: 'brand' as const,
            label: copy.brandOptions.find((o) => o.id === filters.brand)!.label,
          },
        ]
      : []),
    ...(filters.pay !== 'any'
      ? [{ key: 'pay' as const, label: copy.payOptions.find((o) => o.id === filters.pay)!.label }]
      : []),
    ...(filters.data !== 'any'
      ? [
          {
            key: 'data' as const,
            label: copy.dataOptions.find((o) => o.id === filters.data)!.label,
          },
        ]
      : []),
    ...(filters.bringOwnPhone ? [{ key: 'bringOwnPhone' as const, label: copy.phone }] : []),
  ];
  function remove(key: keyof MobileFilters) {
    if (key === 'bringOwnPhone') setFilters({ ...filters, bringOwnPhone: false });
    else setFilters({ ...filters, [key]: defaultMobileFilters[key] });
  }
  return (
    <>
      <div className="cp-mobile-desktop-filters">
        <FilterGroups />
      </div>
      <div className="cp-mobile-small-filters">
        <div className="cp-mobile-filter-tools">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <CpButton className="cp-mobile-filter-trigger" tone="ghost">
                <CpAsset asset={mobileAssets['214-2-imgIconSliders']} />
                {copy.title}
                {chips.length ? (
                  <span className="cp-mobile-filter-count">{chips.length}</span>
                ) : null}
              </CpButton>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="cp-design cp-mobile-filter-sheet"
              showCloseButton={false}
            >
              <div className="cp-mobile-sheet-handle" aria-hidden="true" />
              <div className="cp-mobile-sheet-header">
                <SheetTitle>{copy.title}</SheetTitle>
                <CpButton tone="ghost" onClick={clear}>
                  {copy.clear}
                </CpButton>
                <SheetClose asChild>
                  <CpButton tone="ghost" scale="icon" aria-label={copy.close}>
                    <CpAsset asset={mobileAssets['367-2760-imgIconClose1']} />
                  </CpButton>
                </SheetClose>
              </div>
              <SheetDescription className="sr-only">{copy.sheetDescription}</SheetDescription>
              <div className="cp-mobile-sheet-body">
                <FilterGroups sheet />
              </div>
              <div className="cp-mobile-sheet-footer">
                <SheetClose asChild>
                  <CpButton scale="large">
                    {copy.showPrefix} {matching.length}{' '}
                    {matching.length === 1 ? copy.singular : copy.plural}
                  </CpButton>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
          <label className="cp-mobile-sort">
            <span className="sr-only">{copy.sort}</span>
            <select
              aria-label={copy.sort}
              value={sort}
              onChange={(event) => {
                const option = copy.sortOptions.find((o) => o.id === event.target.value);
                if (option) setSort(option.id);
              }}
            >
              {copy.sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {copy.sort}: {option.label}
                </option>
              ))}
            </select>
            <CpAsset asset={mobileAssets['214-2-imgIconChevronDown']} />
          </label>
        </div>
        <div className="cp-mobile-active-filters" aria-label={copy.active}>
          {chips.map((chip) => (
            <CpButton
              key={chip.key}
              tone="ghost"
              aria-label={`${copy.remove} ${chip.label}`}
              onClick={() => remove(chip.key)}
            >
              {chip.label}
              <CpAsset asset={mobileAssets['214-2-imgIconClose']} />
            </CpButton>
          ))}
          <CpButton tone="ghost" onClick={clear}>
            {copy.clear}
          </CpButton>
        </div>
      </div>
      <p className="cp-mobile-includes">
        <strong>{mobileCopy.plans.includesTitle}</strong> {mobileCopy.plans.includes}
      </p>
      <p className="sr-only" role="status">
        {matching.length} {copy.results}
      </p>
      {matching.length ? (
        <div className="cp-mobile-plan-cards" data-sort={sort}>
          {matching.map((plan) => (
            <div
              key={plan.id}
              className="cp-mobile-plan-wrap"
              data-brand={plan.brand}
              data-featured={plan.featured}
            >
              <CpPlanCard
                content={plan}
                featured={plan.featured}
                variant="mobile"
                onSelect={() => preview(plan)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="cp-mobile-empty">
          <h3>{copy.empty}</h3>
          <p>{copy.emptyHelp}</p>
          <CpButton onClick={clear}>{copy.clear}</CpButton>
        </div>
      )}
      <p className="cp-mobile-note">{mobileCopy.plans.note}</p>
    </>
  );
}

export function ExploreNeeds() {
  const { setFilters, preview } = usePlans();
  return (
    <div className="cp-mobile-explore-links">
      {mobileCopy.explore.links.map((label, index) => (
        <CpLinkPill
          href={index === 7 || index === 8 ? '#brand-comparison' : '#mobile-plans'}
          key={label}
          onClick={(event) => {
            if (index < 3) {
              setFilters({
                ...defaultMobileFilters,
                brand: index === 0 ? 'rogers' : index === 1 ? 'fido' : 'chatr',
              });
            } else if (index === 4) setFilters({ ...defaultMobileFilters, pay: 'prepaid' });
            else if (index !== 7 && index !== 8) {
              event.preventDefault();
              preview(undefined, mobileCopy.preview.unavailableNeed);
            }
          }}
        >
          {label}
        </CpLinkPill>
      ))}
    </div>
  );
}
