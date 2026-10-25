'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import type { AmendableFieldKey, TrackingOrderDetail } from '@canadian-plans/contracts';
import { CpAsset, CpButton } from '@canadian-plans/ui/canadian-plans';
import { orderFormContent } from '@content/order-forms';
import {
  trackBillingCopy,
  trackCopy as copy,
  trackDeliveryCopy,
  trackFieldLabels,
  trackPaymentCopy,
  trackStatusCopy,
} from '@content/track';
import { trackingAssets as assets } from '@content/track-order';
import { useHumanChallenge } from '@/components/shared/human-challenge';
import {
  documentRows,
  fillTemplate,
  formatDate,
  formatMoney,
  progressFor,
  type DocumentRow,
} from '@/lib/tracking-view';
import { TrackChangeDialog } from './change-dialog';
import { TrackInfoRequestForm } from './info-request-form';
import { useDocumentUpload } from './use-document-upload';

function documentLabel(key: string): string {
  return orderFormContent.checklistLabels[key] ?? key.replace(/_/g, ' ');
}

const documentStatusLabel: Readonly<Record<DocumentRow['status'], string>> = {
  received: copy.upload.statusReceived,
  approved: copy.upload.statusApproved,
  needs_replacement: copy.upload.statusReplace,
  missing: copy.upload.statusMissing,
};

const changeStatusLabel = {
  pending: copy.detail.changePending,
  approved: copy.detail.changeApproved,
  rejected: copy.detail.changeRejected,
} as const;

