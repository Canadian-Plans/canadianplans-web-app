import postgres from 'postgres';
import { z } from 'zod';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createDatabaseClient, type DatabaseClient } from '@canadian-plans/db';
import { applyMigrations } from '@canadian-plans/db/migrations';
import { FakeEmailAdapter } from '@canadian-plans/adapters';
import { JobHandlerError, OutboxRunner } from '@canadian-plans/jobs';
import { DatabaseOutboxStore } from '../src/jobs/store.js';
import { DatabaseEmailStore } from '../src/email/store.js';
import { hashContact } from '../src/email/hash.js';
import { TrackingService } from '../src/tracking/service.js';
import { openTrackingCode, sealTrackingCode } from '../src/tracking/cipher.js';
import { createTrackingOtpHandler } from '../src/tracking/delivery.js';
import { TEST_RUNTIME_PASSWORD, setTestRuntimePassword } from '@canadian-plans/db/test-helpers';

import { codeBindingHash, emailBindingHash } from '../src/tracking/secrets.js';
import { DatabaseTrackingStore } from '../src/tracking/store.js';
import { DatabaseDocumentStore } from '../src/documents/store.js';

function disposableDatabaseUrl(): string | undefined {
  const url = process.env.TEST_MIGRATION_DATABASE_URL;
  const allowed = process.env.DB_TEST_ALLOW_DESTRUCTIVE === '1';
  if (!url && !allowed) return undefined;
  if (!url || !allowed) throw new Error('Both disposable database test settings are required.');
  return url;
}

const databaseUrl = disposableDatabaseUrl();
const databaseTest = databaseUrl ? describe : describe.skip;

const WORKSPACE = '14000000-0000-4000-8000-000000000e01';
const ACTOR = '24000000-0000-4000-8000-000000000e01';
const LEAD = '54000000-0000-4000-8000-000000000e01';
const ORDER = '64000000-0000-4000-8000-000000000e01';
const REFERENCE = 'CP-TRACK01';
const EMAIL = 'jane@example.test';

