'use server';

import { randomUUID } from 'node:crypto';
import {
  BackendError,
  type ProvinceCode,
  websiteBotTokenSchema,
  type WebsiteBotProof,
  type WebsiteOffer,
} from '@canadian-plans/contracts';
import { z } from 'zod';

import { getBackendClient } from '@/lib/backendClient';
import { siteConfig } from '@/site.config';
import { buildOrderForm, parseOrderDetails, type ParsedOrder } from './details';
import { clearOrderDraft, readOrderDraft, writeOrderDraft } from './draft';
import { verificationContent } from '@content/verification';
import type {
  ActionResult,
  CallbackInput,
  DocumentFinalizeResult,
  DocumentIntentResult,
  QuoteResult,
  SaveDetailsInput,
  SaveDocumentsInput,
  SubmitOrderInput,
  SubmitOrderResult,
} from './types';

/**
 * Server actions for the order form. Every backend call happens here, on the
 * server, with the site's service credential — the browser never holds it and
 * never sees a price it could tamper with. The scoped draft grant and the
 * submission idempotency key live in an httpOnly cookie (see `draft.ts`).
 */

function validProof(input: WebsiteBotProof): boolean {
  return websiteBotTokenSchema.safeParse(input.turnstileToken).success;
}
function verificationFailure(): Extract<ActionResult<never>, { ok: false }> {
  return { ok: false, code: 'verification_failed', message: verificationContent.failed };
}

const documentKeysSchema = z.array(z.string().regex(/^[a-z0-9_]{1,64}$/)).max(32);

/**
 * Validates what the browser sent, on the server, against the category's rules.
 * A failure carries per-field messages for the form's error summary.
 */
function checkDetails(
  details: unknown,
): { ok: true; order: ParsedOrder } | { ok: false; failure: ActionResult<never> } {
  const parsed = parseOrderDetails(details);
  if (parsed.ok) return { ok: true, order: parsed.order };
  return {
    ok: false,
    failure: {
      ok: false,
      code: 'validation_error',
      message: 'Please correct the highlighted fields.',
      fieldErrors: parsed.errors,
    },
  };
}

/** One API payload shape, so a later PATCH replaces (never drops) earlier steps. */
function formFor(
  order: ParsedOrder,
  documentKeys: readonly string[],
  acknowledged: boolean,
  extra: Record<string, unknown> = {},
) {
  return buildOrderForm(order, documentKeys, acknowledged, {
    creditCheckConsentVersion: siteConfig.legal.creditCheckConsentVersion,
    extra,
  });
}

/**
 * The offer the customer picked, read from the backend (the browser is not
 * trusted on what a product is). A provincial plan is only returned for a
 * province it is sold in.
 */
async function findOffer(
  productId: string,
  province: ProvinceCode | undefined,
): Promise<WebsiteOffer | undefined> {
  const { offers } = await getBackendClient().offers.list(province ? { province } : undefined);
  return offers.find((offer) => offer.productId === productId);
}

function notSaved(): ActionResult<never> {
  return {
    ok: false,
    code: 'not_saved',
    message: 'Your order was not saved. Please try again.',
  };
}

function draftExpired(): ActionResult<never> {
  return {
    ok: false,
    code: 'draft_expired',
    message: 'Your saved details have expired. Please start the order again.',
  };
}

/**
 * The previous draft can no longer be edited: its grant lapsed, it was cleaned
 * up, or it was already turned into an order. None of these is a save failure —
 * the customer simply needs a new draft (see `saveDetails`).
 */
function isFinishedDraft(error: unknown): boolean {
  return (
    error instanceof BackendError &&
    (error.code === 'draft_expired' ||
      error.code === 'draft_not_found' ||
      error.code === 'draft_already_submitted')
  );
}

function regionNotServed(): ActionResult<never> {
  return {
    ok: false,
    code: 'region_not_served',
    message: "That plan isn't sold in the province you chose. Choose another plan or province.",
  };
}

function alreadyOrdered(): ActionResult<never> {
  return {
    ok: false,
    code: 'draft_expired',
    message: 'That order has already been placed. Start a new order to buy another plan.',
  };
}

