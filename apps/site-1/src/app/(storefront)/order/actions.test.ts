import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendError } from '@canadian-plans/contracts';

vi.mock('server-only', () => ({}));

/** Minimal in-memory stand-in for the httpOnly draft cookie. */
const jar = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = jar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));

const leadsCreate = vi.fn();
const leadsUpdate = vi.fn();
vi.mock('@/lib/backendClient', () => ({
  getBackendClient: () => ({ leads: { create: leadsCreate, update: leadsUpdate } }),
}));

const { saveDetails } = await import('./actions');

const LEAD_A = '11111111-1111-4111-8111-111111111111';
const LEAD_B = '22222222-2222-4222-8222-222222222222';
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';

const details = {
  fullName: 'Test Customer',
  email: 'customer@example.test',
  phone: '1712345678',
  countryCode: 'BD',
  currentCountry: 'Bangladesh',
  destination: 'Toronto',
  arrivalDate: '2026-10-01',
};

function input() {
  return {
    details,
    documentKeys: ['passport'],
    productId: PRODUCT_ID,
    attribution: {},
    consentVersion: 'TEST-disclosure-v1',
  };
}

function draftKey(): string {
  const raw = jar.get('cp_order_draft');
  if (!raw) throw new Error('no draft cookie');
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null || !('idempotencyKey' in parsed)) {
    throw new Error('unexpected draft cookie');
  }
  const { idempotencyKey } = parsed;
  if (typeof idempotencyKey !== 'string') throw new Error('unexpected idempotency key');
  return idempotencyKey;
}

beforeEach(() => {
  jar.clear();
  leadsCreate.mockReset();
  leadsUpdate.mockReset();
});

describe('saveDetails draft lifecycle', () => {
  it('reuses the same lead and idempotency key while the draft is still editable', async () => {
    leadsCreate.mockResolvedValue({ lead: { id: LEAD_A }, draftGrant: { token: 'grant-a' } });
    leadsUpdate.mockResolvedValue({ lead: { id: LEAD_A } });

    expect(await saveDetails(input())).toEqual({ ok: true, data: { leadId: LEAD_A } });
    const firstKey = draftKey();

    expect(await saveDetails(input())).toEqual({ ok: true, data: { leadId: LEAD_A } });
    // A resumed draft must never regenerate the key: that is what makes a
    // timeout retry return the existing order (REQ 18).
    expect(draftKey()).toBe(firstKey);
    expect(leadsCreate).toHaveBeenCalledTimes(1);
  });

  it.each(['draft_already_submitted', 'draft_expired', 'draft_not_found'] as const)(
    'starts a fresh draft with a new idempotency key when the old one is finished (%s)',
    async (code) => {
      leadsCreate.mockResolvedValueOnce({ lead: { id: LEAD_A }, draftGrant: { token: 'grant-a' } });
      await saveDetails(input());
      const firstKey = draftKey();

      // The customer comes back to /order carrying the previous draft cookie.
      leadsUpdate.mockRejectedValueOnce(new BackendError(code, 409, 'req-1'));
      leadsCreate.mockResolvedValueOnce({ lead: { id: LEAD_B }, draftGrant: { token: 'grant-b' } });

      const result = await saveDetails(input());

      expect(result).toEqual({ ok: true, data: { leadId: LEAD_B } });
      expect(draftKey()).not.toBe(firstKey);
      expect(leadsCreate).toHaveBeenCalledTimes(2);
    },
  );

  it('still reports a genuine backend failure instead of silently creating a second lead', async () => {
    leadsCreate.mockResolvedValueOnce({ lead: { id: LEAD_A }, draftGrant: { token: 'grant-a' } });
    await saveDetails(input());

    leadsUpdate.mockRejectedValueOnce(new BackendError('persistence_unavailable', 503, 'req-2'));

    expect(await saveDetails(input())).toMatchObject({ ok: false, code: 'not_saved' });
    expect(leadsCreate).toHaveBeenCalledTimes(1);
  });
});
