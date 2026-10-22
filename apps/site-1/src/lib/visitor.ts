import 'server-only';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { headers } from 'next/headers';

/** Vercel's current ipAddress helper uses x-real-ip, set by its proxy. Only
 * that hosting runtime may assert it; arbitrary browser XFF is never forwarded.
 * https://github.com/vercel/vercel/blob/main/packages/functions/src/headers.ts
 */
export async function websiteVisitorId(credential: string): Promise<string | undefined> {
  if (process.env.VERCEL !== '1') return undefined;
  const ip = (await headers()).get('x-real-ip')?.trim();
  if (!ip || ip.includes('%') || !isIP(ip)) return undefined;
  const canonical = isIP(ip) === 6 ? new URL(`http://[${ip}]`).hostname : ip;
  return createHmac('sha256', credential).update(`website-visitor:v1:${canonical}`).digest('hex');
}
