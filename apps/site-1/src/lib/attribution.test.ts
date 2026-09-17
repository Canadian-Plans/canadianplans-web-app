import { describe, expect, test } from 'vitest';

import { captureRawAttribution } from './attribution';

const ORIGIN = 'https://site-1.example';

describe('captureRawAttribution', () => {
  test('maps allowlisted UTM parameters and a partner code, never a raw query string', () => {
    const result = captureRawAttribution({
      searchParams: {
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'fall',
        partner: 'REF-123',
        secret: 'do-not-forward',
      },
      referrer: undefined,
      origin: ORIGIN,
    });

    expect(result).toMatchObject({
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'fall',
      partnerCode: 'REF-123',
      landingPath: '/order',
    });
    // Unknown query keys are never copied through.
    expect(JSON.stringify(result)).not.toContain('do-not-forward');
    expect(result).not.toHaveProperty('secret');
  });

  test('falls back to ref for the partner code and bounds an overlong value', () => {
    expect(
      captureRawAttribution({
        searchParams: { ref: 'PARTNER-9' },
        referrer: undefined,
        origin: ORIGIN,
      }),
    ).toMatchObject({ partnerCode: 'PARTNER-9' });

    expect(
      captureRawAttribution({
        searchParams: { partner: 'x'.repeat(80) },
        referrer: undefined,
        origin: ORIGIN,
      }),
    ).not.toHaveProperty('partnerCode');
  });

  test('keeps an approved external referrer host and drops an unapproved one', () => {
    expect(
      captureRawAttribution({
        searchParams: {},
        referrer: 'https://www.google.com/search?q=sim',
        origin: ORIGIN,
      }),
    ).toMatchObject({ referrerHost: 'www.google.com' });

    expect(
      captureRawAttribution({
        searchParams: {},
        referrer: 'https://example.invalid/page',
        origin: ORIGIN,
      }),
    ).not.toHaveProperty('referrerHost');
  });

  test('uses a same-origin referrer path as the landing path without its query string', () => {
    const result = captureRawAttribution({
      searchParams: {},
      referrer: `${ORIGIN}/plans/rogers-10gb?token=secret`,
      origin: ORIGIN,
    });
    expect(result).toMatchObject({ landingPath: '/plans/rogers-10gb' });
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  test('drops email-like, phone-like and token-like values', () => {
    const result = captureRawAttribution({
      searchParams: {
        utm_source: 'buyer@example.com',
        utm_term: '+1 416 555 1234',
        utm_content: 'access_token=abc',
      },
      referrer: undefined,
      origin: ORIGIN,
    });

    expect(result).not.toHaveProperty('utmSource');
    expect(result).not.toHaveProperty('utmTerm');
    expect(result).not.toHaveProperty('utmContent');
  });

  test('returns only a default landing path when there is nothing to attribute', () => {
    expect(
      captureRawAttribution({ searchParams: {}, referrer: undefined, origin: ORIGIN }),
    ).toEqual({
      landingPath: '/order',
    });
  });
});
