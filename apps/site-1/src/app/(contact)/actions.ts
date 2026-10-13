'use server';

import { z } from 'zod';
import {
  validateContactMessage,
  validateContactTracking,
  type ContactPreviewRequest,
  type ContactPreviewResult,
} from '@/lib/contact-preview';

const requestSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('message'),
    input: z.object({
      name: z.string(),
      email: z.string(),
      phone: z.string(),
      topic: z.string(),
      message: z.string(),
    }),
  }),
  z.object({
    kind: z.literal('tracking'),
    input: z.object({ order: z.string(), email: z.string() }),
  }),
]);

/** UI stub: validates and returns a preview; no storage, logging, mail, chat or order lookup. */
export async function contactPreviewAction(
  request: ContactPreviewRequest,
): Promise<ContactPreviewResult> {
  const parsed = requestSchema.safeParse(request);
  if (!parsed.success) return { status: 'invalid', previewOnly: true };
  const errors =
    parsed.data.kind === 'message'
      ? validateContactMessage(parsed.data.input)
      : validateContactTracking(parsed.data.input);
  return { status: Object.keys(errors).length ? 'invalid' : 'preview', previewOnly: true };
}
