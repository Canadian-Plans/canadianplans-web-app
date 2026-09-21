/**
 * Operational switch for the fulfilment transitions (dispatch and activation).
 *
 * This was a TEST-only flag that production ignored outright, because
 * OPEN_INPUTS #15 had not defined what must be true before an order may be
 * dispatched or activated. #15 is now resolved — required documents must be
 * approved, payment is not a prerequisite, and `order.manage` may override
 * with a recorded reason (`document-prerequisite.ts`) — so the blanket
 * production block is gone and the real rule is enforced instead.
 *
 * It remains opt-in rather than defaulting on: fulfilment goes live when the
 * owner deliberately sets it, and unsetting it is a kill switch that stops
 * dispatch/activation without a deploy. It never authorizes skipping the
 * document prerequisite.
 */
export function loadOperationalTransitionsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ORDER_OPERATIONAL_TRANSITIONS === '1' || env.ORDER_OPERATIONAL_TRANSITIONS === 'true';
}
