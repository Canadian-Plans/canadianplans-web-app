import { describe, expect, it } from 'vitest';
import { isValidNewsletterEmail } from './newsletter-preview';
import { newsletterPreviewAction } from '@/components/shared/newsletter-action';

describe('newsletter preview', () => {
  it('accepts a normal email address', () => {
    expect(isValidNewsletterEmail('you@email.com')).toBe(true);
    expect(isValidNewsletterEmail('  name+tag@example.ca ')).toBe(true);
  });
  it('rejects empty, malformed and non-string input', () => {
    for (const value of ['', 'you', 'you@', '@email.com', 'a b@c.d', 42, null]) {
      expect(isValidNewsletterEmail(value)).toBe(false);
    }
    expect(isValidNewsletterEmail(`${'a'.repeat(250)}@b.ca`)).toBe(false);
  });
  it('returns a preview result and never claims to have subscribed anyone', async () => {
    expect(await newsletterPreviewAction('you@email.com')).toEqual({
      status: 'preview',
      previewOnly: true,
    });
    expect(await newsletterPreviewAction('nope')).toEqual({ status: 'invalid', previewOnly: true });
  });
});
