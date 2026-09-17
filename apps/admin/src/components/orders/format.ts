import {
  orderFulfilmentStatusSchema,
  paymentStateSchema,
  type OrderFulfilmentStatus,
  type PaymentState,
} from '@canadian-plans/contracts';

/** Type guards so a select's string value narrows without an assertion. */
export function isOrderStatus(value: string): value is OrderFulfilmentStatus {
  return orderFulfilmentStatusSchema.safeParse(value).success;
}

export function isPaymentState(value: string): value is PaymentState {
  return paymentStateSchema.safeParse(value).success;
}

/** Human labels for the fulfilment statuses in REQUIREMENTS.md REQ 19. */
export const ORDER_STATUS_LABELS: Readonly<Record<OrderFulfilmentStatus, string>> = {
  submitted: 'Submitted',
  in_progress: 'In progress',
  awaiting_customer: 'Awaiting customer',
  ready_for_delivery: 'Ready for delivery',
  dispatched: 'Dispatched',
  activated: 'Activated',
  cancelled: 'Cancelled',
};

export const PAYMENT_STATE_LABELS: Readonly<Record<PaymentState, string>> = {
  not_required: 'Not required',
  pending: 'Pending',
  paid: 'Paid',
};

export function formatMoney(amount: { amountMinor: number; currency: string }): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: amount.currency,
  }).format(amount.amountMinor / 100);
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

/** The customer label a list row shows, without inventing a name that is not stored. */
export function customerLabel(customer: {
  fullName: string | null;
  email: string | null;
  phone: string | null;
}): string {
  return customer.fullName ?? customer.email ?? customer.phone ?? '—';
}
