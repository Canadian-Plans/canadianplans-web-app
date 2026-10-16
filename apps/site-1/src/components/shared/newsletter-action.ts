'use server';

import { isValidNewsletterEmail, type NewsletterPreviewResult } from '@/lib/newsletter-preview';

/** UI stub: validates only. No storage, logging, email or third-party subscription. */
export async function newsletterPreviewAction(email: unknown): Promise<NewsletterPreviewResult> {
  return { status: isValidNewsletterEmail(email) ? 'preview' : 'invalid', previewOnly: true };
}