databaseTest('DatabaseTrackingStore (T22)', () => {
  let admin: ReturnType<typeof postgres>;
  let database: DatabaseClient;

  beforeAll(async () => {
    if (!databaseUrl || !decodeURIComponent(new URL(databaseUrl).pathname).endsWith('_test'))
      throw new Error('disposable _test database URL missing');
    await applyMigrations({ connectionString: databaseUrl, ssl: false });
    admin = postgres(databaseUrl, { max: 1, prepare: false, ssl: false });
    await setTestRuntimePassword(admin);
    await admin`
      insert into app.workspaces (id, slug, name)
      values (${WORKSPACE}, 'ci-tracking-workspace', 'CI Tracking Workspace')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.leads (id, workspace_id, status, consent_version, email)
      values (${LEAD}, ${WORKSPACE}, 'submitted', 'terms-1', ${EMAIL})
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.orders (id, workspace_id, reference, lead_id, status, payment_state, delivery_state, snapshot, payload, submitted_at)
      values (${ORDER}, ${WORKSPACE}, ${REFERENCE}, ${LEAD}, 'dispatched', 'paid', 'dispatched',
        ${admin.json({ documentChecklist: ['passport'] })}, '{}'::jsonb, now())
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.dispatch_records (workspace_id, order_id, actor_id, courier, tracking_reference, dispatched_at)
      values (${WORKSPACE}, ${ORDER}, ${ACTOR}, 'TEST Courier', 'TRACK-9', now())
    `;

    const runtimeUrl = new URL(databaseUrl);
    runtimeUrl.username = 'app_runtime';
    runtimeUrl.password = TEST_RUNTIME_PASSWORD;
    database = createDatabaseClient({
      connectionString: runtimeUrl.toString(),
      maxConnections: 1,
      ssl: false,
    });
  });

  afterAll(async () => {
    await database.close();
    await admin.end();
  });

  test('matches, consumes once, and returns a PII-free status', async () => {
    const store = new DatabaseTrackingStore(database);
    const secret = 'tracking-store-integration-secret-32-chars';

    const match = await store.matchOrder({
      workspaceId: WORKSPACE,
      reference: REFERENCE,
      normalizedEmail: EMAIL,
    });
    expect(match?.orderId).toBe(ORDER);

    const emailHash = emailBindingHash(secret, WORKSPACE, ORDER, EMAIL);
    await store.createChallenge({
      workspaceId: WORKSPACE,
      orderId: ORDER,
      emailHash,
      codeHash: codeBindingHash(secret, WORKSPACE, ORDER, EMAIL, '123456'),
      expiresAt: new Date(Date.now() + 10 * 60_000),
    });

    const wrong = await store.consume({
      workspaceId: WORKSPACE,
      orderId: ORDER,
      emailHash,
      candidateCodeHash: codeBindingHash(secret, WORKSPACE, ORDER, EMAIL, '000000'),
      now: new Date(),
    });
    expect(wrong).toBe('invalid');

    const ok = await store.consume({
      workspaceId: WORKSPACE,
      orderId: ORDER,
      emailHash,
      candidateCodeHash: codeBindingHash(secret, WORKSPACE, ORDER, EMAIL, '123456'),
      now: new Date(),
    });
    expect(ok).toBe('verified');

    // A second consumption of the same challenge is denied.
    const again = await store.consume({
      workspaceId: WORKSPACE,
      orderId: ORDER,
      emailHash,
      candidateCodeHash: codeBindingHash(secret, WORKSPACE, ORDER, EMAIL, '123456'),
      now: new Date(),
    });
    expect(again).toBe('not_found');

    // The challenge stores hashes, never the plaintext code.
    const rows = await admin<{ code_hash: string; email_hash: string }[]>`
      select code_hash, email_hash from app.tracking_challenges where workspace_id = ${WORKSPACE} and order_id = ${ORDER}
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.code_hash).not.toContain('123456');
    expect(rows[0]?.email_hash).not.toContain(EMAIL);

    const status = await store.status({ workspaceId: WORKSPACE, orderId: ORDER });
    expect(status).toMatchObject({
      reference: REFERENCE,
      fulfilmentStatus: 'dispatched',
      trackingReference: 'TRACK-9',
      documentsRequired: ['passport'],
    });
    expect(JSON.stringify(status)).not.toContain(EMAIL);
  });

  test('reports only outstanding documents using the latest review of linked lead uploads', async () => {
    const documents = new DatabaseDocumentStore(database);
    const tracking = new DatabaseTrackingStore(database);
    const file = await documents.createIntent({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: crypto.randomUUID(),
      recordType: 'lead',
      recordId: LEAD,
      documentType: 'passport',
      bucket: 'test-bucket',
      stagingKey: `staging/${crypto.randomUUID()}`,
      declaredContentType: 'application/pdf',
      declaredSizeBytes: 8,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const candidateKey = `candidate/${crypto.randomUUID()}`;
    await documents.claimForVerification({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      fileId: file.id,
      candidateKey,
      now: new Date(),
    });
    await documents.attachVerified({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: crypto.randomUUID(),
      fileId: file.id,
      candidateKey,
      objectKey: candidateKey,
      detectedMime: 'application/pdf',
      sizeBytes: 8,
      checksumSha256: 'a'.repeat(64),
    });
    expect(
      (await tracking.status({ workspaceId: WORKSPACE, orderId: ORDER }))?.documentsRequired,
    ).toEqual(['passport']);
    await documents.recordReview({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: crypto.randomUUID(),
      fileId: file.id,
      decision: 'approved',
    });
    expect(
      (await tracking.status({ workspaceId: WORKSPACE, orderId: ORDER }))?.documentsRequired,
    ).toEqual([]);
    await documents.recordReview({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: crypto.randomUUID(),
      fileId: file.id,
      decision: 'rejected',
    });
    expect(
      (await tracking.status({ workspaceId: WORKSPACE, orderId: ORDER }))?.documentsRequired,
    ).toEqual(['passport']);
  });
  const SECRET = 'tracking-outbox-integration-secret-32-chars';
  const CONTACT_SECRET = 'tracking-contact-integration-secret';
  function queueInput(code = '654321') {
    const binding = { workspaceId: WORKSPACE, orderId: ORDER, challengeId: crypto.randomUUID() };
    return {
      ...binding,
      normalizedEmail: EMAIL,
      emailHash: emailBindingHash(SECRET, WORKSPACE, ORDER, EMAIL),
      codeHash: codeBindingHash(SECRET, WORKSPACE, ORDER, EMAIL, code),
      sealedCode: sealTrackingCode(SECRET, binding, code),
      contactHash: hashContact(EMAIL, CONTACT_SECRET),
      now: new Date(),
      expiresAt: new Date(Date.now() + 600_000),
    };
  }
  function delivery(store: DatabaseTrackingStore, email: FakeEmailAdapter, now?: () => Date) {
    const emailStore = new DatabaseEmailStore(database);
    return createTrackingOtpHandler({
      email,
      store,
      eligibility: emailStore,
      secret: SECRET,
      contactHashSecret: () => CONTACT_SECRET,
      now,
      delivery: {
        prepare: (input) =>
          emailStore.prepareDelivery({ ...input, provider: 'fake', providerAccount: 'fake' }),
        recordResult: (input) => emailStore.recordDeliveryResult(input),
      },
    });
  }
  test('queues an encrypted code atomically, delivers through the outbox, verifies once, and scrubs the sent payload', async () => {
    const store = new DatabaseTrackingStore(database);
    const service = new TrackingService({
      store,
      secret: SECRET,
      contactHashSecret: () => CONTACT_SECRET,
    });
    await service.requestCode({
      workspaceId: WORKSPACE,
      email: 'wrong@example.test',
      orderReference: REFERENCE,
    });
    expect(
      await admin`select id from app.outbox_jobs where workspace_id = ${WORKSPACE} and job_type = 'tracking_otp_email'`,
    ).toHaveLength(0);
    await service.requestCode({ workspaceId: WORKSPACE, email: EMAIL, orderReference: REFERENCE });
    const rows = await admin<
      { id: string; payload: { orderId: string; challengeId: string; sealedCode: string } }[]
    >`select id, payload from app.outbox_jobs where workspace_id = ${WORKSPACE} and job_type = 'tracking_otp_email'`;
    expect(rows).toHaveLength(1);
    const payload = rows[0]!.payload;
    expect(payload).not.toHaveProperty('code');
    const code = openTrackingCode(
      SECRET,
      { workspaceId: WORKSPACE, ...payload },
      payload.sealedCode,
    );
    expect(code).toMatch(/^\d{6}$/);
    const email = new FakeEmailAdapter();
    const runner = new OutboxRunner({
      store: new DatabaseOutboxStore(database),
      handlers: new Map([['tracking_otp_email', delivery(store, email)]]),
    });
    expect(await runner.run({ authorizedWorkspaceIds: [WORKSPACE], actorId: ACTOR })).toMatchObject(
      { completed: 1, failed: 0 },
    );
    expect(email.deliveries[0]).toMatchObject({
      template: 'tracking_otp',
      toAddress: EMAIL,
      variables: { code },
    });
    expect(
      (await admin`select payload from app.outbox_jobs where id = ${rows[0]!.id}`)[0]!.payload,
    ).toEqual({ orderId: ORDER, challengeId: payload.challengeId });
    expect(
      (
        await service.verifyCode({
          workspaceId: WORKSPACE,
          email: EMAIL,
          orderReference: REFERENCE,
          code: code!,
        })
      ).status,
    ).toBe('verified');
    expect(
      (
        await service.verifyCode({
          workspaceId: WORKSPACE,
          email: EMAIL,
          orderReference: REFERENCE,
          code: code!,
        })
      ).status,
    ).toBe('not_found');
  });
  test('scrubs a failed delivery payload and completes a later staff retry without sending', async () => {
    const store = new DatabaseTrackingStore(database);
    const input = queueInput();
    await store.createChallengeAndQueue(input);
    const outbox = new DatabaseOutboxStore(database);
    expect(
      await new OutboxRunner({
        store: outbox,
        handlers: new Map([
          [
            'tracking_otp_email',
            async () => {
              throw new JobHandlerError('provider_rejected', false);
            },
          ],
        ]),
      }).run({ authorizedWorkspaceIds: [WORKSPACE], actorId: ACTOR }),
    ).toMatchObject({ failed: 1 });
    const [job] = await admin<
      { id: string; status: string; payload: Record<string, unknown> }[]
    >`select id, status, payload from app.outbox_jobs where workspace_id = ${WORKSPACE} and job_type = 'tracking_otp_email' and dedupe_key = ${input.challengeId}`;
    expect(job!.status).toBe('failed');
    expect(Object.keys(job!.payload).sort()).toEqual(['challengeId', 'orderId']);

    expect(
      await outbox.retry({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        jobId: job!.id,
        requestId: crypto.randomUUID(),
      }),
    ).toBe('retried');
    const email = new FakeEmailAdapter();
    expect(
      await new OutboxRunner({
        store: outbox,
        handlers: new Map([['tracking_otp_email', delivery(store, email)]]),
      }).run({ authorizedWorkspaceIds: [WORKSPACE], actorId: ACTOR }),
    ).toMatchObject({ completed: 1, failed: 0 });
    expect(email.deliveries).toHaveLength(0);
  });
  test('serializes concurrent resends so only one pending challenge and email survive', async () => {
    const store = new DatabaseTrackingStore(database);
    const first = queueInput('123456'),
      second = queueInput('654321');
    await Promise.all([
      store.createChallengeAndQueue(first),
      store.createChallengeAndQueue(second),
    ]);
    const pending = await admin<
      { id: string }[]
    >`select id from app.tracking_challenges where workspace_id = ${WORKSPACE} and order_id = ${ORDER} and status = 'pending'`;
    expect(pending).toHaveLength(1);
    expect(
      await admin`select id from app.outbox_jobs where workspace_id = ${WORKSPACE} and job_type = 'tracking_otp_email' and status = 'pending'`,
    ).toHaveLength(1);
    const email = new FakeEmailAdapter();
    await new OutboxRunner({
      store: new DatabaseOutboxStore(database),
      handlers: new Map([['tracking_otp_email', delivery(store, email)]]),
    }).run({ authorizedWorkspaceIds: [WORKSPACE], actorId: ACTOR });
    expect(email.deliveries).toHaveLength(1);
    expect(email.deliveries[0]!.variables?.code).toBe(
      pending[0]!.id === first.challengeId ? '123456' : '654321',
    );
  });
  test('rolls back challenge invalidation when queue persistence fails', async () => {
    const store = new DatabaseTrackingStore(database);
    const previous = queueInput();
    await store.createChallengeAndQueue(previous);
    const replacement = queueInput('111111');
    const failing = new DatabaseTrackingStore({
      withTenantTx: (context, fn) =>
        database.withTenantTx(context, async (tx) => {
          await fn(tx);
          throw new Error('simulated_commit_failure');
        }),
    });
    await expect(failing.createChallengeAndQueue(replacement)).rejects.toThrow(
      'simulated_commit_failure',
    );
    expect(
      await admin`select id from app.tracking_challenges where id = ${replacement.challengeId}`,
    ).toHaveLength(0);
    expect(
      await admin`select id from app.outbox_jobs where workspace_id = ${WORKSPACE} and dedupe_key = ${replacement.challengeId}`,
    ).toHaveLength(0);
    expect(
      (
        await admin`select status from app.tracking_challenges where id = ${previous.challengeId}`
      )[0]!.status,
    ).toBe('pending');
  });
  test('skips expired, superseded, cross-tenant, changed-recipient and tampered deliveries', async () => {
    const store = new DatabaseTrackingStore(database);
    const first = queueInput();
    await store.createChallengeAndQueue(first);
    const oldJobs = await new DatabaseOutboxStore(database).claim({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      leaseOwnerId: crypto.randomUUID(),
      limit: 20,
      now: new Date(),
      leaseExpiresAt: new Date(Date.now() + 60000),
      maxAttempts: 8,
    });
    const job = oldJobs.find(
      (entry) =>
        z.object({ challengeId: z.string().optional() }).safeParse(entry.payload).data
          ?.challengeId === first.challengeId,
    )!;
    expect(job).toBeDefined();
    const email = new FakeEmailAdapter();
    const handle = delivery(store, email);
    const scoped = { ...job, actorId: ACTOR };
    expect(
      await delivery(store, email, () => new Date(first.expiresAt.getTime() + 1))(scoped),
    ).toMatchObject({ providerId: 'skipped:tracking_challenge_inactive' });
    expect(
      await handle({ ...scoped, workspaceId: '14000000-0000-4000-8000-000000000e02' }),
    ).toMatchObject({ providerId: 'skipped:tracking_challenge_inactive' });
    expect(
      await handle({
        ...scoped,
        payload: { ...z.record(z.string(), z.unknown()).parse(job.payload), sealedCode: 'bad' },
      }),
    ).toMatchObject({ providerId: 'skipped:tracking_challenge_inactive' });
    await admin`update app.leads set email = 'changed@example.test' where id = ${LEAD}`;
    expect(await handle(scoped)).toMatchObject({
      providerId: 'skipped:tracking_challenge_inactive',
    });
    await admin`update app.leads set email = ${EMAIL} where id = ${LEAD}`;
    await store.createChallengeAndQueue(queueInput('999999'));
    expect(await handle(scoped)).toMatchObject({
      providerId: 'skipped:tracking_challenge_inactive',
    });
    expect(email.deliveries).toHaveLength(0);
  });
});
