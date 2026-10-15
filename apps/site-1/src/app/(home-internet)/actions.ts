'use server';

import { lookupInternetAvailability } from '@/lib/internet-availability';
import type { InternetLookupInput, InternetLookupResult } from '@/lib/internet-check';

/** UI stub: no network, persistence, messages, lead, order or installation booking. */
export async function checkInternetAddressAction(
  input: InternetLookupInput,
): Promise<InternetLookupResult> {
  try {
    return await lookupInternetAvailability(input);
  } catch {
    return { status: 'error', reason: 'lookup-failed', previewOnly: true };
  }
}