function failureFrom(error: unknown): ActionResult<never> {
  if (error instanceof BackendError) {
    if (error.code === 'draft_already_submitted') return alreadyOrdered();
    if (error.code === 'draft_expired' || error.code === 'draft_not_found') return draftExpired();
    if (
      error.code === 'quote_expired' ||
      error.code === 'quote_withdrawn' ||
      error.code === 'quote_consumed'
    ) {
      return {
        ok: false,
        code: 'quote_restart',
        message: 'That price quotation has expired. Please review the current price again.',
      };
    }
    if (error.code === 'terms_version_unsupported') {
      return {
        ok: false,
        code: 'terms_changed',
        message: 'The terms changed while you were ordering. Please review and accept them again.',
      };
    }
    if (error.code === 'offer_unavailable') {
      return {
        ok: false,
        code: 'offer_unavailable',
        message: 'That plan is no longer available.',
      };
    }
    if (error.code === 'region_not_served') return regionNotServed();
    if (error.code === 'priced_checkout_disabled') {
      return { ok: false, code: 'callback', message: 'Online pricing is unavailable right now.' };
    }
  }
  // A transport failure, a 5xx or an unhandled code must never look like success.
  return notSaved();
}

function quoteFailureFrom(error: unknown): ActionResult<never> {
  if (error instanceof BackendError) {
    if (error.code === 'draft_already_submitted') return alreadyOrdered();
    if (error.code === 'draft_expired' || error.code === 'draft_not_found') return draftExpired();
    if (error.code === 'region_not_served') return regionNotServed();
    if (error.code === 'offer_unavailable') {
      return {
        ok: false,
        code: 'offer_unavailable',
        message: 'That plan is no longer available. Choose another plan or request a callback.',
      };
    }
  }
  return {
    ok: false,
    code: 'callback',
    message: "We couldn't verify the current price for this plan.",
  };
}

/** The plan is not on offer for this customer: not sold in their province, or gone. */
function planNotAvailable(order: ParsedOrder): ActionResult<never> {
  if (order.category === 'internet') {
    return {
      ok: false,
      code: 'region_not_served',
      message: "That plan isn't sold in the province you chose. Choose another plan or province.",
    };
  }
  return { ok: false, code: 'offer_unavailable', message: 'That plan is no longer available.' };
}

/**
 * End of step 2: create the draft lead (or update it when resuming), then issue
 * and persist the one idempotency key this draft will ever use.
 */
export async function saveDetails(
  input: SaveDetailsInput,
): Promise<ActionResult<{ leadId: string }>> {
  const checked = checkDetails(input.details);
  if (!checked.ok) return checked.failure;
  const { order } = checked;
  const documentKeys = documentKeysSchema.safeParse(input.documentKeys);
  const productId = z.uuid().safeParse(input.productId);
  if (!documentKeys.success || !productId.success) {
    return { ok: false, code: 'validation_error', message: 'The selected plan is invalid.' };
  }
  // Only an internet plan is priced by province; the quote needs it again later.
  const province = order.category === 'internet' ? order.province : undefined;

  if (!validProof(input)) return verificationFailure();
  const existing = await readOrderDraft();
  const contact = order.contact;
  const form = formFor(order, documentKeys.data, false);
  const client = getBackendClient();

  try {
    // The browser is not trusted on what the product is or where it is sold: the
    // plan is read from the backend, and the form must match its category.
    const offer = await findOffer(productId.data, order.province);
    if (!offer) return planNotAvailable(order);
    if (offer.commercial.productType !== order.category) {
      return {
        ok: false,
        code: 'validation_error',
        message: 'Those details do not match the plan you selected. Please start again.',
      };
    }

    if (existing) {
      try {
        const updated = await client.leads.update(
          existing.leadId,
          { contact, form, productId: productId.data },
          { draftGrant: existing.draftGrant, turnstileToken: input.turnstileToken },
        );
        // Same draft, same grant, same submission key — only the plan may change.
        await writeOrderDraft({ ...existing, productId: productId.data, province });
        return { ok: true, data: { leadId: updated.lead.id } };
      } catch (error) {
        // The cookie still points at a draft that can no longer be edited —
        // most often because the customer already ordered with it and has come
        // back for a second plan. Fall through and start a brand-new draft with
        // its own idempotency key rather than dead-ending them on an httpOnly
        // cookie they cannot clear. Anything else is a real failure.
        if (!isFinishedDraft(error)) throw error;
        await clearOrderDraft();
        return { ok: false, code: 'retry_fresh_draft', message: verificationContent.retryDraft };
      }
    }
    const created = await client.leads.create(
      {
        contact,
        form,
        productId: productId.data,
        attribution: input.attribution,
        // The server's own disclosure version: never trusted from the browser.
        consentVersion: siteConfig.legal.consentVersion,
      },
      { turnstileToken: input.turnstileToken },
    );
    await writeOrderDraft({
      leadId: created.lead.id,
      draftGrant: created.draftGrant.token,
      // Generated exactly once per draft and reused by every later attempt.
      idempotencyKey: `order-${randomUUID()}`,
      productId: productId.data,
      province,
    });
    return { ok: true, data: { leadId: created.lead.id } };
  } catch (error) {
    return failureFrom(error);
  }
}

