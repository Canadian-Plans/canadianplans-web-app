import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const { incoming } = vi.hoisted(() => ({ incoming: new Map<string, string>() }));
vi.mock('next/headers', () => ({ headers: async () => new Headers([...incoming]) }));
import { websiteVisitorId } from './visitor';

beforeEach(() => incoming.clear());
afterEach(() => vi.unstubAllEnvs());
describe('trusted Vercel visitor assertion', () => {
  it('ignores forwarding assertions outside the hosting runtime', async () => {
    vi.stubEnv('VERCEL', '');
    incoming.set('x-real-ip', '203.0.113.1');
    expect(await websiteVisitorId('server-credential')).toBeUndefined();
  });
  it('hashes only the Vercel proxy IP, keeps workers stable and isolates visitors/credentials', async () => {
    vi.stubEnv('VERCEL', '1');
    incoming.set('x-real-ip', '203.0.113.1');
    const first = await websiteVisitorId('server-credential');
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    incoming.set('x-forwarded-for', '198.51.100.1');
    expect(await websiteVisitorId('server-credential')).toBe(first);
    incoming.set('x-forwarded-for', '198.51.100.2');
    expect(await websiteVisitorId('server-credential')).toBe(first);
    incoming.set('x-real-ip', '203.0.113.2');
    expect(await websiteVisitorId('server-credential')).not.toBe(first);
    incoming.set('x-real-ip', '203.0.113.1');
    expect(await websiteVisitorId('other-credential')).not.toBe(first);
  });
  it('normalizes IPv6 and rejects missing, malformed or multiple IPs', async () => {
    vi.stubEnv('VERCEL', '1');
    incoming.set('x-real-ip', '2001:0db8:0:0:0:0:0:1');
    const first = await websiteVisitorId('credential');
    incoming.set('x-real-ip', '2001:db8::1');
    expect(await websiteVisitorId('credential')).toBe(first);
    for (const value of ['', 'garbage', '203.0.113.1, 198.51.100.1', 'fe80::1%eth0']) {
      incoming.set('x-real-ip', value);
      expect(await websiteVisitorId('credential')).toBeUndefined();
    }
  });
});
