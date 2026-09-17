'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import type { Quote, RawAttribution, WebsiteOffer } from '@canadian-plans/contracts';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FileDrop,
  FormField,
  Input,
  ReviewCard,
  Stepper,
} from '@canadian-plans/ui';

import { requestCallback, requestQuote, saveDetails, saveDocuments, submitOrder } from './actions';
import type { ActionResult, OrderDetailsInput, OrderFieldErrors } from './types';

const STEPS = [
  { id: 'plan', label: 'Plan' },
  { id: 'details', label: 'Details' },
  { id: 'documents', label: 'Documents' },
  { id: 'review', label: 'Review' },
  { id: 'confirmation', label: 'Confirmation' },
] as const;

const CHECKLIST_LABELS: Record<string, string> = {
  passport: 'Passport',
  visa: 'Visa or permit',
  address_proof: 'Proof of address',
  none: 'No documents required',
};

const EMPTY_DETAILS: OrderDetailsInput = {
  fullName: '',
  email: '',
  phone: '',
  countryCode: '',
  currentCountry: '',
  destination: '',
  arrivalDate: '',
};

export interface OrderFormProps {
  offers: readonly WebsiteOffer[];
  selected: WebsiteOffer | undefined;
  attribution: RawAttribution;
  /** Disclosure version recorded with the saved draft (REQ 17). */
  consentVersion: string;
  hasDraft: boolean;
}

function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(amountMinor / 100);
}

function checklistLabel(key: string): string {
  return CHECKLIST_LABELS[key] ?? key.replace(/_/g, ' ');
}

/** Maps a validated field to the element id the error-summary link targets. */
const FIELD_IDS: Record<string, string> = {
  fullName: 'order-full-name',
  email: 'order-email',
  phone: 'order-phone',
  countryCode: 'order-country-code',
  currentCountry: 'order-current-country',
  destination: 'order-destination',
  arrivalDate: 'order-arrival-date',
  terms: 'order-terms',
};

function needsDocuments(keys: readonly string[]): boolean {
  return keys.length > 0 && !keys.every((key) => key === 'none');
}

function validateDetails(details: OrderDetailsInput): OrderFieldErrors {
  const errors: OrderFieldErrors = {};
  if (details.fullName.trim().length === 0) errors.fullName = 'Enter your full name.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(details.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (details.phone.trim().length < 5) errors.phone = 'Enter your phone number.';
  if (!/^[A-Za-z]{2}$/.test(details.countryCode.trim())) {
    errors.countryCode = 'Use the two-letter country code, for example BD.';
  }
  if (details.currentCountry.trim().length === 0) {
    errors.currentCountry = 'Enter the country you are in now.';
  }
  if (details.destination.trim().length === 0) {
    errors.destination = 'Enter your destination in Canada.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(details.arrivalDate)) {
    errors.arrivalDate = 'Enter your arrival date.';
  }
  return errors;
}

