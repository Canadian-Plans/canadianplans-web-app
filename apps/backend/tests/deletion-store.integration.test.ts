import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { z } from 'zod';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { createDatabaseClient, outboxJobs, type DatabaseClient } from '@canadian-plans/db';
import { TEST_RUNTIME_PASSWORD, setTestRuntimePassword } from '@canadian-plans/db/test-helpers';
import { applyMigrations } from '@canadian-plans/db/migrations';
import { commercialOfferSchema, orderSnapshotSchema } from '@canadian-plans/contracts';
import {
  FakeAnalyticsSink,
  FakeEmailAdapter,
  InMemoryDeletionLedger,
  InMemoryR2DocumentStore,
  sha256Hex,
} from '@canadian-plans/adapters';
import { OutboxRunner, createJobHandlerRegistry, type ClaimedJob } from '@canadian-plans/jobs';
import { DatabaseOutboxStore } from '../src/jobs/store.js';
import { DatabaseDeletionStore } from '../src/deletion/store.js';
import { DatabaseDeletionLedgerStore, DeletionLedgerService } from '../src/deletion/ledger.js';
import { PsqlReferencedObjectManifestSource } from '@canadian-plans/jobs/backup';
import { createCustomerCleanupHandler, DatabaseCustomerCleanup } from '../src/deletion/cleanup.js';
import { createDeletionObjectHandler } from '../src/deletion/objects.js';
import { createDatabaseLedgerReplay } from '../src/deletion/replay.js';
import { DatabaseTrackingStore } from '../src/tracking/store.js';
import { TrackingService } from '../src/tracking/service.js';
import { DatabaseDraftGrantVerifier } from '../src/documents/grant.js';
import { DatabaseDocumentStore } from '../src/documents/store.js';
import { DatabaseDocumentContextResolver } from '../src/documents/resolver.js';
import { DocumentService } from '../src/documents/service.js';
import { generateDraftGrantToken } from '../src/leads/token.js';
import { DatabaseLeadStore } from '../src/leads/store.js';
import { DatabaseOrderQueryStore } from '../src/orders/query-store.js';
import { DatabaseStaffOrderActionStore } from '../src/orders/staff-actions.js';
import { DatabaseEmailStore } from '../src/email/store.js';
import { hashContact } from '../src/email/hash.js';

const databaseUrl = process.env.TEST_MIGRATION_DATABASE_URL;
if (databaseUrl || process.env.DB_TEST_ALLOW_DESTRUCTIVE || process.env.CI) {
  if (
    !databaseUrl ||
    process.env.DB_TEST_ALLOW_DESTRUCTIVE !== '1' ||
    !decodeURIComponent(new URL(databaseUrl).pathname).endsWith('_test')
  )
    throw new Error('Deletion tests require an opted-in disposable _test database.');
}
const WORKSPACE = '13000000-0000-4000-8000-000000000d01';
const FOREIGN = '13000000-0000-4000-8000-000000000d02';
const ACTOR = '23000000-0000-4000-8000-000000000d01';
const PRODUCT = '33000000-0000-4000-8000-000000000d01';
const OFFER = '43000000-0000-4000-8000-000000000d01';
const REQUEST = '83000000-0000-4000-8000-000000000d01';
const EMAIL = 'customer@example.test';
const HASH_SECRET = 'deletion-test-contact-hash-secret';
const TRACKING_SECRET = 'deletion-test-tracking-secret-at-least-32';
const CONTACT = hashContact(EMAIL, HASH_SECRET);
const PDF = new TextEncoder().encode('%PDF-1.7\nTEST ONLY identity bytes');
const offer = commercialOfferSchema.parse({
  productKey: 'deletion-fixture',
  productTitle: 'TEST plan',
  productType: 'sim',
  offerName: 'TEST plan',
  currency: 'CAD',
  recurringChargeAmountMinor: 4500,
  oneTimeFees: [],
  amountPayableTodayMinor: 0,
  paymentRequired: false,
  documentChecklist: ['passport'],
  eligibility: 'TEST',
  availability: 'TEST',
  billingParty: 'TEST',
  contractTerms: [{ _type: 'block', children: [] }],
  termsVersion: 'test-v1',
  specs: { carrier: 'TEST', dataAllowance: '10 GB' },
});
const SNAPSHOT = orderSnapshotSchema.parse({
  quoteId: randomUUID(),
  productId: PRODUCT,
  offerVersionId: OFFER,
  offer,
  currency: 'CAD',
  charges: [{ code: 'base', label: 'Plan', amount: { amountMinor: 4500, currency: 'CAD' } }],
  total: { amountMinor: 4500, currency: 'CAD' },
  amountPayableToday: { amountMinor: 0, currency: 'CAD' },
  paymentRequired: false,
  documentChecklist: ['passport'],
  termsVersion: 'test-v1',
});
const FORM = {
  schemaVersion: 1,
  payload: { currentCountry: 'Bangladesh', destination: 'Toronto', arrivalDate: '2026-12-01' },
};

interface Fixture {
  leadId: string;
  orderId: string;
  reference: string;
  grant: string;
  fileIds: string[];
  keys: string[];
  messageId: string;
  docs: DocumentService;
  r2: InMemoryR2DocumentStore;
}

