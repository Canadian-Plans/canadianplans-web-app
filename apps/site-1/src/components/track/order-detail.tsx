'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import type { TrackingOrder } from '@canadian-plans/crm-contracts';
import { CpAsset, CpButton } from '@canadian-plans/ui/canadian-plans';
import {
  trackBillingCopy,
  trackCopy as copy,
  trackDeliveryCopy,
  trackDocumentLabels,
  trackDocumentStateCopy,
  trackFieldLabels,
  trackPermitCopy,
} from '@content/track';
import { trackingAssets as assets } from '@content/track-order';
import { useHumanChallenge } from '@/components/shared/human-challenge';
import {
  documentRows,
  fillTemplate,
  formatDate,
  formatPrice,
  isUploadDocumentType,
  pendingChangeView,
  planView,
  type DocumentRow,
  type TrackEditableField,
} from '@/lib/tracking-view';
import { TrackChangeDialog } from './change-dialog';
import { useDocumentUpload } from './use-document-upload';

function documentLabel(key: string): string {
  return trackDocumentLabels[key] ?? key.replace(/_/g, ' ');
}

/** One verified customer's view of one of their orders. */
export function TrackOrderDetail({
  order,
  onBack,
  onRefresh,
  onSessionExpired,
}: {
  order: TrackingOrder;
  onBack: () => void;
  onRefresh: () => Promise<void>;
  onSessionExpired: () => void;
}) {
  const human = useHumanChallenge();
  const [openCard, setOpenCard] = useState('documents');
  const [change, setChange] = useState<TrackEditableField | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const refresh = useCallback(() => void onRefresh(), [onRefresh]);
  const uploads = useDocumentUpload(order.reference, human, refresh);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const rows = documentRows(order);
  const missing = rows.filter((row) => row.needed);
  const attention = missing.length > 0;
  const plan = planView(order);
  const pendingChange = pendingChangeView(order);

  function openChange(field: TrackEditableField) {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setChange(field);
  }

  function uploadControl(row: DocumentRow, place: 'action' | 'documents') {
    const documentType = row.documentType;
    if (!isUploadDocumentType(documentType)) return null;
    const key = `${place}:${documentType}`;
    const label = fillTemplate(
      row.state === 'missing' && !row.sent ? copy.upload.choose : copy.upload.replace,
      { document: documentLabel(documentType) },
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
          data-document={documentType}
          disabled={uploads.busy}
          onChange={(event) => {
            void uploads.upload(documentType, event.target.files?.[0]);
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
    field?: TrackEditableField,
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
  const price =
    plan.priceMinor === null || plan.billingPeriod === null
      ? null
      : `${formatPrice(plan.priceMinor)} ${trackBillingCopy[plan.billingPeriod]}`;
  const details = order.details;
  const changeField: TrackEditableField | undefined = order.canRequestChange
    ? 'fullName'
    : undefined;
  const deliveryRows: (readonly [string, ReactNode])[] = [
    ...(order.delivery ? [[d.deliveryMethod, trackDeliveryCopy[order.delivery]] as const] : []),
    ...(order.courier ? [[d.courier, order.courier] as const] : []),
    ...(order.trackingNumber ? [[d.trackingNumber, order.trackingNumber] as const] : []),
    ...(order.dispatchedAt ? [[d.dispatched, formatDate(order.dispatchedAt)] as const] : []),
    ...(order.simNumber ? [[d.simNumber, order.simNumber] as const] : []),
  ];

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
            {order.stageLabel}
          </span>
        </div>
        <small>{fillTemplate(d.submittedOn, { date: formatDate(order.submittedAt) })}</small>
      </section>

      {attention ? (
        <section className="cp-container cp-tracking-action-wrap">
          <div className="cp-tracking-action" data-testid="tracking-action">
            <span className="cp-tracking-attention-icon" aria-hidden="true">
              {copy.action.mark}
            </span>
            <div className="cp-tracking-action-copy">
              <h2>{copy.action.title}</h2>
              <p>{copy.action.documents}</p>
            </div>
            {missing.map((row) => (
              <div className="cp-tracking-upload" key={row.documentType}>
                <strong>{documentLabel(row.documentType)}</strong>
                <small>{copy.upload.hint}</small>
                {uploadControl(row, 'action')}
                {uploadFeedback(row.documentType)}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="cp-container cp-tracking-details">
        <div>
          <h2>{d.detailsTitle}</h2>
          <p>{order.canRequestChange ? d.detailsIntro : d.detailsIntroLocked}</p>
        </div>
        <div className="cp-tracking-details-grid">
          {group(
            'plan',
            d.plan,
            [plan.name ?? d.planNotGiven, price].filter(Boolean).join(' · '),
            rowsOf([
              [d.planName, plan.name ?? d.planNotGiven],
              ...(price ? [[d.price, price] as const] : []),
              ...(order.quantity > 1 ? [[d.quantity, String(order.quantity)] as const] : []),
              [d.submitted, formatDate(order.submittedAt)],
            ]),
          )}
          {deliveryRows.length > 0
            ? group(
                'delivery',
                d.delivery,
                deliveryRows.map(([, value]) => value).join(' · '),
                rowsOf(deliveryRows),
              )
            : null}
          {group(
            'personal',
            d.personal,
            [details.fullName, details.canadaAddress].filter(Boolean).join(' · ') || d.notGiven,
            rowsOf([
              [d.name, given(details.fullName)],
              [d.phone, given(details.phone)],
              [d.arrivalDate, details.arrivalDate ? formatDate(details.arrivalDate) : d.notGiven],
              [d.destination, given(details.canadaAddress)],
              ...(details.permitType
                ? [[d.permitType, trackPermitCopy[details.permitType]] as const]
                : []),
              ...(details.shippingAddress
                ? [[d.shippingAddress, details.shippingAddress] as const]
                : []),
              ...(details.flightBooked === null
                ? []
                : [[d.flightBooked, details.flightBooked ? d.yes : d.no] as const]),
            ]),
            changeField,
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
              {rows.map((row) => {
                const stateLabel = row.sent ? copy.upload.sent : trackDocumentStateCopy[row.state];
                return (
                  <div
                    className="cp-tracking-document"
                    key={row.documentType}
                    data-attention={row.needed}
                    data-testid={`tracking-document-${row.documentType}`}
                  >
                    <span>{copy.upload.doc}</span>
                    <div>
                      <strong>{documentLabel(row.documentType)}</strong>
                      {row.uploadable ? <small>{stateLabel}</small> : null}
                    </div>
                    {row.uploadable ? (
                      uploadControl(row, 'documents')
                    ) : (
                      <span className="cp-tracking-verified">{stateLabel}</span>
                    )}
                    {uploadFeedback(row.documentType)}
                  </div>
                );
              })}
              <p className="cp-tracking-document-note">{d.documentsNote}</p>
            </>,
          )}
        </div>
        {pendingChange ? (
          <div className="cp-track-changes" data-testid="tracking-pending-change">
            <h3>{d.pendingTitle}</h3>
            <ul>
              <li data-status="pending">
                <span>
                  {fillTemplate(d.pendingRequest, { number: String(pendingChange.requestNo) })}
                </span>
                <small>
                  {d.pendingStatus} ·{' '}
                  {fillTemplate(d.pendingUpdated, { date: formatDate(pendingChange.updatedAt) })}
                </small>
              </li>
              {pendingChange.fields.length > 0 ? (
                <li>
                  <span>{d.pendingFields}</span>
                  <small>
                    {pendingChange.fields.map((field) => trackFieldLabels[field]).join(', ')}
                  </small>
                </li>
              ) : null}
              {pendingChange.documents.length > 0 ? (
                <li>
                  <span>{d.pendingDocuments}</span>
                  <small>{pendingChange.documents.map(documentLabel).join(', ')}</small>
                </li>
              ) : null}
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
