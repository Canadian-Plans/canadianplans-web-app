'use server';

import { BackendError, type TrackingStatusResponse } from '@canadian-plans/contracts';
import { z } from 'zod';

import { getBackendClient } from '@/lib/backendClient';
import { readTrackingGrant, writeTrackingGrant } from './grant';

/**
 * Server actions for /track. Every backend call happens here, on the server,
 * with the site's service credential — the browser never holds it. The code and
 * grant are never logged. The OTP request always reports success so the page
 * cannot be used to enumerate orders.
 */

export type TrackActionResult<T> =
  { ok: true; data: T } | { ok: false; code: string; message: string };

const identifySchema = z.object({
  email: z.email().max(254),
  orderReference: z.string().trim().min(1).max(32),
});
const verifySchema = identifySchema.extend({ code: z.string().regex(/^\d{6}$/) });

export async function requestTrackingCode(input: {
  email: string;
  orderReference: string;
}): Promise<TrackActionResult<{ sent: true }>> {
  const parsed = identifySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: 'validation_error',
      message: 'Enter a valid email and order reference.',
    };
  }
  try {
    await getBackendClient().tracking.otp(parsed.data);
  } catch {
    // Neutral: the response must not reveal whether the order exists.
  }
  return { ok: true, data: { sent: true } };
}

export async function verifyTrackingCode(input: {
  email: string;
  orderReference: string;
  code: string;
}): Promise<TrackActionResult<{ verified: true }>> {
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: 'validation_error', message: 'Enter the six-digit code.' };
  }
  try {
    const result = await getBackendClient().tracking.verify(parsed.data);
    await writeTrackingGrant(result.grant);
    return { ok: true, data: { verified: true } };
  } catch (error) {
    const code = error instanceof BackendError ? error.code : 'internal_error';
    const message =
      code === 'rate_limited'
        ? 'Too many attempts. Please wait and try again.'
        : 'That code is not valid or has expired. Request a new one.';
    return { ok: false, code, message };
  }
}

export async function loadTrackingStatus(): Promise<TrackActionResult<TrackingStatusResponse>> {
  const grant = await readTrackingGrant();
  if (!grant) {
    return {
      ok: false,
      code: 'grant_missing',
      message: 'Verify your code to view your order.',
    };
  }
  try {
    const status = await getBackendClient().tracking.get({ customerGrant: grant.token });
    return { ok: true, data: status };
  } catch (error) {
    const code = error instanceof BackendError ? error.code : 'internal_error';
    const message =
      code === 'not_found' || code === 'order_not_found'
        ? 'Your tracking session is no longer valid. Verify again.'
        : 'Could not load your order right now.';
    return { ok: false, code, message };
  }
}
