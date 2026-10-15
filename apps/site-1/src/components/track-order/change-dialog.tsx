'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  FormField,
  Input,
  Textarea,
} from '@canadian-plans/ui';
import { CpAsset, CpButton } from '@canadian-plans/ui/canadian-plans';
import {
  trackingCopy as copy,
  trackingAssets as assets,
  trackingChangeOptions,
  type ChangeKind,
  type TrackingOrderFixture,
} from '@content/track-order';
import { arrivalPlans } from '@content/pre-arrival';
import { trackingChangeSchema, type TrackingChangeValues } from '@/lib/tracking-preview';
import { trackingChangeAction } from '@/app/(track-order)/track-order/actions';
export function TrackingChangeDialog({
  order,
  kind,
  onClose,
  onReturnFocus,
}: {
  order: TrackingOrderFixture;
  kind: ChangeKind;
  onClose: () => void;
  onReturnFocus: () => void;
}) {
  const form = useForm<TrackingChangeValues>({
    defaultValues: { kind, value: '', note: '' },
    resolver: zodResolver(trackingChangeSchema()),
    reValidateMode: 'onChange',
  });
  const [selected, setSelected] = useState(kind);
  const [complete, setComplete] = useState(false);
  const [failure, setFailure] = useState('');
  const option =
    trackingChangeOptions.find((option) => option.id === selected) ?? trackingChangeOptions[0];
  const current = {
    email: order.email,
    arrival: order.arrival,
    plan: order.plan,
    device: order.device,
    details: order.name,
    other: order.reference,
  }[selected];
  if (!option) return null;
  async function submit(values: TrackingChangeValues) {
    setFailure('');
    try {
      const result = await trackingChangeAction(values);
      if (result.status === 'preview') {
        setComplete(true);
        requestAnimationFrame(() => document.getElementById('tracking-change-success')?.focus());
      } else {
        for (const field of ['kind', 'value', 'note'] as const)
          if (result.errors[field])
            form.setError(field, { type: 'server', message: result.errors[field] });
      }
    } catch {
      setFailure(copy.feedback.failed);
    }
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
        aria-labelledby="tracking-change-title"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          document.getElementById('tracking-change-title')?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onReturnFocus();
        }}
      >
        <div className="cp-tracking-change-header">
          <div>
            <p>
              {copy.orderPrefix} {order.reference}
            </p>
            <DialogTitle id="tracking-change-title" tabIndex={-1}>
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
            <h3 id="tracking-change-success" tabIndex={-1}>
              {copy.change.successTitle}
            </h3>
            <p role="status">{copy.change.success}</p>
            <CpButton
              onClick={() => {
                setComplete(false);
                requestAnimationFrame(() => document.getElementById('tracking-new-value')?.focus());
              }}
            >
              {copy.change.edit}
            </CpButton>
          </div>
        ) : (
          <form
            className="cp-tracking-change-form"
            noValidate
            method="post"
            onSubmit={form.handleSubmit(submit)}
          >
            <fieldset disabled={form.formState.isSubmitting}>
              <hr />
              <legend className="sr-only">{copy.change.legend}</legend>
              <p className="cp-tracking-change-legend">{copy.change.legend}</p>
              <div
                className="cp-tracking-change-options"
                role="radiogroup"
                aria-label={copy.change.legend}
              >
                {trackingChangeOptions.map((item) => (
                  <label key={item.id} data-selected={selected === item.id}>
                    <input
                      type="radio"
                      className="sr-only"
                      {...form.register('kind')}
                      value={item.id}
                      onChange={() => {
                        form.setValue('kind', item.id);
                        form.setValue('value', '');
                        form.clearErrors();
                        setSelected(item.id);
                      }}
                    />
                    <span className="cp-tracking-mobile">
                      <CpAsset
                        asset={selected === item.id ? assets.radioMobile : assets.radioEmptyMobile}
                      />
                    </span>
                    <span className="cp-tracking-desktop">
                      <CpAsset
                        asset={
                          selected === item.id ? assets.radioDesktop : assets.radioEmptyDesktop
                        }
                      />
                    </span>
                    {item.label}
                  </label>
                ))}
              </div>
              <div className="cp-tracking-change-current">
                <strong>{copy.change.current}</strong>
                <span>{current}</span>
              </div>
              <h3 className="cp-tracking-change-field-title">{option.title}</h3>
              <FormField
                id="tracking-new-value"
                label={
                  selected === 'email' ? (
                    <>
                      <span className="cp-tracking-mobile">{option.title}</span>
                      <span className="cp-tracking-desktop">{copy.change.newEmailLabel}</span>
                    </>
                  ) : (
                    option.title
                  )
                }
                error={form.formState.errors.value?.message}
              >
                {option.type === 'select' ? (
                  <select {...form.register('value')}>
                    <option value="">{option.placeholder}</option>
                    {arrivalPlans.map((plan) => (
                      <option value={plan.id} key={plan.id}>
                        {plan.summaryName} · {plan.allowance} · {plan.amount}
                        {plan.period}
                      </option>
                    ))}
                  </select>
                ) : option.type === 'textarea' ? (
                  <Textarea
                    {...form.register('value')}
                    placeholder={option.placeholder}
                    maxLength={300}
                  />
                ) : (
                  <Input
                    {...form.register('value')}
                    type={option.type === 'email' ? 'email' : 'text'}
                    inputMode={option.type === 'date' ? 'numeric' : undefined}
                    placeholder={option.placeholder}
                    maxLength={300}
                  />
                )}
              </FormField>
              <FormField
                id="tracking-change-note"
                label={
                  <>
                    {copy.change.noteLabel} <span>{copy.change.optional}</span>
                  </>
                }
                error={form.formState.errors.note?.message}
              >
                <Textarea
                  {...form.register('note')}
                  placeholder={copy.change.notePlaceholder}
                  maxLength={2000}
                />
              </FormField>
              <p className="cp-tracking-change-notice">{copy.change.note}</p>
              {failure ? (
                <p role="alert" className="cp-tracking-inline-error">
                  {failure}
                </p>
              ) : null}
              <div className="cp-tracking-change-actions">
                <CpButton type="button" tone="outline" onClick={onClose}>
                  {copy.change.cancel}
                </CpButton>
                <CpButton type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? copy.change.pending : copy.change.send}
                </CpButton>
              </div>
            </fieldset>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
