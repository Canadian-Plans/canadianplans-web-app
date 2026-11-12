'use server';

import {
  BackendError,
  finalizeUploadRequestSchema,
  trackingCodeRequestSchema,
  trackingReferenceSchema,
  trackingUploadIntentRequestSchema,
  trackingVerifyRequestSchema,
  websiteBotTokenSchema,
  type TrackingOrder,
  type TrackingPendingChange,
} from '@canadian-plans/crm-contracts';
import { z } from 'zod';

import { trackCopy } from '@content/track';
import { verificationContent } from '@content/verification';
import { getBackendClient } from '@/lib/backendClient';
import { findOrder, trackChangeFieldsSchema } from '@/lib/tracking-view';
import { clearTrackingGrant, readTrackingGrant, writeTrackingGrant } from './grant';

/**
 * Server actions for /track. Every backend call happens here, on the server,
 * with the site's service credential and the httpOnly tracking grant — the
 * browser holds neither. Codes, grants and addresses are never logged. The code
 * request always reports success so the page cannot reveal whether an email has
 * orders.
 */

export type TrackActionResult<T> =
  { ok: true; data: T } | { ok: false; code: TrackFailureCode; message: string };

/** Failures the page distinguishes; anything else is `failed`. */
export type TrackFailureCode =
  | 'validation_error'
  | 'verification_failed'
  | 'session_expired'
  | 'not_found'
  | 'rate_limited'
  | 'change_not_allowed'
  | 'upload_rejected'
  | 'upload_unavailable'
  | 'failed';

function failure<T>(code: TrackFailureCode, message: string): TrackActionResult<T> {
  return { ok: false, code, message };
}

const botFailed = <T>() => failure<T>('verification_failed', verificationContent.failed);

/** Maps a backend failure on a grant-protected call to what the page shows. */
function mapError<T>(error: unknown, fallback: string): TrackActionResult<T> {
  if (!(error instanceof BackendError)) return failure('failed', fallback);
  switch (error.code) {
    case 'not_found':
      // 401 from the grant check: missing, expired or forged.
      return failure('session_expired', trackCopy.session.expired);
    case 'order_not_found':
      return failure('not_found', trackCopy.session.failed);
    case 'rate_limited':
      return failure('rate_limited', trackCopy.code.limited);
    case 'caller_forbidden':
      return failure('verification_failed', verificationContent.failed);
    default:
      return failure('failed', fallback);
  }
}

async function grantOrExpired(): Promise<string | undefined> {
  return (await readTrackingGrant())?.token;
}

export async function requestTrackingCode(input: {
  email: string;
  turnstileToken?: string;
}): Promise<TrackActionResult<{ sent: true }>> {
  const body = trackingCodeRequestSchema.safeParse({ email: input.email });
  if (!body.success) return failure('validation_error', trackCopy.lookup.emailError);
  if (!websiteBotTokenSchema.safeParse(input.turnstileToken).success) return botFailed();
  try {
    await getBackendClient().tracking.requestCode(body.data, {
      turnstileToken: input.turnstileToken,
    });
  } catch (error) {
    if (error instanceof BackendError && error.code === 'caller_forbidden') return botFailed();
    // Neutral: the response must not reveal whether the email has orders.
  }
  return { ok: true, data: { sent: true } };
}

export async function verifyTrackingCode(input: {
  email: string;
  code: string;
  turnstileToken?: string;
}): Promise<TrackActionResult<{ verified: true }>> {
  const body = trackingVerifyRequestSchema.safeParse({ email: input.email, code: input.code });
  if (!body.success) return failure('validation_error', trackCopy.code.error);
  if (!websiteBotTokenSchema.safeParse(input.turnstileToken).success) return botFailed();
  try {
    const result = await getBackendClient().tracking.verify(body.data, {
      turnstileToken: input.turnstileToken,
    });
    // The grant goes to the httpOnly cookie only; it is never returned.
    await writeTrackingGrant({ token: result.grant.token, expiresAt: result.grant.expiresAt });
    return { ok: true, data: { verified: true } };
  } catch (error) {
    if (error instanceof BackendError && error.code === 'rate_limited')
      return failure('rate_limited', trackCopy.code.limited);
    if (error instanceof BackendError && error.code === 'caller_forbidden') return botFailed();
    return failure('validation_error', trackCopy.code.invalid);
  }
}

/** The verified email's orders on this website, newest first. */
export async function loadTrackedOrders(): Promise<TrackActionResult<TrackingOrder[]>> {
  const grant = await grantOrExpired();
  if (!grant) return failure('session_expired', trackCopy.session.expired);
  try {
    const { orders } = await getBackendClient().tracking.orders({ customerGrant: grant });
    return { ok: true, data: orders };
  } catch (error) {
    return mapError(error, trackCopy.session.failed);
  }
}

