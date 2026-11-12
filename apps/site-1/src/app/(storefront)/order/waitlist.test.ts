import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendError } from '@canadian-plans/crm-contracts';

vi.mock('server-only', () => ({}));

const leadsCreate = vi.fn();
vi.mock('@/lib/backendClient', () => ({
  getBackendClient: () => ({ leads: { create: leadsCreate } }),
}));

const { joinWaitlist } = await import('./waitlist');

beforeEach(() => {
  leadsCreate.mockReset();
});

describe('joinWaitlist', () => {
  it('saves a submitted contact message naming the province, with the server-side consent version', async () => {
    leadsCreate.mockResolvedValue({ lead: { id: 'lead-id' }, draftGrant: null });

    const result = await joinWaitlist({
      province: 'NS',
      email: '  pat@example.test ',
      turnstileToken: 'synthetic-proof',
    });

    expect(result).toEqual({ ok: true, data: { joined: true } });
    expect(leadsCreate).toHaveBeenCalledTimes(1);
    expect(leadsCreate).toHaveBeenCalledWith(
      {
        leadType: 'contact_message',
        contact: { email: 'pat@example.test' },
        form: {
          schemaVersion: 1,
          payload: { kind: 'region_waitlist', interest: 'internet', province: 'NS' },
        },
        consentVersion: 'privacy-2026-10-v2',
        submit: true,
      },
      { turnstileToken: 'synthetic-proof' },
    );
  });

  it('refuses an invalid email with a field error, without calling the backend', async () => {
    const result = await joinWaitlist({
      province: 'NS',
      email: 'nope',
      turnstileToken: 'synthetic-proof',
    });
    expect(result).toMatchObject({
      ok: false,
      code: 'validation_error',
      fieldErrors: { email: expect.any(String) },
    });
    expect(leadsCreate).not.toHaveBeenCalled();
  });

  it.each([
    ['the national marker', 'CA'],
    ['an unknown province', 'ZZ'],
    ['a blank province', ''],
  ])('refuses %s without calling the backend', async (_name, province) => {
    const result = await joinWaitlist({
      province,
      email: 'pat@example.test',
      turnstileToken: 'synthetic-proof',
    });
    expect(result).toMatchObject({ ok: false, code: 'validation_error' });
    expect(leadsCreate).not.toHaveBeenCalled();
  });

  it('refuses a missing security proof before any backend call', async () => {
    const result = await joinWaitlist({ province: 'NS', email: 'pat@example.test' });
    expect(result).toMatchObject({ ok: false, code: 'verification_failed' });
    expect(leadsCreate).not.toHaveBeenCalled();
  });

  it('tells the visitor to try again when the backend fails, without echoing the address', async () => {
    leadsCreate.mockRejectedValue(new BackendError('internal_error', 500, 'req-1'));

    const result = await joinWaitlist({
      province: 'NS',
      email: 'pat@example.test',
      turnstileToken: 'synthetic-proof',
    });

    expect(result).toMatchObject({ ok: false, code: 'not_saved' });
    expect(JSON.stringify(result)).not.toContain('pat@example.test');
  });

  it('treats a transport failure the same way', async () => {
    leadsCreate.mockRejectedValue(new TypeError('network down'));
    const result = await joinWaitlist({
      province: 'NS',
      email: 'pat@example.test',
      turnstileToken: 'synthetic-proof',
    });
    expect(result).toMatchObject({ ok: false, code: 'not_saved' });
  });
});
