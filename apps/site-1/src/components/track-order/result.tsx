'use client';
import type { ReactNode } from 'react';
import { CpAsset, CpButton, CpImageSlot } from '@canadian-plans/ui/canadian-plans';
import {
  trackingCopy as copy,
  trackingAssets as assets,
  type TrackingFixture,
  type TrackingResultState,
  type ChangeKind,
} from '@content/track-order';
type ResultFixture = Extract<TrackingFixture, { key: TrackingResultState }>;
export function TrackingResults({
  fixture,
  openCard,
  onCard,
  onChange,
  onUpload,
  onNotice,
  feedback,
}: {
  fixture: ResultFixture;
  openCard: string;
  onCard: (id: string) => void;
  onChange: (kind: ChangeKind) => void;
  onUpload: (file?: File) => void;
  onNotice: (kind: 'qr') => void;
  feedback?: ReactNode;
}) {
  const { order, attention } = fixture;
  const c = copy.details;
  function group(
    id: string,
    title: string,
    summary: string,
    children: ReactNode,
    kind?: ChangeKind,
  ) {
    const open = openCard === id;
    return (
      <section className="cp-tracking-detail" data-card={id}>
        <button
          type="button"
          className="cp-tracking-detail-toggle"
          onClick={() => onCard(open ? '' : id)}
          aria-expanded={open}
          aria-controls={`tracking-detail-${id}`}
        >
          <span>
            <strong>{title}</strong>
            {open ? null : <small>{summary}</small>}
          </span>
          <CpAsset asset={open ? assets.up : assets.down} />
        </button>
        <div className="cp-tracking-detail-heading">
          <h3>{title}</h3>
          {kind ? (
            <button type="button" onClick={() => onChange(kind)}>
              {copy.request}
            </button>
          ) : null}
        </div>
        <div className="cp-tracking-detail-body" id={`tracking-detail-${id}`} data-open={open}>
          {children}
          {kind ? (
            <CpButton
              tone="outline-brand"
              className="cp-tracking-detail-change"
              onClick={() => onChange(kind)}
            >
              {copy.request}
            </CpButton>
          ) : null}
        </div>
      </section>
    );
  }
  function rows(values: readonly (readonly [string, ReactNode])[]) {
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
  return (
    <>
      <section className="cp-container cp-tracking-order-header">
        <button type="button" className="cp-tracking-back" onClick={() => onCard('lookup')}>
          {copy.back}
        </button>
        <div>
          <h1 id="tracking-title" tabIndex={-1}>
            {copy.orderPrefix} {order.reference}
          </h1>
          <span className="cp-tracking-status" data-attention={attention}>
            <CpAsset asset={attention ? assets.attentionDot : assets.sentDot} />
            {fixture.status}
          </span>
        </div>
        <p>{fixture.description}</p>
        <small>{fixture.updated}</small>
      </section>
      {feedback}
      {attention ? (
        <section className="cp-container cp-tracking-action-wrap">
          <div className="cp-tracking-action">
            <span className="cp-tracking-attention-icon" aria-hidden="true">
              {copy.action.mark}
            </span>
            <div className="cp-tracking-action-copy">
              <h2>{copy.action.title}</h2>
              <p>{copy.action.description}</p>
              <CpImageSlot
                icon={assets.imageLight}
                label={copy.imageLabel}
                caption={copy.action.caption}
              />
            </div>
            <div
              className="cp-tracking-upload"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) onUpload(file);
              }}
            >
              <strong>
                <span className="cp-tracking-desktop">{copy.action.drop}</span>
                <span className="cp-tracking-mobile">{copy.action.mobileDrop}</span>
              </strong>
              <small>{copy.action.hint}</small>
              <CpButton onClick={() => onUpload()}>{copy.action.upload}</CpButton>
              <a href={copy.destinations.contact}>{copy.action.alternative}</a>
            </div>
          </div>
        </section>
      ) : (
        <section className="cp-container cp-tracking-install-wrap">
          <div className="cp-tracking-install">
            <CpImageSlot
              icon={assets.imageLight}
              label={copy.imageLabel}
              caption={copy.install.caption}
            />
            <div>
              <p className="cp-tracking-eyebrow">{copy.install.eyebrow}</p>
              <h2>{copy.install.title}</h2>
              <ol>
                {copy.install.steps.map((step) => (
                  <li key={step.number}>
                    <span>{step.number}</span>
                    <p>{step.text}</p>
                  </li>
                ))}
              </ol>
              <div className="cp-tracking-install-actions">
                <CpButton onClick={() => onNotice('qr')}>{copy.install.resend}</CpButton>
                <a href={copy.destinations.guide}>{copy.install.guide}</a>
              </div>
            </div>
          </div>
        </section>
      )}
      <section className="cp-container cp-tracking-progress-wrap">
        <ol className="cp-tracking-progress" aria-label={fixture.status}>
          {fixture.progress.map((step) => (
            <li key={step.label} data-stage={step.kind}>
              <span className="cp-tracking-progress-marker">
                <span className="cp-tracking-desktop">{step.marker}</span>
                <span className="cp-tracking-mobile">
                  {step.kind === 'done' ? <CpAsset asset={assets.check} /> : step.marker}
                </span>
              </span>
              <div>
                <strong>{step.label}</strong>
                <p>{step.date}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="cp-container cp-tracking-result-body">
        <div className="cp-tracking-updates">
          <h2>{copy.updatesTitle}</h2>
          <ol>
            {fixture.updates.map((update, i) => (
              <li key={update.title}>
                <span className="cp-tracking-update-marker">
                  <CpAsset asset={i === 0 ? assets.updateDot : assets.pastDot} />
                </span>
                <div>
                  <p>{update.time}</p>
                  <h3>{update.title}</h3>
                  <p>
                    {update.phoneDescription ? (
                      <>
                        <span className="cp-tracking-copy-phone">{update.phoneDescription}</span>
                        <span className="cp-tracking-copy-fluid">{update.description}</span>
                      </>
                    ) : (
                      update.description
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="cp-tracking-advisor">
          <p className="cp-tracking-eyebrow">{copy.advisor.eyebrow}</p>
          <div>
            <CpAsset asset={assets.avatar} />
            <div>
              <strong>{copy.advisor.name}</strong>
              <p>{copy.advisor.hours}</p>
            </div>
          </div>
          <p>{copy.advisor.description}</p>
          <CpButton asChild>
            <a href={copy.destinations.contact}>{copy.advisor.button}</a>
          </CpButton>
        </div>
      </section>
      <section className="cp-container cp-tracking-details">
        <div>
          <h2>{copy.detailsTitle}</h2>
          <p>{copy.detailsIntro}</p>
        </div>
        <div className="cp-tracking-details-grid">
          {group(
            'plan',
            c.plan,
            c.collapsedPlan,
            <>
              {rows([
                [c.plan, order.plan],
                [c.sim, order.sim],
                [c.price, order.price],
                [c.charged, c.chargedAmount],
              ])}
              <p className="cp-tracking-detail-note">{c.planNote}</p>
            </>,
            'plan',
          )}
          {group(
            'personal',
            c.personal,
            c.collapsedPersonal,
            rows([
              [c.name, order.name],
              [c.email, order.email],
              [
                c.phone,
                <>
                  {order.phone}
                  <span className="cp-tracking-whatsapp">{c.whatsapp}</span>
                </>,
              ],
              [c.audience, order.audience],
            ]),
            'details',
          )}
          {group(
            'arrival',
            c.arrival,
            order.arrival,
            <>
              {rows([
                [c.arriving, order.arrival],
                [c.newNumber, attention ? c.afterActivation : order.newNumber],
                [c.sentTo, order.email],
                ...(!attention ? [[c.phone, order.device] as const] : []),
              ])}
              <p className="cp-tracking-detail-note">
                {attention ? c.arrivalActionNote : c.arrivalSentNote}
              </p>
            </>,
            'email',
          )}
          {group(
            'documents',
            c.documents,
            attention ? c.actionDocuments : c.collapsedDocuments,
            <>
              <div className="cp-tracking-document">
                <span>{c.doc}</span>
                <div>
                  <strong>{c.passport}</strong>
                  <small>{order.passportFile}</small>
                  <span className="cp-tracking-verified cp-tracking-mobile">{c.verified}</span>
                </div>
                <span className="cp-tracking-verified cp-tracking-desktop">{c.verified}</span>
              </div>
              <div className="cp-tracking-document" data-attention={attention}>
                <span>{c.doc}</span>
                <div>
                  <strong>{c.permit}</strong>
                  <small>{attention ? c.blurred : order.permitFile}</small>
                  {!attention ? (
                    <span className="cp-tracking-verified cp-tracking-mobile">{c.verified}</span>
                  ) : null}
                </div>
                {attention ? (
                  <CpButton className="cp-tracking-reupload" onClick={() => onUpload()}>
                    <CpAsset asset={assets.upload} />
                    {c.reupload}
                  </CpButton>
                ) : (
                  <span className="cp-tracking-verified cp-tracking-desktop">{c.verified}</span>
                )}
              </div>
              <button type="button" className="cp-tracking-add-document" onClick={() => onUpload()}>
                {c.uploadAnother}
              </button>
              <p className="cp-tracking-document-note">{c.documentNote}</p>
            </>,
          )}
        </div>
      </section>
    </>
  );
}
