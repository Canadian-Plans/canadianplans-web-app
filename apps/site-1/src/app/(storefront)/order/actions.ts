'use server';

import { randomUUID } from 'node:crypto';
import {
  BackendError,
  websiteBotTokenSchema,
  type WebsiteBotProof,
} from '@canadian-plans/crm-contracts';
import type { ProvinceCode } from '@canadian-plans/contracts';
import { z } from 'zod';

import { getBackendClient } from '@/lib/backendClient';
import {
  isDraftCategory,
  leadTypeByCategory,
  offerFromPlan,
  offerSoldIn,
  type OrderCategory,
  type WebsiteOffer,
} from '@/lib/offers';
import { siteConfig } from '@/site.config';
import { buildOrderForm, parseOrderDetails, type ParsedOrder } from './details';
import {
  clearOrderDraft,
  hasSavedLead,
  readOrderDraft,
  writeOrderDraft,
  type OrderDraft,
} from './draft';
import { verificationContent } from '@content/verification';
import type {
  ActionResult,
  CallbackInput,
  DocumentFinalizeResult,
  DocumentIntentResult,
  PriceSummary,
  QuoteResult,
  SaveDetailsInput,
  SaveDocumentsInput,
  SubmitOrderInput,
  SubmitOrderResult,
} from './types';

/**
 * Server actions for the order form. Every call to the CRM happens here, on the
 * server, with the site's key: the browser never holds it and never sends a
 * price. The CRM looks the plan's price up itself and freezes it on the order
 * when the order is submitted.
 *
 * A SIM order (`sim_order`) is saved as a draft and resumed; internet and
 * mobile orders (`internet`, `mobility`) are sent once, on submit. The draft
 * grant and the submission's idempotency key live in an httpOnly cookie (see
 * `draft.ts`).
 */

function validProof(input: WebsiteBotProof): boolean {
  return websiteBotTokenSchema.safeParse(input.turnstileToken).success;
}
function verificationFailure(): Extract<ActionResult<never>, { ok: false }> {
  return { ok: false, code: 'verification_failed', message: verificationContent.failed };
}

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

/**
 * The plan the customer picked, read from the CRM (the browser is not trusted
 * on what a plan is). A provincial plan is only returned for a province it is
 * sold in.
 */
async function findOffer(
  productId: string,
  category: OrderCategory,
  province: ProvinceCode | undefined,
): Promise<WebsiteOffer | undefined> {
  const { plans } = await getBackendClient().plans.list({ leadType: leadTypeByCategory[category] });
  const plan = plans.find((candidate) => candidate.id === productId);
  if (!plan) return undefined;
  const offer = offerFromPlan(plan);
  return offerSoldIn(offer, province) ? offer : undefined;
}

/** The consent and terms versions the customer accepted, as one recorded value. */
function acceptedVersions(category: OrderCategory): string {
  const versions = [siteConfig.legal.consentVersion, siteConfig.legal.termsVersion];
  if (category === 'mobile') versions.push(siteConfig.legal.creditCheckConsentVersion);
  // At most 64 characters in the CRM; a longer value is refused there, never cut here.
  return versions.join(';');
}

