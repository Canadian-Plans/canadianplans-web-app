'use client';

import type { ReactNode } from 'react';
import type { OrderDetail } from '@canadian-plans/contracts';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@canadian-plans/ui';

import { ORDER_STATUS_LABELS, PAYMENT_STATE_LABELS, formatDateTime, formatMoney } from './format';

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

/** The frozen commercial snapshot (invariant 5) — read-only by construction. */
export function OrderSnapshotPanel({ order }: { order: OrderDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Commercial snapshot</h2>
        </CardTitle>
        <CardDescription>
          Frozen at submission. Later catalogue or price changes never alter it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <Row label="Plan" value={order.snapshot.offer.productTitle} />
          <Row label="Offer" value={order.snapshot.offer.offerName} />
          <Row
            label="Product key"
            value={<code className="text-xs">{order.snapshot.offer.productKey}</code>}
          />
          <Row label="Carrier" value={order.snapshot.offer.specs.carrier} />
          <Row label="Data allowance" value={order.snapshot.offer.specs.dataAllowance} />
          <Row label="Currency" value={order.snapshot.currency} />
          <Row label="Total" value={formatMoney(order.snapshot.total)} />
          <Row
            label="Amount payable today"
            value={formatMoney(order.snapshot.amountPayableToday)}
          />
          <Row label="Payment required" value={order.snapshot.paymentRequired ? 'Yes' : 'No'} />
          <Row
            label="Document checklist"
            value={
              order.snapshot.documentChecklist.length > 0
                ? order.snapshot.documentChecklist.join(', ')
                : 'none'
            }
          />
          <Row label="Terms version" value={order.snapshot.termsVersion} />
          <Row
            label="Offer version"
            value={<code className="text-xs">{order.snapshot.offerVersionId}</code>}
          />
        </dl>
        <ul className="mt-3 flex flex-col gap-1 text-sm">
          {order.snapshot.charges.map((charge) => (
            <li key={`${charge.code}-${charge.label}`} className="flex justify-between gap-4">
              <span>{charge.label}</span>
              <span>{formatMoney(charge.amount)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/** Customer details live on the originating lead; a change request can amend them. */
export function OrderCustomerPanel({ order }: { order: OrderDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Customer</h2>
        </CardTitle>
        <CardDescription>
          Workspace-scoped contact data. Approved corrections appear as amendments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <Row label="Name" value={order.customer.fullName ?? '—'} />
          <Row label="Email" value={order.customer.email ?? '—'} />
          <Row label="Phone" value={order.customer.phone ?? '—'} />
          <Row label="Country" value={order.customer.countryCode ?? '—'} />
          <Row label="Source" value={<code className="text-xs">{order.source}</code>} />
          <Row label="Partner code" value={order.partnerCode ?? '—'} />
          <Row label="Submitted" value={formatDateTime(order.submittedAt)} />
          <Row
            label="Marketing consent"
            value={
              order.consent
                ? order.consent.marketingOptIn
                  ? `Opted in (${order.consent.marketingConsentVersion ?? 'version not recorded'})`
                  : 'Not opted in'
                : 'Not recorded'
            }
          />
        </dl>
      </CardContent>
    </Card>
  );
}

/** Plan-specific details from the versioned form payload and submission history. */
export function OrderPlanPanel({ order }: { order: OrderDetail }) {
  const payload = order.payload.payload;
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Plan details</h2>
        </CardTitle>
        <CardDescription>
          Versioned form payload (schema version {order.payload.schemaVersion}).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(payload).map(([key, value]) => (
            <Row
              key={key}
              label={key}
              value={
                typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
                  ? String(value)
                  : JSON.stringify(value)
              }
            />
          ))}
        </dl>
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="secondary">{ORDER_STATUS_LABELS[order.fulfilmentStatus]}</Badge>
          <Badge variant="outline">{PAYMENT_STATE_LABELS[order.paymentState]}</Badge>
          <Badge variant="outline">Delivery: {order.deliveryState}</Badge>
          <Badge variant="outline">Archive: {order.archiveState}</Badge>
          <Badge variant="outline">Version {order.recordVersion}</Badge>
        </div>
        {order.dispatch ? (
          <p className="text-sm">
            Dispatched via {order.dispatch.courier}
            {order.dispatch.trackingReference
              ? ` · ${order.dispatch.trackingReference}`
              : ''} on {formatDateTime(order.dispatch.dispatchedAt)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Status history plus the full audit trail: who changed what, and when. */
export function OrderTimelinePanel({ order }: { order: OrderDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Audit timeline</h2>
        </CardTitle>
        <CardDescription>Every important change records who and when.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-medium">Status history</h3>
          {order.history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No status changes yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {order.history.map((entry) => (
                <li
                  key={`${entry.at}-${entry.recordVersion}`}
                  className="rounded-md border p-3 text-sm"
                >
                  <p>
                    {entry.fromStatus ? ORDER_STATUS_LABELS[entry.fromStatus] : 'Created'} →{' '}
                    {ORDER_STATUS_LABELS[entry.toStatus]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(entry.at)} · {entry.actorId.slice(0, 8)} · v
                    {entry.recordVersion}
                    {entry.note ? ` · ${entry.note}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-sm font-medium">Audit events</h3>
          {order.audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {order.audit.map((entry) => (
                <li key={entry.id} className="rounded-md border p-3 text-sm">
                  <p>{entry.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(entry.at)} · {entry.actorId.slice(0, 8)}
                  </p>
                  {entry.before || entry.after ? (
                    <p className="mt-1 text-xs">
                      before {JSON.stringify(entry.before)} → after {JSON.stringify(entry.after)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
