'use client';

import { useState } from 'react';
import { FormField, Input } from '@canadian-plans/ui';
import { CpButton } from '@canadian-plans/ui/canadian-plans';
import type { AmendableFieldKey, TrackingInfoRequest } from '@canadian-plans/contracts';
import { trackCopy as copy, trackFieldLabels } from '@content/track';
import { patchFromValues, type FieldValueError } from '@/lib/tracking-view';
import { sendTrackingChange } from '@/app/(track-order)/track/actions';

const valueErrors: Readonly<Record<FieldValueError, string>> = {
  value: copy.info.fieldError,
  email: copy.change.emailError,
  countryCode: copy.change.countryCodeError,
};

/**
 * The customer's answer to a staff request for missing details. It must fill
 * every requested field and becomes a pending change request for staff.
 */
export function TrackInfoRequestForm({
  reference,
  request,
  onSent,
  onSessionExpired,
}: {
  reference: string;
  request: TrackingInfoRequest;
  onSent: () => void;
  onSessionExpired: () => void;
}) {
  const [values, setValues] = useState<Partial<Record<AmendableFieldKey, string>>>({});
  const [errors, setErrors] = useState<Partial<Record<AmendableFieldKey, string>>>({});
  const [failure, setFailure] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const idFor = (field: AmendableFieldKey) => `track-info-${request.id}-${field.replace('.', '-')}`;

  async function submit() {
    if (pending) return;
    setFailure('');
    const complete = Object.fromEntries(
      request.fields.map((field) => [field, values[field] ?? '']),
    );
    const built = patchFromValues(complete);
    if (!built.ok) {
      const next: Partial<Record<AmendableFieldKey, string>> = {};
      for (const field of request.fields) {
        const code = built.errors[field];
        if (code) next[field] = valueErrors[code];
      }
      setErrors(next);
      const first = request.fields.find((field) => next[field]);
      if (first) requestAnimationFrame(() => document.getElementById(idFor(first))?.focus());
      return;
    }
    setPending(true);
    try {
      const result = await sendTrackingChange({
        reference,
        patch: built.patch,
        infoRequestId: request.id,
      });
      if (result.ok) {
        setSent(true);
        onSent();
      } else if (result.code === 'session_expired') {
        onSessionExpired();
      } else {
        setFailure(result.message);
      }
    } catch {
      setFailure(copy.info.failed);
    } finally {
      setPending(false);
    }
  }

  if (sent)
    return (
      <p className="cp-track-info-sent" role="status">
        {copy.info.sent}
      </p>
    );

  return (
    <form
      className="cp-track-info-form"
      noValidate
      method="post"
      aria-label={copy.info.title}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <fieldset disabled={pending}>
        {request.message ? <p className="cp-track-info-message">{request.message}</p> : null}
        {request.fields.map((field) => (
          <FormField
            key={field}
            id={idFor(field)}
            label={trackFieldLabels[field]}
            error={errors[field]}
          >
            <Input
              value={values[field] ?? ''}
              type={
                field === 'contact.email' ? 'email' : field === 'form.arrivalDate' ? 'date' : 'text'
              }
              maxLength={field === 'contact.email' ? 254 : 160}
              onChange={(event) => {
                setValues((current) => ({ ...current, [field]: event.target.value }));
                setErrors((current) => ({ ...current, [field]: undefined }));
              }}
            />
          </FormField>
        ))}
        {failure ? (
          <p role="alert" className="cp-tracking-inline-error">
            {failure}
          </p>
        ) : null}
        <CpButton type="submit" disabled={pending}>
          {pending ? copy.info.pending : copy.info.submit}
        </CpButton>
      </fieldset>
    </form>
  );
}
