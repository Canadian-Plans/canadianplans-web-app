import { describe, expect, it } from 'vitest';
import { emailCopy, emailFixtures } from '@content/emails';
import { renderTransactionalEmail } from './render';
import { parseEmailMessage, emailAssetOrigin, isEmailTemplate, type EmailMessage } from './data';
const origin = 'https://canadianplans.example';
const actionUrl = origin + '/track-order';
const fixtures: readonly EmailMessage[] = [
  { template: 'order-received', data: { ...emailFixtures['order-received'], actionUrl } },
  { template: 'esim-ready', data: { ...emailFixtures['esim-ready'], actionUrl } },
  { template: 'install-booked', data: { ...emailFixtures['install-booked'], actionUrl } },
];
describe('transactional email renderer', () => {
  it('exports all three messages as standalone inline/table HTML and plain text', async () => {
    for (const fixture of fixtures) {
      const email = await renderTransactionalEmail(fixture, { assetBaseUrl: origin });
      expect(email.html).toContain('<!DOCTYPE');
      expect(email.html).toContain('width="600"');
      expect(email.html).toContain('role="presentation"');
      expect(email.html).toContain('style="');
      expect(email.html).not.toMatch(
        /<(?:script|style)\b|class=|var\(--|display:(?:flex|grid)|figma\.com/iu,
      );
      expect(email.html).toContain(origin + '/design/components/312-2-imgIcon.svg');
      expect(email.html).toContain(actionUrl);
      expect(email.text).toContain(emailCopy[fixture.template].action);
      expect(email.text).toContain(fixture.data.plan);
      expect(email.html).not.toContain('data-email-section="inbox"');
    }
  });
  it('changes personalized fields and subject without falling back to sample data', async () => {
    const email = await renderTransactionalEmail(
      {
        template: 'order-received',
        data: {
          ...emailFixtures['order-received'],
          customerName: 'Maya',
          orderReference: 'CP-DEMO-2',
          plan: 'Different plan',
          actionUrl,
        },
      },
      { assetBaseUrl: origin },
    );
    expect(email.subject).toBe('We got your order, CP-DEMO-2');
    expect(email.html).toContain('Thanks, Maya.');
    expect(email.text).toContain('Different plan');
    expect(email.html).not.toContain('Aarav');
    expect(email.html).not.toContain('CP-2026-10482');
  });
  it('escapes HTML-like values while refusing header controls and unsafe links', async () => {
    const email = await renderTransactionalEmail(
      {
        template: 'order-received',
        data: {
          ...emailFixtures['order-received'],
          customerName: '<img src=x onerror=alert(1)>',
          actionUrl,
        },
      },
      { assetBaseUrl: origin },
    );
    expect(email.html).toContain('&lt;img');
    expect(email.html).not.toContain('<img src=x');
    for (const patch of [
      { orderReference: 'CP-1\r\nBcc: person@example.com' },
      { actionUrl: 'javascript:alert(1)' },
      { actionUrl: 'https://user:secret@example.com' },
      { customerName: '' },
      { customerName: 'x'.repeat(161) },
    ]) {
      expect(() =>
        parseEmailMessage({
          template: 'order-received',
          data: { ...emailFixtures['order-received'], actionUrl, ...patch },
        }),
      ).toThrow('Invalid email template data');
    }
    expect(() => parseEmailMessage({ template: 'unknown', data: fixtures[0]?.data })).toThrow(
      'Invalid email template data',
    );
  });
  it('requires a public asset origin and distinguishes preview inbox annotations', async () => {
    expect(isEmailTemplate('order-received')).toBe(true);
    for (const value of ['toString', '__proto__', ['esim-ready'], undefined])
      expect(isEmailTemplate(value)).toBe(false);
    expect(emailAssetOrigin('https://canadianplans.example')).toBe(origin);
    for (const value of [
      'javascript:alert(1)',
      'https://host.example/path',
      'https://host.example?token=secret',
      'http://remote.example',
      'https://user:secret@host.example',
    ])
      expect(() => emailAssetOrigin(value)).toThrow('Invalid email asset origin');
    const email = await renderTransactionalEmail(fixtures[1], {
      assetBaseUrl: origin,
      previewInbox: true,
    });
    expect(email.html).toContain('data-email-section="inbox"');
    expect(email.preheader).toContain('+1 (604) 555-0142');
  });
});
