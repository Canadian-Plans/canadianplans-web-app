'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import {
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@canadian-plans/ui';
import { CpButton } from '@canadian-plans/ui/canadian-plans';
import { businessCopy, businessNeeds } from '@content/business-internet';
import { businessQuotePreviewAction } from '@/app/(business-internet)/actions';
import {
  businessQuoteFields,
  validateBusinessQuote,
  type BusinessQuoteErrors,
  type BusinessQuoteInput,
} from '@/lib/business-quote-preview';

const empty: BusinessQuoteInput = {
  businessName: '',
  name: '',
  email: '',
  phone: '',
  postalCode: '',
  need: '',
  notes: '',
};

/** UI-only quote request (design preview). Validates locally and on a stub action; sends nothing. */
export function BusinessQuoteForm() {
  const copy = businessCopy.quote;
  const [values, setValues] = useState<BusinessQuoteInput>(empty);
  const [errors, setErrors] = useState<BusinessQuoteErrors>({});
  const [feedback, setFeedback] = useState('');
  const [pending, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const inFlight = useRef(false);

  function update(field: keyof BusinessQuoteInput, value: string) {
    setValues((old) => ({ ...old, [field]: value }));
    setErrors((old) => ({ ...old, [field]: undefined }));
    setFeedback('');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const nextErrors = validateBusinessQuote(values);
    setErrors(nextErrors);
    setFeedback('');
    const first = businessQuoteFields.find((field) => nextErrors[field]);
    if (first) {
      form.current?.querySelector<HTMLElement>(`#business-${first}`)?.focus();
      return;
    }
    inFlight.current = true;
    startTransition(async () => {
      try {
        const result = await businessQuotePreviewAction(values);
        setFeedback(result.status === 'preview' ? copy.result : copy.retry);
      } catch {
        setFeedback(copy.retry);
      } finally {
        inFlight.current = false;
      }
    });
  }

  return (
    <section
      id="quote"
      className="cp-container cp-business-quote"
      aria-labelledby="business-quote-title"
    >
      <div className="cp-business-quote-intro">
        <p className="cp-rd-eyebrow cp-rd-eyebrow-mint">{copy.eyebrow}</p>
        <h2 id="business-quote-title" className="cp-rd-heading">
          {copy.title}
        </h2>
        <p className="cp-rd-lead">{copy.description}</p>
        <p className="cp-business-quote-note">{copy.previewNote}</p>
      </div>
      <form
        ref={form}
        className="cp-business-quote-form"
        method="post"
        noValidate
        onSubmit={submit}
        aria-labelledby="business-quote-title"
        aria-busy={pending}
      >
        <fieldset className="cp-business-quote-fields" disabled={pending}>
          <FormField
            id="business-businessName"
            label={copy.businessName.label}
            error={errors.businessName}
          >
            <Input
              className="cp-business-input"
              name="businessName"
              value={values.businessName}
              onChange={(event) => update('businessName', event.target.value)}
              placeholder={copy.businessName.placeholder}
              required
              maxLength={200}
              autoComplete="organization"
            />
          </FormField>
          <FormField id="business-name" label={copy.name.label} error={errors.name}>
            <Input
              className="cp-business-input"
              name="name"
              value={values.name}
              onChange={(event) => update('name', event.target.value)}
              placeholder={copy.name.placeholder}
              required
              maxLength={200}
              autoComplete="name"
            />
          </FormField>
          <FormField id="business-email" label={copy.email.label} error={errors.email}>
            <Input
              className="cp-business-input"
              name="email"
              type="email"
              value={values.email}
              onChange={(event) => update('email', event.target.value)}
              placeholder={copy.email.placeholder}
              required
              maxLength={254}
              autoComplete="email"
            />
          </FormField>
          <FormField
            id="business-phone"
            label={copy.phone.label}
            hint={copy.phone.hint}
            error={errors.phone}
          >
            <Input
              className="cp-business-input"
              name="phone"
              type="tel"
              value={values.phone}
              onChange={(event) => update('phone', event.target.value)}
              placeholder={copy.phone.placeholder}
              maxLength={40}
              autoComplete="tel"
            />
          </FormField>
          <FormField
            id="business-postalCode"
            label={copy.postalCode.label}
            error={errors.postalCode}
          >
            <Input
              className="cp-business-input"
              name="postalCode"
              value={values.postalCode}
              onChange={(event) => update('postalCode', event.target.value)}
              placeholder={copy.postalCode.placeholder}
              required
              maxLength={7}
              autoComplete="postal-code"
            />
          </FormField>
          <Select
            name="need"
            required
            value={values.need}
            onValueChange={(value) => update('need', value)}
            disabled={pending}
          >
            <FormField id="business-need" label={copy.need.label} error={errors.need}>
              <SelectTrigger className="cp-business-input cp-business-select">
                <SelectValue placeholder={copy.need.placeholder} />
                <span aria-hidden="true">{copy.need.indicator}</span>
              </SelectTrigger>
            </FormField>
            <SelectContent className="cp-design cp-business-select-menu">
              {businessNeeds.map((need) => (
                <SelectItem key={need.value} value={need.value}>
                  {need.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="cp-business-quote-wide">
            <FormField id="business-notes" label={copy.notes.label} error={errors.notes}>
              <Textarea
                className="cp-business-input cp-business-textarea"
                name="notes"
                value={values.notes}
                onChange={(event) => update('notes', event.target.value)}
                placeholder={copy.notes.placeholder}
                maxLength={2000}
              />
            </FormField>
          </div>
        </fieldset>
        <CpButton type="submit" scale="large" disabled={pending}>
          {pending ? copy.pending : copy.submit}
        </CpButton>
        <p role="status" className={feedback || pending ? 'cp-business-feedback' : 'sr-only'}>
          {pending ? copy.pending : feedback}
        </p>
      </form>
    </section>
  );
}
