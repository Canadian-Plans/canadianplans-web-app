'use server';

import { joinRegionWaitlistRequestSchema } from '@canadian-plans/contracts';
import { z } from 'zod';

import { getBackendClient } from '@/lib/backendClient';
import { siteConfig } from '@/site.config';
import type { ActionResult } from './types';

/**
 * Leaves an email on the wish list for a province with no internet or TV plans
 * yet (ADR 0005, D5). The browser sends only the province and email; the consent
 * version comes from the server's config and the interest is fixed to the plan
 * type this form appears for. The result never says whether the address was
 * already listed, and a failure never repeats the address back.
 */
export async function joinWaitlist(input: {
  province: string;
  email: string;
  turnstileToken?: string;
}): Promise<ActionResult<{ joined: true }>> {
  const parsed = joinRegionWaitlistRequestSchema.safeParse({
    province: input.province,
    email: typeof input.email === 'string' ? input.email.trim() : input.email,
    interest: 'internet',
    consentVersion: siteConfig.legal.waitlistConsentVersion,
  });
  if (!parsed.success) {
    return {
      ok: false,
      code: 'validation_error',
      message: 'Enter a valid email address.',
      fieldErrors: { email: 'Enter a valid email address.' },
    };
  }
  try {
    const token = z.string().min(1).max(2048).safeParse(input.turnstileToken);
    await getBackendClient(token.success ? { turnstileToken: token.data } : {}).regionWaitlist.join(
      parsed.data,
    );
    return { ok: true, data: { joined: true } };
  } catch {
    return {
      ok: false,
      code: 'not_saved',
      message: 'We could not add you to the list. Please try again.',
    };
  }
}
