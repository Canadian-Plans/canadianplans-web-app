import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { CAMPAIGN_COOKIE } from './lib/attribution';
import { proxy } from './proxy';

const request = (url: string) => new NextRequest(new URL(url, 'https://canadianplans.com'));

describe('campaign proxy', () => {
  it('remembers a campaign the visitor lands with, as an HttpOnly session cookie', () => {
    const response = proxy(request('/?utm_source=whatsapp&utm_campaign=launch'));
    const cookie = response.cookies.get(CAMPAIGN_COOKIE);
    expect(cookie).toBeDefined();
    expect(JSON.parse(cookie?.value ?? '')).toEqual({
      params: { utm_source: 'whatsapp', utm_campaign: 'launch' },
      landingPath: '/',
    });
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('lax');
    expect(cookie?.path).toBe('/');
    expect(cookie?.maxAge).toBeUndefined();
    expect(cookie?.expires).toBeUndefined();
  });

  it('leaves a request without a campaign untouched', () => {
    expect(proxy(request('/mobile-plans')).cookies.get(CAMPAIGN_COOKIE)).toBeUndefined();
    expect(proxy(request('/order?plan=x')).cookies.get(CAMPAIGN_COOKIE)).toBeUndefined();
  });
});
