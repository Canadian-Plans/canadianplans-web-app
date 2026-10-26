'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TrackingOrderDetail, TrackingOrderSummary } from '@canadian-plans/contracts';
import { FormField, Input } from '@canadian-plans/ui';
import { CpButton } from '@canadian-plans/ui/canadian-plans';
import { trackCopy as copy } from '@content/track';
import { useHumanChallenge } from '@/components/shared/human-challenge';
import { fillTemplate } from '@/lib/tracking-view';
import {
  loadTrackedOrder,
  loadTrackedOrders,
  requestTrackingCode,
  signOutTracking,
  verifyTrackingCode,
} from '@/app/(track-order)/track/actions';
import { TrackOrderDetail } from './order-detail';
import { TrackOrderList } from './order-list';

type View =
  | { phase: 'checking' }
  | { phase: 'lookup' }
  | { phase: 'code' }
  | { phase: 'list'; orders: TrackingOrderSummary[] }
  | { phase: 'detail'; order: TrackingOrderDetail };

const ORDER_PARAM = 'order';

/** Keeps the open order in the address bar (a reference, never contact data). */
function setOrderParam(reference: string | undefined) {
  const url = new URL(window.location.href);
  if (reference) url.searchParams.set(ORDER_PARAM, reference);
  else url.searchParams.delete(ORDER_PARAM);
  window.history.replaceState(window.history.state, '', url);
}

