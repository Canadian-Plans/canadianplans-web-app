import { describe, expect, it } from 'vitest';
import { InMemoryTrackingStore, trackingDetail } from './memory-store.js';
import { signTrackingGrant } from './secrets.js';
import { TrackingService } from './service.js';

const SECRET = 'test-secret-value-that-is-long-enough-32';
const WORKSPACE = '11111111-1111-4111-8111-111111111111';
const OTHER_WORKSPACE = '33333333-3333-4333-8333-333333333333';
const EMAIL = 'Jane@Example.test';
const NOW = '2026-10-25T12:00:00.000Z';

function setup(configured = true) {
  const store = new InMemoryTrackingStore(SECRET);
  let nowMs = Date.parse(NOW);
  const service = new TrackingService({
    store,
    contactHashSecret: () => SECRET,
    secret: configured ? SECRET : undefined,
    now: () => new Date(nowMs),
  });
  store.addOrder({
    workspaceId: WORKSPACE,
    orderId: '22222222-2222-4222-8222-222222222222',
    email: 'jane@example.test',
    detail: trackingDetail('CP-000001'),
  });
  store.addOrder({
    workspaceId: WORKSPACE,
    orderId: '22222222-2222-4222-8222-222222222223',
    email: 'jane@example.test',
    detail: trackingDetail('CP-000002'),
  });
  store.addOrder({
    workspaceId: WORKSPACE,
    orderId: '22222222-2222-4222-8222-222222222224',
    email: 'other@example.test',
    detail: trackingDetail('CP-000003'),
  });
  return { store, service, advance: (ms: number) => (nowMs += ms), now: () => nowMs };
}

async function verified(service: TrackingService, store: InMemoryTrackingStore) {
  await service.requestCode({ workspaceId: WORKSPACE, email: EMAIL });
  const code = store.sent.at(-1)?.code ?? '';
  const outcome = await service.verifyCode({ workspaceId: WORKSPACE, email: EMAIL, code });
  if (outcome.status !== 'verified') throw new Error(`not verified: ${outcome.status}`);
  const identity = service.identify(outcome.grant.token, WORKSPACE);
  if (!identity) throw new Error('grant did not identify');
  return { identity, token: outcome.grant.token };
}

describe('TrackingService.requestCode', () => {
  it('sends nothing for an email without orders on this website', async () => {
    const { store, service } = setup();
    await service.requestCode({ workspaceId: WORKSPACE, email: 'nobody@example.test' });
    await service.requestCode({ workspaceId: OTHER_WORKSPACE, email: EMAIL });
    expect(store.sent).toHaveLength(0);
  });

  it('sends one code for an email with orders, normalized to lower case', async () => {
    const { store, service } = setup();
    await service.requestCode({ workspaceId: WORKSPACE, email: EMAIL });
    expect(store.sent).toEqual([
      {
        workspaceId: WORKSPACE,
        email: 'jane@example.test',
        code: expect.stringMatching(/^\d{6}$/),
      },
    ]);
  });

  it('does nothing when no secret is configured', async () => {
    const { store, service } = setup(false);
    expect(service.configured).toBe(false);
    await service.requestCode({ workspaceId: WORKSPACE, email: EMAIL });
    expect(store.sent).toHaveLength(0);
  });
});

