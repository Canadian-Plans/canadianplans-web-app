'use client';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField, Input, SkipLink } from '@canadian-plans/ui';
import { CpAsset, CpButton, CpChip, CpImageSlot } from '@canadian-plans/ui/canadian-plans';
import { arrivalPlans, type ArrivalAudience } from '@content/pre-arrival';
import {
  preArrivalOrderCopy as copy,
  preArrivalOrderAssets as assets,
  defaultPreArrivalPlan,
} from '@content/pre-arrival-order';
import {
  emptyPreArrival,
  preArrivalSchemas,
  parsePreArrivalDraft,
  documentMetadataSchema,
  isPreArrivalField,
  stepOneFields,
  stepTwoFields,
  type PreArrivalValues,
  type PreArrivalDraft,
} from '@/lib/pre-arrival-order';
import { readPreviewFiles, writePreviewFiles } from '@/lib/pre-arrival-files';
import { preArrivalPreviewAction } from '@/app/(pre-arrival-order)/order/pre-arrival/actions';
import { MobilePlanSummary, PaymentNote, PreArrivalSummary, PreArrivalRecap } from './summary';
import { PreArrivalConfirmation } from './confirmation';
import { BrandMark } from '@/components/shared/brand-mark';
type FieldName = keyof typeof copy.fields;
function OrderField({ name, form }: { name: FieldName; form: UseFormReturn<PreArrivalValues> }) {
  const c = copy.fields[name];
  return (
    <FormField
      id={`pa-${name}`}
      label={c.label}
      hint={
        name === 'email' ? (
          <>
            <span className="cp-pa-email-hint">{copy.fields.email.mobileHint[0]}</span>
            <span>{copy.fields.email.mobileHint[1]}</span>
          </>
        ) : 'hint' in c ? (
          c.hint
        ) : undefined
      }
      error={form.formState.errors[name]?.message}
      errorBeforeHint
      errorIcon={<CpAsset asset={assets.fieldError} />}
    >
      <Input
        {...form.register(name)}
        placeholder={
          name === 'firstName' && form.formState.errors.firstName
            ? copy.fields.firstName.errorPlaceholder
            : c.placeholder
        }
        type={
          name === 'email' || name === 'confirmEmail' ? 'email' : name === 'phone' ? 'tel' : 'text'
        }
        autoComplete={
          name === 'firstName'
            ? 'given-name'
            : name === 'lastName'
              ? 'family-name'
              : name === 'email'
                ? 'email'
                : name === 'phone'
                  ? 'tel'
                  : 'off'
        }
        inputMode={name === 'birthDate' || name === 'arrivalDate' ? 'numeric' : undefined}
        maxLength={300}
      />
    </FormField>
  );
}
function Consent({
  name,
  form,
  children,
}: {
  name: 'whatsapp' | 'contactConsent' | 'terms';
  form: UseFormReturn<PreArrivalValues>;
  children: React.ReactNode;
}) {
  const error = form.formState.errors[name]?.message;
  return (
    <div className="cp-io-consent cp-pa-consent">
      <label htmlFor={`pa-${name}`}>
        <input
          id={`pa-${name}`}
          type="checkbox"
          {...form.register(name)}
          aria-invalid={!!error}
          aria-describedby={error ? `pa-${name}-error` : undefined}
        />
        <span>{children}</span>
      </label>
      {error ? (
        <p id={`pa-${name}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
function FileSlot({
  name,
  form,
  file,
  onFile,
}: {
  name: 'passportFile' | 'permitFile';
  form: UseFormReturn<PreArrivalValues>;
  file: File | null;
  onFile: (name: 'passportFile' | 'permitFile', file: File | null) => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const c = copy.uploads[name];
  const [localError, setLocalError] = useState('');
  async function choose(file: File | undefined) {
    if (!file) return;
    const checked = documentMetadataSchema.safeParse(file);
    if (!checked.success) {
      setLocalError(copy.uploads.invalid);
      return;
    }
    setLocalError('');
    await onFile(name, file);
  }
  const error = localError || form.formState.errors[name]?.message;
  return (
    <div className="cp-pa-upload-field">
      <button
        type="button"
        id={`pa-${name}`}
        className="cp-pa-upload"
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void choose(e.dataTransfer.files[0]);
        }}
        aria-invalid={!!error}
        aria-describedby={error ? `pa-${name}-error` : undefined}
      >
        <span className="cp-pa-upload-arrow" aria-hidden="true">
          {copy.arrow}
        </span>
        <span>
          <strong>{c.label}</strong>
          <span className="cp-pa-upload-desktop">{file ? file.name : copy.uploads.desktop}</span>
          <span className="cp-pa-upload-mobile">{file ? file.name : copy.uploads.mobile}</span>
          <small>{c.hint}</small>
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        hidden
        tabIndex={-1}
        aria-label={c.label}
        onChange={(e) => void choose(e.target.files?.[0])}
      />
      {file ? (
        <button
          type="button"
          className="cp-pa-file-remove"
          onClick={() => void onFile(name, null)}
          aria-label={`${copy.uploads.remove}: ${c.label}`}
        >
          {copy.uploads.remove}
        </button>
      ) : null}
      {error ? (
        <p id={`pa-${name}-error`} className="cp-pa-upload-error" role="alert">
          <CpAsset asset={assets.fieldError} />
          {error}
        </p>
      ) : null}
    </div>
  );
}
export function PreArrivalOrderFlow({
  requestedPlan,
  requestedAudience,
}: {
  requestedPlan?: string;
  requestedAudience?: string;
}) {
  const initialPlan =
    arrivalPlans.find((p) => p.id === requestedPlan) ?? defaultPreArrivalPlan ?? arrivalPlans[0];
  const initialAudience =
    copy.audiences.find((a) => a.id === requestedAudience && initialPlan?.audiences.includes(a.id))
      ?.id ?? 'student';
  const form = useForm<PreArrivalValues>({
    defaultValues: { ...emptyPreArrival, audience: initialAudience },
    resolver: zodResolver(preArrivalSchemas().all),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldUnregister: false,
  });
  const values = useWatch({ control: form.control });
  const [planId, setPlanId] = useState(initialPlan?.id ?? '');
  const [step, setStep] = useState<PreArrivalDraft['step']>('one');
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState('');
  const [storageWarning, setStorageWarning] = useState('');
  const [files, setFiles] = useState<{ passportFile: File | null; permitFile: File | null }>({
    passportFile: null,
    permitFile: null,
  });
  const current = useRef({ planId, step });
  current.current = { planId, step };
  const fileQueue = useRef(Promise.resolve());
  const heading = useRef(false);
  const filesRef = useRef(files);
  const plan = arrivalPlans.find((p) => p.id === planId) ?? initialPlan;
  const { reset, subscribe, getValues, setValue, trigger, setFocus, clearErrors, setError } = form;
  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const saved = parsePreArrivalDraft(sessionStorage.getItem(copy.persistence.key));
        const restoring = saved !== undefined;
        if (restoring) {
          const supplied = arrivalPlans.find((p) => p.id === requestedPlan);
          const nextPlan = supplied ?? arrivalPlans.find((p) => p.id === saved.planId);
          const changed = supplied !== undefined && supplied.id !== saved.planId;
          const audience =
            copy.audiences.find(
              (a) => a.id === requestedAudience && nextPlan?.audiences.includes(a.id),
            )?.id ??
            (nextPlan?.audiences.includes(saved.values.audience)
              ? saved.values.audience
              : initialAudience);
          reset({ ...saved.values, audience });
          const nextStep = changed ? 'one' : saved.step;
          setPlanId(nextPlan?.id ?? saved.planId);
          setStep(nextStep);
          current.current = { planId: nextPlan?.id ?? saved.planId, step: nextStep };
        }
        const retained = await readPreviewFiles();
        if (active) {
          setFiles(retained);
          filesRef.current = retained;
          for (const name of ['passportFile', 'permitFile'] as const) {
            const file = retained[name];
            setValue(name, file ? documentMetadataSchema.parse(file) : null);
          }
          if (
            restoring &&
            saved.step === 'confirmation' &&
            (!preArrivalSchemas().all.safeParse(getValues()).success ||
              retained.passportFile === null ||
              retained.permitFile === null)
          )
            setStep('two');
        }
      } catch {
        if (active) setStorageWarning(copy.persistence.unavailable);
      } finally {
        if (requestedPlan || requestedAudience)
          window.history.replaceState(window.history.state, '', copy.destinations.order);
        if (active) setReady(true);
      }
    }
    void restore();
    return () => {
      active = false;
    };
  }, [requestedPlan, requestedAudience, initialAudience, reset, setValue, getValues]);
  function persist() {
    if (!ready) return;
    try {
      sessionStorage.setItem(
        copy.persistence.key,
        JSON.stringify({ version: 1, ...current.current, values: getValues() }),
      );
    } catch {
      setStorageWarning(copy.persistence.unavailable);
    }
  }
  useEffect(() => {
    if (!ready) return;
    return subscribe({
      formState: { values: true },
      callback: () => {
        try {
          sessionStorage.setItem(
            copy.persistence.key,
            JSON.stringify({ version: 1, ...current.current, values: getValues() }),
          );
        } catch {
          setStorageWarning(copy.persistence.unavailable);
        }
      },
    });
  }, [ready, subscribe, getValues]);
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(
        copy.persistence.key,
        JSON.stringify({ version: 1, planId, step, values: getValues() }),
      );
    } catch {
      setStorageWarning(copy.persistence.unavailable);
    }
    if (heading.current) {
      document.getElementById('pa-heading')?.focus();
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    heading.current = true;
  }, [planId, step, ready, getValues]);
  async function onFile(name: 'passportFile' | 'permitFile', file: File | null) {
    const next = { ...filesRef.current, [name]: file };
    filesRef.current = next;
    setFiles(next);
    setValue(name, file ? documentMetadataSchema.parse(file) : null, {
      shouldValidate: true,
      shouldDirty: true,
    });
    fileQueue.current = fileQueue.current.catch(() => {}).then(() => writePreviewFiles(next));
    try {
      await fileQueue.current;
    } catch {
      setStorageWarning(copy.persistence.filesUnavailable);
    }
  }
  function changeAudience(audience: ArrivalAudience) {
    setValue('audience', audience, { shouldDirty: true });
    if (plan && !plan.audiences.includes(audience)) {
      const next = arrivalPlans.find((p) => p.audiences.includes(audience));
      if (next) setPlanId(next.id);
    }
    clearErrors('audience');
  }
  async function next() {
    if (!ready) return;
    const ok = await trigger([...stepOneFields], { shouldFocus: true });
    if (ok) {
      if (!getValues('confirmEmail')) setValue('confirmEmail', getValues('email'));
      setFailure('');
      setStep('two');
    } else {
      const first = stepOneFields.find((f) => form.getFieldState(f).invalid);
      if (first) setFocus(first);
    }
  }
  async function submit(data: PreArrivalValues) {
    if (!ready || !plan) return;
    setFailure('');
    try {
      await fileQueue.current.catch(() => {});
      const result = await preArrivalPreviewAction(data, plan.id);
      if (result.status === 'preview') {
        setStep('confirmation');
      } else {
        for (const [field, message] of Object.entries(result.errors))
          if (isPreArrivalField(field)) setError(field, { type: 'server', message });
        if (stepOneFields.some((f) => result.errors[f])) setStep('one');
      }
    } catch {
      setFailure(copy.feedback.retry);
    }
  }
  async function clearDraft() {
    await fileQueue.current.catch(() => {});
    try {
      await writePreviewFiles(null);
      sessionStorage.removeItem(copy.persistence.key);
    } catch {
      setStorageWarning(copy.persistence.unavailable);
      return;
    }
    reset({ ...emptyPreArrival, audience: initialAudience });
    setFiles({ passportFile: null, permitFile: null });
    filesRef.current = { passportFile: null, permitFile: null };
    setStep('one');
    setPlanId(initialPlan?.id ?? '');
    setFailure('');
    setStorageWarning('');
    setOpen(false);
    setFocus('firstName');
  }
  const fields = step === 'one' ? stepOneFields : stepTwoFields;
  const invalid = fields.filter((f) => form.formState.errors[f]);
  if (!plan) return null;
  return (
    <>
      <SkipLink href="#pa-main" className="cp-io-skip">
        {copy.skip}
      </SkipLink>
      <header className="cp-io-header">
        <div className="cp-container">
          <a href={copy.destinations.home} className="cp-brand" aria-label={`${copy.brand} home`}>
            <BrandMark />
          </a>
          <div className="cp-io-desktop-help">
            <strong>{copy.header.payment}</strong>
            <a href={copy.destinations.contact}>{copy.header.help}</a>
          </div>
          <CpButton asChild tone="outline-brand" className="cp-io-call">
            <a href={copy.destinations.contact}>
              <CpAsset
                asset={
                  step === 'confirmation'
                    ? assets.phoneConfirmation
                    : step === 'two'
                      ? assets.phoneTwo
                      : open
                        ? assets.phoneExpanded
                        : assets.phoneOne
                }
              />
              {copy.header.call}
            </a>
          </CpButton>
        </div>
      </header>
      {step === 'confirmation' ? (
        <PreArrivalConfirmation plan={plan} values={getValues()} onBack={() => setStep('one')} />
      ) : (
        <>
          <nav className="cp-container cp-pa-stepper" aria-label={copy.title}>
            {copy.steps.map((label, i) => (
              <div
                key={label}
                className="cp-pa-step"
                data-active={(step === 'one' ? 0 : 1) === i}
                data-done={step === 'two' && i === 0}
                aria-current={(step === 'one' ? 0 : 1) === i ? 'step' : undefined}
              >
                <span>{step === 'two' && i === 0 ? copy.check : copy.numbers[i]}</span>
                <p>{label}</p>
              </div>
            ))}
          </nav>
          <main id="pa-main" tabIndex={-1} className="cp-container cp-io-body cp-pa-body">
            <MobilePlanSummary plan={plan} open={open} onToggle={() => setOpen(!open)} />
            <form
              className="cp-io-form cp-pa-form"
              noValidate
              method="post"
              onChange={persist}
              onSubmit={
                step === 'one'
                  ? (e) => {
                      e.preventDefault();
                      void next();
                    }
                  : form.handleSubmit(submit, (errors) => {
                      const first = [...stepOneFields, ...stepTwoFields].find((f) => errors[f]);
                      if (first) {
                        if (stepOneFields.some((f) => f === first)) setStep('one');
                        document.getElementById(`pa-${first}`)?.focus();
                      }
                    })
              }
            >
              <fieldset disabled={!ready || form.formState.isSubmitting} className="cp-pa-fields">
                {invalid.length ? (
                  <div className="cp-pa-error-summary" role="alert">
                    <h2>
                      <CpAsset asset={assets.error} />
                      {copy.feedback.heading(invalid.length)}
                    </h2>
                    <p>{copy.feedback.hint}</p>
                    <ul>
                      {invalid.map((field) => (
                        <li key={field}>
                          <a
                            href={`#pa-${field}`}
                            onClick={(e) => {
                              e.preventDefault();
                              document.getElementById(`pa-${field}`)?.focus();
                            }}
                          >
                            {field in copy.feedback.summaries &&
                            (field === 'firstName' || field === 'email' || field === 'phone')
                              ? copy.feedback.summaries[field]
                              : copy.feedback.errors[field]}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {failure ? (
                  <p className="cp-pa-error-summary" role="alert">
                    {failure}
                  </p>
                ) : null}
                <p className="cp-io-eyebrow">
                  {step === 'one' ? copy.stepOne.eyebrow : copy.stepTwo.eyebrow}
                </p>
                <h1 id="pa-heading" tabIndex={-1}>
                  {step === 'one' ? copy.stepOne.title : copy.stepTwo.title}
                </h1>
                <p className="cp-io-intro">
                  {step === 'one' ? copy.stepOne.intro : copy.stepTwo.intro}
                </p>
                {step === 'one' ? (
                  <>
                    <p className="cp-pa-audience-label" id="pa-audience-label">
                      {copy.stepOne.audienceLabel}
                    </p>
                    <div
                      className="cp-pa-audiences"
                      id="pa-audience"
                      role="group"
                      aria-labelledby="pa-audience-label"
                    >
                      {copy.audiences.map((a) => (
                        <CpChip
                          key={a.id}
                          selected={values.audience === a.id}
                          onClick={() => changeAudience(a.id)}
                        >
                          {a.label}
                        </CpChip>
                      ))}
                    </div>
                    <div className="cp-io-row cp-io-two">
                      <OrderField name="firstName" form={form} />
                      <OrderField name="lastName" form={form} />
                    </div>
                    <OrderField name="email" form={form} />
                    <OrderField name="phone" form={form} />
                    <Consent name="whatsapp" form={form}>
                      {copy.stepOne.whatsapp}
                    </Consent>
                    <div className="cp-io-row cp-io-two">
                      <OrderField name="arrivalDate" form={form} />
                      <FormField
                        id="pa-city"
                        label={copy.fields.city.label}
                        error={form.formState.errors.city?.message}
                        errorIcon={<CpAsset asset={assets.fieldError} />}
                      >
                        <select {...form.register('city')}>
                          <option value="">{copy.fields.city.placeholder}</option>
                          {copy.cities.map((city) => (
                            <option key={city}>{city}</option>
                          ))}
                        </select>
                      </FormField>
                    </div>
                    <hr />
                    <div className="cp-pa-mobile-note">
                      <PaymentNote />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="cp-pa-documents">
                      <div className="cp-pa-privacy">
                        <span>
                          <CpAsset asset={assets.lock} />
                        </span>
                        <div>
                          <strong>{copy.stepTwo.privacyTitle}</strong>
                          <p>
                            {copy.stepTwo.privacy}
                            <a href={copy.destinations.privacy}>{copy.stepTwo.privacyLink}</a>.
                          </p>
                        </div>
                      </div>
                      <div className="cp-pa-upload-row">
                        <FileSlot
                          name="passportFile"
                          form={form}
                          file={files.passportFile}
                          onFile={onFile}
                        />
                        <FileSlot
                          name="permitFile"
                          form={form}
                          file={files.permitFile}
                          onFile={onFile}
                        />
                      </div>
                      <div className="cp-io-row cp-io-two">
                        <OrderField name="passportNumber" form={form} />
                        <OrderField name="birthDate" form={form} />
                      </div>
                    </div>
                    <hr />
                    <h2>{copy.stepTwo.esimTitle}</h2>
                    <div className="cp-pa-esim">
                      <CpImageSlot
                        icon={assets.image}
                        label={copy.stepTwo.imageLabel}
                        caption={copy.stepTwo.imageCaption}
                      />
                      <div>{copy.stepTwo.delivery(values.email ?? '')}</div>
                    </div>
                    <OrderField name="confirmEmail" form={form} />
                    <OrderField name="phoneModel" form={form} />
                    <hr />
                    <Consent name="contactConsent" form={form}>
                      {copy.stepTwo.consent}
                    </Consent>
                    <Consent name="terms" form={form}>
                      {copy.stepTwo.termsBefore}
                      <a href={copy.destinations.terms}>{copy.stepTwo.terms}</a>
                      {copy.stepTwo.termsBetween}
                      <a href={copy.destinations.privacy}>{copy.stepTwo.privacyPolicy}</a>
                      {copy.stepTwo.termsAfter}
                      <br className="cp-pa-terms-break" />
                      {copy.stepTwo.termsEnd}
                    </Consent>
                    <div className="cp-io-mobile-recap">
                      <PreArrivalRecap plan={plan} />
                    </div>
                  </>
                )}
                <div className="cp-io-actions cp-pa-actions" data-step={step}>
                  {step === 'one' ? (
                    <a href={copy.destinations.plans}>{copy.stepOne.back}</a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setFailure('');
                        clearErrors();
                        setStep('one');
                      }}
                    >
                      {copy.stepTwo.back}
                    </button>
                  )}
                  <div>
                    <CpButton
                      type="submit"
                      scale="large"
                      disabled={!ready || form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting
                        ? copy.stepTwo.pending
                        : step === 'one'
                          ? copy.stepOne.next
                          : copy.stepTwo.send}
                    </CpButton>
                    {step === 'two' ? <p>{copy.stepTwo.note}</p> : null}
                  </div>
                </div>
              </fieldset>
            </form>
            <aside className="cp-io-desktop-summary">
              <PreArrivalSummary plan={plan} />
            </aside>
          </main>
        </>
      )}
      <div className="cp-container cp-pa-draft-tools">
        {!ready ? (
          <p className="sr-only" role="status">
            {copy.persistence.loading}
          </p>
        ) : null}
        {storageWarning ? <p role="alert">{storageWarning}</p> : null}
        <button
          type="button"
          onClick={() => void clearDraft()}
          disabled={form.formState.isSubmitting}
        >
          {copy.persistence.clear}
        </button>
      </div>
    </>
  );
}
