'use client';

import { useState } from 'react';
import type { OrderDetail, PaymentState } from '@canadian-plans/contracts';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@canadian-plans/ui';

import { recordOrderPayment } from '../../lib/api';
import { PAYMENT_STATE_LABELS, formatDateTime, formatMoney, isPaymentState } from './format';
import type { OrderWrite } from './order-write';

const PAYMENT_STATES: readonly PaymentState[] = ['not_required', 'pending', 'paid'];

export interface PaymentPanelProps {
  workspaceId: string;
  accessToken: string;
  order: OrderDetail;
  write: OrderWrite;
}

/**
 * Phase A manual payment recording (REQ 29). The amount shown comes only from
 * the frozen snapshot; the browser never supplies or re-prices it.
 */
export function OrderPayment({ workspaceId, accessToken, order, write }: PaymentPanelProps) {
  const [paymentState, setPaymentState] = useState<PaymentState>(order.paymentState);
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');

  const amountMinor = amount.trim() === '' ? undefined : Math.round(Number(amount) * 100);
  const amountValid =
    amountMinor === undefined || (Number.isFinite(amountMinor) && amountMinor >= 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Payment</h2>
        </CardTitle>
        <CardDescription>
          {order.snapshot.paymentRequired
            ? 'This plan requires payment; record it manually.'
            : 'This plan does not require payment.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Payment required</dt>
          <dd>{order.snapshot.paymentRequired ? 'Yes' : 'No'}</dd>
          <dt className="text-muted-foreground">Amount payable today</dt>
          <dd>{formatMoney(order.snapshot.amountPayableToday)}</dd>
          <dt className="text-muted-foreground">Current state</dt>
          <dd>{PAYMENT_STATE_LABELS[order.paymentState]}</dd>
        </dl>

        {order.payments.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {order.payments.map((payment) => (
              <li key={payment.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{PAYMENT_STATE_LABELS[payment.toState]}</Badge>
                  <span>
                    {payment.amount ? formatMoney(payment.amount) : 'amount not recorded'}
                    {payment.method ? ` · ${payment.method}` : ''}
                    {payment.reference ? ` · ${payment.reference}` : ''}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(payment.recordedAt)} · {payment.actorId.slice(0, 8)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No payments recorded.</p>
        )}

        {order.capabilities.canRecordPayment ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="payment-state">Payment state</Label>
              <Select
                value={paymentState}
                onValueChange={(value) => {
                  if (isPaymentState(value)) setPaymentState(value);
                }}
              >
                <SelectTrigger id="payment-state" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {PAYMENT_STATE_LABELS[state]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="payment-amount">Amount ({order.snapshot.currency})</Label>
              <Input
                id="payment-amount"
                inputMode="decimal"
                value={amount}
                aria-invalid={!amountValid}
                className="w-32"
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="payment-method">Method</Label>
              <Input
                id="payment-method"
                value={method}
                maxLength={120}
                className="w-40"
                onChange={(event) => setMethod(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="payment-reference">Reference</Label>
              <Input
                id="payment-reference"
                value={reference}
                maxLength={120}
                className="w-40"
                onChange={(event) => setReference(event.target.value)}
              />
            </div>
            <Button
              type="button"
              disabled={write.busy || !amountValid}
              onClick={async () => {
                const result = await write.run(() =>
                  recordOrderPayment(accessToken, workspaceId, order.id, {
                    paymentState,
                    ...(method.trim() ? { method: method.trim() } : {}),
                    ...(reference.trim() ? { reference: reference.trim() } : {}),
                    ...(amountMinor !== undefined ? { amountMinor } : {}),
                    expectedVersion: order.recordVersion,
                  }),
                );
                if (result) {
                  setMethod('');
                  setReference('');
                  setAmount('');
                }
              }}
            >
              Record payment
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your access does not include recording payments.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