function focusTitle() {
  requestAnimationFrame(() => {
    document.getElementById('tracking-title')?.focus();
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
}

/**
 * Email-only tracking: the customer proves their email with a six-digit code,
 * then browses every order placed with it on this website. Every request goes
 * through a server action; the page holds no credential or grant.
 */
export function TrackPageClient({ hasSession }: { hasSession: boolean }) {
  const human = useHumanChallenge();
  const [view, setView] = useState<View>({ phase: hasSession ? 'checking' : 'lookup' });
  const [email, setEmail] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState<string>();
  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  const expired = useCallback(() => {
    setOrderParam(undefined);
    setView({ phase: 'lookup' });
    setMessage(copy.session.expired);
    focusTitle();
  }, []);

  const showList = useCallback(async (): Promise<boolean> => {
    const result = await loadTrackedOrders();
    if (!result.ok) {
      if (result.code === 'session_expired') expired();
      else setMessage(result.message);
      return false;
    }
    setOrderParam(undefined);
    setView({ phase: 'list', orders: result.data });
    focusTitle();
    return true;
  }, [expired]);

  const openOrder = useCallback(
    async (reference: string, focus = true): Promise<boolean> => {
      const result = await loadTrackedOrder(reference);
      if (!result.ok) {
        if (result.code === 'session_expired') expired();
        else setMessage(result.message);
        return false;
      }
      setMessage('');
      setOrderParam(reference);
      setView({ phase: 'detail', order: result.data });
      if (focus) focusTitle();
      return true;
    },
    [expired],
  );

  useEffect(() => {
    if (!hasSession) return;
    void (async () => {
      // A valid grant cookie resumes the session, including an open order.
      const reference = new URL(window.location.href).searchParams.get(ORDER_PARAM);
      if (reference && (await openOrder(reference))) return;
      const result = await loadTrackedOrders();
      if (result.ok) setView({ phase: 'list', orders: result.data });
      else setView({ phase: 'lookup' });
    })();
  }, [hasSession, openOrder]);

  async function guarded(work: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      await work();
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  function requestCode(resend = false) {
    return guarded(async () => {
      setMessage('');
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
        setFieldError(copy.lookup.emailError);
        requestAnimationFrame(() => document.getElementById('track-email')?.focus());
        return;
      }
      const result = await human.run('tracking-request', (turnstileToken) =>
        requestTrackingCode({ email: email.trim(), turnstileToken }),
      );
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setCode('');
      setNotice(resend ? copy.code.resent : '');
      setView({ phase: 'code' });
      focusTitle();
    });
  }

  function verify() {
    return guarded(async () => {
      setMessage('');
      if (!/^\d{6}$/.test(code)) {
        setFieldError(copy.code.error);
        requestAnimationFrame(() => document.getElementById('track-code')?.focus());
        return;
      }
      const result = await human.run('tracking-verify', (turnstileToken) =>
        verifyTrackingCode({ email: email.trim(), code, turnstileToken }),
      );
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setVerifiedEmail(email.trim().toLowerCase());
      setNotice('');
      await showList();
    });
  }

  if (view.phase === 'checking')
    return (
      <main id="tracking-main" tabIndex={-1}>
        <p className="cp-container cp-track-loading" role="status">
          {copy.loading}
        </p>
      </main>
    );

  if (view.phase === 'list')
    return (
      <main id="tracking-main" tabIndex={-1}>
        {message ? (
          <p className="cp-container cp-tracking-feedback" role="alert">
            {message}
          </p>
        ) : null}
        <TrackOrderList
          email={verifiedEmail}
          orders={view.orders}
          onOpen={(reference) => void guarded(async () => void (await openOrder(reference)))}
          onSignOut={() =>
            void guarded(async () => {
              await signOutTracking();
              setVerifiedEmail(undefined);
              setView({ phase: 'lookup' });
              focusTitle();
            })
          }
        />
      </main>
    );

  if (view.phase === 'detail')
    return (
      <main id="tracking-main" tabIndex={-1}>
        {message ? (
          <p className="cp-container cp-tracking-feedback" role="alert">
            {message}
          </p>
        ) : null}
        <TrackOrderDetail
          key={view.order.reference}
          order={view.order}
          onBack={() => void guarded(async () => void (await showList()))}
          onRefresh={async () => void (await openOrder(view.order.reference, false))}
          onSessionExpired={expired}
        />
      </main>
    );

  const codeStep = view.phase === 'code';
  return (
    <main id="tracking-main" tabIndex={-1}>
      <section className="cp-tracking-lookup-hero">
        <div className="cp-container">
          <p className="cp-tracking-eyebrow">{copy.lookup.eyebrow}</p>
          <h1 id="tracking-title" tabIndex={-1}>
            {codeStep ? copy.code.heading : copy.lookup.heading}
          </h1>
          <p>
            {codeStep ? fillTemplate(copy.code.sent, { email: email.trim() }) : copy.lookup.intro}
          </p>
        </div>
        <form
          className="cp-tracking-lookup-card"
          noValidate
          method="post"
          onSubmit={(event) => {
            event.preventDefault();
            void (codeStep ? verify() : requestCode());
          }}
        >
          {human.challenge}
          <fieldset disabled={pending}>
            {codeStep ? (
              <FormField id="track-code" label={copy.code.label} error={fieldError}>
                <Input
                  value={code}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                    setFieldError('');
                  }}
                />
              </FormField>
            ) : (
              <FormField id="track-email" label={copy.lookup.emailLabel} error={fieldError}>
                <Input
                  value={email}
                  type="email"
                  autoComplete="email"
                  placeholder={copy.lookup.emailPlaceholder}
                  maxLength={254}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setFieldError('');
                  }}
                />
              </FormField>
            )}
            <CpButton type="submit" disabled={pending}>
              {codeStep
                ? pending
                  ? copy.code.pending
                  : copy.code.submit
                : pending
                  ? copy.lookup.pending
                  : copy.lookup.submit}
            </CpButton>
            {codeStep ? (
              <div className="cp-track-code-actions">
                <button type="button" onClick={() => void requestCode(true)}>
                  {copy.code.resend}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setView({ phase: 'lookup' });
                    setMessage('');
                    setNotice('');
                    focusTitle();
                  }}
                >
                  {copy.code.change}
                </button>
              </div>
            ) : (
              <div className="cp-tracking-lookup-help">
                <p>{copy.lookup.help}</p>
                <CpButton asChild tone="outline-brand">
                  <a href={copy.destinations.contact}>{copy.lookup.helpLink}</a>
                </CpButton>
              </div>
            )}
            {message ? (
              <p className="cp-tracking-inline-error" role="alert">
                {message}
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
    </main>
  );
}