/** One verified customer's view of one of their orders. */
export function TrackOrderDetail({
  order,
  onBack,
  onRefresh,
  onSessionExpired,
}: {
  order: TrackingOrderDetail;
  onBack: () => void;
  onRefresh: () => Promise<void>;
  onSessionExpired: () => void;
}) {
  const human = useHumanChallenge();
  const [openCard, setOpenCard] = useState('documents');
  const [change, setChange] = useState<AmendableFieldKey | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const refresh = useCallback(() => void onRefresh(), [onRefresh]);
  const uploads = useDocumentUpload(order.reference, human, refresh);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const status = trackStatusCopy[order.fulfilmentStatus];
  const attention = order.actionNeeded || order.fulfilmentStatus === 'awaiting_customer';
  const rows = documentRows(order);
  const missing = rows.filter((row) => row.uploadable);
  const progress = progressFor(order.fulfilmentStatus);

  function openChange(field: AmendableFieldKey) {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setChange(field);
  }

  function uploadControl(row: DocumentRow, place: 'action' | 'documents') {
    const key = `${place}:${row.documentType}`;
    const label = fillTemplate(
      row.status === 'needs_replacement' ? copy.upload.replace : copy.upload.choose,
      { document: documentLabel(row.documentType) },
    );
    return (
      <>
        <input
          ref={(element) => {
            inputs.current[key] = element;
          }}
          type="file"
          className="sr-only"
          tabIndex={-1}
          accept="application/pdf,image/jpeg,image/png"
          aria-label={label}
          data-document={row.documentType}
          disabled={uploads.busy}
          onChange={(event) => {
            void uploads.upload(row.documentType, event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <CpButton
          className="cp-tracking-reupload"
          disabled={uploads.busy}
          onClick={() => inputs.current[key]?.click()}
        >
          <CpAsset asset={assets.upload} />
          {label}
        </CpButton>
      </>
    );
  }

  function uploadFeedback(documentType: string): ReactNode {
    const state = uploads.state;
    if (state.status === 'idle' || state.documentType !== documentType) return null;
    return (
      <p
        className={state.status === 'error' ? 'cp-tracking-inline-error' : 'cp-track-upload-note'}
        role={state.status === 'error' ? 'alert' : 'status'}
      >
        {state.status === 'uploading'
          ? copy.upload.uploading
          : state.status === 'done'
            ? copy.upload.done
            : state.message}
      </p>
    );
  }

  function group(
    id: string,
    title: string,
    summary: string,
    children: ReactNode,
    field?: AmendableFieldKey,
  ) {
    const open = openCard === id;
    return (
      <section className="cp-tracking-detail" data-card={id}>
        <button
          type="button"
          className="cp-tracking-detail-toggle"
          onClick={() => setOpenCard(open ? '' : id)}
          aria-expanded={open}
          aria-controls={`track-detail-${id}`}
        >
          <span>
            <strong>{title}</strong>
            {open ? null : <small>{summary}</small>}
          </span>
          <CpAsset asset={open ? assets.up : assets.down} />
        </button>
        <div className="cp-tracking-detail-heading">
          <h3>{title}</h3>
          {field ? (
            <button type="button" onClick={() => openChange(field)}>
              {copy.detail.requestChange}
            </button>
          ) : null}
        </div>
        <div className="cp-tracking-detail-body" id={`track-detail-${id}`} data-open={open}>
          {children}
          {field ? (
            <CpButton
              tone="outline-brand"
              className="cp-tracking-detail-change"
              onClick={() => openChange(field)}
            >
              {copy.detail.requestChange}
            </CpButton>
          ) : null}
        </div>
      </section>
    );
  }

  function rowsOf(values: readonly (readonly [string, ReactNode])[]) {
    return (
      <dl>
        {values.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  const d = copy.detail;
  const given = (value: string | null) => value ?? d.notGiven;
  const recurring = `${formatMoney(order.price.recurring)} ${trackBillingCopy[order.billingPeriod]}`;

  return (
    <>
      {human.challenge}
      <section className="cp-container cp-tracking-order-header">
        <button type="button" className="cp-tracking-back" onClick={onBack}>
          {d.back}
        </button>
        <div>
          <h1 id="tracking-title" tabIndex={-1}>
            {d.orderPrefix} {order.reference}
          </h1>
          <span
            className="cp-tracking-status"
            data-attention={attention}
            data-testid="tracking-status"
          >
            <CpAsset asset={attention ? assets.attentionDot : assets.sentDot} />
            {status.label}
          </span>
        </div>
        <p>{status.description}</p>
        <small>{fillTemplate(d.updated, { date: formatDate(order.updatedAt) })}</small>
      </section>

      {attention && (missing.length > 0 || order.infoRequests.length > 0) ? (
        <section className="cp-container cp-tracking-action-wrap">
          <div className="cp-tracking-action" data-testid="tracking-action">
            <span className="cp-tracking-attention-icon" aria-hidden="true">
              {copy.action.mark}
            </span>
            <div className="cp-tracking-action-copy">
              <h2>{copy.action.title}</h2>
              {missing.length > 0 ? <p>{copy.action.documents}</p> : null}
              {order.infoRequests.length > 0 ? <p>{copy.action.info}</p> : null}
            </div>
            {missing.map((row) => (
              <div className="cp-tracking-upload" key={row.documentType}>
                <strong>{documentLabel(row.documentType)}</strong>
                <small>{copy.upload.hint}</small>
                {uploadControl(row, 'action')}
                {uploadFeedback(row.documentType)}
              </div>
            ))}
            {order.infoRequests.map((request) => (
              <div className="cp-track-info" key={request.id}>
                <h3>{copy.info.title}</h3>
                <TrackInfoRequestForm
                  reference={order.reference}
                  request={request}
                  onSent={refresh}
                  onSessionExpired={onSessionExpired}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {order.fulfilmentStatus === 'cancelled' ? null : (
        <section className="cp-container cp-tracking-progress-wrap">
          <ol className="cp-tracking-progress" aria-label={status.label}>
            {progress.map((step) => (
              <li key={step.label} data-stage={step.kind}>
                <span className="cp-tracking-progress-marker">
                  <span className="cp-tracking-desktop">{step.marker}</span>
                  <span className="cp-tracking-mobile">
                    {step.kind === 'done' ? <CpAsset asset={assets.check} /> : step.marker}
                  </span>
                </span>
                <div>
                  <strong>{step.label}</strong>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="cp-container cp-tracking-details">
        <div>
          <h2>{d.detailsTitle}</h2>
          <p>{d.detailsIntro}</p>
        </div>
        <div className="cp-tracking-details-grid">
          {group(
            'plan',
            d.plan,
            `${order.productTitle} · ${recurring}`,
            rowsOf([
              [d.planName, `${order.productTitle} · ${order.offerName}`],
              [d.price, recurring],
              [d.payableToday, formatMoney(order.price.amountPayableToday)],
              [d.payment, trackPaymentCopy[order.paymentState]],
              [d.delivery, trackDeliveryCopy[order.deliveryState]],
              ...(order.trackingReference
                ? [[d.trackingReference, order.trackingReference] as const]
                : []),
              [d.submitted, formatDate(order.submittedAt)],
            ]),
          )}
          {group(
            'personal',
            d.personal,
            [order.customer.fullName, order.customer.email].filter(Boolean).join(' · '),
            rowsOf([
              [d.name, given(order.customer.fullName)],
              [d.email, given(order.customer.email)],
              [d.phone, given(order.customer.phone)],
              [d.country, given(order.customer.countryCode)],
            ]),
            'contact.email',
          )}
          {group(
            'arrival',
            d.arrival,
            [order.details.destination, order.details.arrivalDate].filter(Boolean).join(' · ') ||
              d.notGiven,
            rowsOf([
              [d.currentCountry, given(order.details.currentCountry)],
              [d.destination, given(order.details.destination)],
              [d.arrivalDate, given(order.details.arrivalDate)],
            ]),
            'form.arrivalDate',
          )}
          {group(
            'documents',
            d.documents,
            rows.length === 0
              ? d.documentsNone
              : rows.map((row) => documentLabel(row.documentType)).join(' · '),
            <>
              {rows.length === 0 ? (
                <p className="cp-tracking-detail-note">{d.documentsNone}</p>
              ) : null}
              {rows.map((row) => (
                <div
                  className="cp-tracking-document"
                  key={row.documentType}
                  data-attention={row.uploadable}
                  data-testid={`tracking-document-${row.documentType}`}
                >
                  <span>{copy.upload.doc}</span>
                  <div>
                    <strong>{documentLabel(row.documentType)}</strong>
                    {row.uploadable ? <small>{documentStatusLabel[row.status]}</small> : null}
                  </div>
                  {row.uploadable ? (
                    uploadControl(row, 'documents')
                  ) : (
                    <span className="cp-tracking-verified">{documentStatusLabel[row.status]}</span>
                  )}
                  {uploadFeedback(row.documentType)}
                </div>
              ))}
              <p className="cp-tracking-document-note">{d.documentsNote}</p>
            </>,
          )}
        </div>
        {order.changeRequests.length > 0 ? (
          <div className="cp-track-changes">
            <h3>{d.changesTitle}</h3>
            <ul>
              {order.changeRequests.map((request) => (
                <li key={request.id} data-status={request.status}>
                  <span>{request.fields.map((field) => trackFieldLabels[field]).join(', ')}</span>
                  <small>
                    {changeStatusLabel[request.status]} · {formatDate(request.createdAt)}
                  </small>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {change ? (
        <TrackChangeDialog
          order={order}
          initial={change}
          onClose={() => {
            setChange(null);
            requestAnimationFrame(() => {
              if (trigger.current?.isConnected) trigger.current.focus();
              else document.getElementById('tracking-title')?.focus();
            });
          }}
          onSent={refresh}
          onSessionExpired={onSessionExpired}
        />
      ) : null}
    </>
  );
}
