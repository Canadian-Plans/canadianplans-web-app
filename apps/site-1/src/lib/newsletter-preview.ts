/**
 * Footer email sign-up (final homepage design, 16 October 2026). There is no email
 * backend yet, so this only validates; nothing is stored, logged or sent.
 */
export type NewsletterPreviewResult =
  | { readonly status: 'preview'; readonly previewOnly: true }
  | { readonly status: 'invalid'; readonly previewOnly: true };

export function isValidNewsletterEmail(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value.trim())
  );
}
