import { describe, expect, it } from 'vitest';

import type { TrackingNotifier, TrackingOtpMessage } from './notifier.js';
import { TrackingService } from './service.js';
import type { ConsumeOutcome, TrackingStatusView, TrackingStore } from './store.js';

const SECRET = 'test-secret-value-that-is-long-enough-32';
const WORKSPACE = '11111111-1111-4111-8111-111111111111';
const ORDER = '22222222-2222-4222-8222-222222222222';
const REFERENCE = 'CP-000123';
const EMAIL = 'Jane@Example.test';

interface Row {
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  status: 'pending' | 'consumed';
}

class MemoryTrackingStore implements TrackingStore {
  readonly orders = new Map<string, { orderId: string; email: string }>();
  readonly rows = new Map<string, Row[]>();
  readonly statuses = new Map<string, TrackingStatusView>();

  private key(workspaceId: string, orderId: string, emailHash: string): string {
    return `${workspaceId}:${orderId}:${emailHash}`;
  }

  async matchOrder(input: {
    workspaceId: string;
    reference: string;
    normalizedEmail: string;
  }): Promise<{ orderId: string } | undefined> {
    const row = this.orders.get(`${input.workspaceId}:${input.reference}`);
    return row && row.email === input.normalizedEmail ? { orderId: row.orderId } : undefined;
  }

  async invalidatePending(input: {
    workspaceId: string;
    orderId: string;
    emailHash: string;
  }): Promise<void> {
    for (const row of this.rows.get(this.key(input.workspaceId, input.orderId, input.emailHash)) ??
      []) {
      if (row.status === 'pending') row.status = 'consumed';
    }
  }

  async createChallenge(input: {
    workspaceId: string;
    orderId: string;
    emailHash: string;
    codeHash: string;
    expiresAt: Date;
  }): Promise<{ challengeId: string }> {
    const key = this.key(input.workspaceId, input.orderId, input.emailHash);
    const list = this.rows.get(key) ?? [];
    list.push({
      codeHash: input.codeHash,
      attempts: 0,
      expiresAt: input.expiresAt,
      status: 'pending',
    });
    this.rows.set(key, list);
    return { challengeId: crypto.randomUUID() };
  }

  async consume(input: {
    workspaceId: string;
    orderId: string;
    emailHash: string;
    candidateCodeHash: string;
    now: Date;
  }): Promise<ConsumeOutcome> {
    const list = (
      this.rows.get(this.key(input.workspaceId, input.orderId, input.emailHash)) ?? []
    ).filter((row) => row.status === 'pending');
    const row = list.at(-1);
    if (!row) return 'not_found';
    if (row.expiresAt.getTime() <= input.now.getTime()) {
      row.status = 'consumed';
      return 'expired';
    }
    if (row.attempts >= 5) {
      row.status = 'consumed';
      return 'exhausted';
    }
    if (row.codeHash !== input.candidateCodeHash) {
      row.attempts += 1;
      return 'invalid';
    }
    row.status = 'consumed';
    return 'verified';
  }

  async status(input: {
    workspaceId: string;
    orderId: string;
  }): Promise<TrackingStatusView | undefined> {
    return this.statuses.get(`${input.workspaceId}:${input.orderId}`);
  }
}

class RecordingNotifier implements TrackingNotifier {
  readonly sent: TrackingOtpMessage[] = [];
  async send(message: TrackingOtpMessage): Promise<void> {
    this.sent.push({ ...message });
  }
}

function setup(configured = true) {
  const store = new MemoryTrackingStore();
  const notifier = new RecordingNotifier();
  let nowMs = Date.parse('2026-09-20T12:00:00.000Z');
  const service = new TrackingService({
    store,
    notifier,
    secret: configured ? SECRET : undefined,
    now: () => new Date(nowMs),
  });
  store.orders.set(`${WORKSPACE}:${REFERENCE}`, { orderId: ORDER, email: 'jane@example.test' });
  return { store, notifier, service, advance: (ms: number) => (nowMs += ms) };
}

