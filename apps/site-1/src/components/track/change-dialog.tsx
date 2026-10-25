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
  Textarea,
} from '@canadian-plans/ui';
import { CpAsset, CpButton } from '@canadian-plans/ui/canadian-plans';
import type { AmendableFieldKey, TrackingOrderDetail } from '@canadian-plans/contracts';
import { trackChangeFields, trackCopy as copy, trackFieldLabels } from '@content/track';
import { trackingAssets as assets } from '@content/track-order';
import { currentValue, patchFromValues, type FieldValueError } from '@/lib/tracking-view';
import { sendTrackingChange } from '@/app/(track-order)/track/actions';

const valueErrors: Readonly<Record<FieldValueError, string>> = {
  value: copy.change.valueError,
  email: copy.change.emailError,
  countryCode: copy.change.countryCodeError,
};

/**
 * A customer change request for one of their own details. Nothing is edited
 * directly: the request waits in staff's Change requests panel for approval.
 */
export function TrackChangeDialog({
  order,
  initial,
  onClose,
  onSent,
  onSessionExpired,
}: {
  order: TrackingOrderDetail;
  initial: AmendableFieldKey;
  onClose: () => void;
  onSent: () => void;
  onSessionExpired: () => void;
}) {
  const [field, setField] = useState<AmendableFieldKey>(initial);
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [failure, setFailure] = useState('');
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);

  async function submit() {
    if (pending) return;
    setFailure('');
    const built = patchFromValues({ [field]: value });
    if (!built.ok) {
      setError(valueErrors[built.errors[field] ?? 'value']);
      requestAnimationFrame(() => document.getElementById('track-change-value')?.focus());
      return;
    }
    if (note.length > 2000) {
      setFailure(copy.change.noteError);
      return;
    }
    setPending(true);
    try {
      const result = await sendTrackingChange({
        reference: order.reference,
        patch: built.patch,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
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

  const current = currentValue(order, field);
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
              <div
                className="cp-tracking-change-options"
                role="radiogroup"
                aria-label={copy.change.legend}
              >
                {trackChangeFields.map((item) => (
                  <label key={item} data-selected={field === item}>
                    <input
                      type="radio"
                      className="sr-only"
                      name="track-change-field"
                      value={item}
                      checked={field === item}
                      onChange={() => {
                        setField(item);
                        setValue('');
                        setError('');
                      }}
                    />
                    <span className="cp-tracking-mobile">
                      <CpAsset
                        asset={field === item ? assets.radioMobile : assets.radioEmptyMobile}
                      />
                    </span>
                    <span className="cp-tracking-desktop">
                      <CpAsset
                        asset={field === item ? assets.radioDesktop : assets.radioEmptyDesktop}
                      />
                    </span>
                    {trackFieldLabels[item]}
                  </label>
                ))}
              </div>
              <div className="cp-tracking-change-current">
                <strong>{copy.change.current}</strong>
                <span>{current ?? copy.detail.notGiven}</span>
              </div>
              <FormField
                id="track-change-value"
                label={`${copy.change.newValue}: ${trackFieldLabels[field]}`}
                error={error}
              >
                <Input
                  value={value}
                  type={
                    field === 'contact.email'
                      ? 'email'
                      : field === 'form.arrivalDate'
                        ? 'date'
                        : 'text'
                  }
                  autoComplete={
                    field === 'contact.email' ? 'email' : field === 'contact.phone' ? 'tel' : 'off'
                  }
                  maxLength={field === 'contact.email' ? 254 : 160}
                  onChange={(event) => {
                    setValue(event.target.value);
                    setError('');
                  }}
                />
              </FormField>
              <FormField
                id="track-change-note"
                label={
                  <>
                    {copy.change.noteLabel} <span>{copy.change.optional}</span>
                  </>
                }
              >
                <Textarea
                  value={note}
                  placeholder={copy.change.notePlaceholder}
                  maxLength={2000}
                  onChange={(event) => setNote(event.target.value)}
                />
              </FormField>
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
