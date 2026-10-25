'use server';

import {
  BackendError,
  documentChecklistKeySchema,
  documentMediaTypeSchema,
  emailSchema,
  MAX_DOCUMENT_BYTES,
  orderChangeRequestPatchSchema,
  trackingOrderReferenceSchema,
  websiteBotTokenSchema,
  type TrackingChangeRequest,
  type TrackingDocument,
  type TrackingOrderDetail,
  type TrackingOrderSummary,
} from '@canadian-plans/contracts';
import { z } from 'zod';

import { trackCopy } from '@content/track';
import { verificationContent } from '@content/verification';
import { getBackendClient } from '@/lib/backendClient';
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
  | 'too_many_pending'
  | 'fields_mismatch'
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
      // 401 from the grant check: missing, expired or foreign.
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
  const email = emailSchema.safeParse(input.email.trim());
  if (!email.success) return failure('validation_error', trackCopy.lookup.emailError);
  if (!websiteBotTokenSchema.safeParse(input.turnstileToken).success) return botFailed();
  try {
    await getBackendClient().tracking.otp(
      { email: email.data },
      { turnstileToken: input.turnstileToken },
    );
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
  const email = emailSchema.safeParse(input.email.trim());
  const code = z
    .string()
    .regex(/^\d{6}$/)
    .safeParse(input.code);
  if (!email.success || !code.success) return failure('validation_error', trackCopy.code.error);
  if (!websiteBotTokenSchema.safeParse(input.turnstileToken).success) return botFailed();
  try {
    const result = await getBackendClient().tracking.verify(
      { email: email.data, code: code.data },
      { turnstileToken: input.turnstileToken },
    );
    await writeTrackingGrant(result.grant);
    return { ok: true, data: { verified: true } };
  } catch (error) {
    if (error instanceof BackendError && error.code === 'rate_limited')
      return failure('rate_limited', trackCopy.code.limited);
    if (error instanceof BackendError && error.code === 'caller_forbidden') return botFailed();
    return failure('validation_error', trackCopy.code.invalid);
  }
}

export async function loadTrackedOrders(): Promise<TrackActionResult<TrackingOrderSummary[]>> {
  const grant = await grantOrExpired();
  if (!grant) return failure('session_expired', trackCopy.session.expired);
  try {
    const { orders } = await getBackendClient().tracking.listOrders({ customerGrant: grant });
    return { ok: true, data: orders };
  } catch (error) {
    return mapError(error, trackCopy.session.failed);
  }
}

export async function loadTrackedOrder(
  reference: string,
): Promise<TrackActionResult<TrackingOrderDetail>> {
  const ref = trackingOrderReferenceSchema.safeParse(reference);
  if (!ref.success) return failure('not_found', trackCopy.session.failed);
  const grant = await grantOrExpired();
  if (!grant) return failure('session_expired', trackCopy.session.expired);
  try {
    const { order } = await getBackendClient().tracking.getOrder(ref.data, {
      customerGrant: grant,
    });
    return { ok: true, data: order };
  } catch (error) {
    return mapError(error, trackCopy.session.failed);
  }
}

const changeInputSchema = z.object({
  reference: trackingOrderReferenceSchema,
  patch: orderChangeRequestPatchSchema,
  note: z.string().trim().max(2000).optional(),
  infoRequestId: z.uuid().optional(),
});

/**
 * A change request, or the answer to a staff request for details when
 * `infoRequestId` is set. Either way it waits for staff approval.
 */
export async function sendTrackingChange(input: {
  reference: string;
  patch: unknown;
  note?: string;
  infoRequestId?: string;
}): Promise<TrackActionResult<TrackingChangeRequest>> {
  const parsed = changeInputSchema.safeParse(input);
  const fallback = input.infoRequestId ? trackCopy.info.failed : trackCopy.change.failed;
  if (!parsed.success) return failure('validation_error', fallback);
  const grant = await grantOrExpired();
  if (!grant) return failure('session_expired', trackCopy.session.expired);
  const { reference, patch, infoRequestId } = parsed.data;
  const note = parsed.data.note ? { note: parsed.data.note } : {};
  try {
    const client = getBackendClient().tracking;
    const result = infoRequestId
      ? await client.answerInfoRequest(
          reference,
          infoRequestId,
          { patch, ...note },
          { customerGrant: grant },
        )
      : await client.requestChange(reference, { patch, ...note }, { customerGrant: grant });
    return { ok: true, data: result.changeRequest };
  } catch (error) {
    if (error instanceof BackendError && error.code === 'too_many_pending_requests')
      return failure('too_many_pending', trackCopy.change.tooMany);
    if (error instanceof BackendError && error.code === 'info_request_fields_mismatch')
      return failure('fields_mismatch', trackCopy.info.mismatch);
    if (error instanceof BackendError && error.code === 'info_request_not_found')
      return failure('not_found', fallback);
    return mapError(error, fallback);
  }
}

const intentInputSchema = z.object({
  reference: trackingOrderReferenceSchema,
  documentType: documentChecklistKeySchema,
  fileName: z.string().min(1).max(255),
  contentType: documentMediaTypeSchema,
  sizeBytes: z.int().positive().max(MAX_DOCUMENT_BYTES),
});

function uploadError<T>(error: unknown): TrackActionResult<T> {
  if (error instanceof BackendError) {
    if (error.code === 'feature_not_ready')
      return failure('upload_unavailable', trackCopy.upload.unavailable);
    if (error.code === 'document_verification_failed')
      return failure('upload_rejected', trackCopy.upload.rejected);
    if (error.code === 'document_too_large')
      return failure('validation_error', trackCopy.upload.sizeError);
  }
  return mapError(error, trackCopy.upload.failed);
}

/** Authorises one direct-to-R2 upload for a checklist document of the order. */
export async function createTrackingUpload(input: {
  reference: string;
  documentType: string;
  fileName: string;
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
  const parsed = intentInputSchema.safeParse(input);
  if (!parsed.success) return failure('validation_error', trackCopy.upload.typeError);
  if (!websiteBotTokenSchema.safeParse(input.turnstileToken).success) return botFailed();
  const grant = await grantOrExpired();
  if (!grant) return failure('session_expired', trackCopy.session.expired);
  const { reference, ...body } = parsed.data;
  try {
    const intent = await getBackendClient().tracking.createUploadIntent(reference, body, {
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

/** Finalizes an uploaded object; the backend verifies its signature and checksum. */
export async function finalizeTrackingUpload(input: {
  reference: string;
  uploadId: string;
  checksumSha256: string;
  turnstileToken?: string;
}): Promise<TrackActionResult<TrackingDocument>> {
  const reference = trackingOrderReferenceSchema.safeParse(input.reference);
  const uploadId = z.uuid().safeParse(input.uploadId);
  const checksum = z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .safeParse(input.checksumSha256);
  if (!reference.success || !uploadId.success || !checksum.success)
    return failure('validation_error', trackCopy.upload.failed);
  if (!websiteBotTokenSchema.safeParse(input.turnstileToken).success) return botFailed();
  const grant = await grantOrExpired();
  if (!grant) return failure('session_expired', trackCopy.session.expired);
  try {
    const result = await getBackendClient().tracking.finalizeUpload(
      reference.data,
      uploadId.data,
      { checksumSha256: checksum.data },
      { customerGrant: grant, turnstileToken: input.turnstileToken },
    );
    return { ok: true, data: result.document };
  } catch (error) {
    return uploadError(error);
  }
}

/** Ends the tracking session on this device. */
export async function signOutTracking(): Promise<void> {
  await clearTrackingGrant();
}