function newIdempotencyKey(): string {
  return `order-${randomUUID()}`;
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
 * up, or it was already turned into an order. None of these is a save failure;
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

function alreadyOrdered(): ActionResult<never> {
  return {
    ok: false,
    code: 'draft_expired',
    message: 'That order has already been placed. Start a new order to buy another plan.',
  };
}

function offerUnavailable(): ActionResult<never> {
  return { ok: false, code: 'offer_unavailable', message: 'That plan is no longer available.' };
}

function failureFrom(error: unknown): ActionResult<never> {
  if (error instanceof BackendError) {
    // The same key arrived with a different body: an earlier submit whose
    // response was lost already created the order. Retrying with this key can
    // only conflict again, so no "Try again": point at the order.
    if (error.code === 'idempotency_conflict') {
      return {
        ok: false,
        code: 'draft_expired',
        message:
          'We already received an order for these details. Check your email for the confirmation, or use Track order. To buy another plan, start a new order.',
      };
    }
    if (error.code === 'draft_already_submitted') return alreadyOrdered();
    if (error.code === 'draft_expired' || error.code === 'draft_not_found') return draftExpired();
    if (error.code === 'plan_not_available') return offerUnavailable();
    if (error.code === 'caller_forbidden') return verificationFailure();
  }
  // A transport failure, a 5xx or an unhandled code must never look like success.
  return notSaved();
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
  return offerUnavailable();
}

function formFor(order: ParsedOrder, offer: WebsiteOffer, consentedAt: string) {
  return buildOrderForm(
    order,
    { productKey: offer.commercial.productKey, offerName: offer.commercial.offerName },
    { consentedAt },
  );
}

/**
 * End of the details step. A SIM order's draft is created in the CRM (or
 * updated when resuming); an internet or mobile order is only checked here,
 * because the CRM takes it whole on submit. Either way the plan is read from
 * the CRM, and a new idempotency key is issued for the submission that follows.
 */
export async function saveDetails(input: SaveDetailsInput): Promise<ActionResult<{ saved: true }>> {
  const checked = checkDetails(input.details);
  if (!checked.ok) return checked.failure;
  const { order } = checked;
  const productId = z.uuid().safeParse(input.productId);
  if (!productId.success) {
    return { ok: false, code: 'validation_error', message: 'The selected plan is invalid.' };
  }
  // The province the plan is sold in: chosen for internet, from the postal code for mobile.
  const province = order.province;

  if (!validProof(input)) return verificationFailure();
  const existing = await readOrderDraft();
  const client = getBackendClient();

  try {
    const offer = await findOffer(productId.data, order.category, order.province);
    if (!offer) return planNotAvailable(order);
    const base: OrderDraft = {
      idempotencyKey: newIdempotencyKey(),
      productId: productId.data,
      province,
    };
    if (!isDraftCategory(order.category)) {
      await writeOrderDraft(base);
      return { ok: true, data: { saved: true } };
    }

    const contact = order.contact;
    const form = formFor(order, offer, new Date().toISOString());
    const planOrder = { planId: productId.data };
    if (hasSavedLead(existing)) {
      try {
        await client.leads.update(
          existing.leadId,
          { contact, form, order: planOrder },
          { draftGrant: existing.draftGrant, turnstileToken: input.turnstileToken },
        );
        await writeOrderDraft({
          ...base,
          leadId: existing.leadId,
          draftGrant: existing.draftGrant,
        });
        return { ok: true, data: { saved: true } };
      } catch (error) {
        // The cookie still points at a draft that can no longer be edited, most
        // often because the customer already ordered with it and has come back
        // for a second plan. Start a brand-new draft rather than dead-ending
        // them on an httpOnly cookie they cannot clear. Anything else is a real
        // failure.
        if (!isFinishedDraft(error)) throw error;
        await clearOrderDraft();
        return { ok: false, code: 'retry_fresh_draft', message: verificationContent.retryDraft };
      }
    }
    const created = await client.leads.create(
      {
        leadType: leadTypeByCategory[order.category],
        contact,
        form,
        order: planOrder,
        attribution: input.attribution,
        // The server's own disclosure version: never trusted from the browser.
        consentVersion: siteConfig.legal.consentVersion,
      },
      { turnstileToken: input.turnstileToken },
    );
    if (!created.draftGrant) return notSaved();
    await writeOrderDraft({
      ...base,
      leadId: created.lead.id,
      draftGrant: created.draftGrant.token,
    });
    return { ok: true, data: { saved: true } };
  } catch (error) {
    return failureFrom(error);
  }
}

/**
 * End of the documents step. The files themselves are attached by
 * `createDocumentIntent` and `finalizeDocument`; this only confirms the order
 * in progress is still there to continue.
 */
export async function saveDocuments(
  input: SaveDocumentsInput,
): Promise<ActionResult<{ saved: true }>> {
  const checked = checkDetails(input.details);
  if (!checked.ok) return checked.failure;
  const draft = await readOrderDraft();
  if (!draft) return draftExpired();
  return { ok: true, data: { saved: true } };
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
 * Authorises a direct upload for one checklist document of a SIM order. The
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
  if (!hasSavedLead(draft)) {
    return { ok: false, message: 'Your saved details have expired. Please start again.' };
  }
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

/** Finalizes the uploaded object; the CRM verifies and attaches it. */
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
  if (!hasSavedLead(draft)) {
    return { ok: false, message: 'Your saved details have expired. Please start again.' };
  }
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

const BILLING_PERIOD_WORDS: Record<
  NonNullable<WebsiteOffer['commercial']['billingPeriod']>,
  string
> = {
  month: 'per month',
  '30_days': 'per 30 days',
  '90_days': 'per 90 days',
};

function priceSummary(offer: WebsiteOffer): PriceSummary {
  const { commercial } = offer;
  const period = commercial.billingPeriod ? BILLING_PERIOD_WORDS[commercial.billingPeriod] : '';
  return {
    currency: commercial.currency,
    lines: [
      {
        label: period ? `${commercial.offerName}, ${period}` : commercial.offerName,
        amountMinor: commercial.recurringChargeAmountMinor,
      },
    ],
    totalMinor: commercial.recurringChargeAmountMinor,
    termsVersion: siteConfig.legal.termsVersion,
  };
}

/**
 * The review step's price: the chosen plan's current price, read from the CRM.
 * Shown only; the CRM reads it again and freezes it when the order is submitted.
 */
export async function requestQuote(input: {
  category: OrderCategory;
}): Promise<ActionResult<QuoteResult>> {
  const category = z.enum(['sim', 'mobile', 'internet']).safeParse(input.category);
  const draft = await readOrderDraft();
  if (!draft || !category.success) return draftExpired();
  try {
    const offer = await findOffer(draft.productId, category.data, draft.province);
    if (!offer) {
      return {
        ok: false,
        code: 'offer_unavailable',
        message: 'That plan is no longer available. Choose another plan or request a callback.',
      };
    }
    return { ok: true, data: { quote: priceSummary(offer) } };
  } catch {
    return {
      ok: false,
      code: 'callback',
      message: "We couldn't load the current price for this plan.",
    };
  }
}

/**
 * The review step's alternative: ask to be called instead of ordering. Saved in
 * the CRM as a contact message naming the plan the customer was looking at.
 */
export async function requestCallback(
  input: CallbackInput,
): Promise<ActionResult<{ requested: true }>> {
  if (!validProof(input)) return verificationFailure();
  const draft = await readOrderDraft();
  if (!draft) return draftExpired();
  const checked = checkDetails(input.details);
  if (!checked.ok) return checked.failure;
  const { order } = checked;
  try {
    await getBackendClient().leads.create(
      {
        leadType: 'contact_message',
        contact: order.contact,
        form: {
          schemaVersion: 1,
          payload: {
            kind: 'callback_request',
            category: order.category,
            planId: draft.productId,
            ...(draft.province ? { province: draft.province } : {}),
          },
        },
        consentVersion: siteConfig.legal.consentVersion,
        submit: true,
      },
      { turnstileToken: input.turnstileToken },
    );
    return { ok: true, data: { requested: true } };
  } catch (error) {
    return failureFrom(error);
  }
}

/**
 * The last step. A transport failure asks the browser for a fresh proof before
 * retrying with the SAME cookie, idempotency key and body. A server HTTP
 * response, including 503, is returned for an explicit customer retry.
 */
export async function submitOrder(
  input: SubmitOrderInput,
): Promise<ActionResult<SubmitOrderResult>> {
  if (!validProof(input)) return verificationFailure();
  const stored = await readOrderDraft();
  if (!stored) return draftExpired();
  const checked = checkDetails(input.details);
  if (!checked.ok) return checked.failure;
  const { order } = checked;
  if (input.termsVersion !== siteConfig.legal.termsVersion) {
    return {
      ok: false,
      code: 'validation_error',
      message: 'The terms changed while you were ordering. Please reload the page and review them.',
    };
  }
  if (isDraftCategory(order.category) !== hasSavedLead(stored)) return draftExpired();
  // Kept from the first attempt, so a retry sends the same body under the same key.
  const draft: OrderDraft = stored.consentedAt
    ? stored
    : { ...stored, consentedAt: new Date().toISOString() };
  if (draft !== stored) await writeOrderDraft(draft);
  const client = getBackendClient();

  try {
    const offer = await findOffer(draft.productId, order.category, draft.province);
    if (!offer) return planNotAvailable(order);
    const form = formFor(order, offer, draft.consentedAt ?? new Date().toISOString());
    const body = {
      contact: order.contact,
      form,
      order: { planId: draft.productId },
      consentVersion: acceptedVersions(order.category),
      submit: true,
    };
    const result = hasSavedLead(draft)
      ? await client.leads.update(draft.leadId, body, {
          draftGrant: draft.draftGrant,
          idempotencyKey: draft.idempotencyKey,
          turnstileToken: input.turnstileToken,
        })
      : await client.leads.create(
          { ...body, leadType: leadTypeByCategory[order.category], attribution: input.attribution },
          { idempotencyKey: draft.idempotencyKey, turnstileToken: input.turnstileToken },
        );
    return {
      ok: true,
      data: { reference: result.lead.externalRef ?? result.lead.id, orderId: result.lead.id },
    };
  } catch (error) {
    if (!(error instanceof BackendError))
      return { ok: false, code: 'transport_retry', message: verificationContent.retryOrder };
    // The order behind this cookie already exists; the next visit to /order
    // must start a fresh draft and key instead of conflicting forever.
    if (error.code === 'idempotency_conflict') await clearOrderDraft();
    return failureFrom(error);
  }
}