describe.skipIf(!databaseUrl)('complete customer deletion under runtime RLS', () => {
  let admin: ReturnType<typeof postgres>;
  let database: DatabaseClient;
  let store: DatabaseDeletionStore;
  let fixture: Fixture;
  beforeAll(async () => {
    if (!databaseUrl) throw new Error('disposable database missing');
    await applyMigrations({ connectionString: databaseUrl, ssl: false });
    admin = postgres(databaseUrl, { max: 4, prepare: false, ssl: false });
    await setTestRuntimePassword(admin);
    for (const [id, slug] of [
      [WORKSPACE, 'deletion-a'],
      [FOREIGN, 'deletion-b'],
    ] as const)
      await admin`insert into app.workspaces(id,slug,name) values(${id},${slug},${slug}) on conflict(id) do nothing`;
    await admin`insert into app.products(id,workspace_id,product_key) values(${PRODUCT},${WORKSPACE},'deletion-fixture') on conflict(id) do nothing`;
    await admin`insert into app.offer_versions(id,workspace_id,product_id,content,content_hash) values(${OFFER},${WORKSPACE},${PRODUCT},${admin.json(z.json().parse(offer))},'deletion-fixture') on conflict(id) do nothing`;
    const runtimeUrl = new URL(databaseUrl);
    runtimeUrl.username = 'app_runtime';
    runtimeUrl.password = TEST_RUNTIME_PASSWORD;
    database = createDatabaseClient({
      connectionString: runtimeUrl.toString(),
      maxConnections: 4,
      ssl: false,
    });
    store = new DatabaseDeletionStore(database);
  });
  afterAll(async () => {
    await database?.close();
    await admin?.end();
  });

  async function seed(withOrder = true, r2 = new InMemoryR2DocumentStore()): Promise<Fixture> {
    const leadId = randomUUID(),
      orderId = randomUUID(),
      reference = `CP-${randomUUID().slice(0, 8).toUpperCase()}`,
      messageId = randomUUID();
    const grant = generateDraftGrantToken();
    await admin`insert into app.leads(id,workspace_id,status,consent_version,full_name,email,phone,country_code,payload,attribution,selected_offer_version_id) values(${leadId},${WORKSPACE},${withOrder ? 'submitted' : 'incomplete'},'privacy-2026-10-v2','Saved Customer',${EMAIL},'1712345678','BD',${admin.json(FORM)},${admin.json({ utmSource: 'private-source' })},${OFFER})`;
    await admin`update app.leads set custom_values = '{"custom_erasure":"Private sentinel"}'::jsonb where id=${leadId}`;
    await admin`insert into app.draft_grants(workspace_id,lead_id,token_hash,expires_at) values(${WORKSPACE},${leadId},${grant.tokenHash},now()+interval '1 day')`;
    if (withOrder) {
      await admin`insert into app.orders(id,workspace_id,reference,lead_id,status,payment_state,delivery_state,snapshot,payload,submitted_at) values(${orderId},${WORKSPACE},${reference},${leadId},'submitted','not_required','none',${admin.json(z.json().parse(SNAPSHOT))},${admin.json(FORM)},now())`;
      await admin`insert into app.order_notes(workspace_id,order_id,author_id,body) values(${WORKSPACE},${orderId},${ACTOR},${EMAIL})`;
      await admin`insert into app.order_amendments(workspace_id,order_id,actor_id,reason,patch,before,after) values(${WORKSPACE},${orderId},${ACTOR},'customer correction',${admin.json({ contact: { email: EMAIL } })},${admin.json({ email: EMAIL })},${admin.json({ email: EMAIL })})`;
      await admin`insert into app.order_change_requests(workspace_id,order_id,requested_by,payload) values(${WORKSPACE},${orderId},${ACTOR},${admin.json({ patch: { contact: { email: EMAIL } }, note: EMAIL })})`;
      await admin`insert into app.order_info_requests(workspace_id,order_id,requested_by,fields,message) values(${WORKSPACE},${orderId},${ACTOR},${admin.json(['contact.email'])},${EMAIL})`;
      await admin`insert into app.order_reminders(workspace_id,order_id,created_by,remind_at,note) values(${WORKSPACE},${orderId},${ACTOR},now(),${EMAIL})`;
      await admin`insert into app.order_status_history(workspace_id,order_id,actor_id,to_status,order_version,reason) values(${WORKSPACE},${orderId},${ACTOR},'submitted',1,${EMAIL})`;
      await admin`insert into app.payment_records(workspace_id,order_id,actor_id,from_state,to_state,method,payment_reference,amount_minor,currency,recorded_at) values(${WORKSPACE},${orderId},${ACTOR},'pending','paid','manual',${EMAIL},4500,'CAD',now())`;
      await admin`insert into app.dispatch_records(workspace_id,order_id,actor_id,courier,tracking_reference,dispatched_at) values(${WORKSPACE},${orderId},${ACTOR},'TEST courier',${EMAIL},now())`;
      await admin`insert into app.outbox_jobs(workspace_id,job_type,dedupe_key,message_id,payload) values(${WORKSPACE},'order_acknowledgement_email',${orderId},${messageId},${admin.json({ orderId, reference, toAddress: EMAIL, contactHash: CONTACT })})`;
      await admin`insert into app.marketing_consents(workspace_id,lead_id,order_id,contact_hash,marketing_opt_in,version,captured_at) values(${WORKSPACE},${leadId},${orderId},${CONTACT},true,'test-v1',now())`;
      await admin`insert into app.follow_up_schedules(workspace_id,lead_id,order_id,template,due_at) values(${WORKSPACE},${leadId},${orderId},'test',now())`;
      const email = new DatabaseEmailStore(database);
      await email.prepareDelivery({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        orderId,
        leadId,
        messageId,
        template: 'order_acknowledgement',
        messageClass: 'transactional',
        contactHash: CONTACT,
        provider: 'resend',
        providerAccount: 'test-account',
      });
      await email.recordDeliveryResult({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        messageId,
        result: { status: 'delivered', providerId: `send-${messageId}` },
      });
      await email.applyProviderEvent({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        provider: 'resend',
        providerAccount: 'test-account',
        providerMessageId: `send-${messageId}`,
        providerEventId: `event-${messageId}`,
        hardBounce: false,
        eventType: 'delivered',
        contactHash: CONTACT,
        messageId,
        receivedAt: new Date(),
      });
      await new TrackingService({
        store: new DatabaseTrackingStore(database),
        secret: TRACKING_SECRET,
        contactHashSecret: () => HASH_SECRET,
      }).requestCode({ workspaceId: WORKSPACE, email: EMAIL });
      await admin`insert into app.audit_events(workspace_id,actor_id,actor_label,action,entity,entity_id,after,request_id) values(${WORKSPACE},${ACTOR},'staff','order.submitted','order',${orderId},${admin.json({ email: EMAIL })},${REQUEST})`;
    }
    const documents = new DatabaseDocumentStore(database);
    const docs = new DocumentService(documents, r2, new DatabaseDocumentContextResolver(database), {
      bucket: 'test-bucket',
    });
    const fileIds: string[] = [],
      keys: string[] = [];
    for (const recordType of withOrder
      ? (['lead', 'lead', 'order'] as const)
      : (['lead'] as const)) {
      const intent = await docs.createIntent({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        requestId: REQUEST,
        recordType,
        recordId: recordType === 'lead' ? leadId : orderId,
        documentType: 'passport',
        declaredContentType: 'application/pdf',
        declaredSizeBytes: PDF.length,
      });
      if (intent.status !== 'created') throw new Error('fixture upload intent missing');
      const pending = await documents.getFile({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        fileId: intent.uploadId,
      });
      if (!pending) throw new Error('fixture file missing');
      r2.putStagingObject(pending.stagingKey, PDF);
      const finalized = await docs.finalize({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        requestId: REQUEST,
        fileId: intent.uploadId,
        checksumSha256: sha256Hex(PDF),
      });
      if (finalized.status !== 'available' || !finalized.file.objectKey)
        throw new Error('fixture finalization failed');
      await docs.review({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        requestId: REQUEST,
        fileId: intent.uploadId,
        decision: 'approved',
        note: EMAIL,
      });
      fileIds.push(intent.uploadId);
      keys.push(pending.stagingKey, finalized.file.objectKey);
    }
    // Synthetic uploads have no live URL. Expire their fixture intents so the
    // provider-cleanup tests can run without waiting five minutes.
    await admin`update app.files set expires_at=now()-interval '2 minutes' where workspace_id=${WORKSPACE} and record_id in (${leadId},${orderId})`;
    return { leadId, orderId, reference, grant: grant.token, fileIds, keys, messageId, docs, r2 };
  }
  beforeEach(async () => {
    fixture = await seed();
  });
  async function request(f = fixture) {
    const result = await store.deleteCustomerData({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      orderId: f.orderId,
      reason: 'verified customer request',
    });
    if (result.status !== 'restricted') throw new Error('deletion request missing');
    return result;
  }
  async function acknowledge(deletionId: string) {
    const ledger = new InMemoryDeletionLedger();
    await new DeletionLedgerService({
      ledger,
      store: new DatabaseDeletionLedgerStore(database),
    }).publish({ workspaceId: WORKSPACE, deletionId });
    return ledger;
  }
  async function localCleanup(deletionId: string) {
    await acknowledge(deletionId);
    await new DatabaseCustomerCleanup(database).run({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      deletionId,
    });
  }
  function objectJob(id: string): ClaimedJob {
    return {
      id: randomUUID(),
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      jobType: 'deletion_object_cleanup',
      messageId: randomUUID(),
      payloadVersion: 1,
      payload: { objectId: id },
      attempts: 1,
      leaseOwnerId: randomUUID(),
    };
  }
  async function objects(deletionId: string) {
    return admin<
      { id: string; object_key: string; completed_at: Date | null }[]
    >`select id,object_key,completed_at from app.deletion_objects where workspace_id=${WORKSPACE} and deletion_id=${deletionId}`;
  }

  test('restricts immediately, revokes old access and stops an already-claimed email before any erasure', async () => {
    const query = new DatabaseOrderQueryStore(database);
    expect((await query.getOrder(WORKSPACE, ACTOR, fixture.orderId))?.customer.email).toBe(EMAIL);
    const [queued] = await admin<
      { id: string; payload: unknown }[]
    >`select id,payload from app.outbox_jobs where workspace_id=${WORKSPACE} and message_id=${fixture.messageId}`;
    if (!queued) throw new Error('fixture job missing');
    const leaseOwnerId = randomUUID();
    await admin`update app.outbox_jobs set status='processing',lease_owner_id=${leaseOwnerId},lease_expires_at=now()+interval '1 minute',locked_at=now() where id=${queued.id}`;
    const claimed: ClaimedJob = {
      id: queued.id,
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      jobType: 'order_acknowledgement_email',
      messageId: fixture.messageId,
      payloadVersion: 1,
      payload: queued.payload,
      attempts: 1,
      leaseOwnerId,
    };
    const deletion = await request();
    expect(deletion.cleanupStatus).toBe('pending');
    // Restriction hides the order from its customer's tracking at once.
    expect(
      await new DatabaseTrackingStore(database).orderId({
        workspaceId: WORKSPACE,
        normalizedEmail: EMAIL,
        reference: fixture.reference,
      }),
    ).toBeUndefined();
    expect(
      await new DatabaseDraftGrantVerifier(database).verifyLead({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        grantToken: fixture.grant,
        now: new Date(),
      }),
    ).toBeUndefined();
    for (const fileId of fixture.fileIds)
      expect(
        (
          await fixture.docs.issueDownload({
            workspaceId: WORKSPACE,
            actorId: ACTOR,
            fileId,
            requestId: REQUEST,
          })
        ).status,
      ).not.toBe('issued');
    expect(
      (
        await fixture.docs.createIntent({
          workspaceId: WORKSPACE,
          actorId: ACTOR,
          requestId: REQUEST,
          recordType: 'lead',
          recordId: fixture.leadId,
          documentType: 'passport',
          declaredContentType: 'application/pdf',
          declaredSizeBytes: PDF.length,
        })
      ).status,
    ).toBe('parent_not_found');
    const email = new FakeEmailAdapter();
    const handler = createJobHandlerRegistry({
      email,
      analytics: new FakeAnalyticsSink(),
      eligibility: new DatabaseEmailStore(database),
    }).get(claimed.jobType);
    if (!handler) throw new Error('handler missing');
    expect(await handler(claimed)).toMatchObject({
      status: 'completed',
      providerId: 'skipped:customer_data_restricted',
    });
    expect(email.deliveries).toHaveLength(0);
    const detail = await query.getOrder(WORKSPACE, ACTOR, fixture.orderId);
    expect(detail).toMatchObject({
      customerDataState: 'restricted',
      payload: null,
      consent: null,
      notes: [],
      reminders: [],
      amendments: [],
      changeRequests: [],
      dispatch: null,
      customer: { fullName: null, email: null, phone: null, countryCode: null },
    });
    expect(JSON.stringify(detail)).not.toContain(EMAIL);
    const [raw] = await admin`select email,payload from app.leads where id=${fixture.leadId}`;
    expect(raw?.email).toBe(EMAIL); // no irreversible erasure before ledger acknowledgement
    expect(fixture.keys.every((key) => fixture.r2.has(key))).toBe(true);
    await expect(
      new DatabaseCustomerCleanup(database).run({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        deletionId: deletion.deletionId,
      }),
    ).rejects.toThrow('deletion_not_acknowledged');
    expect(
      (
        await new DatabaseStaffOrderActionStore(database).addNote({
          workspaceId: WORKSPACE,
          actorId: ACTOR,
          requestId: REQUEST,
          orderId: fixture.orderId,
          body: 'late personal copy',
        })
      ).status,
    ).toBe('not_found');
  });

  test('keeps an unavailable ledger pending and reuses one concurrent logical operation', async () => {
    const [a, b] = await Promise.all([request(), request()]);
    expect(a.deletionId).toBe(b.deletionId);
    const service = new DeletionLedgerService({
      ledger: new InMemoryDeletionLedger(false),
      store: new DatabaseDeletionLedgerStore(database),
    });
    await expect(
      service.publish({ workspaceId: WORKSPACE, deletionId: a.deletionId }),
    ).rejects.toThrow('deletion_ledger_unavailable');
    const [intent] =
      await admin`select status,completed_at from app.deletion_intents where id=${a.deletionId}`;
    expect(intent).toMatchObject({ status: 'failed', completed_at: null });
    expect((await objects(a.deletionId)).length).toBe(0);
    expect(fixture.keys.every((key) => fixture.r2.has(key))).toBe(true);
    const ledger = await acknowledge(a.deletionId);
    expect(ledger.published[0]).toMatchObject({
      relatedLeadId: fixture.leadId,
      subjectType: 'order',
      subjectId: fixture.orderId,
      schemaVersion: 1,
    });
  });

  test('erases all linked DB copies after acknowledgement, then deletes every current and superseded private object', async () => {
    const deletion = await request();
    await localCleanup(deletion.deletionId);
    for (const table of [
      'order_notes',
      'order_amendments',
      'order_change_requests',
      'order_info_requests',
      'order_reminders',
      'tracking_challenges',
      'dispatch_records',
    ]) {
      const [row] = await admin.unsafe(
        `select count(*)::int as count from app.${table} where order_id=$1`,
        [fixture.orderId],
      );
      expect(row?.count, table).toBe(0);
    }
    for (const table of ['email_messages', 'marketing_consents', 'follow_up_schedules']) {
      const [row] = await admin.unsafe(
        `select count(*)::int as count from app.${table} where lead_id=$1 or order_id=$2`,
        [fixture.leadId, fixture.orderId],
      );
      expect(row?.count, table).toBe(0);
    }
    const [lead] =
      await admin`select full_name,email,phone,payload,attribution,custom_values from app.leads where id=${fixture.leadId}`;
    expect(lead).toMatchObject({
      custom_values: {},
      full_name: null,
      email: null,
      phone: null,
      payload: null,
      attribution: {},
    });
    expect(
      await admin`select id from app.files where record_id in (${fixture.leadId},${fixture.orderId})`,
    ).toHaveLength(0);
    expect(
      await admin`select id from app.file_revisions where file_id in ${admin(fixture.fileIds)}`,
    ).toHaveLength(0);
    expect(
      await admin`select id from app.file_review_events where file_id in ${admin(fixture.fileIds)}`,
    ).toHaveLength(0);
    const [payment] =
      await admin`select method,payment_reference,amount_minor from app.payment_records where order_id=${fixture.orderId}`;
    expect(payment).toEqual({ method: null, payment_reference: null, amount_minor: 4500 });
    const [history] =
      await admin`select reason,to_status,actor_id from app.order_status_history where order_id=${fixture.orderId}`;
    expect(history).toEqual({ reason: null, to_status: 'submitted', actor_id: ACTOR });
    const [order] =
      await admin`select reference,snapshot,payload from app.orders where id=${fixture.orderId}`;
    expect(order).toMatchObject({ reference: fixture.reference, snapshot: SNAPSHOT, payload: {} });
    const work = await objects(deletion.deletionId);
    expect(new Set(work.map((row) => row.object_key))).toEqual(new Set(fixture.keys));
    expect(work.length).toBeGreaterThan(4);
    const handler = createDeletionObjectHandler({ database, r2: fixture.r2 });
    for (const item of work)
      expect(await handler(objectJob(item.id))).toMatchObject({ status: 'completed' });
    expect(fixture.keys.some((key) => fixture.r2.has(key))).toBe(false);
    expect(
      (await new DatabaseOrderQueryStore(database).getOrder(WORKSPACE, ACTOR, fixture.orderId))
        ?.customerDataState,
    ).toBe('deleted');
    expect((await request()).cleanupStatus).toBe('completed');
    expect(await handler(objectJob(work[0]!.id))).toMatchObject({
      providerId: 'r2_object_already_deleted',
    });
    const email = new DatabaseEmailStore(database);
    await email.recordDeliveryResult({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      messageId: fixture.messageId,
      result: { status: 'delivered', providerId: `send-${fixture.messageId}` },
    });
    expect(
      await email.applyProviderEvent({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        provider: 'resend',
        providerAccount: 'test-account',
        providerMessageId: `send-${fixture.messageId}`,
        providerEventId: randomUUID(),
        messageId: fixture.messageId,
        eventType: 'delivered',
        hardBounce: false,
        contactHash: CONTACT,
        receivedAt: new Date(),
      }),
    ).toBe('duplicate');
    expect(
      await admin`select id from app.email_provider_events where message_id=${fixture.messageId}`,
    ).toHaveLength(0);
    await expect(
      email.prepareDelivery({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        messageId: randomUUID(),
        leadId: fixture.leadId,
        template: 'order_acknowledgement',
        messageClass: 'transactional',
        contactHash: CONTACT,
        provider: 'resend',
        providerAccount: 'test-account',
      }),
    ).rejects.toThrow('customer_data_restricted');
  });

  test('retains only minimal opt-out evidence so deletion and late unsubscribe never revive marketing', async () => {
    const unrelated = await seed();
    const email = new DatabaseEmailStore(database);
    // A newer unsubscribe belongs to the record being deleted; another active
    // order sharing the address still has an older opt-in.
    await email.recordUnsubscribe({
      workspaceId: WORKSPACE,
      contactHash: CONTACT,
      leadId: fixture.leadId,
      orderId: fixture.orderId,
      version: 'test-v1',
      now: new Date(Date.now() + 1000),
    });
    const deletion = await request();
    await localCleanup(deletion.deletionId);
    expect(
      await email.checkMarketing({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        contactHash: CONTACT,
        orderId: unrelated.orderId,
      }),
    ).toEqual({ eligible: false, reason: 'opted_out' });
    await email.recordUnsubscribe({
      workspaceId: WORKSPACE,
      contactHash: CONTACT,
      leadId: fixture.leadId,
      orderId: fixture.orderId,
      version: 'test-v1',
      now: new Date(Date.now() + 2000),
    });
    const retained =
      await admin`select lead_id,order_id,version from app.marketing_consents where workspace_id=${WORKSPACE} and contact_hash=${CONTACT} and marketing_opt_in=false order by captured_at desc limit 1`;
    expect(retained[0]).toEqual({ lead_id: null, order_id: null, version: 'retained-opt-out' });
    expect(
      await admin`select id from app.marketing_consents where lead_id=${fixture.leadId} or order_id=${fixture.orderId}`,
    ).toHaveLength(0);
    expect(
      await email.checkTransactional({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        contactHash: CONTACT,
        orderId: unrelated.orderId,
      }),
    ).toEqual({ eligible: true });
  });

  test('backup inventory retains verified references after immediate restriction', async () => {
    const source = new PsqlReferencedObjectManifestSource('test-only', async (_command, args) => {
      const query = args[args.indexOf('--command') + 1];
      if (!query) throw new Error('inventory query missing');
      const rows = await admin.unsafe(query);
      return {
        stdout: new TextEncoder().encode(
          rows
            .map((row) =>
              [
                row.workspace_id,
                row.bucket,
                row.object_key,
                row.checksum_sha256,
                row.size_bytes,
              ].join('\t'),
            )
            .join('\n'),
        ),
        stderr: '',
        exitCode: 0,
      };
    });
    const before = (await source.listReferencedObjects()).filter((item) =>
      fixture.keys.includes(item.objectKey),
    );
    expect(before).toHaveLength(fixture.fileIds.length);
    await request();
    expect(
      (await source.listReferencedObjects()).filter((item) =>
        fixture.keys.includes(item.objectKey),
      ),
    ).toEqual(expect.arrayContaining(before));
  });

  test('defers metadata cleanup during backup and resumes the same job after release', async () => {
    const runId = `metadata-${randomUUID()}`;
    await admin`insert into app.backup_leases(run_id,expires_at) values(${runId},now()+interval '1 minute')`;
    try {
      const deletion = await request();
      await acknowledge(deletion.deletionId);
      const handler = createCustomerCleanupHandler(new DatabaseCustomerCleanup(database));
      const job = {
        ...objectJob(deletion.deletionId),
        jobType: 'customer_data_cleanup',
        payload: { deletionId: deletion.deletionId },
      };
      expect(await handler(job)).toMatchObject({
        status: 'retry',
        errorCode: 'customer_cleanup_deferred',
      });
      expect(
        await admin`select id from app.files where id in ${admin(fixture.fileIds)}`,
      ).toHaveLength(fixture.fileIds.length);
      expect(await objects(deletion.deletionId)).toHaveLength(0);
      await admin`delete from app.backup_leases where run_id=${runId}`;
      expect(await handler(job)).toMatchObject({ status: 'completed' });
      expect(
        await admin`select id from app.files where id in ${admin(fixture.fileIds)}`,
      ).toHaveLength(0);
      expect((await objects(deletion.deletionId)).length).toBeGreaterThan(0);
    } finally {
      await admin`delete from app.backup_leases where run_id=${runId}`;
    }
  });

  test('backup waiting preserves the last cleanup attempt through the real queue runner', async () => {
    const workspaceId = randomUUID(),
      waitId = randomUUID(),
      runId = `budget-${randomUUID()}`;
    await admin`insert into app.workspaces(id,slug,name) values(${workspaceId},${workspaceId},'TEST cleanup retry budget')`;
    await admin`insert into app.region_waitlist(id,workspace_id,province,email,consent_version) values(${waitId},${workspaceId},'SK',${EMAIL},'privacy-2026-10-v2')`;
    const deletion = await store.requestDeletion({
      workspaceId,
      actorId: ACTOR,
      requestId: REQUEST,
      subjectType: 'region_waitlist',
      subjectId: waitId,
      reason: 'verified customer request',
    });
    if (deletion.status !== 'restricted') throw new Error('request missing');
    await new DeletionLedgerService({
      ledger: new InMemoryDeletionLedger(),
      store: new DatabaseDeletionLedgerStore(database),
    }).publish({ workspaceId, deletionId: deletion.deletionId });
    // The publisher was exercised above; only its acknowledged cleanup job is due.
    await admin`update app.outbox_jobs set status='completed',completed_at=now() where workspace_id=${workspaceId} and job_type='deletion_ledger_publish'`;
    await admin`update app.outbox_jobs set attempts=7 where workspace_id=${workspaceId} and job_type='customer_data_cleanup'`;
    let now = new Date();
    const runner = new OutboxRunner({
      store: new DatabaseOutboxStore(database),
      handlers: new Map([
        [
          'customer_data_cleanup',
          createCustomerCleanupHandler(new DatabaseCustomerCleanup(database)),
        ],
      ]),
      batchSize: 1,
      maxAttempts: 8,
      now: () => now,
    });
    const input = { authorizedWorkspaceIds: [workspaceId], actorId: ACTOR };
    await admin`insert into app.backup_leases(run_id,expires_at) values(${runId},now()+interval '1 minute')`;
    try {
      expect(await runner.run(input)).toMatchObject({ claimed: 1, retried: 1 });
      const [queued] =
        await admin`select status,attempts,available_at from app.outbox_jobs where workspace_id=${workspaceId} and job_type='customer_data_cleanup'`;
      expect(queued).toMatchObject({ status: 'pending', attempts: 7 });
      expect(await runner.run(input)).toMatchObject({ claimed: 0, failed: 0 });
      expect(
        (
          await admin`select status from app.outbox_jobs where workspace_id=${workspaceId} and job_type='customer_data_cleanup'`
        )[0]?.status,
      ).toBe('pending');
      await admin`delete from app.backup_leases where run_id=${runId}`;
      now = new Date(new Date(queued!.available_at).getTime() + 1);
      expect(await runner.run(input)).toMatchObject({ claimed: 1, completed: 1 });
      expect(await admin`select id from app.region_waitlist where id=${waitId}`).toHaveLength(0);
    } finally {
      await admin`delete from app.backup_leases where run_id=${runId}`;
    }
  });

  test('backup acquisition waits for the metadata cleanup transaction to commit', async () => {
    const deletion = await request();
    await acknowledge(deletion.deletionId);
    let release = () => {};
    let reached = () => {};
    const pause = new Promise<void>((resolve) => {
      release = resolve;
    });
    const ready = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const held: Pick<DatabaseClient, 'withTenantTx'> = {
      withTenantTx: (context, operation) =>
        database.withTenantTx(context, async (tx) => {
          const result = await operation(tx);
          reached();
          await pause;
          return result;
        }),
    };
    const pending = new DatabaseCustomerCleanup(held).run({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      deletionId: deletion.deletionId,
    });
    const runId = `cleanup-first-${randomUUID()}`;
    try {
      await Promise.race([
        ready,
        pending.then(() => {
          throw new Error('cleanup unexpectedly finished');
        }),
      ]);
      await expect(
        admin.begin(async (tx) => {
          await tx`set local lock_timeout = '100ms'`;
          await tx`insert into app.backup_leases(run_id,expires_at) values(${runId},now()+interval '1 minute')`;
        }),
      ).rejects.toMatchObject({ code: '55P03' });
    } finally {
      release();
      await pending;
    }
    await admin`insert into app.backup_leases(run_id,expires_at) values(${runId},now()+interval '1 minute')`;
    await admin`delete from app.backup_leases where run_id=${runId}`;
  });

  test('metadata backup barrier rejects missing or mismatched tenant context', async () => {
    await expect(
      admin`select app.customer_cleanup_backup_barrier(${WORKSPACE}::uuid)`,
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      database.withTenantTx({ workspaceId: WORKSPACE, actorId: ACTOR }, (tx) =>
        tx.execute(sql`select app.customer_cleanup_backup_barrier(${FOREIGN}::uuid)`),
      ),
    ).rejects.toMatchObject({ cause: { code: '42501', message: 'cleanup_context_missing' } });
    await expect(
      database.withTenantTx({ workspaceId: WORKSPACE, actorId: ACTOR }, (tx) =>
        tx.execute(sql`select * from app.backup_leases`),
      ),
    ).rejects.toThrow();
  });

  test('restore replay remains closed when an active backup defers local erasure', async () => {
    const runId = `replay-${randomUUID()}`;
    const event = {
      eventId: randomUUID(),
      workspaceId: WORKSPACE,
      action: 'delete_customer_data',
      subjectType: 'order',
      subjectId: fixture.orderId,
      relatedLeadId: fixture.leadId,
      occurredAt: new Date().toISOString(),
      schemaVersion: 1,
      versionId: 'synthetic-ledger-version',
    };
    const replay = createDatabaseLedgerReplay(database);
    await admin`insert into app.backup_leases(run_id,expires_at) values(${runId},now()+interval '1 minute')`;
    try {
      await expect(replay(event)).rejects.toThrow('deletion_cleanup_deferred');
      expect((await admin`select email from app.leads where id=${fixture.leadId}`)[0]?.email).toBe(
        EMAIL,
      );
      expect(
        (await new DatabaseOrderQueryStore(database).getOrder(WORKSPACE, ACTOR, fixture.orderId))
          ?.customer.email,
      ).toBeNull();
      await admin`delete from app.backup_leases where run_id=${runId}`;
      await replay(event);
      expect(
        (await admin`select email from app.leads where id=${fixture.leadId}`)[0]?.email,
      ).toBeNull();
    } finally {
      await admin`delete from app.backup_leases where run_id=${runId}`;
    }
  });

  test('defers the same durable object for an active backup and resumes it after release', async () => {
    const deletion = await request();
    await localCleanup(deletion.deletionId);
    const item = (await objects(deletion.deletionId))[0];
    if (!item) throw new Error('object missing');
    const runId = `deletion-${randomUUID()}`;
    await admin`insert into app.backup_leases(run_id,expires_at) values(${runId},now()+interval '1 minute')`;
    try {
      const handler = createDeletionObjectHandler({ database, r2: fixture.r2 });
      expect(await handler(objectJob(item.id))).toMatchObject({
        status: 'retry',
        errorCode: 'document_cleanup_deferred',
        preserveAttempt: true,
      });
      expect(fixture.r2.has(item.object_key)).toBe(true);
      expect(
        (await objects(deletion.deletionId)).find((row) => row.id === item.id)?.completed_at,
      ).toBeNull();
      await admin`delete from app.backup_leases where run_id=${runId}`;
      expect(await handler(objectJob(item.id))).toMatchObject({ status: 'completed' });
      expect(fixture.r2.has(item.object_key)).toBe(false);
    } finally {
      await admin`delete from app.backup_leases where run_id=${runId}`;
    }
  });

  test('backup acquisition cannot pass a live cleanup request', async () => {
    let release = () => {};
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    class BlockingR2 extends InMemoryR2DocumentStore {
      override async deleteObject(input: {
        workspaceId: string;
        bucket: string;
        objectKey: string;
      }) {
        await blocked;
        return super.deleteObject(input);
      }
    }
    const target = await seed(true, new BlockingR2());
    const deletion = await request(target);
    await localCleanup(deletion.deletionId);
    const item = (await objects(deletion.deletionId))[0];
    if (!item) throw new Error('object missing');
    const pending = createDeletionObjectHandler({ database, r2: target.r2 })(objectJob(item.id));
    try {
      await vi.waitFor(async () =>
        expect(
          (
            await admin`select object_id from app.document_cleanup_leases where object_id=${item.id}`
          ).length,
        ).toBe(1),
      );
      await expect(
        admin`insert into app.backup_leases(run_id,expires_at) values('deletion-overlap-test',now()+interval '1 minute')`,
      ).rejects.toMatchObject({ code: '55P03' });
    } finally {
      release();
      await pending;
    }
    await admin`insert into app.backup_leases(run_id,expires_at) values('deletion-overlap-test',now()+interval '1 minute')`;
    await admin`delete from app.backup_leases where run_id='deletion-overlap-test'`;
  });

  test('a crash after provider deletion retains work and retries an already absent object', async () => {
    let crash = true;
    let providerFinished = false;
    class CrashR2 extends InMemoryR2DocumentStore {
      override async deleteObject(input: {
        workspaceId: string;
        bucket: string;
        objectKey: string;
      }) {
        await super.deleteObject(input);
        providerFinished = true;
      }
    }
    const target = await seed(true, new CrashR2());
    const deletion = await request(target);
    await localCleanup(deletion.deletionId);
    const item = (await objects(deletion.deletionId))[0];
    if (!item) throw new Error('object missing');
    const flaky: Pick<DatabaseClient, 'withTenantTx'> = {
      withTenantTx: async (context, operation) => {
        if (providerFinished && crash) {
          crash = false;
          throw new Error('synthetic_commit_crash');
        }
        return database.withTenantTx(context, operation);
      },
    };
    const handler = createDeletionObjectHandler({ database: flaky, r2: target.r2 });
    await expect(handler(objectJob(item.id))).rejects.toThrow('synthetic_commit_crash');
    expect(target.r2.has(item.object_key)).toBe(false);
    expect(
      (await objects(deletion.deletionId)).find((row) => row.id === item.id)?.completed_at,
    ).toBeNull();
    expect(await handler(objectJob(item.id))).toMatchObject({ status: 'completed' });
  });

  test('an already-issued upload intent defers physical removal beyond its expiry', async () => {
    await admin`update app.files set expires_at=now()+interval '5 minutes' where id=${fixture.fileIds[0]!}`;
    const deletion = await request();
    await localCleanup(deletion.deletionId);
    const work = await objects(deletion.deletionId);
    const target = work.find((row) => row.object_key === fixture.keys[0]);
    if (!target) throw new Error('work missing');
    expect(
      await createDeletionObjectHandler({ database, r2: fixture.r2 })(objectJob(target.id)),
    ).toMatchObject({ status: 'retry' });
    expect(fixture.r2.has(target.object_key)).toBe(true);
  });

  test('supports explicit lead/wish-list requests without erasing another order that shares the email', async () => {
    const draft = await seed(false);
    const waitId = randomUUID();
    await admin`insert into app.region_waitlist(id,workspace_id,province,email,consent_version) values(${waitId},${WORKSPACE},'SK',${EMAIL},'privacy-2026-10-v2')`;
    const candidates = await store.findSubjects({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      email: EMAIL,
    });
    expect(candidates.subjects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ subjectType: 'lead', subjectId: draft.leadId }),
        expect.objectContaining({ subjectType: 'region_waitlist', subjectId: waitId }),
      ]),
    );
    for (const [subjectType, subjectId] of [
      ['lead', draft.leadId],
      ['region_waitlist', waitId],
    ] as const) {
      const result = await store.requestDeletion({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        requestId: REQUEST,
        subjectType,
        subjectId,
        reason: 'verified customer request',
      });
      if (result.status !== 'restricted') throw new Error('request missing');
      await localCleanup(result.deletionId);
      expect(
        await store.requestDeletion({
          workspaceId: WORKSPACE,
          actorId: ACTOR,
          requestId: REQUEST,
          subjectType,
          subjectId,
          reason: 'repeat',
        }),
      ).toMatchObject({ deletionId: result.deletionId });
    }
    expect(
      (await new DatabaseOrderQueryStore(database).getOrder(WORKSPACE, ACTOR, fixture.orderId))
        ?.customer.email,
    ).toBe(EMAIL);
    expect(await admin`select id from app.region_waitlist where id=${waitId}`).toHaveLength(0);
    expect(
      (
        await new DatabaseLeadStore(database).readLead({
          workspaceId: WORKSPACE,
          actorId: ACTOR,
          leadId: draft.leadId,
          grantToken: draft.grant,
        })
      ).status,
    ).toBe('grant_invalid');
  });

  test('replays an older draft-only backup twice, including documents and grants, before reopening', async () => {
    const draft = await seed(false);
    const eventId = randomUUID(),
      missingOrder = randomUUID();
    const event = {
      eventId,
      workspaceId: WORKSPACE,
      action: 'delete_customer_data',
      subjectType: 'order',
      subjectId: missingOrder,
      relatedLeadId: draft.leadId,
      occurredAt: new Date().toISOString(),
      schemaVersion: 1,
      versionId: 'synthetic-ledger-version',
    };
    const replay = createDatabaseLedgerReplay(database);
    await replay(event);
    await replay(event);
    expect(
      await new DatabaseDraftGrantVerifier(database).verifyLead({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        grantToken: draft.grant,
        now: new Date(),
      }),
    ).toBeUndefined();
    expect(
      (await admin`select email,payload from app.leads where id=${draft.leadId}`)[0],
    ).toMatchObject({ email: null, payload: null });
    expect(await admin`select id from app.files where record_id=${draft.leadId}`).toHaveLength(0);
    expect(await admin`select id from app.deletion_intents where id=${eventId}`).toHaveLength(1);
    expect((await objects(eventId)).length).toBeGreaterThan(0);
    await expect(
      replay({
        ...event,
        eventId: randomUUID(),
        relatedLeadId: undefined,
        subjectId: randomUUID(),
      }),
    ).rejects.toThrow('deletion_scope_unresolved');
    const target = await seed();
    await expect(
      replay({
        ...event,
        eventId: randomUUID(),
        subjectId: target.orderId,
        relatedLeadId: draft.leadId,
      }),
    ).rejects.toThrow('deletion_scope_mismatch');
    expect(
      (await new DatabaseOrderQueryStore(database).getOrder(WORKSPACE, ACTOR, target.orderId))
        ?.customer.email,
    ).toBe(EMAIL);
  });

  test('enforces tenant scope, no-context cleanup denial and null-only audit/history redaction', async () => {
    expect(
      await store.deleteCustomerData({
        workspaceId: FOREIGN,
        actorId: ACTOR,
        requestId: REQUEST,
        orderId: fixture.orderId,
        reason: 'foreign',
      }),
    ).toEqual({ status: 'not_found' });
    await expect(
      database.db.execute(
        sql`select app.try_document_cleanup_lease(${WORKSPACE}::uuid,${randomUUID()}::uuid,${randomUUID()}::uuid)`,
      ),
    ).rejects.toMatchObject({ cause: { code: '42501' } });
    await expect(
      database.withTenantTx({ workspaceId: WORKSPACE, actorId: ACTOR }, (tx) =>
        tx.execute(sql`delete from app.files where id=${fixture.fileIds[0]!}::uuid`),
      ),
    ).rejects.toThrow();
    const deletion = await request();
    await localCleanup(deletion.deletionId);
    await expect(
      database.withTenantTx({ workspaceId: WORKSPACE, actorId: ACTOR }, (tx) =>
        tx.execute(
          sql`update app.order_status_history set reason='restored personal text' where order_id=${fixture.orderId}::uuid`,
        ),
      ),
    ).rejects.toThrow();
    await expect(
      database.withTenantTx({ workspaceId: WORKSPACE, actorId: ACTOR }, (tx) =>
        tx.execute(
          sql`update app.audit_events set after='{}'::jsonb where entity_id=${fixture.orderId}::uuid`,
        ),
      ),
    ).rejects.toThrow();
    const claimed = await database.withTenantTx({ workspaceId: WORKSPACE, actorId: ACTOR }, (tx) =>
      tx
        .select({ status: outboxJobs.status })
        .from(outboxJobs)
        .where(
          and(eq(outboxJobs.workspaceId, WORKSPACE), eq(outboxJobs.messageId, fixture.messageId)),
        ),
    );
    expect(claimed[0]?.status).toBe('completed');
  });
});
