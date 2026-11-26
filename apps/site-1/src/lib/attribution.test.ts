import { describe, expect, test } from 'vitest';

import {
  campaignCookieValue,
  campaignQueryParams,
  captureRawAttribution,
  hasCampaign,
  orderHref,
  readCampaignCookie,
  rememberedCampaign,
} from './attribution';

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

describe('carrying campaign parameters across /order', () => {
  const landed = captureRawAttribution({
    searchParams: {
      utm_source: 'whatsapp',
      utm_medium: 'social',
      utm_campaign: 'launch',
      ref: 'AGENT-7',
      secret: 'do-not-forward',
    },
    referrer: undefined,
    origin: ORIGIN,
  });

  test('rebuilds only the screened utm and partner keys', () => {
    expect(campaignQueryParams(landed)).toEqual([
      ['utm_source', 'whatsapp'],
      ['utm_medium', 'social'],
      ['utm_campaign', 'launch'],
      ['partner', 'AGENT-7'],
    ]);
  });

  test('a plan link keeps the campaign, and the next page captures it again', () => {
    const href = orderHref({ plan: 'plan id/1', province: 'BC' }, landed);
    expect(href).toBe(
      '/order?plan=plan+id%2F1&province=BC&utm_source=whatsapp&utm_medium=social&utm_campaign=launch&partner=AGENT-7',
    );
    const next = new URL(href, ORIGIN);
    const again = captureRawAttribution({
      searchParams: Object.fromEntries(next.searchParams),
      referrer: `${ORIGIN}/order`,
      origin: ORIGIN,
    });
    expect(again).toMatchObject({
      utmSource: 'whatsapp',
      utmMedium: 'social',
      utmCampaign: 'launch',
      partnerCode: 'AGENT-7',
    });
    expect(href).not.toContain('do-not-forward');
  });

  test('no campaign and no parameters gives the bare order page', () => {
    const plain = captureRawAttribution({ searchParams: {}, referrer: undefined, origin: ORIGIN });
    expect(orderHref({ category: undefined }, plain)).toBe('/order');
    expect(orderHref({ category: 'sim' }, plain)).toBe('/order?category=sim');
  });
});

describe('remembering a campaign for the visit', () => {
  test('a landing URL with a campaign gives a cookie holding only screened values and the path', () => {
    const value = campaignCookieValue(
      {
        utm_source: 'facebook',
        utm_campaign: 'launch',
        utm_content: 'someone@example.test',
        partner_code: 'MAPLE10',
        secret: 'nope',
      },
      '/pre-arrival-sim/students',
    );
    expect(value).toBeDefined();
    expect(JSON.parse(value ?? '')).toEqual({
      params: { utm_source: 'facebook', utm_campaign: 'launch', partner: 'MAPLE10' },
      landingPath: '/pre-arrival-sim/students',
    });
    expect(value).not.toContain('example.test');
    expect(value).not.toContain('nope');
  });

  test('no campaign, no cookie', () => {
    expect(campaignCookieValue({ plan: 'x', province: 'BC' }, '/order')).toBeUndefined();
    expect(campaignCookieValue({ utm_source: 'a@b.co' }, '/')).toBeUndefined();
    expect(hasCampaign({ plan: 'x' })).toBe(false);
    expect(hasCampaign({ ref: 'AGENT7' })).toBe(true);
  });

  test('the remembered campaign becomes the order attribution, landing page included', () => {
    const remembered = readCampaignCookie(
      campaignCookieValue({ utm_source: 'whatsapp', utm_medium: 'social' }, '/'),
    );
    expect(remembered).toEqual({
      searchParams: { utm_source: 'whatsapp', utm_medium: 'social' },
      landingPath: '/',
    });
    const attribution = captureRawAttribution({
      searchParams: { plan: 'p1', ...remembered?.searchParams },
      referrer: `${ORIGIN}/mobile-plans`,
      origin: ORIGIN,
      landingPath: remembered?.landingPath,
    });
    expect(attribution).toEqual({ utmSource: 'whatsapp', utmMedium: 'social', landingPath: '/' });
  });

  test('the same campaign carried by the order form keeps its landing page; a new one wins', () => {
    const cookie = campaignCookieValue({ utm_source: 'facebook', utm_campaign: 'launch' }, '/faq');
    const carried = { plan: 'p1', utm_source: 'facebook', utm_campaign: 'launch' };
    expect(campaignCookieValue(carried, '/order', cookie)).toBeUndefined();
    expect(rememberedCampaign(carried, cookie)?.landingPath).toBe('/faq');
    expect(rememberedCampaign({ plan: 'p1' }, cookie)?.landingPath).toBe('/faq');
    const other = { utm_source: 'whatsapp', utm_campaign: 'launch' };
    expect(rememberedCampaign(other, cookie)).toBeUndefined();
    expect(JSON.parse(campaignCookieValue(other, '/order', cookie) ?? '')).toMatchObject({
      landingPath: '/order',
    });
  });

  test('a malformed or hand-edited cookie gains nothing', () => {
    expect(readCampaignCookie(undefined)).toBeUndefined();
    expect(readCampaignCookie('not json')).toBeUndefined();
    expect(readCampaignCookie('null')).toBeUndefined();
    expect(readCampaignCookie(JSON.stringify({ params: { secret: 'x' } }))).toBeUndefined();
    expect(readCampaignCookie('x'.repeat(3000))).toBeUndefined();
    const edited = readCampaignCookie(
      JSON.stringify({
        params: { utm_source: 'ok', token: 'drop', utm_medium: 42 },
        landingPath: 'https://evil.example/x?y',
      }),
    );
    expect(edited).toEqual({ searchParams: { utm_source: 'ok' }, landingPath: undefined });
    for (const path of ['//evil.example', '/a?b', '/a#b', 'relative']) {
      const attribution = captureRawAttribution({
        searchParams: {},
        referrer: undefined,
        origin: ORIGIN,
        landingPath: path,
      });
      expect(attribution['landingPath']).toBe('/order');
    }
  });
});