export async function saveDocuments(
  input: SaveDocumentsInput,
): Promise<ActionResult<{ leadId: string }>> {
  const checked = checkDetails(input.details);
  if (!checked.ok) return checked.failure;
  if (!validProof(input)) return verificationFailure();
  const draft = await readOrderDraft();
  if (!draft) return draftExpired();

  try {
    const updated = await getBackendClient().leads.update(
      draft.leadId,
      {
        contact: checked.order.contact,
        form: formFor(checked.order, input.documentKeys, input.acknowledged),
        productId: draft.productId,
      },
      { draftGrant: draft.draftGrant, turnstileToken: input.turnstileToken },
    );
    return { ok: true, data: { leadId: updated.lead.id } };
  } catch (error) {
    return failureFrom(error);
  }
}

const documentTypeSchema = z.string().regex(/^[a-z0-9_]{1,64}$/);
const contentTypeSchema = z.enum(['application/pdf', 'image/jpeg', 'image/png']);
const checksumSchema = z.string().regex(/^[a-f0-9]{64}$/);

function documentErrorMessage(error: unknown): string {
  if (error instanceof BackendError) {
    if (error.code === 'draft_not_found' || error.code === 'draft_expired') {
      return 'Your saved details have expired. Please start the order again.';
    }
    if (error.code === 'document_too_large') return 'That file is larger than the 10 MB limit.';
    if (error.code === 'checklist_mismatch') {
      return 'That document type is not requested for this plan.';
    }
    if (error.code === 'document_verification_failed') {
      return 'That file could not be verified as a PDF, JPG or PNG. Please re-upload.';
    }
    if (error.code === 'feature_not_ready') {
      return 'Document uploads are not enabled yet. Our team will collect them another way.';
    }
  }
  return 'The document could not be uploaded. Please try again.';
}

/**
 * T17 step 3: authorise a direct-to-R2 upload for one checklist document. The
 * browser PUTs the file to the returned signed URL, then calls `finalizeDocument`.
 * The service credential and draft grant stay on the server (in the httpOnly cookie).
 */
export async function createDocumentIntent(input: {
  documentType: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  turnstileToken?: string;
}): Promise<DocumentIntentResult> {
  const documentType = documentTypeSchema.safeParse(input.documentType);
  const contentType = contentTypeSchema.safeParse(input.contentType);
  const fileName = z.string().min(1).max(255).safeParse(input.fileName);
  const sizeBytes = z.number().int().positive().safeParse(input.sizeBytes);
  if (!documentType.success || !contentType.success || !fileName.success || !sizeBytes.success) {
    return { ok: false, message: 'That file cannot be uploaded.' };
  }
  if (!validProof(input)) return verificationFailure();
  const draft = await readOrderDraft();
  if (!draft) return { ok: false, message: 'Your saved details have expired. Please start again.' };
  try {
    const intent = await getBackendClient().uploads.createIntent(
      {
        parentType: 'lead',
        parentId: draft.leadId,
        documentType: documentType.data,
        fileName: fileName.data,
        contentType: contentType.data,
        sizeBytes: sizeBytes.data,
      },
      { draftGrant: draft.draftGrant, turnstileToken: input.turnstileToken },
    );
    return {
      ok: true,
      uploadId: intent.uploadId,
      url: intent.url,
      method: 'PUT',
      headers: intent.headers,
    };
  } catch (error) {
    return { ok: false, message: documentErrorMessage(error) };
  }
}

