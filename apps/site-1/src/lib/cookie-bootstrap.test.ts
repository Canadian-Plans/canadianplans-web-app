import { describe, expect, it } from 'vitest';
import { runInNewContext } from 'node:vm';
import { cookieBootstrapScript } from './cookie-bootstrap';
import { parseCookieChoice, COOKIE_KEY } from './cookie-consent';
describe('initial consent visibility', () => {
  it('hides only choices the consent store accepts, without writing any preferences', () => {
    for (const raw of [
      null,
      '',
      'invalid',
      '{}',
      '[]',
      'null',
      JSON.stringify({ version: 2, analytics: true, marketing: true }),
      JSON.stringify({ version: 1, analytics: false, marketing: false }),
      JSON.stringify({ version: 1, analytics: true, marketing: true }),
      JSON.stringify({ version: 1, analytics: false, marketing: false, extra: 'ignored' }),
      ' '.repeat(501),
    ]) {
      const attributes = new Map<string, string>();
      runInNewContext(cookieBootstrapScript, {
        localStorage: {
          getItem: (key: string) => {
            expect(key).toBe(COOKIE_KEY);
            return raw;
          },
        },
        document: {
          documentElement: {
            setAttribute: (key: string, value: string) => attributes.set(key, value),
          },
        },
      });
      expect(attributes.has('data-cp-consent')).toBe(parseCookieChoice(raw) !== null);
    }
  });
  it('keeps the banner visible when browser storage is unavailable', () => {
    const attributes = new Map<string, string>();
    runInNewContext(cookieBootstrapScript, {
      localStorage: {
        getItem: () => {
          throw new Error('Storage unavailable');
        },
      },
      document: {
        documentElement: {
          setAttribute: (key: string, value: string) => attributes.set(key, value),
        },
      },
    });
    expect(attributes.size).toBe(0);
  });
});
