'use client';

import type { TrackingOrder } from '@canadian-plans/crm-contracts';
import { CpAsset } from '@canadian-plans/ui/canadian-plans';
import { trackCopy as copy } from '@content/track';
import { trackingAssets as assets } from '@content/track-order';
import { fillTemplate, formatDate, needsAttention, planView } from '@/lib/tracking-view';

/** Every order of the verified email on this website, newest first. */
export function TrackOrderList({
  email,
  orders,
  onOpen,
  onSignOut,
}: {
  email: string | undefined;
  orders: readonly TrackingOrder[];
  onOpen: (reference: string) => void;
  onSignOut: () => void;
}) {
  return (
    <section className="cp-container cp-track-orders">
      <div className="cp-track-orders-header">
        <div>
          <p className="cp-tracking-eyebrow">{copy.lookup.eyebrow}</p>
          <h1 id="tracking-title" tabIndex={-1}>
            {copy.list.heading}
          </h1>
          {email ? <p>{fillTemplate(copy.list.intro, { email })}</p> : null}
        </div>
        <button type="button" className="cp-tracking-back" onClick={onSignOut}>
          {copy.list.signOut}
        </button>
      </div>
      {orders.length === 0 ? (
        <p className="cp-tracking-preview-notice" role="status">
          {copy.list.empty}
        </p>
      ) : (
        <ul className="cp-track-order-cards">
          {orders.map((order) => {
            const attention = needsAttention(order);
            return (
              <li key={order.reference}>
                <button
                  type="button"
                  className="cp-track-order-card"
                  onClick={() => onOpen(order.reference)}
                  aria-label={`${copy.list.open} ${order.reference}`}
                >
                  <span className="cp-track-order-card-top">
                    <strong>{order.reference}</strong>
                    <span className="cp-tracking-status" data-attention={attention}>
                      <CpAsset asset={attention ? assets.attentionDot : assets.sentDot} />
                      {order.stageLabel}
                    </span>
                  </span>
                  <span>{planView(order).name ?? copy.list.planNotGiven}</span>
                  {attention ? <span>{copy.list.actionNeeded}</span> : null}
                  <small>
                    {copy.list.submitted} {formatDate(order.submittedAt)}
                  </small>
                  <span className="cp-track-order-card-open" aria-hidden="true">
                    {copy.list.open} →
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
