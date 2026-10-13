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
    return window.localStorage.getItem(COOKIE_KEY);
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
    persisted = true;
  } catch {
    /* Explicit choice remains valid for this visit. */
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
