/**
 * Client-side Umami event helpers (T20, REQ 35). Only interactions that are not
 * conversions are emitted here — the lead/order conversion events come from the
 * backend outbox, so the browser never double-counts a submission.
 */

export interface UmamiTracker {
  track: (name?: string, data?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    umami?: UmamiTracker;
  }
}

/** Records a plan selection. The value is the opaque product id — never contact data. */
export function trackPlanSelected(productId: string): void {
  window.umami?.track?.('plan_selected', { plan: productId });
}
