import { z } from 'zod';
export const COOKIE_KEY = 'canadian-plans.cookie-choices.v1';
export const COOKIE_VERSION = 1;
export const COOKIE_MAX_LENGTH = 500;
const CHANGE_EVENT = 'canadian-plans-cookie-change';
const schema = z.object({
  version: z.literal(COOKIE_VERSION),
  analytics: z.boolean(),
  marketing: z.boolean(),
});
export type CookieChoice = z.infer<typeof schema>;
let visitSnapshot: string | null = null;
let failedWrite = false;
let storedAtFailure: string | null | undefined;
export function parseCookieChoice(input: unknown): CookieChoice | null {
  if (typeof input !== 'string' || input.length > COOKIE_MAX_LENGTH) return null;
  try {
    const value: unknown = JSON.parse(input);
    const parsed = schema.safeParse(value);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
export function cookieSnapshot(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(COOKIE_KEY);
    // An unchanged persisted value must not override a choice we could not save.
    // A different value reflects another tab's change; queued storage events
    // alone do not prove that the old value is newer than this visit's choice.
    if (failedWrite) {
      if (storedAtFailure === undefined) {
        // Reads have recovered. Establish a baseline without losing a local or
        // persisted withdrawal whose ordering could not be observed.
        storedAtFailure = stored;
        const local = parseCookieChoice(visitSnapshot);
        const persisted = parseCookieChoice(stored);
        if (local && persisted) {
          visitSnapshot = JSON.stringify({
            version: COOKIE_VERSION,
            analytics: local.analytics && persisted.analytics,
            marketing: local.marketing && persisted.marketing,
          });
        }
        return visitSnapshot;
      }
      if (stored === storedAtFailure) return visitSnapshot;
    }
    failedWrite = false;
    return stored;
  } catch {
    return visitSnapshot;
  }
}
export function saveCookieChoice(input: unknown): { valid: boolean; persisted: boolean } {
  const value = schema.safeParse(input);
  if (!value.success || typeof window === 'undefined') return { valid: false, persisted: false };
  visitSnapshot = JSON.stringify(value.data);
  let persisted = false;
  try {
    window.localStorage.setItem(COOKIE_KEY, visitSnapshot);
    failedWrite = false;
    persisted = true;
  } catch {
    failedWrite = true;
    try {
      storedAtFailure = window.localStorage.getItem(COOKIE_KEY);
    } catch {
      storedAtFailure = undefined;
    }
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return { valid: true, persisted };
}
export function subscribeCookieChoice(notify: () => void): () => void {
  window.addEventListener('storage', notify);
  window.addEventListener(CHANGE_EVENT, notify);
  return () => {
    window.removeEventListener('storage', notify);
    window.removeEventListener(CHANGE_EVENT, notify);
  };
}
export function hasAnalyticsConsent(): boolean {
  return parseCookieChoice(cookieSnapshot())?.analytics === true;
}