describe('TrackingService.requestCode', () => {
  it('sends nothing for an unknown reference or a mismatched email', async () => {
    const { notifier, service } = setup();
    await service.requestCode({ workspaceId: WORKSPACE, email: EMAIL, orderReference: 'CP-NOPE' });
    await service.requestCode({
      workspaceId: WORKSPACE,
      email: 'other@example.test',
      orderReference: REFERENCE,
    });
    expect(notifier.sent).toHaveLength(0);
  });

  it('sends one code for a matching order, normalized to lower case', async () => {
    const { notifier, service } = setup();
    await service.requestCode({ workspaceId: WORKSPACE, email: EMAIL, orderReference: REFERENCE });
    expect(notifier.sent).toHaveLength(1);
    expect(notifier.sent[0]).toMatchObject({
      workspaceId: WORKSPACE,
      email: 'jane@example.test',
      reference: REFERENCE,
    });
    expect(notifier.sent[0]?.code).toMatch(/^\d{6}$/);
  });

  it('does nothing when no secret is configured', async () => {
    const { notifier, service } = setup(false);
    expect(service.configured).toBe(false);
    await service.requestCode({ workspaceId: WORKSPACE, email: EMAIL, orderReference: REFERENCE });
    expect(notifier.sent).toHaveLength(0);
  });
});

describe('TrackingService.verifyCode', () => {
  it('verifies the code once and consumes it', async () => {
    const { notifier, service } = setup();
    await service.requestCode({ workspaceId: WORKSPACE, email: EMAIL, orderReference: REFERENCE });
    const code = notifier.sent[0]?.code ?? '';

    const first = await service.verifyCode({
      workspaceId: WORKSPACE,
      email: EMAIL,
      orderReference: REFERENCE,
      code,
    });
    expect(first.status).toBe('verified');
    // A second verification of the same consumed code is denied.
    const second = await service.verifyCode({
      workspaceId: WORKSPACE,
      email: EMAIL,
      orderReference: REFERENCE,
      code,
    });
    expect(second.status).toBe('not_found');
  });

  it('denies a wrong code and exhausts after five attempts', async () => {
    const { notifier, service } = setup();
    await service.requestCode({ workspaceId: WORKSPACE, email: EMAIL, orderReference: REFERENCE });
    const real = notifier.sent[0]?.code ?? '';
    const wrong = real === '000000' ? '111111' : '000000';

    for (let i = 0; i < 5; i += 1) {
      expect(
        (
          await service.verifyCode({
            workspaceId: WORKSPACE,
            email: EMAIL,
            orderReference: REFERENCE,
            code: wrong,
          })
        ).status,
      ).toBe('invalid');
    }
    expect(
      (
        await service.verifyCode({
          workspaceId: WORKSPACE,
          email: EMAIL,
          orderReference: REFERENCE,
          code: wrong,
        })
      ).status,
    ).toBe('exhausted');
    // The real code no longer works once the challenge is exhausted.
    expect(
      (
        await service.verifyCode({
          workspaceId: WORKSPACE,
          email: EMAIL,
          orderReference: REFERENCE,
          code: real,
        })
      ).status,
    ).toBe('not_found');
  });

  it('denies an expired code', async () => {
    const { notifier, service, advance } = setup();
    await service.requestCode({ workspaceId: WORKSPACE, email: EMAIL, orderReference: REFERENCE });
    const code = notifier.sent[0]?.code ?? '';
    advance(10 * 60 * 1_000 + 1);
    expect(
      (
        await service.verifyCode({
          workspaceId: WORKSPACE,
          email: EMAIL,
          orderReference: REFERENCE,
          code,
        })
      ).status,
    ).toBe('expired');
  });

  it('invalidates the previous code on resend', async () => {
    const { notifier, service } = setup();
    await service.requestCode({ workspaceId: WORKSPACE, email: EMAIL, orderReference: REFERENCE });
    const firstCode = notifier.sent[0]?.code ?? '';
    await service.requestCode({ workspaceId: WORKSPACE, email: EMAIL, orderReference: REFERENCE });
    const secondCode = notifier.sent[1]?.code ?? '';

    if (firstCode !== secondCode) {
      expect(
        (
          await service.verifyCode({
            workspaceId: WORKSPACE,
            email: EMAIL,
            orderReference: REFERENCE,
            code: firstCode,
          })
        ).status,
      ).toBe('invalid');
    }
    expect(
      (
        await service.verifyCode({
          workspaceId: WORKSPACE,
          email: EMAIL,
          orderReference: REFERENCE,
          code: secondCode,
        })
      ).status,
    ).toBe('verified');
  });

  it('does not verify when no secret is configured', async () => {
    const { service } = setup(false);
    const result = await service.verifyCode({
      workspaceId: WORKSPACE,
      email: EMAIL,
      orderReference: REFERENCE,
      code: '123456',
    });
    expect(result.status).toBe('not_found');
  });
});
