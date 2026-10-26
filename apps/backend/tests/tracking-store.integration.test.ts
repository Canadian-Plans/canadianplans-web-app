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
import { DatabaseOrderQueryStore } from '../src/orders/query-store.js';
import { DatabaseStaffOrderActionStore } from '../src/orders/staff-actions.js';

function disposableDatabaseUrl(): string | undefined {
  const url = process.env.TEST_MIGRATION_DATABASE_URL;
  const allowed = process.env.DB_TEST_ALLOW_DESTRUCTIVE === '1';
  if (!url && !allowed && !process.env.CI) return undefined;
  if (!url || !allowed) throw new Error('Both disposable database test settings are required.');
  return url;
}

const databaseUrl = disposableDatabaseUrl();
const databaseTest = databaseUrl ? describe : describe.skip;

const WORKSPACE = '14000000-0000-4000-8000-000000000e01';
const OTHER_WORKSPACE = '14000000-0000-4000-8000-000000000e02';
const ACTOR = '24000000-0000-4000-8000-000000000e01';
const CREDENTIAL = '84000000-0000-4000-8000-000000000e01';
const JANE_LEAD = '54000000-0000-4000-8000-000000000e01';
const BOB_LEAD = '54000000-0000-4000-8000-000000000e02';
const FOREIGN_LEAD = '54000000-0000-4000-8000-000000000e03';
const GONE_LEAD = '54000000-0000-4000-8000-000000000e04';
const JANE_OLDER_LEAD = '54000000-0000-4000-8000-000000000e05';
const JANE_ORDER = '64000000-0000-4000-8000-000000000e01';
const JANE_OLDER_ORDER = '64000000-0000-4000-8000-000000000e02';
const BOB_ORDER = '64000000-0000-4000-8000-000000000e03';
const FOREIGN_ORDER = '64000000-0000-4000-8000-000000000e04';
const GONE_ORDER = '64000000-0000-4000-8000-000000000e05';
const EMAIL = 'jane@example.test';
const SECRET = 'tracking-outbox-integration-secret-32-chars';
const CONTACT_SECRET = 'tracking-contact-integration-secret';

const snapshot = {
  quoteId: '74000000-0000-4000-8000-000000000e01',
  productId: '74000000-0000-4000-8000-000000000e02',
  offerVersionId: '74000000-0000-4000-8000-000000000e03',
  offer: {
    productKey: 'pre-arrival-esim',
    productTitle: 'Pre-arrival eSIM',
    productType: 'sim',
    regions: ['CA'],
    offerName: 'Rogers 100 GB',
    currency: 'CAD',
    recurringChargeAmountMinor: 4000,
    oneTimeFees: [],
    amountPayableTodayMinor: 0,
    paymentRequired: false,
    documentChecklist: ['passport'],
    eligibility: 'New arrivals',
    availability: 'Canada',
    billingParty: 'Rogers',
    contractTerms: [{ _type: 'block', children: [] }],
    termsVersion: 'terms-1',
    specs: { carrier: 'Rogers', dataAllowance: '100 GB' },
  },
  currency: 'CAD',
  charges: [],
  total: { amountMinor: 4000, currency: 'CAD' },
  amountPayableToday: { amountMinor: 0, currency: 'CAD' },
  paymentRequired: false,
  documentChecklist: ['passport'],
  termsVersion: 'terms-1',
};

