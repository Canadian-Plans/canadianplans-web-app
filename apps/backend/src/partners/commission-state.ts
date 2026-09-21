import type { CommissionState } from '@canadian-plans/contracts';

/**
 * Commission line state machine (PLATFORM_CONTEXT.md §4 item 10; REQ 32):
 * `earned` → `carrier_paid` → `partner_paid`. It is entirely independent of the
 * order's fulfilment status (invariant 9) — advancing a commission never reads
 * or writes `orders.status`, and vice versa.
 *
 * Phase A only records `earned` and `carrier_paid`. `partner_paid` stays
 * disabled until B1 approved-invoice support exists or OPEN_INPUTS #18 defines
 * an interim approval mechanism; the backend refuses the transition until then
 * (`partner_paid_disabled`) rather than inventing an approval path.
 */

const forwardTransitions: Readonly<Record<CommissionState, CommissionState | undefined>> = {
  earned: 'carrier_paid',
  carrier_paid: 'partner_paid',
  partner_paid: undefined,
};

export type CommissionStateTransition =
  { status: 'ok' } | { status: 'partner_paid_disabled' } | { status: 'invalid_transition' };

/**
 * Whether a Finance action may move a commission line from `from` to `to`.
 * Only the single forward step is legal; `partner_paid` is explicitly gated
 * even though it is the natural next step from `carrier_paid`.
 */
export function validateCommissionStateTransition(
  from: CommissionState,
  to: CommissionState,
): CommissionStateTransition {
  if (to === 'partner_paid') return { status: 'partner_paid_disabled' };
  if (forwardTransitions[from] !== to) return { status: 'invalid_transition' };
  return { status: 'ok' };
}
