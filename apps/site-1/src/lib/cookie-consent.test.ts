import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  COOKIE_KEY,
  cookieSnapshot,
  hasAnalyticsConsent,
  parseCookieChoice,
  saveCookieChoice,
  subscribeCookieChoice,
} from './cookie-consent';
afterEach(() => vi.unstubAllGlobals());
describe('cookie choice boundary', () => {
  it('fails closed for missing, malformed and obsolete preferences', () => {
    for (const value of [
      null,
      '{',
      'true',
      JSON.stringify({ version: 2, analytics: true, marketing: true }),
      JSON.stringify({ version: 1, analytics: 'yes', marketing: false }),
    ])
      expect(parseCookieChoice(value)).toBeNull();
    vi.stubGlobal('window', { localStorage: { getItem: () => null } });
    expect(hasAnalyticsConsent()).toBe(false);
  });
  it('persists explicit independent choices and notifies subscribers', () => {
    let saved: string | null = null;
    const target = new EventTarget();
    vi.stubGlobal(
      'window',
      Object.assign(target, {
        localStorage: {
          getItem: () => saved,
          setItem: (key: string, value: string) => {
            expect(key).toBe(COOKIE_KEY);
            saved = value;
          },
        },
      }),
    );
    const notify = vi.fn();
    const unsubscribe = subscribeCookieChoice(notify);
    expect(saveCookieChoice({ version: 1, analytics: false, marketing: true })).toEqual({
      valid: true,
      persisted: true,
    });
    expect(hasAnalyticsConsent()).toBe(false);
    expect(notify).toHaveBeenCalledTimes(1);
    target.dispatchEvent(new Event('storage'));
    expect(notify).toHaveBeenCalledTimes(2);
    unsubscribe();
    target.dispatchEvent(new Event('storage'));
    expect(notify).toHaveBeenCalledTimes(2);
    expect(saveCookieChoice({ version: 1, analytics: true, marketing: false })).toEqual({
      valid: true,
      persisted: true,
    });
    expect(hasAnalyticsConsent()).toBe(true);
    expect(saveCookieChoice({ version: 1, analytics: false, marketing: false })).toEqual({
      valid: true,
      persisted: true,
    });
    expect(hasAnalyticsConsent()).toBe(false);
  });
  it('retains a visit-only explicit choice when browser storage is blocked', () => {
    vi.stubGlobal(
      'window',
      Object.assign(new EventTarget(), {
        localStorage: {
          getItem: () => {
            throw new Error('blocked');
          },
          setItem: () => {
            throw new Error('blocked');
          },
        },
      }),
    );
    expect(saveCookieChoice({ version: 1, analytics: false, marketing: false })).toEqual({
      valid: true,
      persisted: false,
    });
    expect(parseCookieChoice(cookieSnapshot())).toEqual({
      version: 1,
      analytics: false,
      marketing: false,
    });
    expect(hasAnalyticsConsent()).toBe(false);
    expect(saveCookieChoice({ analytics: true })).toEqual({ valid: false, persisted: false });
  });
});
