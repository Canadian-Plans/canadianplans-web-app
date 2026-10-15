'use server';

import { z } from 'zod';
import {
  validateBusinessQuote,
  type BusinessQuoteInput,
  type BusinessQuoteResult,
} from '@/lib/business-quote-preview';

const inputSchema = z.object({
  businessName: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  postalCode: z.string(),
  need: z.string(),
  notes: z.string(),
});

/** UI stub: validates and returns a preview; no storage, logging, email or quote request. */
export async function businessQuotePreviewAction(
  input: BusinessQuoteInput,
): Promise<BusinessQuoteResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: 'invalid', previewOnly: true };
  const errors = validateBusinessQuote(parsed.data);
  return { status: Object.keys(errors).length ? 'invalid' : 'preview', previewOnly: true };
}
