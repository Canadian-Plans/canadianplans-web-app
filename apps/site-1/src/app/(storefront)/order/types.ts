import type { RawAttribution, WebsiteBotProof } from '@canadian-plans/crm-contracts';

import type { OrderDetailsInput, OrderFieldErrors } from './details';

export type {
  ArrivalDetails,
  InternetDetails,
  MobileDetails,
  OrderCategory,
  OrderDetailField,
  OrderDetailsInput,
  OrderFieldErrors,
} from './details';

/** Failure codes the form reacts to. Never carries a reference. */
export type OrderErrorCode =
  | 'validation_error'
  | 'draft_expired'
  | 'not_saved'
  | 'callback'
  | 'offer_unavailable'
  | 'region_not_served'
  | 'unavailable'
  | 'verification_failed'
  | 'request_failed'
  | 'retry_fresh_draft'
  | 'transport_retry';

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: OrderErrorCode;
      message: string;
      fieldErrors?: OrderFieldErrors;
    };

export interface SaveDetailsInput extends WebsiteBotProof {
  details: OrderDetailsInput;
  productId: string;
  attribution: RawAttribution;
}

export interface SaveDocumentsInput extends WebsiteBotProof {
  details: OrderDetailsInput;
}

export interface CallbackInput extends WebsiteBotProof {
  details: OrderDetailsInput;
}

export interface SubmitOrderInput extends WebsiteBotProof {
  /** The terms version shown on the review step; the server checks it is current. */
  termsVersion: string;
  details: OrderDetailsInput;
  /** Recorded on an internet or mobile order, which the CRM takes whole on submit. */
  attribution: RawAttribution;
}

/** One line of the price summary on the review step. */
export interface PriceLine {
  label: string;
  amountMinor: number;
}

/**
 * The plan's current price, read from the CRM for the review step. It is shown
 * only: the CRM looks the price up again and freezes it on the order when the
 * order is submitted, and never takes one from the browser.
 */
export interface PriceSummary {
  currency: 'CAD';
  lines: PriceLine[];
  totalMinor: number;
  /** The terms the customer accepts with the order. */
  termsVersion: string;
}

export interface QuoteResult {
  quote: PriceSummary;
}

/** The three allowed document media types (recorded decision). */
export type DocumentContentType = 'application/pdf' | 'image/jpeg' | 'image/png';

export type DocumentIntentResult =
  | { ok: true; uploadId: string; url: string; method: 'PUT'; headers: Record<string, string> }
  | { ok: false; message: string };

export type DocumentFinalizeResult =
  { ok: true; fileId: string; documentType: string } | { ok: false; message: string };

export interface SubmitOrderResult {
  /** The order number when the CRM issues one (`MS-<n>`), else the order's id. */
  reference: string;
  orderId: string;
}