/** One order, found by reference in the verified email's list (the API has no single-order read). */
export async function loadTrackedOrder(
  reference: string,
): Promise<TrackActionResult<TrackingOrder>> {
  const ref = trackingReferenceSchema.safeParse(reference);
  if (!ref.success) return failure('not_found', trackCopy.session.failed);
  const listed = await loadTrackedOrders();
  if (!listed.ok) return listed;
  const order = findOrder(listed.data, ref.data);
  return order ? { ok: true, data: order } : failure('not_found', trackCopy.session.failed);
}

const changeInputSchema = z
  .object({ reference: trackingReferenceSchema, fields: trackChangeFieldsSchema })
  .strict();

/**
 * A change request for the customer's own details. It waits for staff
 * approval and replaces any request already pending on the order.
 */
export async function sendTrackingChange(input: {
  reference: string;
  fields: unknown;
}): Promise<TrackActionResult<TrackingPendingChange>> {
  const parsed = changeInputSchema.safeParse(input);
  if (!parsed.success) return failure('validation_error', trackCopy.change.invalid);
  const grant = await grantOrExpired();
  if (!grant) return failure('session_expired', trackCopy.session.expired);
  try {
    const result = await getBackendClient().tracking.requestChange(
      parsed.data.reference,
      { fields: parsed.data.fields },
      { customerGrant: grant },
    );
    return { ok: true, data: result.changeRequest };
  } catch (error) {
    if (error instanceof BackendError && error.code === 'change_request_not_allowed')
      return failure('change_not_allowed', trackCopy.change.notAllowed);
    if (error instanceof BackendError && error.code === 'validation_error')
      return failure('validation_error', trackCopy.change.invalid);
    return mapError(error, trackCopy.change.failed);
  }
}

function uploadError<T>(error: unknown): TrackActionResult<T> {
  if (error instanceof BackendError) {
    switch (error.code) {
      case 'feature_not_ready':
        return failure('upload_unavailable', trackCopy.upload.unavailable);
      case 'document_verification_failed':
        return failure('upload_rejected', trackCopy.upload.rejected);
      case 'document_too_large':
        return failure('validation_error', trackCopy.upload.sizeError);
      case 'change_request_not_allowed':
        return failure('change_not_allowed', trackCopy.upload.notAllowed);
      case 'checklist_mismatch':
        return failure('change_not_allowed', trackCopy.upload.mismatch);
      case 'upload_expired':
      case 'upload_not_found':
        return failure('failed', trackCopy.upload.expired);
      case 'verification_in_progress':
        return failure('failed', trackCopy.upload.checking);
      default:
        break;
    }
  }
  return mapError(error, trackCopy.upload.failed);
}

/** Authorises one direct-to-storage upload of a passport or visa for the order. */
export async function createTrackingUpload(input: {
  reference: string;
  documentType: string;
  contentType: string;
  sizeBytes: number;
  turnstileToken?: string;
}): Promise<
  TrackActionResult<{
    uploadId: string;
    url: string;
    method: 'PUT';
    headers: Record<string, string>;
  }>
> {
  const reference = trackingReferenceSchema.safeParse(input.reference);
  const body = trackingUploadIntentRequestSchema.safeParse({
    documentType: input.documentType,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
  });
  if (!reference.success || !body.success)
    return failure('validation_error', trackCopy.upload.typeError);
  if (!websiteBotTokenSchema.safeParse(input.turnstileToken).success) return botFailed();
  const grant = await grantOrExpired();
  if (!grant) return failure('session_expired', trackCopy.session.expired);
  try {
    const intent = await getBackendClient().tracking.createUpload(reference.data, body.data, {
      customerGrant: grant,
      turnstileToken: input.turnstileToken,
    });
    return {
      ok: true,
      data: {
        uploadId: intent.uploadId,
        url: intent.url,
        method: intent.method,
        headers: intent.headers,
      },
    };
  } catch (error) {
    return uploadError(error);
  }
}

/**
 * Finalizes an uploaded object; the backend verifies its signature and
 * checksum, then adds the document to the order's pending change request.
 */
export async function finalizeTrackingUpload(input: {
  reference: string;
  uploadId: string;
  checksumSha256: string;
  turnstileToken?: string;
}): Promise<TrackActionResult<TrackingPendingChange>> {
  const reference = trackingReferenceSchema.safeParse(input.reference);
  const uploadId = z.uuid().safeParse(input.uploadId);
  const body = finalizeUploadRequestSchema.safeParse({ checksumSha256: input.checksumSha256 });
  if (!reference.success || !uploadId.success || !body.success)
    return failure('validation_error', trackCopy.upload.failed);
  if (!websiteBotTokenSchema.safeParse(input.turnstileToken).success) return botFailed();
  const grant = await grantOrExpired();
  if (!grant) return failure('session_expired', trackCopy.session.expired);
  try {
    const result = await getBackendClient().tracking.finalizeUpload(
      reference.data,
      uploadId.data,
      body.data,
      { customerGrant: grant, turnstileToken: input.turnstileToken },
    );
    return { ok: true, data: result.changeRequest };
  } catch (error) {
    return uploadError(error);
  }
}

/** Ends the tracking session on this device. */
export async function signOutTracking(): Promise<void> {
  await clearTrackingGrant();
}
