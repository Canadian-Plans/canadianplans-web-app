'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  FormField,
  Input,
} from '@canadian-plans/ui';
import { CpAsset, CpButton } from '@canadian-plans/ui/canadian-plans';
import type { TrackingOrder } from '@canadian-plans/crm-contracts';
import { trackCopy as copy, trackFieldLabels } from '@content/track';
import { trackingAssets as assets } from '@content/track-order';
import {
  TRACK_EDITABLE_FIELDS,
  changeFormValues,
  changeFromValues,
  currentValue,
  formatDate,
  type TrackChangeValues,
  type TrackEditableField,
} from '@/lib/tracking-view';
import { sendTrackingChange } from '@/app/(track-order)/track/actions';

const fieldId = (field: TrackEditableField) => `track-change-${field}`;

const inputProps: Readonly<
  Record<
    TrackEditableField,
    { type: 'text' | 'tel' | 'date'; autoComplete: string; maxLength?: number }
  >
> = {
  fullName: { type: 'text', autoComplete: 'name', maxLength: 160 },
  phone: { type: 'tel', autoComplete: 'tel', maxLength: 40 },
  arrivalDate: { type: 'date', autoComplete: 'off' },
  canadaAddress: { type: 'text', autoComplete: 'off', maxLength: 300 },
};

/**
 * A customer change request for their own details: full name, phone, arrival
 * date and destination. Nothing is edited directly: the request waits for
 * staff approval and replaces any request already pending on the order, so
 * the form starts from the pending values where there are any.
 */
export function TrackChangeDialog({
  order,
  initial,
  onClose,
  onSent,
  onSessionExpired,
}: {
  order: TrackingOrder;
  initial: TrackEditableField;
  onClose: () => void;
  onSent: () => void;
  onSessionExpired: () => void;
}) {
  const [values, setValues] = useState<TrackChangeValues>(() => changeFormValues(order));
  const [errors, setErrors] = useState<Partial<Record<TrackEditableField, string>>>({});
  const [failure, setFailure] = useState('');
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);

  const focusField = (field: TrackEditableField) =>
    requestAnimationFrame(() => document.getElementById(fieldId(field))?.focus());

  async function submit() {
    if (pending) return;
    setFailure('');
    const built = changeFromValues(order, values);
    if (!built.ok) {
      if (built.unchanged) {
        setErrors({});
        setFailure(copy.change.unchanged);
        focusField(initial);
        return;
      }
      const next: Partial<Record<TrackEditableField, string>> = {};
      for (const field of TRACK_EDITABLE_FIELDS)
        if (built.errors[field]) next[field] = copy.change.fieldErrors[field];
      setErrors(next);
      const first = TRACK_EDITABLE_FIELDS.find((field) => next[field]);
      if (first) focusField(first);
      return;
    }
    setPending(true);
    try {
      const result = await sendTrackingChange({ reference: order.reference, fields: built.fields });
      if (result.ok) {
        setComplete(true);
        onSent();
        requestAnimationFrame(() => document.getElementById('track-change-success')?.focus());
      } else if (result.code === 'session_expired') {
        onSessionExpired();
      } else {
        setFailure(result.message);
      }
    } catch {
      setFailure(copy.change.failed);
    } finally {
      setPending(false);
    }
  }

  function currentText(field: TrackEditableField): string {
    const value = currentValue(order, field);
    if (!value) return copy.detail.notGiven;
    return field === 'arrivalDate' ? formatDate(value) : value;
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="cp-design cp-tracking-change-dialog"
        showCloseButton={false}
        aria-labelledby="track-change-title"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          document.getElementById('track-change-title')?.focus();
        }}
      >
        <div className="cp-tracking-change-header">
          <div>
            <p>
              {copy.detail.orderPrefix} {order.reference}
            </p>
            <DialogTitle id="track-change-title" tabIndex={-1}>
              {copy.change.title}
            </DialogTitle>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              className="cp-tracking-change-close"
              aria-label={copy.change.close}
            >
              <span className="cp-tracking-mobile">
                <CpAsset asset={assets.close} />
              </span>
              <span className="cp-tracking-desktop">{copy.change.desktopClose}</span>
            </button>
          </DialogClose>
        </div>
        <DialogDescription className="sr-only">{copy.change.description}</DialogDescription>
        {complete ? (
          <div className="cp-tracking-change-form">
            <h3 id="track-change-success" tabIndex={-1}>
              {copy.change.successTitle}
            </h3>
            <p role="status">{copy.change.success}</p>
            <CpButton onClick={onClose}>{copy.change.done}</CpButton>
          </div>
        ) : (
          <form
            className="cp-tracking-change-form"
            noValidate
            method="post"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <fieldset disabled={pending}>
              <hr />
              <legend className="sr-only">{copy.change.legend}</legend>
              <p className="cp-tracking-change-legend" aria-hidden="true">
                {copy.change.legend}
              </p>
              {TRACK_EDITABLE_FIELDS.map((field) => (
                <FormField
                  key={field}
                  id={fieldId(field)}
                  label={trackFieldLabels[field]}
                  hint={`${copy.change.current} ${currentText(field)}`}
                  error={errors[field]}
                >
                  <Input
                    value={values[field]}
                    {...inputProps[field]}
                    onChange={(event) => {
                      const value = event.target.value;
                      setValues((current) => ({ ...current, [field]: value }));
                      setErrors((current) => ({ ...current, [field]: undefined }));
                      setFailure('');
                    }}
                  />
                </FormField>
              ))}
              <p className="cp-tracking-change-notice">{copy.change.notice}</p>
              {failure ? (
                <p role="alert" className="cp-tracking-inline-error">
                  {failure}
                </p>
              ) : null}
              <div className="cp-tracking-change-actions">
                <CpButton type="button" tone="outline" onClick={onClose}>
                  {copy.change.cancel}
                </CpButton>
                <CpButton type="submit" disabled={pending}>
                  {pending ? copy.change.pending : copy.change.send}
                </CpButton>
              </div>
            </fieldset>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
