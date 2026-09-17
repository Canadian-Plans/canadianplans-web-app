import { createHmac } from 'node:crypto';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { createDatabaseClient, type DatabaseClient } from '@canadian-plans/db';
import { applyMigrations } from '@canadian-plans/db/migrations';
import type { PublishedOffer } from '@canadian-plans/contracts';
import type { SanityCatalogue, SiteRevalidator } from '@canadian-plans/adapters';

import { MachineRegistry } from '../src/machines/registry.js';
import { DatabaseCatalogueStore } from '../src/catalogue/store.js';
import { CatalogueService, type CatalogueProvider } from '../src/catalogue/service.js';

function disposableDatabaseUrl(): string | undefined {
  const url = process.env.TEST_MIGRATION_DATABASE_URL;
  const enabled = process.env.DB_TEST_ALLOW_DESTRUCTIVE === '1';
  if (!url && !enabled) return undefined;
  if (!url || !enabled) throw new Error('Both disposable database test settings are required.');
  if (!decodeURIComponent(new URL(url).pathname).endsWith('_test')) {
    throw new Error('The disposable database name must end in _test.');
  }
  return url;
}

const databaseUrl = disposableDatabaseUrl();
const databaseDescribe = databaseUrl ? describe : describe.skip;

/** Narrows the optional URL for use inside the suite body. */
function requireDatabaseUrl(): string {
  if (!databaseUrl) throw new Error('disposable database URL missing');
  return databaseUrl;
}

const WORKSPACE = '10000000-0000-4000-8000-000000000451';
const PROVIDER_ACCOUNT = 'project-catalogue-sync';
const DOCUMENT = 'sanity-sync-offer-1';
const PRODUCT_KEY = 'sync-integration-plan';
const MACHINE_ACTOR = '20000000-0000-4000-8000-000000000452';
const WEBHOOK_SECRET = 'catalogue-sync-webhook-secret-0001';
const NOW_MS = Date.parse('2026-09-16T00:00:00.000Z');

function offer(amount: number, revisionId: string): PublishedOffer {
  return {
    documentId: DOCUMENT,
    revisionId,
    commercial: {
      productKey: PRODUCT_KEY,
      productTitle: 'Sync Integration Plan',
      productType: 'sim',
      offerName: 'Sync 10 GB',
      currency: 'CAD',
      recurringChargeAmountMinor: amount,
      oneTimeFees: [],
      amountPayableTodayMinor: amount,
      paymentRequired: false,
      documentChecklist: ['passport'],
      eligibility: 'TEST only',
      availability: 'TEST only',
      billingParty: 'TEST carrier',
      contractTerms: [{ _type: 'block', children: [] }],
      termsVersion: 'terms-1',
      specs: { carrier: 'TEST', dataAllowance: '10 GB' },
    },
  };
}

/** Catalogue double whose published state a test can change between deliveries. */
class ControllableCatalogue implements SanityCatalogue {
  current: PublishedOffer | undefined;
  /** When set, the given values are returned in order and `current` is ignored. */
  sequence: (PublishedOffer | undefined)[] | undefined;
  private calls = 0;
  async fetchPublishedByDocumentId() {
    if (this.sequence) return this.sequence[this.calls++];
    return this.current;
  }
  async fetchPublishedByProductKey() {
    return this.current;
  }
  async listPublished() {
    return this.current ? [this.current] : [];
  }
}

const revalidator: SiteRevalidator = { revalidate: async () => undefined };

