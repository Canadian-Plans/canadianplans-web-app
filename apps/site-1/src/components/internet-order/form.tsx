'use client';
import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import { FormField, Input } from '@canadian-plans/ui';
import { CpAsset, CpButton } from '@canadian-plans/ui/canadian-plans';
import type { InternetPlan } from '@content/home-internet';
import { internetOrderAssets, internetOrderCopy as copy } from '@content/internet-order';
import {
  emptyInternetOrder,
  validateInternetOrder,
  type InternetOrderValues,
  type InternetOrderErrors,
} from '@/lib/internet-order-preview';
import { internetOrderPreviewAction } from '@/app/(internet-order)/order/home-internet/actions';
import { OrderConfirmation } from '@/components/shared/order-confirmation';
import { InternetOrderSummary } from './summary';
type TextField = Exclude<keyof InternetOrderValues, 'contactConsent' | 'terms'>;
export function HomeInternetOrderForm({ plan }: { plan: InternetPlan }) {
  const [values, setValues] = useState<InternetOrderValues>(emptyInternetOrder);
  const [errors, setErrors] = useState<InternetOrderErrors>({});
  const [failure, setFailure] = useState('');
  const [completed, setCompleted] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const busy = useRef(false);
  const returning = useRef(false);
  useEffect(() => {
    if (completed) document.getElementById('order-preview-title')?.focus();
    else if (returning.current) {
      document.getElementById('io-firstName')?.focus();
      returning.current = false;
    }
  }, [completed]);
  function update<K extends keyof InternetOrderValues>(key: K, value: InternetOrderValues[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
    setFailure('');
  }
  function showErrors(next: InternetOrderErrors) {
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) form.current?.querySelector<HTMLElement>(`#io-${first}`)?.focus();
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const next = validateInternetOrder(values);
    showErrors(next);
    setFailure('');
    if (Object.keys(next).length) return;
    busy.current = true;
    startTransition(async () => {
      try {
        const result = await internetOrderPreviewAction(values);
        if (result.status === 'preview') setCompleted(true);
        else showErrors(result.errors);
      } catch {
        setFailure(copy.feedback.retry);
      } finally {
        busy.current = false;
      }
    });
  }
  function field(key: TextField, type: 'text' | 'email' | 'tel' = 'text') {
    const content = copy.fields[key];
    const hint = 'hint' in content ? content.hint : undefined;
    return (
      <FormField
        id={`io-${key}`}
        label={
          key === 'callTime' ? (
            <>
              {content.label} <span className="cp-io-optional">{copy.optional}</span>
            </>
          ) : (
            content.label
          )
        }
        hint={
          key === 'birthDate' ? (
            <span className="cp-io-lock-hint">
              <CpAsset asset={internetOrderAssets.lock} />
              <span>{hint}</span>
            </span>
          ) : key === 'installDate' ? (
            <span className="cp-io-install-hint">
              {copy.installHintLines.map((line) => (
                <span key={line}>{line} </span>
              ))}
            </span>
          ) : (
            hint
          )
        }
        error={errors[key]}
      >
        {key === 'province' ? (
          <select
            value={values.province}
            onChange={(event) => update('province', event.target.value)}
          >
            {copy.provinces.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        ) : key === 'callTime' ? (
          <select
            value={values.callTime}
            onChange={(event) => update('callTime', event.target.value)}
          >
            <option value="">{copy.fields.callTime.placeholder}</option>
            {copy.callTimes.map((time) => (
              <option key={time.value} value={time.value}>
                {time.label}
              </option>
            ))}
          </select>
        ) : (
          <Input
            type={type}
            name={key}
            value={values[key]}
            placeholder={'placeholder' in content ? content.placeholder : undefined}
            autoComplete={
              key === 'firstName'
                ? 'given-name'
                : key === 'lastName'
                  ? 'family-name'
                  : key === 'email'
                    ? 'email'
                    : key === 'phone'
                      ? 'tel'
                      : key === 'street'
                        ? 'street-address'
                        : key === 'city'
                          ? 'address-level2'
                          : key === 'postalCode'
                            ? 'postal-code'
                            : 'off'
            }
            inputMode={key === 'birthDate' || key === 'installDate' ? 'numeric' : undefined}
            onChange={(event) => update(key, event.target.value)}
          />
        )}
      </FormField>
    );
  }
  if (completed)
    return (
      <div className="cp-io-form">
        <OrderConfirmation
          kind="preview"
          onBack={() => {
            returning.current = true;
            setCompleted(false);
          }}
        />
      </div>
    );
  return (
    <form
      ref={form}
      noValidate
      method="post"
      onSubmit={submit}
      className="cp-io-form"
      aria-labelledby="io-title"
      aria-busy={pending}
    >
      <p className="cp-io-eyebrow">{copy.eyebrow}</p>
      <h1 id="io-title">{copy.heading}</h1>
      <p className="cp-io-intro">{copy.intro}</p>
      {Object.values(errors).some(Boolean) || failure ? (
        <div role="alert" className="cp-io-errors">
          <h2>{copy.feedback.title}</h2>
          {failure ? (
            <p>{failure}</p>
          ) : (
            <ul>
              {Object.entries(errors)
                .filter(([, message]) => message)
                .map(([key, message]) => (
                  <li key={key}>
                    <a href={`#io-${key}`}>{message}</a>
                  </li>
                ))}
            </ul>
          )}
        </div>
      ) : null}
      <h2>{copy.personal}</h2>
      <div className="cp-io-row cp-io-two">
        {field('firstName')}
        {field('lastName')}
      </div>
      <div className="cp-io-row cp-io-two">
        {field('email', 'email')}
        {field('phone', 'tel')}
      </div>
      <div className="cp-io-row cp-io-dob">{field('birthDate')}</div>
      <hr />
      <h2>{copy.address}</h2>
      <div className="cp-io-row">{field('street')}</div>
      <div className="cp-io-row cp-io-three">
        {field('city')}
        {field('province')}
        {field('postalCode')}
      </div>
      <div className="cp-io-row cp-io-two">
        {field('installDate')}
        {field('callTime')}
      </div>
      <hr />
      <div className="cp-io-consent">
        <label>
          <input
            type="checkbox"
            id="io-contactConsent"
            checked={values.contactConsent}
            onChange={(event) => update('contactConsent', event.target.checked)}
            aria-invalid={!!errors.contactConsent}
            aria-describedby={errors.contactConsent ? 'io-contactConsent-error' : undefined}
          />
          <span>
            <span className="cp-io-consent-mobile">
              {copy.contactMobileLines.map((line) => (
                <span key={line}>{line} </span>
              ))}
            </span>
            <span className="cp-io-consent-desktop">{copy.contactConsent}</span>
          </span>
        </label>
        {errors.contactConsent ? (
          <p id="io-contactConsent-error" role="alert">
            {errors.contactConsent}
          </p>
        ) : null}
      </div>
      <div className="cp-io-consent">
        <label>
          <input
            type="checkbox"
            id="io-terms"
            checked={values.terms}
            onChange={(event) => update('terms', event.target.checked)}
            aria-invalid={!!errors.terms}
            aria-describedby={errors.terms ? 'io-terms-error' : undefined}
          />
          <span>
            {copy.termsPrefix}
            <a href={copy.destinations.terms} target="_blank" rel="noopener noreferrer">
              {copy.terms}
            </a>
            {copy.termsJoin}
            <a href={copy.destinations.privacy} target="_blank" rel="noopener noreferrer">
              {copy.privacyWords[0]}
              <br className="cp-io-policy-break" />
              {copy.privacyWords[1]}
            </a>
            {copy.termsEnd}
          </span>
        </label>
        {errors.terms ? (
          <p id="io-terms-error" role="alert">
            {errors.terms}
          </p>
        ) : null}
      </div>
      <div className="cp-io-mobile-recap">
        <InternetOrderSummary plan={plan} recap />
      </div>
      <div className="cp-io-actions">
        <a href={copy.destinations.plans}>{copy.back}</a>
        <div>
          <CpButton type="submit" scale="large" disabled={pending}>
            {pending ? copy.pending : copy.submit}
          </CpButton>
          <p>{copy.note}</p>
        </div>
      </div>
    </form>
  );
}
