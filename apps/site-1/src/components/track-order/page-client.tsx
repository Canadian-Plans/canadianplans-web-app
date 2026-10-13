'use client';
import { useRef, useState } from 'react';
import { FormField, Input } from '@canadian-plans/ui';
import { CpAsset, CpButton, CpImageSlot } from '@canadian-plans/ui/canadian-plans';
import {
  trackingCopy as copy,
  trackingFixtures,
  trackingAssets as assets,
  type TrackingFixture,
  type TrackingState,
  type ChangeKind,
} from '@content/track-order';
import { trackingLookupSchema, type TrackingLookupValues } from '@/lib/tracking-preview';
import {
  trackingLookupAction,
  trackingNoticeAction,
} from '@/app/(track-order)/track-order/actions';
import { TrackingResults } from './result';
import { TrackingChangeDialog } from './change-dialog';
export function TrackingPageClient({ fixture }: { fixture: TrackingFixture }) {
  const [state, setState] = useState<TrackingState>(fixture.key);
  const [fields, setFields] = useState<TrackingLookupValues>({
    orderNumber: 'orderNumber' in fixture ? fixture.orderNumber : '',
    contact: 'email' in fixture ? fixture.email : '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof TrackingLookupValues, string>>>({});
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');
  const [openCard, setOpenCard] = useState('mobileOpen' in fixture ? fixture.mobileOpen : '');
  const [change, setChange] = useState<ChangeKind | null>(
    'openRequest' in fixture && fixture.openRequest ? 'email' : null,
  );
  const trigger = useRef<HTMLElement | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const current = trackingFixtures[state];
  const result = 'order' in current ? current : null;
  const error = 'orderNumber' in current ? current : null;
  function switchState(next: TrackingState) {
    setState(next);
    setNotice('');
    setFailure('');
    setErrors({});
    window.history.replaceState(window.history.state, '', `${copy.path}?state=${next}`);
    setOpenCard(next === 'action-needed' ? 'documents' : 'arrival');
    requestAnimationFrame(() => {
      document.getElementById('tracking-title')?.focus();
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
  }
  async function lookup() {
    if (inFlight.current) return;
    setFailure('');
    const valid = trackingLookupSchema.safeParse(fields);
    if (!valid.success) {
      const next: Partial<Record<keyof TrackingLookupValues, string>> = {};
      for (const issue of valid.error.issues) {
        if (issue.path[0] === 'orderNumber') next.orderNumber = copy.lookup.orderError;
        if (issue.path[0] === 'contact') next.contact = copy.lookup.contactError;
      }
      setErrors(next);
      requestAnimationFrame(() =>
        document
          .getElementById(next.orderNumber ? 'tracking-order-number' : 'tracking-contact')
          ?.focus(),
      );
      return;
    }
    inFlight.current = true;
    setPending(true);
    try {
      const response = await trackingLookupAction(fields);
      if (response.status === 'fixture') switchState(response.state);
      else setErrors(response.errors);
    } catch {
      setFailure(copy.feedback.failed);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  async function preview(kind: 'qr' | 'code' | 'upload') {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setFailure('');
    try {
      await trackingNoticeAction();
      setNotice(copy.feedback[kind]);
    } catch {
      setFailure(copy.feedback.failed);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  function openChange(kind: ChangeKind) {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setChange(kind);
  }
  function selectFile(selected: File) {
    if (
      selected.size > 0 &&
      selected.size <= 10 * 1024 * 1024 &&
      ['image/jpeg', 'image/png', 'application/pdf'].includes(selected.type)
    )
      void preview('upload');
    else setFailure(copy.feedback.fileError);
  }
  function input(name: keyof TrackingLookupValues, label: string, hint?: string) {
    return (
      <FormField
        id={name === 'orderNumber' ? 'tracking-order-number' : 'tracking-contact'}
        label={label}
        hint={hint}
        error={errors[name]}
      >
        <Input
          value={fields[name]}
          onChange={(e) => {
            setFields({ ...fields, [name]: e.target.value });
            setErrors({ ...errors, [name]: undefined });
          }}
          placeholder={
            name === 'orderNumber' ? copy.lookup.orderPlaceholder : copy.lookup.contactPlaceholder
          }
          maxLength={254}
          autoComplete="off"
        />
      </FormField>
    );
  }
  return (
    <>
      <main id="tracking-main" tabIndex={-1}>
        {result ? (
          <TrackingResults
            fixture={result}
            openCard={openCard}
            onCard={(id) => (id === 'lookup' ? switchState('lookup') : setOpenCard(id))}
            onChange={openChange}
            onUpload={(selected) => (selected ? selectFile(selected) : file.current?.click())}
            onNotice={(kind) => void preview(kind)}
            feedback={
              notice || failure ? (
                <div
                  className="cp-container cp-tracking-feedback"
                  role={failure ? 'alert' : 'status'}
                >
                  {failure || notice}
                </div>
              ) : null
            }
          />
        ) : (
          <>
            <section className="cp-tracking-lookup-hero">
              <div className="cp-container">
                <p className="cp-tracking-eyebrow">{copy.lookup.eyebrow}</p>
                <h1 id="tracking-title" tabIndex={-1}>
                  {copy.lookup.heading}
                </h1>
                <p>{copy.lookup.intro}</p>
              </div>
              <form
                className={error ? 'cp-tracking-error-card' : 'cp-tracking-lookup-card'}
                data-error={error?.key}
                noValidate
                method="post"
                onSubmit={(event) => {
                  event.preventDefault();
                  void lookup();
                }}
              >
                <fieldset disabled={pending}>
                  {error ? (
                    <>
                      <h2>{copy.errors.heading}</h2>
                      <div className="cp-tracking-error-notice" data-error={error.key} role="alert">
                        <CpAsset
                          asset={
                            error.key === 'not-found'
                              ? assets.notFound
                              : error.key === 'too-many-tries'
                                ? assets.throttle
                                : assets.expired
                          }
                        />
                        <div>
                          <strong>{error.title}</strong>
                          <p>{error.description}</p>
                        </div>
                      </div>
                    </>
                  ) : null}
                  {error?.key === 'code-expired' ? (
                    <>
                      <div
                        className="cp-tracking-code"
                        role="group"
                        aria-label={copy.errors.codeLabel}
                      >
                        {Array.from({ length: 6 }, (_, i) => (
                          <span key={i} aria-hidden="true">
                            {copy.errors.dot}
                          </span>
                        ))}
                      </div>
                      <CpButton
                        type="button"
                        onClick={() => void preview('code')}
                        disabled={pending}
                      >
                        {copy.errors.newCode}
                      </CpButton>
                    </>
                  ) : (
                    <>
                      {input(
                        'orderNumber',
                        copy.lookup.orderLabel,
                        error ? undefined : copy.lookup.orderHint,
                      )}
                      {input('contact', error ? copy.errors.emailLabel : copy.lookup.contactLabel)}
                      {error?.key === 'too-many-tries' ? (
                        <CpButton asChild tone="outline">
                          <a href={copy.destinations.contact}>{copy.errors.throttleHelp}</a>
                        </CpButton>
                      ) : (
                        <CpButton type="submit" disabled={pending}>
                          {pending
                            ? copy.lookup.pending
                            : error
                              ? copy.errors.retry
                              : copy.lookup.submit}
                        </CpButton>
                      )}
                      {error ? (
                        <p className="cp-tracking-error-help">
                          {error.key === 'too-many-tries' ? (
                            copy.errors.urgent
                          ) : (
                            <>
                              {copy.errors.missingPrefix}
                              <a href={copy.destinations.contact}>{copy.errors.whatsapp}</a>
                              {copy.errors.orCall}
                            </>
                          )}
                          <a href={copy.destinations.contact}>{copy.errors.phone}</a>
                          {copy.errors.period}
                        </p>
                      ) : (
                        <div className="cp-tracking-lookup-help">
                          <p>{copy.lookup.missing}</p>
                          <CpButton asChild tone="outline-brand">
                            <a href={copy.destinations.contact}>{copy.lookup.help}</a>
                          </CpButton>
                        </div>
                      )}
                    </>
                  )}
                  {failure ? (
                    <p className="cp-tracking-inline-error" role="alert">
                      {failure}
                    </p>
                  ) : null}
                  {notice ? (
                    <p className="cp-tracking-preview-notice" role="status">
                      {notice}
                    </p>
                  ) : null}
                </fieldset>
              </form>
            </section>
            <section className="cp-container cp-tracking-meanings">
              <h2>{copy.meanings.title}</h2>
              <ol>
                {copy.meanings.cards.map((card) => (
                  <li key={card.number} data-tone={card.tone}>
                    <span>{card.number}</span>
                    <div>
                      <h3>{card.title}</h3>
                      <p>{card.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <section className="cp-container cp-tracking-help-wrap">
              <div className="cp-tracking-help">
                <CpImageSlot
                  tone="on-blue"
                  icon={assets.imageInverse}
                  label={copy.imageLabel}
                  caption={copy.help.caption}
                />
                <div>
                  <h2>{copy.help.title}</h2>
                  <p>{copy.help.description}</p>
                </div>
                <CpButton asChild scale="large">
                  <a href={copy.destinations.contact}>{copy.help.button}</a>
                </CpButton>
              </div>
            </section>
          </>
        )}
        <input
          ref={file}
          hidden
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          aria-label={copy.action.upload}
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) selectFile(selected);
            e.target.value = '';
          }}
        />
      </main>
      {result && change ? (
        <TrackingChangeDialog
          order={result.order}
          kind={change}
          onClose={() => setChange(null)}
          onReturnFocus={() => {
            if (trigger.current?.isConnected) trigger.current.focus();
            else document.getElementById('tracking-title')?.focus();
          }}
        />
      ) : null}
    </>
  );
}