databaseDescribe('catalogue sync convergence', () => {
  let admin: ReturnType<typeof postgres>;
  let database: DatabaseClient;
  let store: DatabaseCatalogueStore;
  let catalogue: ControllableCatalogue;
  let service: CatalogueService;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error('disposable database URL missing');
    await applyMigrations({ connectionString: databaseUrl, ssl: false });
    admin = postgres(databaseUrl, { max: 1, prepare: false, ssl: false });
    await admin`
      insert into app.workspaces (id, slug, name)
      values (${WORKSPACE}, 'catalogue-sync-integration', 'Catalogue Sync Integration')
      on conflict (id) do nothing
    `;
  });

  beforeEach(() => {
    const runtimeUrl = new URL(requireDatabaseUrl());
    runtimeUrl.username = 'app_runtime';
    runtimeUrl.password = 'local_ci_runtime_password';
    database = createDatabaseClient({ connectionString: runtimeUrl.toString(), ssl: false });
    store = new DatabaseCatalogueStore(database);
    catalogue = new ControllableCatalogue();
    const provider: CatalogueProvider = {
      account: PROVIDER_ACCOUNT,
      catalogue,
      revalidator,
    };
    service = new CatalogueService(store, () => provider, 'honour_until_expiry');
  });

  afterAll(async () => {
    await database?.close();
    await admin.end();
  });

  async function deliver(deliveryId: string): Promise<string> {
    const accepted = await store.acceptEvent({
      workspaceId: WORKSPACE,
      actorId: MACHINE_ACTOR,
      selector: 'site-1-sanity',
      providerAccount: PROVIDER_ACCOUNT,
      deliveryId,
      documentId: DOCUMENT,
      payload: { documentId: DOCUMENT },
    });
    return accepted.eventId;
  }

  async function currentState() {
    const rows = await admin<
      {
        cms_revision_id: string | null;
        content: { recurringChargeAmountMinor: number };
        revoked_at: Date | null;
      }[]
    >`
      select v.cms_revision_id, v.content, a.revoked_at
      from app.product_availability a
      left join app.offer_versions v
        on v.workspace_id = a.workspace_id and v.id = a.current_offer_version_id
      join app.products p on p.workspace_id = a.workspace_id and p.id = a.product_id
      where a.workspace_id = ${WORKSPACE} and p.product_key = ${PRODUCT_KEY}
    `;
    return rows[0];
  }

  async function versionCount(): Promise<string> {
    const rows = await admin<{ count: string }[]>`
      select count(*)::text as count from app.offer_versions
      where workspace_id = ${WORKSPACE} and cms_document_id = ${DOCUMENT}
    `;
    return rows[0]?.count ?? '0';
  }

  test('a replayed delivery id is stored once and reported as duplicate', async () => {
    const deliveryId = 'delivery-replayed-451';
    const first = await store.acceptEvent({
      workspaceId: WORKSPACE,
      actorId: MACHINE_ACTOR,
      selector: 'site-1-sanity',
      providerAccount: PROVIDER_ACCOUNT,
      deliveryId,
      documentId: DOCUMENT,
      payload: { documentId: DOCUMENT },
    });
    const replay = await store.acceptEvent({
      workspaceId: WORKSPACE,
      actorId: MACHINE_ACTOR,
      selector: 'site-1-sanity',
      providerAccount: PROVIDER_ACCOUNT,
      deliveryId,
      documentId: DOCUMENT,
      payload: { documentId: DOCUMENT },
    });

    expect(first.duplicate).toBe(false);
    expect(replay).toEqual({ eventId: first.eventId, duplicate: true });

    // Exactly one inbox row exists for that delivery.
    const rows = await admin<{ count: string }[]>`
      select count(*)::text as count from app.catalogue_sync_events
      where workspace_id = ${WORKSPACE}
        and provider_account = ${PROVIDER_ACCOUNT}
        and delivery_id = ${deliveryId}
    `;
    expect(rows[0]?.count).toBe('1');
  });

  test('two revisions processed in reverse order converge on the current published document', async () => {
    const versionsBefore = await versionCount();
    // The CMS is already at r2 when both deliveries are processed. The older
    // r1 delivery is handled after the newer r2 delivery.
    catalogue.current = offer(7_500, 'r2');
    const newer = await deliver('delivery-r2');
    const older = await deliver('delivery-r1');
    expect(newer).not.toBe(older);

    await service.processEvent(WORKSPACE, newer);
    await service.processEvent(WORKSPACE, older);

    // Exactly one offer version was written and it is the current revision;
    // the late older delivery never persisted a superseded snapshot.
    expect(await versionCount()).toBe(String(Number(versionsBefore) + 1));
    const state = await currentState();
    expect(state?.cms_revision_id).toBe('r2');
    expect(state?.content.recurringChargeAmountMinor).toBe(7_500);
    expect(state?.revoked_at).toBeNull();

    const events = await admin<{ status: string; cms_revision_id: string | null }[]>`
      select status, cms_revision_id from app.catalogue_sync_events
      where workspace_id = ${WORKSPACE} and delivery_id in ('delivery-r2', 'delivery-r1')
      order by delivery_id
    `;
    expect(events.map((event) => event.status)).toEqual(['completed', 'completed']);
    expect(events.map((event) => event.cms_revision_id)).toEqual(['r2', 'r2']);
  });

  test('a delivery whose pre-lease read is already stale persists the post-lease state', async () => {
    const versionsBefore = await versionCount();
    // The first (pre-lease) read sees r1 and the second (post-lease) read sees
    // r2. Only the post-lease read may be persisted, so a delivery whose
    // payload/initial read is stale can never write the superseded snapshot.
    catalogue.sequence = [offer(4_100, 'r1'), offer(6_900, 'r2')];
    await service.processEvent(WORKSPACE, await deliver('delivery-divergent-reads'));

    const state = await currentState();
    expect(state?.cms_revision_id).toBe('r2');
    expect(state?.content.recurringChargeAmountMinor).toBe(6_900);
    // Only r2 was written: the stale r1 read was never persisted.
    expect(await versionCount()).toBe(String(Number(versionsBefore) + 1));
  });

  test('an unpublish followed by a stale publish delivery stays withdrawn', async () => {
    // Publish, then unpublish, then process a publish delivery that is stale.
    catalogue.current = offer(3_500, 'r1');
    await service.processEvent(WORKSPACE, await deliver('delivery-publish-r1'));
    expect((await currentState())?.revoked_at).toBeNull();

    catalogue.current = undefined;
    await service.processEvent(WORKSPACE, await deliver('delivery-unpublish'));
    expect((await currentState())?.revoked_at).not.toBeNull();
    const versionsBeforeStale = await versionCount();

    catalogue.current = undefined;
    await service.processEvent(WORKSPACE, await deliver('delivery-stale-publish'));

    // The stale delivery must not resurrect the withdrawn offer, and must not
    // append a version for the revision it carried.
    const state = await currentState();
    expect(state?.revoked_at).not.toBeNull();
    expect(state?.cms_revision_id).toBeNull();
    expect(await versionCount()).toBe(versionsBeforeStale);
  });

  test('attributes the inbox and sync writes to the registry machine actor', async () => {
    const registry = new MachineRegistry(
      {
        webhooks: [
          {
            selector: 'site-1-sanity',
            provider: 'sanity',
            providerAccount: PROVIDER_ACCOUNT,
            workspaceId: WORKSPACE,
            actorId: MACHINE_ACTOR,
            verificationSecret: WEBHOOK_SECRET,
            revoked: false,
          },
        ],
        schedulers: [],
      },
      () => NOW_MS,
    );
    const body = JSON.stringify({ documentId: DOCUMENT });
    const timestamp = String(NOW_MS / 1_000);
    const signature = `t=${timestamp},v1=${createHmac('sha256', WEBHOOK_SECRET)
      .update(`${timestamp}.${body}`)
      .digest('base64url')}`;
    const resolution = registry.resolveWebhook({
      selector: 'site-1-sanity',
      expectedProvider: 'sanity',
      providerAccount: PROVIDER_ACCOUNT,
      signature,
      rawBody: body,
    });
    expect(resolution.ok).toBe(true);
    if (!resolution.ok) return;
    // The verified machine identity is the actor the route threads into the inbox.
    expect(resolution.actorId).toBe(MACHINE_ACTOR);

    const accepted = await store.acceptEvent({
      workspaceId: WORKSPACE,
      actorId: resolution.actorId,
      selector: resolution.selector,
      providerAccount: resolution.providerAccount,
      deliveryId: 'delivery-actor-attribution',
      documentId: DOCUMENT,
      payload: { documentId: DOCUMENT },
    });

    // Inbox DB assertion: the row stores the registry actor, never the event id.
    const inbox = await admin<{ actor_id: string }[]>`
      select actor_id from app.catalogue_sync_events where id = ${accepted.eventId}
    `;
    expect(inbox[0]?.actor_id).toBe(MACHINE_ACTOR);
    expect(inbox[0]?.actor_id).not.toBe(accepted.eventId);

    // Sync DB assertion: the drain-time write is attributed to that same actor.
    const persistSpy = vi.spyOn(store, 'persistPublished');
    catalogue.current = offer(8_800, 'attribution-r1');
    await service.processEvent(WORKSPACE, accepted.eventId);
    const persisted = persistSpy.mock.calls[0]?.[0];
    expect(persisted?.actorId).toBe(MACHINE_ACTOR);
    expect(persisted?.actorId).not.toBe(accepted.eventId);

    const after = await admin<{ status: string; actor_id: string }[]>`
      select status, actor_id from app.catalogue_sync_events where id = ${accepted.eventId}
    `;
    expect(after[0]?.status).toBe('completed');
    expect(after[0]?.actor_id).toBe(MACHINE_ACTOR);
  });
});
