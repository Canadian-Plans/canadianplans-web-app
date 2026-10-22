import { afterEach, beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());
const choice = (analytics: boolean) => ({ version: 1, analytics, marketing: false });

it('honours opt-out when reads succeed and writes fail, including queued storage events', async () => {
  const consent = await import('./cookie-consent');
  let stored = JSON.stringify(choice(true));
  const target = new EventTarget();
  vi.stubGlobal(
    'window',
    Object.assign(target, {
      localStorage: {
        getItem: () => stored,
        setItem: () => {
          throw new Error('quota');
        },
      },
    }),
  );
  expect(consent.saveCookieChoice(choice(false))).toEqual({ valid: true, persisted: false });
  expect(consent.hasAnalyticsConsent()).toBe(false);
  target.dispatchEvent(new Event('storage'));
  expect(consent.hasAnalyticsConsent()).toBe(false);
  expect(consent.saveCookieChoice({ analytics: true })).toEqual({ valid: false, persisted: false });
  expect(consent.hasAnalyticsConsent()).toBe(false);
  stored = JSON.stringify(choice(false));
  expect(consent.cookieSnapshot()).toBe(stored);
});

it('uses the latest failed choice and observes subsequent changes from another tab', async () => {
  const consent = await import('./cookie-consent');
  let stored: string | null = null;
  vi.stubGlobal(
    'window',
    Object.assign(new EventTarget(), {
      localStorage: {
        getItem: () => stored,
        setItem: () => {
          throw new Error('quota');
        },
      },
    }),
  );
  consent.saveCookieChoice(choice(false));
  consent.saveCookieChoice(choice(true));
  expect(consent.hasAnalyticsConsent()).toBe(true);
  stored = JSON.stringify(choice(false));
  expect(consent.hasAnalyticsConsent()).toBe(false);
});

it('returns to persisted state after a successful save and retains a cache for read failures', async () => {
  const consent = await import('./cookie-consent');
  let stored = JSON.stringify(choice(true));
  let blockedWrite = true;
  let blockedRead = false;
  vi.stubGlobal(
    'window',
    Object.assign(new EventTarget(), {
      localStorage: {
        getItem: () => {
          if (blockedRead) throw new Error('blocked');
          return stored;
        },
        setItem: (_key: string, value: string) => {
          if (blockedWrite) throw new Error('quota');
          stored = value;
        },
      },
    }),
  );
  consent.saveCookieChoice(choice(false));
  blockedWrite = false;
  consent.saveCookieChoice(choice(true));
  blockedRead = true;
  expect(consent.hasAnalyticsConsent()).toBe(true);
  blockedRead = false;
  stored = JSON.stringify(choice(false));
  expect(consent.hasAnalyticsConsent()).toBe(false);
});

it('never exposes a cached browser choice during server rendering', async () => {
  const consent = await import('./cookie-consent');
  vi.stubGlobal('window', undefined);
  expect(consent.cookieSnapshot()).toBeNull();
  expect(consent.hasAnalyticsConsent()).toBe(false);
  expect(consent.saveCookieChoice(choice(true))).toEqual({ valid: false, persisted: false });
});

it('respects persisted withdrawal after both storage reads and writes recover', async () => {
  const consent = await import('./cookie-consent');
  let readable = false;
  let stored = JSON.stringify(choice(false));
  vi.stubGlobal(
    'window',
    Object.assign(new EventTarget(), {
      localStorage: {
        getItem: () => {
          if (!readable) throw new Error('blocked');
          return stored;
        },
        setItem: () => {
          throw new Error('blocked');
        },
      },
    }),
  );
  consent.saveCookieChoice(choice(true));
  expect(consent.hasAnalyticsConsent()).toBe(true);
  readable = true;
  expect(consent.hasAnalyticsConsent()).toBe(false);
  stored = JSON.stringify(choice(true));
  expect(consent.hasAnalyticsConsent()).toBe(true);
});
