'use client';

import {
  createContext,
  useContext,
  useRef,
  useState,
  useTransition,
  useId,
  type ReactNode,
  type FormEvent,
} from 'react';
import {
  Card,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@canadian-plans/ui';
import {
  CpAsset,
  CpButton,
  CpChip,
  CpPlanCard,
  CpSectionHeading,
  type CpButtonTone,
} from '@canadian-plans/ui/canadian-plans';
import {
  internetCopy,
  internetPlans,
  internetAssets,
  internetChrome,
  internetChromeAssets,
} from '@content/home-internet';
import { Navigation } from '@/components/shared/component-lab-client';
import { isValidPostalCode } from '@/lib/postal-preview';
import { isValidMoveInDate, type InternetLookupResult } from '@/lib/internet-check';
import { checkInternetAddressAction } from '@/app/(home-internet)/actions';

type PreviewView = 'address' | 'continuation' | 'waitlist' | 'advisor' | 'tv';
interface InternetPreview {
  readonly postalCode: string;
  readonly moveInDate: string;
  readonly result: InternetLookupResult | null;
  readonly pending: boolean;
  readonly setPostalCode: (value: string) => void;
  readonly setMoveInDate: (value: string) => void;
  readonly submit: () => void;
  readonly openAddress: (speedId?: string) => void;
  readonly openPreview: (view: PreviewView) => void;
}
const PreviewContext = createContext<InternetPreview | null>(null);
function usePreview(): InternetPreview {
  const context = useContext(PreviewContext);
  if (!context) throw new Error('Internet preview provider is missing');
  return context;
}

export function InternetPreviewProvider({ children }: { children: ReactNode }) {
  const [postalCode, updatePostalCode] = useState(''),
    [moveInDate, updateMoveInDate] = useState('');
  const [result, setResult] = useState<InternetLookupResult | null>(null),
    [open, setOpen] = useState(false);
  const [view, setView] = useState<PreviewView>('address');
  const [selectedSpeedId, setSelectedSpeedId] = useState('preview-internet-500');
  const [pending, startTransition] = useTransition();
  const trigger = useRef<HTMLElement | null>(null);
  function openView(next: PreviewView) {
    if (!open)
      trigger.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setView(next);
    setOpen(true);
  }
  function submit() {
    if (pending) return;
    openView('address');
    if (!isValidPostalCode(postalCode)) {
      setResult({ status: 'invalid', field: 'postalCode', previewOnly: true });
      return;
    }
    if (!isValidMoveInDate(moveInDate)) {
      setResult({ status: 'invalid', field: 'moveInDate', previewOnly: true });
      return;
    }
    const submitted = { postalCode, moveInDate };
    startTransition(async () => {
      try {
        const next = await checkInternetAddressAction(submitted);
        setResult(next);
        if (next.status === 'available' && !next.plans.some((plan) => plan.id === selectedSpeedId))
          setSelectedSpeedId(next.plans[0]?.id ?? '');
      } catch {
        setResult({ status: 'error', reason: 'lookup-failed', previewOnly: true });
      }
    });
  }
  const selected =
    result?.status === 'available'
      ? result.plans.find((plan) => plan.id === selectedSpeedId)
      : undefined;
  const copy = internetCopy.result;
  const preview = {
    postalCode,
    moveInDate,
    result,
    pending,
    setPostalCode: (value: string) => {
      updatePostalCode(value);
      setResult(null);
    },
    setMoveInDate: (value: string) => {
      updateMoveInDate(value);
      setResult(null);
    },
    submit,
    openAddress: (speedId?: string) => {
      if (speedId) setSelectedSpeedId(speedId);
      openView('address');
    },
    openPreview: openView,
  };
  const secondary =
    view === 'continuation'
      ? { title: copy.continuationTitle, description: copy.continuationDescription }
      : view === 'waitlist'
        ? { title: copy.waitlistTitle, description: copy.waitlistDescription }
        : view === 'tv'
          ? { title: copy.tvTitle, description: copy.tvDescription }
          : { title: copy.advisorTitle, description: copy.advisorDescription };
  return (
    <PreviewContext value={preview}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="cp-design cp-internet-result-dialog"
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <DialogClose asChild>
            <CpButton
              className="cp-internet-dialog-close"
              tone="ghost"
              scale="icon"
              aria-label={copy.close}
            >
              {copy.closeSymbol}
            </CpButton>
          </DialogClose>
          <DialogTitle>{view === 'address' ? copy.title : secondary.title}</DialogTitle>
          <DialogDescription className={view === 'address' ? 'sr-only' : undefined}>
            {view === 'address' ? internetCopy.form.mockNotice : secondary.description}
          </DialogDescription>
          {view === 'address' ? (
            <>
              <form
                method="post"
                className="cp-internet-result-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  submit();
                }}
                noValidate
              >
                <AddressFields resultOnly />
                {pending ? (
                  <p role="status" className="cp-internet-result-note">
                    {internetCopy.form.pending}
                  </p>
                ) : result?.status === 'available' ? (
                  <>
                    <div
                      className="cp-internet-result-status"
                      data-status="available"
                      role="status"
                    >
                      <CpAsset asset={internetAssets['308-3-imgFrame']} />
                      <div>
                        <strong>{copy.availableTitle}</strong>
                        <p>{result.address}</p>
                      </div>
                    </div>
                    <fieldset className="cp-internet-result-speeds">
                      <legend className="sr-only">{copy.speedsLabel}</legend>
                      {result.plans.map((plan) => (
                        <label
                          key={plan.id}
                          className="cp-internet-result-speed"
                          data-selected={selectedSpeedId === plan.id}
                        >
                          <input
                            className="sr-only"
                            type="radio"
                            name="internetSpeed"
                            value={plan.id}
                            checked={selectedSpeedId === plan.id}
                            onChange={() => setSelectedSpeedId(plan.id)}
                          />
                          <span>
                            {plan.resultLabel}
                            {plan.badge ? (
                              <span className="cp-internet-popular">{copy.popular}</span>
                            ) : null}
                          </span>
                          <strong>{plan.resultPrice}</strong>
                        </label>
                      ))}
                    </fieldset>
                    <CpButton onClick={() => setView('continuation')} disabled={!selected}>
                      {selected?.continueLabel}
                    </CpButton>
                    <p className="cp-internet-result-note">{result.earliestInstall}</p>
                  </>
                ) : result?.status === 'unavailable' ? (
                  <>
                    <div
                      className="cp-internet-result-status"
                      data-status="unavailable"
                      role="status"
                    >
                      <CpAsset asset={internetAssets['308-38-imgFrame']} />
                      <div>
                        <strong>{copy.unavailableTitle}</strong>
                        <p>{copy.unavailableDescription}</p>
                      </div>
                    </div>
                    <h3>{copy.alternativesHeading}</h3>
                    <ul className="cp-internet-alternatives">
                      {copy.alternatives.map((text, index) => (
                        <li key={text}>
                          <CpAsset
                            asset={
                              [
                                internetAssets['308-38-imgIcon'],
                                internetAssets['308-38-imgIcon1'],
                                internetAssets['308-38-imgIcon2'],
                              ][index] ?? internetAssets['308-38-imgIcon']
                            }
                          />
                          <p>{text}</p>
                        </li>
                      ))}
                    </ul>
                    <CpButton onClick={() => setView('waitlist')}>{copy.waitlist}</CpButton>
                    <CpButton tone="outline" onClick={() => setView('advisor')}>
                      {copy.advisor}
                    </CpButton>
                  </>
                ) : (
                  <>
                    {result?.status === 'error' ? (
                      <p className="cp-internet-result-error" role="alert">
                        {result.reason === 'unconfigured' ? copy.error : copy.lookupFailed}
                      </p>
                    ) : null}
                    <CpButton type="submit" disabled={pending}>
                      {result?.status === 'error'
                        ? internetCopy.form.retry
                        : internetCopy.form.submit}
                    </CpButton>
                    <p className="cp-internet-result-note">{internetCopy.form.note}</p>
                  </>
                )}
              </form>
              {result?.status === 'available' || result?.status === 'unavailable' ? (
                <p className="cp-internet-preview-notice">{internetCopy.form.mockNotice}</p>
              ) : null}
            </>
          ) : (
            <>
              {view === 'continuation' && selected ? (
                <p className="cp-internet-chosen-speed">
                  {selected.resultLabel} · {selected.resultPrice}
                </p>
              ) : null}
              {result ? (
                <CpButton tone="outline" onClick={() => setView('address')}>
                  {copy.back}
                </CpButton>
              ) : null}
              <DialogClose asChild>
                <CpButton>{copy.dismiss}</CpButton>
              </DialogClose>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PreviewContext>
  );
}

function AddressFields({ resultOnly = false }: { resultOnly?: boolean }) {
  const preview = usePreview(),
    id = useId(),
    copy = internetCopy.form;
  const postalError = preview.result?.status === 'invalid' && preview.result.field === 'postalCode';
  const dateError = preview.result?.status === 'invalid' && preview.result.field === 'moveInDate';
  return (
    <>
      <div className="cp-internet-field">
        <label htmlFor={`${id}-postal`}>{copy.postalLabel}</label>
        <input
          id={`${id}-postal`}
          name="postalCode"
          value={preview.postalCode}
          onChange={(e) => preview.setPostalCode(e.target.value)}
          placeholder={resultOnly ? undefined : copy.postalPlaceholder}
          autoComplete="postal-code"
          maxLength={10}
          disabled={preview.pending}
          aria-invalid={postalError}
          aria-describedby={postalError ? `${id}-postal-error` : undefined}
        />
        {postalError ? (
          <p id={`${id}-postal-error`} className="cp-internet-field-error" role="alert">
            <CpAsset asset={internetAssets['308-59-imgFrame']} />
            {copy.invalidPostal}
          </p>
        ) : null}
      </div>
      {!resultOnly || dateError ? (
        <div className="cp-internet-field">
          <label htmlFor={`${id}-date`}>{copy.dateLabel}</label>
          <input
            id={`${id}-date`}
            name="moveInDate"
            value={preview.moveInDate}
            onChange={(e) => preview.setMoveInDate(e.target.value)}
            placeholder={copy.datePlaceholder}
            inputMode="numeric"
            maxLength={20}
            disabled={preview.pending}
            aria-invalid={dateError}
            aria-describedby={dateError ? `${id}-date-error` : undefined}
          />
          {dateError ? (
            <p id={`${id}-date-error`} className="cp-internet-field-error" role="alert">
              {copy.invalidDate}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export function AddressCheckForm() {
  const preview = usePreview(),
    copy = internetCopy.form;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    preview.submit();
  }
  return (
    <form
      id="address-check"
      className="cp-internet-address-card"
      method="post"
      onSubmit={submit}
      noValidate
    >
      <h2>{copy.title}</h2>
      <p>{copy.description}</p>
      <AddressFields />
      <CpButton type="submit" disabled={preview.pending} scale="large">
        {preview.pending ? copy.pending : copy.submit}
      </CpButton>
      <p className="cp-internet-form-note">{copy.note}</p>
    </form>
  );
}

export function InternetNavigation() {
  const [menuOpen, setMenuOpen] = useState(false),
    preview = usePreview();
  return (
    <Navigation
      content={internetChrome}
      assets={internetChromeAssets}
      brandHref="/"
      menuOpen={menuOpen}
      onMenuOpenChange={setMenuOpen}
      onAction={() => {
        setMenuOpen(false);
        document.getElementById('speed-finder')?.scrollIntoView({ behavior: 'instant' });
        document.getElementById('finder-people-1')?.focus({ preventScroll: true });
      }}
      onContact={() => preview.openPreview('advisor')}
    />
  );
}

export function InternetAction({
  label,
  view = 'address',
  tone = 'primary',
  className,
}: {
  label: string;
  view?: PreviewView;
  tone?: CpButtonTone;
  className?: string;
}) {
  const preview = usePreview();
  return (
    <CpButton
      className={className}
      tone={tone}
      scale="large"
      onClick={() => (view === 'address' ? preview.openAddress() : preview.openPreview(view))}
    >
      {label}
    </CpButton>
  );
}

export function InternetSpeedCards() {
  const preview = usePreview();
  return (
    <div className="cp-internet-speed-cards">
      {internetPlans.map((plan) => (
        <CpPlanCard
          key={plan.id}
          content={plan}
          variant="internet"
          featured={plan.mbps === 500}
          onSelect={() => preview.openAddress(plan.id)}
        />
      ))}
    </div>
  );
}

export function SpeedFinder() {
  const [people, setPeople] = useState(1),
    [activity, setActivity] = useState(1),
    [tv, setTv] = useState(false),
    preview = usePreview(),
    copy = internetCopy.finder;
  const mbps =
    people === 2 && activity === 2
      ? 1500
      : people === 2 || activity === 2
        ? 1000
        : people === 0 && activity === 0
          ? 150
          : 500;
  const recommended = internetPlans.find((plan) => plan.mbps === mbps);
  if (!recommended) return null;
  return (
    <section id="speed-finder" className="cp-internet-finder cp-internet-section">
      <div className="cp-container">
        <CpSectionHeading content={copy.heading} />
        <div className="cp-internet-finder-card">
          <div className="cp-internet-finder-questions">
            <fieldset>
              <legend>{copy.peopleQuestion}</legend>
              <div>
                {copy.people.map((label, index) => (
                  <CpChip
                    id={`finder-people-${index}`}
                    key={label}
                    selected={people === index}
                    onClick={() => setPeople(index)}
                  >
                    {label}
                  </CpChip>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>{copy.activityQuestion}</legend>
              <div>
                {copy.activities.map((label, index) => (
                  <CpChip
                    key={label}
                    selected={activity === index}
                    onClick={() => setActivity(index)}
                  >
                    {label}
                  </CpChip>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>{copy.tvQuestion}</legend>
              <div>
                {copy.tv.map((label, index) => (
                  <CpChip
                    key={label}
                    selected={tv === (index === 1)}
                    onClick={() => setTv(index === 1)}
                  >
                    {label}
                  </CpChip>
                ))}
              </div>
            </fieldset>
          </div>
          <Card className="cp-internet-recommendation" aria-live="polite">
            <p className="cp-internet-eyebrow">{copy.recommend}</p>
            <h3>
              {recommended.allowance} {recommended.unit}
            </h3>
            <p className="cp-internet-recommendation-price">
              <strong>{recommended.amount}</strong>
              <span>{copy.period}</span>
            </p>
            <p>
              {mbps === 500 && people === 1 && activity === 1
                ? copy.recommendation
                : copy.descriptions[internetPlans.findIndex((plan) => plan.id === recommended.id)]}
            </p>
            {tv ? <p className="cp-internet-form-note">{copy.tvNotice}</p> : null}
            <CpButton scale="large" onClick={() => preview.openAddress(recommended.id)}>
              {recommended.buttonLabel}
            </CpButton>
          </Card>
        </div>
      </div>
    </section>
  );
}
