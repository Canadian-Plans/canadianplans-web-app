'use client';

import type { WebsiteOffer } from '@/lib/offers';
import Link from 'next/link';
import { useHumanChallenge } from '@/components/shared/human-challenge';
import { OrderConfirmation } from '@/components/shared/order-confirmation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  isOfferSoldIn,
  provinceCodeSchema,
  provinceNames,
  type ProvinceCode,
} from '@canadian-plans/contracts';
import type { RawAttribution } from '@canadian-plans/crm-contracts';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  NativeSelect,
  ReviewCard,
  Stepper,
} from '@canadian-plans/ui';

import { orderFormContent } from '@content/order-forms';

import { trackPlanSelected, trackRegionSelected } from '../../../lib/analytics';
import { requestCallback, requestQuote, saveDetails, saveDocuments, submitOrder } from './actions';
import {
  ORDER_DETAIL_FIELDS,
  initialDetails,
  parseOrderDetails,
  reviewRows,
  type ArrivalDetails,
  type InternetDetails,
  type MobileDetails,
  type OrderCategory,
} from './details';
import { DocumentUploads } from './document-uploads';
import { ArrivalFields, FIELD_IDS, InternetFields, MobileFields } from './fields';
import type { ActionResult, OrderDetailsInput, OrderFieldErrors, PriceSummary } from './types';
import { WaitlistForm } from './waitlist-form';

const STEPS = [
  { id: 'plan', label: 'Plan' },
  { id: 'details', label: 'Details' },
  { id: 'documents', label: 'Documents' },
  { id: 'review', label: 'Review' },
  { id: 'confirmation', label: 'Confirmation' },
] as const;

export interface OrderFormProps {
  offers: readonly WebsiteOffer[];
  selected: WebsiteOffer | undefined;
  /** The province chosen to see internet and TV plans, if any. */
  province: ProvinceCode | undefined;
  /** The plan type chosen on the plan step, if any. */
  category: OrderCategory | undefined;
  attribution: RawAttribution;
  restoredDetails: OrderDetailsInput | undefined;
}

function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(amountMinor / 100);
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const longDate = new Intl.DateTimeFormat('en-CA', { dateStyle: 'long', timeZone: 'UTC' });

/** A review value as the customer reads it: a typed date becomes "January 15, 2027". */
function reviewValue(value: string): string {
  const match = ISO_DATE.exec(value);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? value : longDate.format(date);
}

function checklistLabel(key: string): string {
  return orderFormContent.checklistLabels[key] ?? key.replace(/_/g, ' ');
}

function needsDocuments(keys: readonly string[]): boolean {
  return keys.length > 0 && !keys.every((key) => key === 'none');
}

/** The provinces that have at least one internet plan, for the picker's hint. */
function servedProvinces(offers: readonly WebsiteOffer[]): Set<ProvinceCode> {
  const served = new Set<ProvinceCode>();
  for (const offer of offers) {
    if (offer.commercial.productType !== 'internet') continue;
    for (const region of offer.commercial.regions) {
      const province = provinceCodeSchema.safeParse(region);
      if (province.success) served.add(province.data);
    }
  }
  return served;
}

