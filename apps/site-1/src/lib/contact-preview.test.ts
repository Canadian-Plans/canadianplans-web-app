import { describe, expect, it } from 'vitest';
import { contactPreviewAction } from '@/app/(contact)/actions';
import {
  contactMessageMailto,
  validateContactMessage,
  validateContactTracking,
  type ContactMessageInput,
} from './contact-preview';

const validMessage = (overrides: Partial<ContactMessageInput> = {}): ContactMessageInput => ({
  name: 'Preview visitor',
  email: 'visitor@example.com',
  phone: '',
  topic: 'general',
  message: 'Please explain the available plans.',
  ...overrides,
});

describe('contact preview validation', () => {
  it('requires name, email, topic and message, but permits an empty phone', () => {
    expect(validateContactMessage(validMessage())).toEqual({});
    expect(
      Object.keys(
        validateContactMessage(validMessage({ name: ' ', email: '', topic: '', message: '\n' })),
      ),
    ).toEqual(['name', 'email', 'topic', 'message']);
  });
  it.each(['+1 (604) 555-0100', '+880 1712 345678', '555-0100'])(
    'accepts an optional international phone: %s',
    (phone) => {
      expect(validateContactMessage(validMessage({ phone })).phone).toBeUndefined();
    },
  );
  it.each(['call me', '+123', '+1234567890123456', '++16045550100'])(
    'rejects a malformed optional phone: %s',
    (phone) => {
      expect(validateContactMessage(validMessage({ phone })).phone).toBeDefined();
    },
  );
  it('rejects unknown topics instead of submitting arbitrary topic values', () => {
    expect(validateContactMessage(validMessage({ topic: 'unexpected' })).topic).toBeDefined();
  });
  it('accepts the text limits and rejects longer name/message drafts', () => {
    expect(
      validateContactMessage(validMessage({ name: 'a'.repeat(200), message: 'a'.repeat(4000) })),
    ).toEqual({});
    expect(
      Object.keys(
        validateContactMessage(validMessage({ name: 'a'.repeat(201), message: 'a'.repeat(4001) })),
      ),
    ).toEqual(['name', 'message']);
  });
  it('validates tracking details without inventing a real order-number format or lookup', () => {
    expect(
      validateContactTracking({ order: ' CP-2026-10482 ', email: ' visitor@example.com ' }),
    ).toEqual({});
    expect(
      validateContactTracking({ order: 'reference-42', email: 'visitor@example.com' }),
    ).toEqual({});
    expect(Object.keys(validateContactTracking({ order: ' ', email: 'not-an-email' }))).toEqual([
      'order',
      'email',
    ]);
    expect(
      validateContactTracking({ order: 'a'.repeat(81), email: 'visitor@example.com' }).order,
    ).toBeDefined();
  });
  it('rejects email whitespace and excessive length', () => {
    expect(
      validateContactMessage(validMessage({ email: 'visitor name@example.com' })).email,
    ).toBeDefined();
    expect(
      validateContactMessage(validMessage({ email: `${'a'.repeat(250)}@example.com` })).email,
    ).toBeDefined();
  });
  it('returns only a preview marker from both valid submissions, never reflected personal data', async () => {
    expect(await contactPreviewAction({ kind: 'message', input: validMessage() })).toEqual({
      status: 'preview',
      previewOnly: true,
    });
    expect(
      await contactPreviewAction({
        kind: 'tracking',
        input: { order: 'CP-2026-10482', email: 'visitor@example.com' },
      }),
    ).toEqual({ status: 'preview', previewOnly: true });
  });
  it('revalidates drafts at the server boundary', async () => {
    expect(
      await contactPreviewAction({ kind: 'message', input: validMessage({ topic: 'unknown' }) }),
    ).toEqual({ status: 'invalid', previewOnly: true });
    expect(
      await contactPreviewAction({ kind: 'tracking', input: { order: '', email: '' } }),
    ).toEqual({ status: 'invalid', previewOnly: true });
  });
  it('rejects malformed direct action requests without throwing', async () => {
    // Deliberately cross the TypeScript boundary to simulate an untrusted direct POST.
    const result = await Reflect.apply(contactPreviewAction, undefined, [
      { kind: 'message', input: { name: 42 } },
    ]);
    expect(result).toEqual({ status: 'invalid', previewOnly: true });
  });
});

describe('contact message email draft (REL-33 interim)', () => {
  it('addresses the support inbox with the topic, message and contact details', () => {
    const href = contactMessageMailto(
      validMessage({ topic: 'internet', phone: ' +1 604 555 0100 ', message: ' Hi & thanks? ' }),
    );
    const url = new URL(href);
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe('info@canadianplans.com');
    expect(url.searchParams.get('subject')).toBe('Website message: Home internet / installation');
    expect(url.searchParams.get('body')).toBe(
      'Hi & thanks?\n\nName: Preview visitor\nEmail: visitor@example.com\nPhone: +1 604 555 0100',
    );
  });
  it('leaves out an empty phone', () => {
    const body = new URL(contactMessageMailto(validMessage())).searchParams.get('body');
    expect(body).not.toContain('Phone:');
  });
});
