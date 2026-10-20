/**
 * Client-side Umami event helpers (T20, REQ 35). Only interactions that are not
 * conversions are emitted here — the lead/order conversion events come from the
 * backend outbox, so the browser never double-counts a submission.
 */

import { hasAnalyticsConsent } from './cookie-consent';
export interface UmamiTracker {
  track: (name?: string, data?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    umami?: UmamiTracker;
  }
}

/**
 * Records that a visitor looked at plans for a province, and whether we sell
 * internet there. The province code is not personal data; this is how we learn
 * which provinces to add next (ADR 0005, D5).
 */
export function trackRegionSelected(province: string, served: boolean): void {
  if (hasAnalyticsConsent()) window.umami?.track?.('region_selected', { province, served });
}

/** Records a plan selection. The value is the opaque product id — never contact data. */
export function trackPlanSelected(productId: string): void {
  if (hasAnalyticsConsent()) window.umami?.track?.('plan_selected', { plan: productId });
}