export function OrderForm({
  offers,
  selected,
  province,
  category,
  attribution,
  restoredDetails,
}: OrderFormProps) {
  const human = useHumanChallenge();
  const [stepIndex, setStepIndexState] = useState(selected ? 1 : 0);
  const [details, setDetails] = useState<OrderDetailsInput>(
    () =>
      restoredDetails ??
      initialDetails(selected?.commercial ?? { productType: 'sim', regions: ['CA'] }, province),
  );
  const [fieldErrors, setFieldErrors] = useState<OrderFieldErrors>({});
  const [acknowledged, setAcknowledged] = useState(false);
  const [quote, setQuote] = useState<PriceSummary | undefined>(undefined);
  const [quoteFailed, setQuoteFailed] = useState<string | undefined>(undefined);
  const [callbackRequested, setCallbackRequested] = useState(false);
  const [reference, setReference] = useState<string | undefined>(undefined);
  const [orderError, setOrderError] = useState<{ code: string; message: string } | undefined>(
    undefined,
  );
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);

  const selectedProductId = selected?.productId;

  // One `plan_selected` per chosen plan. The conversion events are server-side
  // only, so the browser never double-counts an order.
  useEffect(() => {
    if (selectedProductId) trackPlanSelected(selectedProductId);
  }, [selectedProductId]);

  const provinceServed =
    province !== undefined &&
    offers.some(
      (offer) =>
        offer.commercial.productType === 'internet' &&
        isOfferSoldIn(offer.commercial.regions, province),
    );

  // One `region_selected` per province looked at, served or not: the count of
  // unserved provinces is what decides where to expand next.
  useEffect(() => {
    if (province) trackRegionSelected(province, provinceServed);
  }, [province, provinceServed]);

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

  /** Editing a field clears its message, so a corrected field never keeps a stale error. */
  function clearErrorsFor(patch: object): void {
    const edited = ORDER_DETAIL_FIELDS.filter((field) => field in patch);
    setFieldErrors((current) => {
      if (!edited.some((field) => current[field] !== undefined)) return current;
      const next = { ...current };
      for (const field of edited) delete next[field];
      return next;
    });
  }

  // Each form edits only its own category's fields; an edit for another
  // category (a stale event after the plan changed) is ignored.
  function patchArrival(patch: Partial<ArrivalDetails>): void {
    setDetails((current) => (current.category === 'sim' ? { ...current, ...patch } : current));
    clearErrorsFor(patch);
  }
  function patchInternet(patch: Partial<InternetDetails>): void {
    setDetails((current) => (current.category === 'internet' ? { ...current, ...patch } : current));
    clearErrorsFor(patch);
  }
  function patchMobile(patch: Partial<MobileDetails>): void {
    setDetails((current) => (current.category === 'mobile' ? { ...current, ...patch } : current));
    clearErrorsFor(patch);
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
    const checked = parseOrderDetails(details);
    if (!checked.ok) {
      setFieldErrors(checked.errors);
      focusSummary();
      return;
    }
    setBusy(true);
    let result = await human.run('lead-save', (turnstileToken) =>
      saveDetails({
        turnstileToken,
        details,
        productId: selected.productId,
        attribution,
      }),
    );
    if (!result.ok && result.code === 'retry_fresh_draft') {
      result = await human.run('lead-save', (turnstileToken) =>
        saveDetails({
          details,
          productId: selected.productId,
          attribution,
          turnstileToken,
        }),
      );
    }
    setBusy(false);
    if (!result.ok) {
      applyFailure(result);
      return;
    }
    setFieldErrors({});
    setOrderError(undefined);
    // A plan that asks for no documents has nothing to show on that step.
    if (documentsRequired) goToStep(2);
    else await handleDocuments();
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
    const result = await saveDocuments({ details });
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
    const result = await requestQuote({ category: details.category });
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
    const attempt = (turnstileToken: string) =>
      submitOrder({
        turnstileToken,
        termsVersion: quote.termsVersion,
        details,
        attribution,
      });
    let result = await human.run('lead-save', attempt);
    if (!result.ok && result.code === 'transport_retry')
      result = await human.run('lead-save', attempt);
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
    const result = await human.run('lead-save', (turnstileToken) =>
      requestCallback({ details, turnstileToken }),
    );
    setBusy(false);
    if (result.ok) {
      setCallbackRequested(true);
      setOrderError(undefined);
      return;
    }
    applyFailure(result);
  }

  const summaryItems = ORDER_DETAIL_FIELDS.flatMap((field) => {
    const message = fieldErrors[field];
    return message === undefined ? [] : [{ field, message }];
  });
  const showSummary = summaryItems.length > 0 || orderError !== undefined;

  function renderOfferCard(offer: WebsiteOffer) {
    const { commercial } = offer;
    const period = orderFormContent.planStep.perPeriod[commercial.billingPeriod ?? 'month'];
    return (
      <li key={offer.productId}>
        <Card>
          <CardHeader>
            <CardTitle>
              <h4 className="text-lg">{commercial.offerName}</h4>
            </CardTitle>
            <CardDescription>
              {commercial.presentation?.bestFor ?? commercial.productTitle}
            </CardDescription>
            <p className="pt-1">
              <span className="text-2xl font-bold tabular-nums">
                {formatMoney(commercial.recurringChargeAmountMinor, commercial.currency)}
              </span>{' '}
              <span className="text-sm text-muted-foreground">
                {commercial.currency} {period}
              </span>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {commercial.promotion ? (
              <p className="text-sm font-medium">{commercial.promotion.headline}</p>
            ) : null}
            {commercial.presentation?.features.length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {commercial.presentation.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            ) : null}
            <Button asChild className="w-full sm:w-auto">
              <Link
                href={`/order?plan=${encodeURIComponent(offer.productId)}${commercial.productType === 'internet' && province ? `&province=${province}` : ''}`}
              >
                {orderFormContent.planStep.select}
                <span className="sr-only">: {commercial.offerName}</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </li>
    );
  }

  function renderOfferGroup(title: string, group: readonly WebsiteOffer[]) {
    if (group.length === 0) return null;
    return (
      <section className="space-y-3" aria-labelledby={`plans-${title}`}>
        <h3 id={`plans-${title}`} className="text-lg font-semibold">
          {title}
        </h3>
        <ul className="space-y-3">{group.map((offer) => renderOfferCard(offer))}</ul>
      </section>
    );
  }

  /** Internet and TV are priced by province, so the visitor names theirs first. */
  function renderInternetGroup() {
    const copy = orderFormContent.planStep;
    const served = servedProvinces(offers);
    if (served.size === 0) return null;
    const internet = province
      ? offers.filter(
          (offer) =>
            offer.commercial.productType === 'internet' &&
            isOfferSoldIn(offer.commercial.regions, province),
        )
      : [];
    return (
      <section className="space-y-3" aria-labelledby="plans-internet">
        <h3 id="plans-internet" className="text-lg font-semibold">
          {copy.categories.internet}
        </h3>
        <form method="get" action="/order" className="flex flex-wrap items-end gap-4">
          <div className="min-w-[14rem] flex-1">
            <FormField
              id="order-province-picker"
              label={copy.provinceLabel}
              hint={copy.provincePrompt}
            >
              <NativeSelect name="province" defaultValue={province ?? ''}>
                <option value="">{orderFormContent.fields.province.placeholder}</option>
                {provinceCodeSchema.options.map((code) => (
                  <option key={code} value={code}>
                    {provinceNames[code]}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
          <Button type="submit" variant="outline">
            {copy.provinceApply}
          </Button>
        </form>
        {province && internet.length === 0 ? (
          <div className="space-y-3">
            <p>{copy.noInternetInProvince}</p>
            <WaitlistForm key={province} province={province} />
          </div>
        ) : null}
        {internet.length > 0 ? (
          <ul className="space-y-3">{internet.map((offer) => renderOfferCard(offer))}</ul>
        ) : null}
      </section>
    );
  }

  /** One card per plan type, so the visitor chooses what they want before any list. */
  function renderCategoryChooser(present: readonly OrderCategory[]) {
    const copy = orderFormContent.planStep;
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{copy.chooseTitle}</h3>
        <ul className="grid gap-4 sm:grid-cols-3">
          {present.map((type) => (
            <li key={type}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>
                    <h4 className="text-lg">{copy.categories[type]}</h4>
                  </CardTitle>
                  <CardDescription>{copy.categoryDescriptions[type]}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild>
                    <Link href={`/order?category=${type}`}>
                      {copy.seePlans}
                      <span className="sr-only"> for {copy.categories[type]}</span>
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function renderPlanStep() {
    const copy = orderFormContent.planStep;
    const byType = (type: OrderCategory) =>
      offers.filter((offer) => offer.commercial.productType === type);
    const present = (['internet', 'mobile', 'sim'] as const).filter(
      (type) => byType(type).length > 0,
    );
    // A province only means something for internet; one plan type needs no chooser.
    const active: OrderCategory | undefined = province
      ? 'internet'
      : (category ??
        selected?.commercial.productType ??
        (present.length === 1 ? present[0] : undefined));
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-xl">{copy.title}</h2>
          </CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {offers.length === 0 ? (
            <p>{copy.empty}</p>
          ) : (
            <>
              {active && present.length > 1 ? (
                <Link href="/order" className="inline-flex min-h-11 items-center text-sm underline">
                  ← {copy.allCategories}
                </Link>
              ) : null}
              {active === undefined ? renderCategoryChooser(present) : null}
              {active === 'mobile'
                ? renderOfferGroup(copy.categories.mobile, byType('mobile'))
                : null}
              {active === 'sim' ? renderOfferGroup(copy.categories.sim, byType('sim')) : null}
              {active === 'internet' ? renderInternetGroup() : null}
            </>
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
          <CardDescription>
            {selected ? (
              <span className="mb-1 block font-medium text-foreground">
                {selected.commercial.offerName} ·{' '}
                {formatMoney(
                  selected.commercial.recurringChargeAmountMinor,
                  selected.commercial.currency,
                )}{' '}
                {orderFormContent.planStep.perPeriod[selected.commercial.billingPeriod ?? 'month']}
              </span>
            ) : null}
            {details.category === 'sim'
              ? orderFormContent.detailsStep.savedDraft
              : orderFormContent.detailsStep.sentOnSubmit}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleDetails} noValidate>
            {details.category === 'sim' ? (
              <ArrivalFields details={details} errors={fieldErrors} onChange={patchArrival} />
            ) : null}
            {details.category === 'internet' ? (
              <InternetFields
                details={details}
                errors={fieldErrors}
                onChange={patchInternet}
                provinces={provinceCodeSchema.options.filter(
                  (code) => selected && isOfferSoldIn(selected.commercial.regions, code),
                )}
              />
            ) : null}
            {details.category === 'mobile' ? (
              <MobileFields details={details} errors={fieldErrors} onChange={patchMobile} />
            ) : null}
            {restoredDetails ? (
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
              ? 'This plan asks for documents before activation. Upload them now, or continue and send them later.'
              : 'This plan does not require any documents.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {documentsRequired ? (
            <DocumentUploads
              documentKeys={documentKeys.filter((key) => key !== 'none')}
              labelFor={checklistLabel}
            />
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
                className="mt-0.5 size-5 shrink-0 accent-primary"
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
        <ReviewCard title="Plan" onEdit={() => goToStep(0)} editLabel="Change plan">
          <p className="font-medium">{selected?.commercial.offerName}</p>
          {selected && selected.commercial.productTitle !== selected.commercial.offerName ? (
            <p className="text-sm text-muted-foreground">{selected.commercial.productTitle}</p>
          ) : null}
        </ReviewCard>
        <ReviewCard title="Your details" onEdit={() => goToStep(1)}>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-y-2">
            {reviewRows(details).map((row) => (
              <div key={row.label} className="sm:contents">
                <dt className="text-sm text-muted-foreground">{row.label}</dt>
                <dd className="font-medium break-words">{reviewValue(row.value)}</dd>
              </div>
            ))}
          </dl>
        </ReviewCard>
        <ReviewCard title="Price">
          <ul className="space-y-1">
            {quote.lines.map((line) => (
              <li key={line.label} className="flex justify-between gap-4">
                <span>{line.label}</span>
                <span>{formatMoney(line.amountMinor, quote.currency)}</span>
              </li>
            ))}
            <li className="flex justify-between gap-4 font-medium">
              <span>Total</span>
              <span>{formatMoney(quote.totalMinor, quote.currency)}</span>
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
              className="mt-0.5 size-5 shrink-0 accent-primary"
            />
            <label htmlFor="order-terms">
              I accept the{' '}
              <a href="/terms" target="_blank" rel="noopener" className="underline">
                terms
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              , version {quote.termsVersion}.
            </label>
          </div>
          {fieldErrors.terms ? (
            <p id="order-terms-error" role="alert" className="text-sm text-destructive">
              {fieldErrors.terms}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">{orderFormContent.reviewStep.reassurance}</p>
        </div>
        {orderError ? (
          <div role="alert" className="space-y-2 text-destructive">
            <p>{orderError.message}</p>
            {orderError.code === 'not_saved' || orderError.code === 'transport_retry' ? (
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
          <Button
            type="button"
            variant="outline"
            onClick={() => goToStep(documentsRequired ? 2 : 1)}
          >
            Back
          </Button>
        </div>
      </form>
    );
  }

  function renderConfirmation() {
    return reference ? (
      <OrderConfirmation kind="saved" reference={reference} email={details.email} />
    ) : (
      <OrderConfirmation kind="missing" />
    );
  }

  return (
    <div className="space-y-8">
      {human.challenge}
      <Stepper
        steps={STEPS.filter((step) => step.id !== 'documents' || documentsRequired)}
        currentStepId={STEPS[stepIndex]?.id ?? 'plan'}
      />
      {showSummary && stepIndex !== 4 ? (
        <div
          ref={summaryRef}
          role="alert"
          tabIndex={-1}
          aria-labelledby="order-error-summary-title"
          className="rounded-2xl border border-destructive p-4"
        >
          <h2 id="order-error-summary-title" className="font-medium">
            There is a problem
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {summaryItems.map((item) => (
              <li key={item.field}>
                <a href={`#${FIELD_IDS[item.field]}`} className="underline">
                  {item.message}
                </a>
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