databaseTest('DatabaseTrackingStore (email-only tracking)', () => {
  let admin: ReturnType<typeof postgres>;
  let database: DatabaseClient;

  async function seedOrder(input: {
    workspaceId: string;
    leadId: string;
    orderId: string;
    reference: string;
    email: string;
    submittedAt: string;
  }) {
    await admin`
      insert into app.leads (id, workspace_id, status, consent_version, email, full_name)
      values (${input.leadId}, ${input.workspaceId}, 'submitted', 'terms-1', ${input.email}, 'Synthetic Customer')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.orders (id, workspace_id, reference, lead_id, status, payment_state, delivery_state, snapshot, payload, submitted_at)
      values (${input.orderId}, ${input.workspaceId}, ${input.reference}, ${input.leadId}, 'in_progress', 'not_required', 'none',
        ${admin.json(snapshot)},
        ${admin.json({ schemaVersion: 1, payload: { category: 'sim', currentCountry: 'India', destination: 'Toronto', arrivalDate: '2026-11-14' } })},
        ${input.submittedAt})
      on conflict (id) do nothing
    `;
  }

  beforeAll(async () => {
    if (!databaseUrl || !decodeURIComponent(new URL(databaseUrl).pathname).endsWith('_test'))
      throw new Error('disposable _test database URL missing');
    await applyMigrations({ connectionString: databaseUrl, ssl: false });
    admin = postgres(databaseUrl, { max: 1, prepare: false, ssl: false });
    await setTestRuntimePassword(admin);
    for (const [id, slug] of [
      [WORKSPACE, 'ci-tracking-workspace'],
      [OTHER_WORKSPACE, 'ci-tracking-other-brand'],
    ] as const) {
      await admin`
        insert into app.workspaces (id, slug, name) values (${id}, ${slug}, ${slug})
        on conflict (id) do nothing
      `;
    }
    await seedOrder({
      workspaceId: WORKSPACE,
      leadId: JANE_LEAD,
      orderId: JANE_ORDER,
      reference: 'CP-TRACK01',
      email: EMAIL,
      submittedAt: '2026-10-20T10:00:00.000Z',
    });
    // A second order of the same email (its own lead: one order per lead).
    await seedOrder({
      workspaceId: WORKSPACE,
      leadId: JANE_OLDER_LEAD,
      orderId: JANE_OLDER_ORDER,
      reference: 'CP-TRACK00',
      email: EMAIL,
      submittedAt: '2026-10-01T10:00:00.000Z',
    });
    await seedOrder({
      workspaceId: WORKSPACE,
      leadId: BOB_LEAD,
      orderId: BOB_ORDER,
      reference: 'CP-TRACK02',
      email: 'bob@example.test',
      submittedAt: '2026-10-21T10:00:00.000Z',
    });
    // The same email on another website (brand) must never appear here.
    await seedOrder({
      workspaceId: OTHER_WORKSPACE,
      leadId: FOREIGN_LEAD,
      orderId: FOREIGN_ORDER,
      reference: 'CP-TRACK03',
      email: EMAIL,
      submittedAt: '2026-10-22T10:00:00.000Z',
    });
    await seedOrder({
      workspaceId: WORKSPACE,
      leadId: GONE_LEAD,
      orderId: GONE_ORDER,
      reference: 'CP-TRACK04',
      email: 'gone@example.test',
      submittedAt: '2026-10-22T10:00:00.000Z',
    });
    await admin`update app.orders set customer_data_restricted_at = now() where id = ${GONE_ORDER}`;
    await admin`
      insert into app.dispatch_records (workspace_id, order_id, actor_id, courier, tracking_reference, dispatched_at)
      values (${WORKSPACE}, ${JANE_ORDER}, ${ACTOR}, 'TEST Courier', 'TRACK-9', now())
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

  const identity = (workspaceId = WORKSPACE, normalizedEmail = EMAIL) => ({
    workspaceId,
    normalizedEmail,
  });

  test('a code exists only for an email with active orders and verifies once', async () => {
    const store = new DatabaseTrackingStore(database);
    expect(await store.hasActiveOrders(identity())).toBe(true);
    expect(await store.hasActiveOrders(identity(WORKSPACE, 'nobody@example.test'))).toBe(false);
    // A restricted (deleted-customer) order no longer counts.
    expect(await store.hasActiveOrders(identity(WORKSPACE, 'gone@example.test'))).toBe(false);

    const input = queueInput('123456');
    await store.createChallengeAndQueue(input);
    const consume = (code: string) =>
      store.consume({
        workspaceId: WORKSPACE,
        normalizedEmail: EMAIL,
        emailHash: input.emailHash,
        candidateCodeHash: codeBindingHash(SECRET, WORKSPACE, EMAIL, code),
        now: new Date(),
      });
    expect(await consume('000000')).toBe('invalid');
    expect(await consume('123456')).toBe('verified');
    expect(await consume('123456')).toBe('not_found');

    // The challenge stores hashes, never the plaintext code or email, and no order.
    const rows = await admin<{ code_hash: string; email_hash: string; order_id: string | null }[]>`
      select code_hash, email_hash, order_id from app.tracking_challenges where id = ${input.challengeId}
    `;
    expect(rows).toEqual([
      {
        code_hash: expect.not.stringContaining('123456'),
        email_hash: input.emailHash,
        order_id: null,
      },
    ]);
    expect(rows[0]!.email_hash).not.toContain(EMAIL);
  });

  test('lists the email’s orders on this website only, newest first', async () => {
    const store = new DatabaseTrackingStore(database);
    expect((await store.listOrders(identity())).map((order) => order.reference)).toEqual([
      'CP-TRACK01',
      'CP-TRACK00',
    ]);
    expect((await store.listOrders(identity(OTHER_WORKSPACE))).map((o) => o.reference)).toEqual([
      'CP-TRACK03',
    ]);
    expect(await store.listOrders(identity(WORKSPACE, 'gone@example.test'))).toEqual([]);
  });

  test('shows one order’s customer view and hides other emails’ and brands’ orders', async () => {
    const store = new DatabaseTrackingStore(database);
    const detail = await store.orderDetail({ ...identity(), reference: 'CP-TRACK01' });
    expect(detail).toMatchObject({
      reference: 'CP-TRACK01',
      productTitle: 'Pre-arrival eSIM',
      fulfilmentStatus: 'in_progress',
      paymentState: 'not_required',
      deliveryState: 'none',
      trackingReference: 'TRACK-9',
      price: { recurring: { amountMinor: 4000, currency: 'CAD' }, paymentRequired: false },
      customer: { email: EMAIL, fullName: 'Synthetic Customer' },
      details: { currentCountry: 'India', destination: 'Toronto', arrivalDate: '2026-11-14' },
      documentChecklist: ['passport'],
      documentsRequired: ['passport'],
      actionNeeded: true,
    });
    for (const [scope, reference] of [
      [identity(), 'CP-TRACK02'],
      [identity(), 'CP-TRACK03'],
      [identity(WORKSPACE, 'gone@example.test'), 'CP-TRACK04'],
      [identity(OTHER_WORKSPACE), 'CP-TRACK01'],
    ] as const) {
      expect(await store.orderDetail({ ...scope, reference })).toBeUndefined();
      expect(await store.orderId({ ...scope, reference })).toBeUndefined();
    }
  });

  test('reports documents by latest review, including uploads made on the order itself', async () => {
    const documents = new DatabaseDocumentStore(database);
    const tracking = new DatabaseTrackingStore(database);
    async function attach(recordType: 'lead' | 'order', recordId: string) {
      const file = await documents.createIntent({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        requestId: crypto.randomUUID(),
        recordType,
        recordId,
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
      return file.id;
    }
    const review = (fileId: string, decision: 'approved' | 'rejected') =>
      documents.recordReview({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        requestId: crypto.randomUUID(),
        fileId,
        decision,
      });
    const view = () => tracking.orderDetail({ ...identity(), reference: 'CP-TRACK01' });

    const leadFile = await attach('lead', JANE_LEAD);
    expect((await view())?.documents).toEqual([
      expect.objectContaining({ id: leadFile, status: 'received' }),
    ]);
    expect((await view())?.documentsRequired).toEqual(['passport']);
    await review(leadFile, 'rejected');
    expect((await view())?.documents).toEqual([
      expect.objectContaining({ id: leadFile, status: 'needs_replacement' }),
    ]);
    // The replacement arrives through tracking, on the order.
    const orderFile = await attach('order', JANE_ORDER);
    expect((await view())?.documents.map((d) => [d.id, d.status])).toEqual([
      [orderFile, 'received'],
    ]);
    await review(orderFile, 'approved');
    expect((await view())?.documentsRequired).toEqual([]);
    expect((await view())?.actionNeeded).toBe(false);
  });

  test('a customer change lands in staff Change requests and approval amends the details', async () => {
    const tracking = new DatabaseTrackingStore(database);
    const staff = new DatabaseStaffOrderActionStore(database);
    const query = new DatabaseOrderQueryStore(database);
    const created = await tracking.createCustomerChange({
      ...identity(),
      actorId: CREDENTIAL,
      requestId: crypto.randomUUID(),
      reference: 'CP-TRACK01',
      patch: { form: { destination: 'Vancouver' } },
      note: 'Moving west',
      now: new Date(),
    });
    expect(created).toMatchObject({
      status: 'created',
      changeRequest: { status: 'pending', fields: ['form.destination'] },
    });
    if (created.status !== 'created') throw new Error('not created');
    // Another email cannot raise one on this order.
    expect(
      await tracking.createCustomerChange({
        ...identity(WORKSPACE, 'bob@example.test'),
        actorId: CREDENTIAL,
        requestId: crypto.randomUUID(),
        reference: 'CP-TRACK01',
        patch: { form: { destination: 'Calgary' } },
        now: new Date(),
      }),
    ).toEqual({ status: 'not_found' });

    const before = await query.getOrder(WORKSPACE, ACTOR, JANE_ORDER);
    const change = before?.changeRequests.find((row) => row.id === created.changeRequest.id);
    expect(change).toMatchObject({ origin: 'customer', status: 'pending', note: 'Moving west' });
    const [audit] = await admin<{ actor_label: string; after: Record<string, unknown> }[]>`
      select actor_label, after from app.audit_events
      where workspace_id = ${WORKSPACE} and entity_id = ${JANE_ORDER} and action = 'order.change_request_created'
      order by created_at desc limit 1
    `;
    expect(audit).toMatchObject({ actor_label: 'website credential' });
    expect(JSON.stringify(audit!.after)).not.toContain('Vancouver');

    expect(
      await staff.resolveChangeRequest({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        requestId: crypto.randomUUID(),
        orderId: JANE_ORDER,
        changeRequestId: created.changeRequest.id,
        decision: 'approve',
        expectedVersion: before!.recordVersion,
      }),
    ).toEqual({ status: 'updated' });
    // The frozen payload is untouched; the customer sees the amended value.
    const [order] = await admin<{ payload: { payload: { destination: string } } }[]>`
      select payload from app.orders where id = ${JANE_ORDER}
    `;
    expect(order!.payload.payload.destination).toBe('Toronto');
    expect(
      (await tracking.orderDetail({ ...identity(), reference: 'CP-TRACK01' }))?.details.destination,
    ).toBe('Vancouver');
  });

  test('caps open customer changes per order', async () => {
    const tracking = new DatabaseTrackingStore(database);
    const raise = () =>
      tracking.createCustomerChange({
        ...identity(),
        actorId: CREDENTIAL,
        requestId: crypto.randomUUID(),
        reference: 'CP-TRACK00',
        patch: { contact: { phone: '+15550100' } },
        now: new Date(),
      });
    for (let i = 0; i < 3; i += 1) expect((await raise()).status).toBe('created');
    expect(await raise()).toEqual({ status: 'too_many_pending' });
  });

  test('answers a staff info request with exactly its fields, linked for staff', async () => {
    const tracking = new DatabaseTrackingStore(database);
    const staff = new DatabaseStaffOrderActionStore(database);
    const asked = await staff.createInfoRequest({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: crypto.randomUUID(),
      orderId: JANE_ORDER,
      fields: ['form.arrivalDate'],
      message: 'When do you land?',
    });
    if (asked.status !== 'created') throw new Error('info request not created');
    expect(
      (await tracking.orderDetail({ ...identity(), reference: 'CP-TRACK01' }))?.infoRequests,
    ).toEqual([
      expect.objectContaining({ id: asked.infoRequest.id, message: 'When do you land?' }),
    ]);
    const answer = (patch: { form?: { arrivalDate: string }; contact?: { phone: string } }) =>
      tracking.createCustomerChange({
        ...identity(),
        actorId: CREDENTIAL,
        requestId: crypto.randomUUID(),
        reference: 'CP-TRACK01',
        patch,
        infoRequestId: asked.infoRequest.id,
        now: new Date(),
      });
    expect(await answer({ contact: { phone: '+1555' } })).toEqual({ status: 'fields_mismatch' });
    const ok = await answer({ form: { arrivalDate: '2026-11-20' } });
    if (ok.status !== 'created') throw new Error('answer not created');
    expect(await answer({ form: { arrivalDate: '2026-11-21' } })).toEqual({
      status: 'info_request_not_found',
    });
    const detail = await new DatabaseOrderQueryStore(database).getOrder(
      WORKSPACE,
      ACTOR,
      JANE_ORDER,
    );
    expect(detail?.infoRequests.find((row) => row.id === asked.infoRequest.id)).toMatchObject({
      status: 'answered',
      changeRequestId: ok.changeRequest.id,
    });
    expect(detail?.changeRequests.find((row) => row.id === ok.changeRequest.id)).toMatchObject({
      origin: 'customer',
      infoRequestId: asked.infoRequest.id,
    });
    // Another workspace's staff context never sees it (RLS).
    expect(
      await new DatabaseOrderQueryStore(database).getOrder(OTHER_WORKSPACE, ACTOR, JANE_ORDER),
    ).toBeUndefined();
  });

  function queueInput(code = '654321', email = EMAIL) {
    const challengeId = crypto.randomUUID();
    return {
      workspaceId: WORKSPACE,
      challengeId,
      normalizedEmail: email,
      emailHash: emailBindingHash(SECRET, WORKSPACE, email),
      codeHash: codeBindingHash(SECRET, WORKSPACE, email, code),
      sealedCode: sealTrackingCode(SECRET, { workspaceId: WORKSPACE, challengeId }, code),
      contactHash: hashContact(email, CONTACT_SECRET),
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
  async function pendingJobs() {
    return admin<{ id: string }[]>`
      select id from app.outbox_jobs
      where workspace_id = ${WORKSPACE} and job_type = 'tracking_otp_email' and status = 'pending'
    `;
  }

  test('queues an encrypted code atomically, delivers it without an order, verifies once, and scrubs the payload', async () => {
    const store = new DatabaseTrackingStore(database);
    const service = new TrackingService({
      store,
      secret: SECRET,
      contactHashSecret: () => CONTACT_SECRET,
    });
    // Drain anything earlier tests queued.
    await new OutboxRunner({
      store: new DatabaseOutboxStore(database),
      handlers: new Map([['tracking_otp_email', delivery(store, new FakeEmailAdapter())]]),
    }).run({ authorizedWorkspaceIds: [WORKSPACE], actorId: ACTOR });
    await service.requestCode({ workspaceId: WORKSPACE, email: 'nobody@example.test' });
    expect(await pendingJobs()).toHaveLength(0);
    await service.requestCode({ workspaceId: WORKSPACE, email: 'Jane@Example.test' });
    const rows = await admin<
      {
        id: string;
        payload_version: number;
        payload: { challengeId: string; sealedCode: string };
      }[]
    >`select id, payload_version, payload from app.outbox_jobs where workspace_id = ${WORKSPACE} and job_type = 'tracking_otp_email' and status = 'pending'`;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.payload_version).toBe(2);
    const payload = rows[0]!.payload;
    expect(payload).not.toHaveProperty('code');
    expect(payload).not.toHaveProperty('orderId');
    const code = openTrackingCode(
      SECRET,
      { workspaceId: WORKSPACE, challengeId: payload.challengeId },
      payload.sealedCode,
    );
    expect(code).toMatch(/^\d{6}$/);
    const email = new FakeEmailAdapter();
    expect(
      await new OutboxRunner({
        store: new DatabaseOutboxStore(database),
        handlers: new Map([['tracking_otp_email', delivery(store, email)]]),
      }).run({ authorizedWorkspaceIds: [WORKSPACE], actorId: ACTOR }),
    ).toMatchObject({ completed: 1, failed: 0 });
    expect(email.deliveries).toEqual([
      expect.objectContaining({ template: 'tracking_otp', toAddress: EMAIL, variables: { code } }),
    ]);
    expect(email.deliveries[0]).not.toHaveProperty('reference');
    expect(
      (await admin`select payload from app.outbox_jobs where id = ${rows[0]!.id}`)[0]!.payload,
    ).toEqual({ challengeId: payload.challengeId });
    expect(
      (await service.verifyCode({ workspaceId: WORKSPACE, email: EMAIL, code: code! })).status,
    ).toBe('verified');
    expect(
      (await service.verifyCode({ workspaceId: WORKSPACE, email: EMAIL, code: code! })).status,
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
    expect(Object.keys(job!.payload)).toEqual(['challengeId']);
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
    const pending = await admin<{ id: string }[]>`
      select id from app.tracking_challenges
      where workspace_id = ${WORKSPACE} and email_hash = ${first.emailHash} and status = 'pending'
    `;
    expect(pending).toHaveLength(1);
    expect(await pendingJobs()).toHaveLength(1);
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

  test('skips expired, superseded, cross-tenant, legacy, changed-recipient and tampered deliveries', async () => {
    const store = new DatabaseTrackingStore(database);
    const first = queueInput();
    await store.createChallengeAndQueue(first);
    const claimed = await new DatabaseOutboxStore(database).claim({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      leaseOwnerId: crypto.randomUUID(),
      limit: 20,
      now: new Date(),
      leaseExpiresAt: new Date(Date.now() + 60000),
      maxAttempts: 8,
    });
    const job = claimed.find(
      (entry) =>
        z.object({ challengeId: z.string().optional() }).safeParse(entry.payload).data
          ?.challengeId === first.challengeId,
    )!;
    expect(job).toBeDefined();
    const email = new FakeEmailAdapter();
    const handle = delivery(store, email);
    const scoped = { ...job, actorId: ACTOR };
    const inactive = { providerId: 'skipped:tracking_challenge_inactive' };
    expect(
      await delivery(store, email, () => new Date(first.expiresAt.getTime() + 1))(scoped),
    ).toMatchObject(inactive);
    expect(await handle({ ...scoped, workspaceId: OTHER_WORKSPACE })).toMatchObject(inactive);
    // A job queued before email-only tracking (bound to one order) sends nothing.
    expect(await handle({ ...scoped, payloadVersion: 1 })).toMatchObject(inactive);
    expect(
      await handle({
        ...scoped,
        payload: { ...z.record(z.string(), z.unknown()).parse(job.payload), sealedCode: 'bad' },
      }),
    ).toMatchObject(inactive);
    // The queued address must still own an active order.
    // (Both of Jane's orders, so the address owns no active order any more.)
    await admin`update app.leads set email = 'changed@example.test' where id in ${admin([JANE_LEAD, JANE_OLDER_LEAD])}`;
    expect(await handle(scoped)).toMatchObject(inactive);
    await admin`update app.leads set email = ${EMAIL} where id in ${admin([JANE_LEAD, JANE_OLDER_LEAD])}`;
    await store.createChallengeAndQueue(queueInput('999999'));
    expect(await handle(scoped)).toMatchObject(inactive);
    expect(email.deliveries).toHaveLength(0);
  });
});