export function OrderForm({
  offers,
  selected,
  attribution,
  consentVersion,
  hasDraft,
}: OrderFormProps) {
  const [stepIndex, setStepIndexState] = useState(selected ? 1 : 0);
  const [details, setDetails] = useState<OrderDetailsInput>(EMPTY_DETAILS);
  const [fieldErrors, setFieldErrors] = useState<OrderFieldErrors>({});
  const [acknowledged, setAcknowledged] = useState(false);
  const [quote, setQuote] = useState<Quote | undefined>(undefined);
  const [quoteFailed, setQuoteFailed] = useState<string | undefined>(undefined);
  const [callbackRequested, setCallbackRequested] = useState(false);
  const [reference, setReference] = useState<string | undefined>(undefined);
  const [orderError, setOrderError] = useState<{ code: string; message: string } | undefined>(
    undefined,
  );
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);

  /** Moves to a step and focuses its content, so keyboard users follow the flow. */
  function goToStep(index: number): void {
    setStepIndexState(index);
    window.setTimeout(() => stepRef.current?.focus(), 0);
  }

  const documentKeys = selected?.commercial.documentChecklist ?? [];
  const documentsRequired = needsDocuments(documentKeys);

  function focusSummary(): void {
    // The summary is rendered by this same state update; focus on the next tick.
    window.setTimeout(() => summaryRef.current?.focus(), 0);
  }

  function setField(id: keyof OrderDetailsInput, value: string): void {
    setDetails((current) => ({ ...current, [id]: value }));
  }

  function applyFailure(result: Extract<ActionResult<unknown>, { ok: false }>): void {
    if (result.code === 'validation_error' && result.fieldErrors) {
      setFieldErrors(result.fieldErrors);
      setOrderError(undefined);
      focusSummary();
      return;
    }
    setOrderError({ code: result.code, message: result.message });
    focusSummary();
  }

  async function handleDetails(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selected) return;
    const errors = validateDetails(details);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      focusSummary();
      return;
    }
    setBusy(true);
    const result = await saveDetails({
      details,
      documentKeys,
      productId: selected.productId,
      attribution,
      consentVersion,
    });
    setBusy(false);
    if (!result.ok) {
      applyFailure(result);
      return;
    }
    setFieldErrors({});
    setOrderError(undefined);
    goToStep(2);
  }

  async function handleDocuments(): Promise<void> {
    if (documentsRequired && !acknowledged) {
      setOrderError({
        code: 'validation_error',
        message: 'Confirm that you have read the document checklist to continue.',
      });
      focusSummary();
      return;
    }
    setBusy(true);
    const result = await saveDocuments({ details, documentKeys, acknowledged: true });
    setBusy(false);
    if (!result.ok) {
      applyFailure(result);
      return;
    }
    await loadQuote();
  }

  async function loadQuote(): Promise<void> {
    setBusy(true);
    setQuoteFailed(undefined);
    setOrderError(undefined);
    const result = await requestQuote();
    setBusy(false);
    goToStep(3);
    if (result.ok) {
      setQuote(result.data.quote);
      return;
    }
    setQuote(undefined);
    if (result.code === 'draft_expired' || result.code === 'offer_unavailable') {
      setOrderError({ code: result.code, message: result.message });
      return;
    }
    setQuoteFailed(result.message);
  }

  async function performSubmit(): Promise<void> {
    if (!quote) return;
    setBusy(true);
    setOrderError(undefined);
    const result = await submitOrder({
      quoteId: quote.id,
      termsVersion: quote.termsVersion,
      marketingOptIn,
      details,
      documentKeys,
    });
    setBusy(false);
    if (result.ok) {
      // The only path to the confirmation step: a server-issued reference.
      setReference(result.data.reference);
      goToStep(4);
      return;
    }
    if (result.code === 'validation_error' && result.fieldErrors) {
      setFieldErrors(result.fieldErrors);
      focusSummary();
      return;
    }
    if (result.code === 'quote_restart') {
      setQuote(undefined);
      await loadQuote();
      return;
    }
    setOrderError({ code: result.code, message: result.message });
    focusSummary();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!termsAccepted) {
      setFieldErrors({ terms: 'Please accept the terms to place the order.' });
      focusSummary();
      return;
    }
    await performSubmit();
  }

  async function handleCallback(): Promise<void> {
    setBusy(true);
    const result = await requestCallback({ details, documentKeys });
    setBusy(false);
    if (result.ok) {
      setCallbackRequested(true);
      setOrderError(undefined);
      return;
    }
    applyFailure(result);
  }

  const summaryItems = Object.entries(fieldErrors).map(([field, message]) => ({
    field,
    message: message ?? 'Please check this field.',
  }));
  const showSummary = summaryItems.length > 0 || orderError !== undefined;

  function renderPlanStep() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-xl">Choose a plan</h2>
          </CardTitle>
          <CardDescription>
            Prices are confirmed by our server when you reach the review step.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {offers.length === 0 ? (
            <p>No plans are available right now. Please try again later.</p>
          ) : (
            <ul className="space-y-3">
              {offers.map((offer) => (
                <li key={offer.productId}>
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        <h3 className="text-lg">{offer.commercial.offerName}</h3>
                      </CardTitle>
                      <CardDescription>{offer.commercial.productTitle}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center justify-between gap-4">
                      <p className="font-medium">
                        {formatMoney(
                          offer.commercial.recurringChargeAmountMinor,
                          offer.commercial.currency,
                        )}{' '}
                        / month
                      </p>
                      <Button asChild>
                        <Link href={`/order?plan=${encodeURIComponent(offer.productId)}`}>
                          Select {offer.commercial.offerName}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    );
  }

  function renderDetailsStep() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-xl">Your details</h2>
          </CardTitle>
          <CardDescription>We&apos;ll save your details so you can continue later.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleDetails} noValidate>
            <FormField id="order-full-name" label="Full name" required error={fieldErrors.fullName}>
              <Input
                value={details.fullName}
                onChange={(event) => setField('fullName', event.target.value)}
                autoComplete="name"
              />
            </FormField>
            <FormField id="order-email" label="Email" required error={fieldErrors.email}>
              <Input
                type="email"
                value={details.email}
                onChange={(event) => setField('email', event.target.value)}
                autoComplete="email"
              />
            </FormField>
            <div className="flex flex-wrap gap-4">
              <div className="w-28">
                <FormField
                  id="order-country-code"
                  label="Code"
                  required
                  hint="ISO country, e.g. BD"
                  error={fieldErrors.countryCode}
                >
                  <Input
                    value={details.countryCode}
                    onChange={(event) => setField('countryCode', event.target.value.toUpperCase())}
                    autoComplete="country"
                    maxLength={2}
                  />
                </FormField>
              </div>
              <div className="min-w-[12rem] flex-1">
                <FormField id="order-phone" label="Phone" required error={fieldErrors.phone}>
                  <Input
                    type="tel"
                    value={details.phone}
                    onChange={(event) => setField('phone', event.target.value)}
                    autoComplete="tel"
                  />
                </FormField>
              </div>
            </div>
            <FormField
              id="order-current-country"
              label="Country you are in now"
              required
              error={fieldErrors.currentCountry}
            >
              <Input
                value={details.currentCountry}
                onChange={(event) => setField('currentCountry', event.target.value)}
                autoComplete="country-name"
              />
            </FormField>
            <FormField
              id="order-destination"
              label="Destination in Canada"
              required
              error={fieldErrors.destination}
            >
              <Input
                value={details.destination}
                onChange={(event) => setField('destination', event.target.value)}
                autoComplete="address-level2"
              />
            </FormField>
            <FormField
              id="order-arrival-date"
              label="Arrival date"
              required
              error={fieldErrors.arrivalDate}
            >
              <Input
                type="date"
                value={details.arrivalDate}
                onChange={(event) => setField('arrivalDate', event.target.value)}
              />
            </FormField>
            {hasDraft ? (
              <p className="text-sm">We found your saved details and will update them.</p>
            ) : null}
            <div className="flex flex-wrap gap-4">
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Continue'}
              </Button>
              <Button type="button" variant="outline" onClick={() => goToStep(0)}>
                Back
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  function renderDocumentsStep() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-xl">Documents</h2>
          </CardTitle>
          <CardDescription>
            {documentsRequired
              ? 'This plan asks for documents before activation. Uploads open in a later release; you can continue now.'
              : 'This plan does not require any documents.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {documentsRequired ? (
            <ul className="space-y-4">
              {documentKeys.map((key) => (
                <li key={key}>
                  <FileDrop
                    id={`order-document-${key}`}
                    label={checklistLabel(key)}
                    hint="PDF, JPG or PNG, up to 10 MB."
                    accept="application/pdf,image/jpeg,image/png"
                    note="Uploads are not enabled yet — nothing is sent from this step."
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p>Nothing to upload for this plan.</p>
          )}
          {documentsRequired ? (
            <div className="flex items-start gap-3">
              <input
                id="order-documents-ack"
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                className="mt-1"
              />
              <label htmlFor="order-documents-ack">I have read the document checklist.</label>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-4">
            <Button type="button" onClick={handleDocuments} disabled={busy}>
              {busy ? 'Saving…' : 'Continue'}
            </Button>
            <Button type="button" variant="outline" onClick={() => goToStep(1)}>
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderQuoteFailure() {
    if (callbackRequested) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="text-xl">Callback requested</h2>
            </CardTitle>
            <CardDescription>
              We&apos;ve saved your details. Our team will contact you with the current price. No
              order has been created.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-xl">We couldn&apos;t confirm the price</h2>
          </CardTitle>
          <CardDescription>{quoteFailed}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button type="button" onClick={handleCallback} disabled={busy}>
            Request a callback
          </Button>
          <Button type="button" variant="outline" onClick={loadQuote} disabled={busy}>
            Try the price again
          </Button>
        </CardContent>
      </Card>
    );
  }

  function renderReviewStep() {
    if (!quote) return renderQuoteFailure();
    return (
      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <h2 className="text-xl">Review and confirm</h2>
        <ReviewCard title="Plan" onEdit={() => goToStep(0)}>
          <p>{selected?.commercial.offerName}</p>
          <p className="text-sm">{selected?.commercial.productTitle}</p>
        </ReviewCard>
        <ReviewCard title="Your details" onEdit={() => goToStep(1)}>
          <dl className="grid gap-1 sm:grid-cols-2">
            <dt>Name</dt>
            <dd>{details.fullName}</dd>
            <dt>Email</dt>
            <dd>{details.email}</dd>
            <dt>Phone</dt>
            <dd>
              +{details.countryCode} {details.phone}
            </dd>
            <dt>Current country</dt>
            <dd>{details.currentCountry}</dd>
            <dt>Destination</dt>
            <dd>{details.destination}</dd>
            <dt>Arrival</dt>
            <dd>{details.arrivalDate}</dd>
          </dl>
        </ReviewCard>
        <ReviewCard title="Price" onEdit={() => goToStep(2)}>
          <ul className="space-y-1">
            {quote.charges.map((charge) => (
              <li key={charge.code} className="flex justify-between gap-4">
                <span>{charge.label}</span>
                <span>{formatMoney(charge.amount.amountMinor, charge.amount.currency)}</span>
              </li>
            ))}
            <li className="flex justify-between gap-4 font-medium">
              <span>Total</span>
              <span>{formatMoney(quote.total.amountMinor, quote.total.currency)}</span>
            </li>
          </ul>
        </ReviewCard>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <input
              id="order-terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              aria-invalid={fieldErrors.terms ? true : undefined}
              aria-describedby={fieldErrors.terms ? 'order-terms-error' : undefined}
              className="mt-1"
            />
            <label htmlFor="order-terms">I accept the terms, version {quote.termsVersion}.</label>
          </div>
          {fieldErrors.terms ? (
            <p id="order-terms-error" role="alert">
              {fieldErrors.terms}
            </p>
          ) : null}
          <div className="flex items-start gap-3">
            <input
              id="order-marketing"
              type="checkbox"
              checked={marketingOptIn}
              onChange={(event) => setMarketingOptIn(event.target.checked)}
              className="mt-1"
            />
            <label htmlFor="order-marketing">
              Send me occasional updates. You can unsubscribe at any time.
            </label>
          </div>
        </div>
        {orderError ? (
          <div role="alert" className="space-y-2">
            <p>{orderError.message}</p>
            {orderError.code === 'not_saved' ? (
              <Button type="button" onClick={performSubmit} disabled={busy}>
                {busy ? 'Trying again…' : 'Try again'}
              </Button>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-4">
          <Button type="submit" disabled={busy}>
            {busy ? 'Placing your order…' : 'Place order'}
          </Button>
          <Button type="button" variant="outline" onClick={() => goToStep(2)}>
            Back
          </Button>
        </div>
      </form>
    );
  }

  function renderConfirmation() {
    if (!reference) {
      // Defensive: the confirmation step is unreachable without a reference.
      return (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="text-xl">Not saved</h2>
            </CardTitle>
            <CardDescription>
              Your order was not saved. Please try again — no order exists yet.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-xl">Order received</h2>
          </CardTitle>
          <CardDescription>Keep this reference: it is how we track your order.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold" data-testid="order-reference">
            {reference}
          </p>
          <p className="mt-2 text-sm">
            We&apos;ve emailed a confirmation to {details.email}. We&apos;ll contact you if we need
            anything else.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Stepper steps={STEPS} currentStepId={STEPS[stepIndex]?.id ?? 'plan'} />
      {showSummary && stepIndex !== 4 ? (
        <div
          ref={summaryRef}
          role="alert"
          tabIndex={-1}
          aria-labelledby="order-error-summary-title"
          className="rounded-md border border-destructive p-4"
        >
          <h2 id="order-error-summary-title" className="font-medium">
            There is a problem
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {summaryItems.map((item) => (
              <li key={item.field}>
                <a href={`#${FIELD_IDS[item.field] ?? 'order-full-name'}`}>{item.message}</a>
              </li>
            ))}
            {orderError ? <li key="order">{orderError.message}</li> : null}
          </ul>
        </div>
      ) : null}

      <div ref={stepRef} tabIndex={-1} className="outline-none">
        {stepIndex === 0 ? renderPlanStep() : null}
        {stepIndex === 1 ? renderDetailsStep() : null}
        {stepIndex === 2 ? renderDocumentsStep() : null}
        {stepIndex === 3 ? renderReviewStep() : null}
        {stepIndex === 4 ? renderConfirmation() : null}
      </div>
    </div>
  );
}