/** T17 step 3: finalize the uploaded object; the backend verifies and attaches it. */
export async function finalizeDocument(input: {
  uploadId: string;
  checksumSha256: string;
  turnstileToken?: string;
}): Promise<DocumentFinalizeResult> {
  const uploadId = z.uuid().safeParse(input.uploadId);
  const checksum = checksumSchema.safeParse(input.checksumSha256);
  if (!uploadId.success || !checksum.success) {
    return { ok: false, message: 'That upload cannot be finalized.' };
  }
  if (!validProof(input)) return verificationFailure();
  const draft = await readOrderDraft();
  if (!draft) return { ok: false, message: 'Your saved details have expired. Please start again.' };
  try {
    const finalized = await getBackendClient().uploads.finalize(
      uploadId.data,
      { checksumSha256: checksum.data },
      { draftGrant: draft.draftGrant, turnstileToken: input.turnstileToken },
    );
    return { ok: true, fileId: finalized.file.id, documentType: finalized.file.documentType };
  } catch (error) {
    return { ok: false, message: documentErrorMessage(error) };
  }
}

/** Step 4 (first half): a server-authoritative quote for the saved draft. */
export async function requestQuote(
  input: WebsiteBotProof = {},
): Promise<ActionResult<QuoteResult>> {
  if (!validProof(input)) return verificationFailure();
  const draft = await readOrderDraft();
  if (!draft) return draftExpired();
  try {
    const result = await getBackendClient().quotes.create(
      { leadId: draft.leadId, productId: draft.productId, province: draft.province },
      { draftGrant: draft.draftGrant, turnstileToken: input.turnstileToken },
    );
    return { ok: true, data: { quote: result.quote } };
  } catch (error) {
    return quoteFailureFrom(error);
  }
}

/** Step 4 alternative: keep the lead as an unpriced callback instead of ordering. */
export async function requestCallback(
  input: CallbackInput,
): Promise<ActionResult<{ requested: true }>> {
  if (!validProof(input)) return verificationFailure();
  const draft = await readOrderDraft();
  if (!draft) return draftExpired();
  const checked = checkDetails(input.details);
  if (!checked.ok) return checked.failure;
  try {
    await getBackendClient().leads.update(
      draft.leadId,
      {
        contact: checked.order.contact,
        form: formFor(checked.order, input.documentKeys, false, { callbackRequested: true }),
        productId: draft.productId,
      },
      { draftGrant: draft.draftGrant, turnstileToken: input.turnstileToken },
    );
    return { ok: true, data: { requested: true } };
  } catch (error) {
    return failureFrom(error);
  }
}

/**
 * Step 4 (second half). A transport failure asks the browser for a fresh proof
 * before retrying with the SAME cookie/idempotency key (REQ 18). A server HTTP
 * response, including 503, is returned for an explicit customer retry.
 */
export async function submitOrder(
  input: SubmitOrderInput,
): Promise<ActionResult<SubmitOrderResult>> {
  if (!validProof(input)) return verificationFailure();
  const draft = await readOrderDraft();
  if (!draft) return draftExpired();
  const checked = checkDetails(input.details);
  if (!checked.ok) return checked.failure;
  const quoteId = z.uuid().safeParse(input.quoteId);
  const termsVersion = z.string().min(1).max(64).safeParse(input.termsVersion);
  if (!quoteId.success || !termsVersion.success) {
    return {
      ok: false,
      code: 'quote_restart',
      message: 'That price quotation is no longer valid. Please review the price again.',
    };
  }

  const body = {
    quoteId: quoteId.data,
    termsVersion: termsVersion.data,
    form: formFor(checked.order, input.documentKeys, true),
    consent: {
      termsVersion: termsVersion.data,
      marketingOptIn: input.marketingOptIn,
    },
  };
  const options = {
    draftGrant: draft.draftGrant,
    idempotencyKey: draft.idempotencyKey,
    turnstileToken: input.turnstileToken,
  };
  const client = getBackendClient();

  try {
    const result = await client.orders.submit(body, options);
    return {
      ok: true,
      data: { reference: result.order.reference, orderId: result.order.id },
    };
  } catch (error) {
    if (!(error instanceof BackendError))
      return { ok: false, code: 'transport_retry', message: verificationContent.retryOrder };
    return failureFrom(error);
  }
}
