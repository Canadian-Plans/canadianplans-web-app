import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendError } from '@canadian-plans/contracts';

vi.mock('server-only', () => ({}));

const join = vi.fn();
vi.mock('@/lib/backendClient', () => ({
  getBackendClient: () => ({ regionWaitlist: { join } }),
}));

const { joinWaitlist } = await import('./waitlist');

beforeEach(() => {
  join.mockReset();
});

describe('joinWaitlist', () => {
  it('sends the trimmed email with the server-side consent version and the internet interest', async () => {
    join.mockResolvedValue({ requestId: 'x' });

    const result = await joinWaitlist({ province: 'NS', email: '  pat@example.test ' });

    expect(result).toEqual({ ok: true, data: { joined: true } });
    expect(join).toHaveBeenCalledWith({
      province: 'NS',
      email: 'pat@example.test',
      interest: 'internet',
      consentVersion: 'privacy-2026-10-v2',
    });
  });

  it.each([
    ['a bad email', { province: 'NS', email: 'nope' }],
    ['the national marker', { province: 'CA', email: 'pat@example.test' }],
    ['an unknown province', { province: 'ZZ', email: 'pat@example.test' }],
  ])('refuses %s without calling the backend', async (_name, input) => {
    const result = await joinWaitlist(input);
    expect(result.ok).toBe(false);
    expect(join).not.toHaveBeenCalled();
  });

  it('tells the visitor to try again when the backend fails, without echoing the address', async () => {
    join.mockRejectedValue(new BackendError('internal_error', 500, 'unavailable'));

    const result = await joinWaitlist({ province: 'NS', email: 'pat@example.test' });

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('pat@example.test');
    if (!result.ok) expect(result.code).toBe('not_saved');
  });
});
