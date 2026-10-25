import 'server-only';
import { cookies } from 'next/headers';
import { z } from 'zod';

/**
 * The 30-minute tracking grant lives in a server-set, httpOnly cookie so the
 * scoped token never reaches the browser as readable state and is never logged.
 */

const GRANT_COOKIE = 'cp_tracking_grant';
const GRANT_TTL_SECONDS = 30 * 60;

const grantCookieSchema = z.object({
  token: z.string().min(1).max(4_096),
  expiresAt: z.iso.datetime(),
});

export async function readTrackingGrant(): Promise<{ token: string } | undefined> {
  const store = await cookies();
  const raw = store.get(GRANT_COOKIE)?.value;
  if (!raw) return undefined;
  try {
    const parsed = grantCookieSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return undefined;
    if (Date.parse(parsed.data.expiresAt) <= Date.now()) return undefined;
    return { token: parsed.data.token };
  } catch {
    return undefined;
  }
}

/** Persists the grant cookie. Only callable from a Server Action or Route Handler. */
export async function writeTrackingGrant(grant: {
  token: string;
  expiresAt: string;
}): Promise<void> {
  const store = await cookies();
  store.set(GRANT_COOKIE, JSON.stringify(grant), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/track',
    maxAge: GRANT_TTL_SECONDS,
  });
}

export async function clearTrackingGrant(): Promise<void> {
  const store = await cookies();
  store.delete(GRANT_COOKIE);
}