describe('TrackingService.verifyCode', () => {
  it('verifies the code once and consumes it', async () => {
    const { store, service } = setup();
    await service.requestCode({ workspaceId: WORKSPACE, email: EMAIL });
    const code = store.sent[0]?.code ?? '';
    expect((await service.verifyCode({ workspaceId: WORKSPACE, email: EMAIL, code })).status).toBe(
      'verified',
    );
    expect((await service.verifyCode({ workspaceId: WORKSPACE, email: EMAIL, code })).status).toBe(
      'not_found',
    );
  });

  it('denies a wrong code and exhausts after five attempts', async () => {
    const { store, service } = setup();
    await service.requestCode({ workspaceId: WORKSPACE, email: EMAIL });
    const real = store.sent[0]?.code ?? '';
    const wrong = real === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i += 1) {
      expect(
        (await service.verifyCode({ workspaceId: WORKSPACE, email: EMAIL, code: wrong })).status,
      ).toBe('invalid');
    }
    expect(
      (await service.verifyCode({ workspaceId: WORKSPACE, email: EMAIL, code: wrong })).status,
    ).toBe('exhausted');
    expect(
      (await service.verifyCode({ workspaceId: WORKSPACE, email: EMAIL, code: real })).status,
    ).toBe('not_found');
  });

  it('denies an expired code', async () => {
    const { store, service, advance } = setup();
    await service.requestCode({ workspaceId: WORKSPACE, email: EMAIL });
    const code = store.sent[0]?.code ?? '';
    advance(10 * 60 * 1_000 + 1);
    expect((await service.verifyCode({ workspaceId: WORKSPACE, email: EMAIL, code })).status).toBe(
      'expired',
    );
  });

  it('never verifies a code for another email or another website', async () => {
    const { store, service } = setup();
    await service.requestCode({ workspaceId: WORKSPACE, email: EMAIL });
    const code = store.sent[0]?.code ?? '';
    expect(
      (await service.verifyCode({ workspaceId: WORKSPACE, email: 'other@example.test', code }))
        .status,
    ).toBe('not_found');
    expect(
      (await service.verifyCode({ workspaceId: OTHER_WORKSPACE, email: EMAIL, code })).status,
    ).toBe('not_found');
  });

  it('invalidates the previous code on resend', async () => {
    const { store, service } = setup();
    await service.requestCode({ workspaceId: WORKSPACE, email: EMAIL });
    const firstCode = store.sent[0]?.code ?? '';
    await service.requestCode({ workspaceId: WORKSPACE, email: EMAIL });
    const secondCode = store.sent[1]?.code ?? '';
    if (firstCode !== secondCode) {
      expect(
        (await service.verifyCode({ workspaceId: WORKSPACE, email: EMAIL, code: firstCode }))
          .status,
      ).toBe('invalid');
    }
    expect(
      (await service.verifyCode({ workspaceId: WORKSPACE, email: EMAIL, code: secondCode })).status,
    ).toBe('verified');
  });

  it('does not verify when no secret is configured', async () => {
    const { service } = setup(false);
    const result = await service.verifyCode({ workspaceId: WORKSPACE, email: EMAIL, code: '1234' });
    expect(result.status).toBe('not_found');
  });
});

describe('TrackingService grant scope', () => {
  it('lists every order of the verified email and none of another email', async () => {
    const { store, service } = setup();
    const { identity } = await verified(service, store);
    const orders = await service.listOrders(identity);
    expect(orders.map((order) => order.reference)).toEqual(['CP-000001', 'CP-000002']);
    expect(await service.order(identity, 'CP-000003')).toBeUndefined();
    expect(await service.orderId(identity, 'CP-000003')).toBeUndefined();
  });

  it('refuses the grant on another website and after it expires', async () => {
    const { store, service, advance } = setup();
    const { token } = await verified(service, store);
    expect(service.identify(token, OTHER_WORKSPACE)).toBeUndefined();
    expect(service.identify(undefined, WORKSPACE)).toBeUndefined();
    advance(30 * 60 * 1_000 + 1);
    expect(service.identify(token, WORKSPACE)).toBeUndefined();
  });

  it('refuses a grant signed with another secret', () => {
    const { service, now } = setup();
    const forged = signTrackingGrant(
      'another-secret-value-that-is-long-enough',
      { workspaceId: WORKSPACE, normalizedEmail: 'jane@example.test' },
      now(),
    );
    expect(service.identify(forged.token, WORKSPACE)).toBeUndefined();
  });

  it('records a customer change only on an order of the verified email', async () => {
    const { store, service } = setup();
    const { identity } = await verified(service, store);
    const base = { actorId: WORKSPACE, requestId: 'req', patch: { contact: { phone: '+1555' } } };
    expect(
      (await service.requestChange(identity, { ...base, reference: 'CP-000003' })).status,
    ).toBe('not_found');
    const created = await service.requestChange(identity, { ...base, reference: 'CP-000001' });
    expect(created).toMatchObject({
      status: 'created',
      changeRequest: { status: 'pending', fields: ['contact.phone'] },
    });
  });

  it('accepts an info-request answer only with exactly the requested fields', async () => {
    const { store, service } = setup();
    const { identity } = await verified(service, store);
    const infoRequestId = '44444444-4444-4444-8444-444444444444';
    store.addInfoRequest('22222222-2222-4222-8222-222222222222', infoRequestId, [
      'form.arrivalDate',
    ]);
    const base = { actorId: WORKSPACE, requestId: 'req', reference: 'CP-000001', infoRequestId };
    expect(
      (await service.requestChange(identity, { ...base, patch: { contact: { phone: '+1' } } }))
        .status,
    ).toBe('fields_mismatch');
    expect(
      (
        await service.requestChange(identity, {
          ...base,
          patch: { form: { arrivalDate: '2026-11-20' } },
        })
      ).status,
    ).toBe('created');
    // Answered: a second answer finds no open request.
    expect(
      (
        await service.requestChange(identity, {
          ...base,
          patch: { form: { arrivalDate: '2026-11-21' } },
        })
      ).status,
    ).toBe('info_request_not_found');
  });
});
