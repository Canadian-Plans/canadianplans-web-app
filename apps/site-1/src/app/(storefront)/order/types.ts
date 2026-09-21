import type { Quote, RawAttribution } from '@canadian-plans/contracts';

/** The four detail fields the customer enters in step 2 (REQ 16/17). */
export interface OrderDetailsInput {
  fullName: string;
  email: string;
  phone: string;
  countryCode: string;
  currentCountry: string;
  destination: string;
  arrivalDate: string;
}

export type OrderDetailField = keyof OrderDetailsInput | 'terms' | 'marketing';

export type OrderFieldErrors = Partial<Record<OrderDetailField, string>>;

/** Failure codes the form reacts to. Never carries a reference. */
export type OrderErrorCode =
  | 'validation_error'
  | 'draft_expired'
  | 'not_saved'
  | 'callback'
  | 'quote_restart'
  | 'offer_unavailable'
  | 'terms_changed'
  | 'unavailable';

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: OrderErrorCode;
      message: string;
      fieldErrors?: OrderFieldErrors;
    };

export interface SaveDetailsInput {
  details: OrderDetailsInput;
  /** The selected offer's `documentChecklist`, persisted with the draft. */
  documentKeys: readonly string[];
  productId: string;
  attribution: RawAttribution;
  /** The disclosure version shown with the save notice (REQ 17). */
  consentVersion: string;
}

export interface SaveDocumentsInput {
  details: OrderDetailsInput;
  documentKeys: readonly string[];
  /** The placeholder step records that the customer saw the checklist. */
  acknowledged: boolean;
}

export interface CallbackInput {
  details: OrderDetailsInput;
  documentKeys: readonly string[];
}

export interface SubmitOrderInput {
  quoteId: string;
  termsVersion: string;
  marketingOptIn: boolean;
  details: OrderDetailsInput;
  documentKeys: readonly string[];
}

export interface QuoteResult {
  quote: Quote;
}

/** The three allowed document media types (recorded decision). */
export type DocumentContentType = 'application/pdf' | 'image/jpeg' | 'image/png';

export type DocumentIntentResult =
  | { ok: true; uploadId: string; url: string; method: 'PUT'; headers: Record<string, string> }
  | { ok: false; message: string };

export type DocumentFinalizeResult =
  { ok: true; fileId: string; documentType: string } | { ok: false; message: string };

export interface SubmitOrderResult {
  reference: string;
  orderId: string;
}
