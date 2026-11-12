'use server';

import { provinceCodeSchema } from '@canadian-plans/contracts';
import { websiteBotTokenSchema } from '@canadian-plans/crm-contracts';
import { z } from 'zod';

import { getBackendClient } from '@/lib/backendClient';
import { siteConfig } from '@/site.config';
import type { ActionResult } from './types';
import { verificationContent } from '@content/verification';

const waitlistSchema = z.object({
  province: provinceCodeSchema,
  email: z
    .string()
    .max(254)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
});

/**
 * Leaves an email on the wish list for a province with no internet or TV plans
 * yet (ADR 0005, D5). The CRM has no wait list of its own, so the request is
 * saved as a contact message naming the province. The browser sends only the
 * province and email; the consent version comes from the server's config. The
 * result never says whether the address was already listed, and a failure never
 * repeats the address back.
 */
export async function joinWaitlist(input: {
  province: string;
  email: string;
  turnstileToken?: string;
}): Promise<ActionResult<{ joined: true }>> {
  const parsed = waitlistSchema.safeParse({
    province: input.province,
    email: typeof input.email === 'string' ? input.email.trim() : input.email,
  });
  if (!parsed.success) {
    if (!provinceCodeSchema.safeParse(input.province).success) {
      return { ok: false, code: 'validation_error', message: 'Choose a province.' };
    }
    return {
      ok: false,
      code: 'validation_error',
      message: 'Enter a valid email address.',
      fieldErrors: { email: 'Enter a valid email address.' },
    };
  }
  if (!websiteBotTokenSchema.safeParse(input.turnstileToken).success)
    return { ok: false, code: 'verification_failed', message: verificationContent.failed };
  try {
    await getBackendClient().leads.create(
      {
        leadType: 'contact_message',
        contact: { email: parsed.data.email },
        form: {
          schemaVersion: 1,
          payload: {
            kind: 'region_waitlist',
            interest: 'internet',
            province: parsed.data.province,
          },
        },
        consentVersion: siteConfig.legal.waitlistConsentVersion,
        submit: true,
      },
      { turnstileToken: input.turnstileToken },
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
