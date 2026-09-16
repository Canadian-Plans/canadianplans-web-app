import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { createDatabaseClient, type DatabaseClient } from '../src/index.js';
import { applyMigrations } from '../src/migrations.js';
import { seedDatabase } from '../src/seed.js';

function getDisposableTestDatabaseUrl(): string | undefined {
  const migrationUrl = process.env.TEST_MIGRATION_DATABASE_URL;
  const destructiveTestsEnabled = process.env.DB_TEST_ALLOW_DESTRUCTIVE === '1';

  if (!migrationUrl && !destructiveTestsEnabled) return undefined;
  if (!migrationUrl || !destructiveTestsEnabled) {
    throw new Error(
      'Database integration tests require TEST_MIGRATION_DATABASE_URL and DB_TEST_ALLOW_DESTRUCTIVE=1 together.',
    );
  }

  const databaseName = decodeURIComponent(new URL(migrationUrl).pathname.slice(1));
  if (!databaseName.endsWith('_test')) {
    throw new Error('TEST_MIGRATION_DATABASE_URL must name a disposable database ending in _test.');
  }

  return migrationUrl;
}

const migrationUrl = getDisposableTestDatabaseUrl();
const databaseTest = migrationUrl ? describe : describe.skip;

// A distinct id range from rls.integration.test.ts and partners.integration.test.ts
// so no test file shares rows on the same disposable test database.
const WORKSPACE_A = '10000000-0000-4000-8000-000000000021';
const WORKSPACE_B = '10000000-0000-4000-8000-000000000022';
const ACTOR_A = '20000000-0000-4000-8000-000000000021';
const ACTOR_B = '20000000-0000-4000-8000-000000000022';
const PRODUCT_A = '90000000-0000-4000-8000-000000000021';
const PRODUCT_A2 = '90000000-0000-4000-8000-000000000023';
const PRODUCT_B = '90000000-0000-4000-8000-000000000022';
const OFFER_VERSION_A1 = '91000000-0000-4000-8000-000000000021';
const SHARED_CONTENT_HASH = 'sha256:shared-test-hash';
const TEST_RUNTIME_PASSWORD = 'local_ci_runtime_password';

databaseTest('catalogue tables (T10A)', () => {
  let admin: ReturnType<typeof postgres>;
  let runtimeSql: ReturnType<typeof postgres>;
  let tenantDatabase: DatabaseClient;

  beforeAll(async () => {
    if (!migrationUrl) throw new Error('TEST_MIGRATION_DATABASE_URL is required');

    await applyMigrations({ connectionString: migrationUrl, ssl: false });
    await seedDatabase({ connectionString: migrationUrl, ssl: false });
    admin = postgres(migrationUrl, { max: 1, prepare: false, ssl: false });

    // Synthetic CI-only password, matching rls.integration.test.ts.
    await admin.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(745284914)`;
      await tx.unsafe(`ALTER ROLE app_runtime PASSWORD '${TEST_RUNTIME_PASSWORD}'`);
    });

    await admin`
      insert into app.workspaces (id, slug, name)
      values
        (${WORKSPACE_A}, 'ci-catalogue-workspace-a', 'CI Catalogue Workspace A'),
        (${WORKSPACE_B}, 'ci-catalogue-workspace-b', 'CI Catalogue Workspace B')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.products (id, workspace_id, product_key)
      values
        (${PRODUCT_A}, ${WORKSPACE_A}, 'ci-starter-5gb'),
        (${PRODUCT_A2}, ${WORKSPACE_A}, 'ci-unlimited-plus'),
        (${PRODUCT_B}, ${WORKSPACE_B}, 'ci-starter-5gb')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.offer_versions (id, workspace_id, product_id, content, content_hash)
      values (
        ${OFFER_VERSION_A1},
        ${WORKSPACE_A},
        ${PRODUCT_A},
        '{"name": "CI fixture"}'::jsonb,
        ${SHARED_CONTENT_HASH}
      )
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.product_availability (product_id, workspace_id, revoked_at)
      values (${PRODUCT_A}, ${WORKSPACE_A}, null)
      on conflict (product_id) do nothing
    `;

    const runtimeUrl = new URL(migrationUrl);
    runtimeUrl.username = 'app_runtime';
    runtimeUrl.password = TEST_RUNTIME_PASSWORD;
    runtimeSql = postgres(runtimeUrl.toString(), { max: 1, prepare: false, ssl: false });
    tenantDatabase = createDatabaseClient({
      connectionString: runtimeUrl.toString(),
      maxConnections: 1,
      ssl: false,
    });
  });

  afterAll(async () => {
    await tenantDatabase.close();
    await runtimeSql.end();
    await admin.end();
  });

  test('product_key must be unique within a workspace', async () => {
    await expect(
      admin`
        insert into app.products (workspace_id, product_key)
        values (${WORKSPACE_A}, 'ci-starter-5gb')
      `,
    ).rejects.toMatchObject({ code: '23505' });
  });

  test('the same product_key may be reused by a different workspace', async () => {
    const rows = await admin`
      select workspace_id from app.products
      where product_key = 'ci-starter-5gb'
      order by workspace_id
    `;
    expect(rows).toEqual([{ workspace_id: WORKSPACE_A }, { workspace_id: WORKSPACE_B }]);
  });

  test('content hash must be unique per workspace and product', async () => {
    await expect(
      admin`
        insert into app.offer_versions (workspace_id, product_id, content, content_hash)
        values (${WORKSPACE_A}, ${PRODUCT_A}, '{"name": "duplicate"}'::jsonb, ${SHARED_CONTENT_HASH})
      `,
    ).rejects.toMatchObject({ code: '23505' });
  });

  test('the same content hash may recur for a different product or workspace', async () => {
    await admin`
      insert into app.offer_versions (workspace_id, product_id, content, content_hash)
      values
        (${WORKSPACE_A}, ${PRODUCT_A2}, '{"name": "different product"}'::jsonb, ${SHARED_CONTENT_HASH}),
        (${WORKSPACE_B}, ${PRODUCT_B}, '{"name": "different workspace"}'::jsonb, ${SHARED_CONTENT_HASH})
    `;

    const rows = await admin`
      select workspace_id, product_id from app.offer_versions
      where content_hash = ${SHARED_CONTENT_HASH}
      order by workspace_id, product_id
    `;
    expect(rows).toHaveLength(3);
  });

  test('the runtime role can insert an offer version within its own tenant context', async () => {
    const inserted = await tenantDatabase.withTenantTx(
      { workspaceId: WORKSPACE_A, actorId: ACTOR_A },
      (tx) =>
        tx.execute<{ id: string }>(sql`
          insert into app.offer_versions (workspace_id, product_id, content, content_hash)
          values (${WORKSPACE_A}, ${PRODUCT_A}, '{"name": "tenant insert"}'::jsonb, 'sha256:tenant-insert')
          returning id
        `),
    );
    expect(inserted).toHaveLength(1);
  });

  test('offer_versions cannot be updated or deleted by the runtime role', async () => {
    await expect(
      tenantDatabase.withTenantTx({ workspaceId: WORKSPACE_A, actorId: ACTOR_A }, (tx) =>
        tx.execute(sql`
          update app.offer_versions set content_hash = 'tampered' where id = ${OFFER_VERSION_A1}
        `),
      ),
    ).rejects.toMatchObject({ cause: { code: '42501' } });

    await expect(
      tenantDatabase.withTenantTx({ workspaceId: WORKSPACE_A, actorId: ACTOR_A }, (tx) =>
        tx.execute(sql`delete from app.offer_versions where id = ${OFFER_VERSION_A1}`),
      ),
    ).rejects.toMatchObject({ cause: { code: '42501' } });
  });

  test('wrong workspace context sees zero rows for products and offer_versions', async () => {
    const productRows = await tenantDatabase.withTenantTx(
      { workspaceId: WORKSPACE_B, actorId: ACTOR_B },
      (tx) => tx.execute(sql`select id from app.products where id = ${PRODUCT_A}`),
    );
    expect(productRows).toHaveLength(0);

    const offerVersionRows = await tenantDatabase.withTenantTx(
      { workspaceId: WORKSPACE_B, actorId: ACTOR_B },
      (tx) => tx.execute(sql`select id from app.offer_versions where id = ${OFFER_VERSION_A1}`),
    );
    expect(offerVersionRows).toHaveLength(0);
  });

  test('a composite foreign key can reference offer_versions by (workspace_id, id)', async () => {
    await admin`
      create table ci_offer_version_reference (
        id uuid primary key default gen_random_uuid(),
        workspace_id uuid not null,
        offer_version_id uuid not null,
        constraint ci_offer_version_reference_fk
          foreign key (workspace_id, offer_version_id)
          references app.offer_versions (workspace_id, id)
      )
    `;

    await admin`
      insert into ci_offer_version_reference (workspace_id, offer_version_id)
      values (${WORKSPACE_A}, ${OFFER_VERSION_A1})
    `;

    await expect(
      admin`
        insert into ci_offer_version_reference (workspace_id, offer_version_id)
        values (${WORKSPACE_B}, ${OFFER_VERSION_A1})
      `,
    ).rejects.toMatchObject({ code: '23503' });

    await admin`drop table ci_offer_version_reference`;
  });

  test('a composite foreign key rejects a cross-workspace product on product_availability', async () => {
    await expect(
      admin`
        insert into app.product_availability (product_id, workspace_id, revoked_at)
        values (${PRODUCT_A2}, ${WORKSPACE_B}, null)
      `,
    ).rejects.toMatchObject({ code: '23503' });
  });

  test('a composite foreign key rejects a cross-workspace product on offer_versions', async () => {
    await expect(
      admin`
        insert into app.offer_versions (
          workspace_id, product_id, content, content_hash
        ) values (
          ${WORKSPACE_B}, ${PRODUCT_A}, '{"name": "foreign product"}'::jsonb, 'sha256:foreign-product'
        )
      `,
    ).rejects.toMatchObject({ code: '23503' });
  });

  test('CMS document and revision provenance are stored independently of commercial identity', async () => {
    const [row] = await admin<{ cms_document_id: string; cms_revision_id: string }[]>`
      insert into app.offer_versions (
        workspace_id, product_id, content, content_hash, cms_document_id, cms_revision_id
      ) values (
        ${WORKSPACE_A}, ${PRODUCT_A}, '{"name": "provenance"}'::jsonb,
        'sha256:provenance', 'sanity-product-1', 'revision-42'
      )
      returning cms_document_id, cms_revision_id
    `;
    expect(row).toEqual({
      cms_document_id: 'sanity-product-1',
      cms_revision_id: 'revision-42',
    });
  });

  test('runtime product deletion cannot cascade into immutable offer history', async () => {
    await expect(
      tenantDatabase.withTenantTx({ workspaceId: WORKSPACE_A, actorId: ACTOR_A }, (tx) =>
        tx.execute(sql`delete from app.products where id = ${PRODUCT_A}`),
      ),
    ).rejects.toMatchObject({ cause: { code: '23503' } });

    const versions = await admin`
      select id from app.offer_versions where product_id = ${PRODUCT_A}
    `;
    expect(versions.length).toBeGreaterThan(0);
  });

  test('revoking a product sets availability without touching its offer versions', async () => {
    await admin`
      update app.product_availability set revoked_at = now() where product_id = ${PRODUCT_A}
    `;

    const [availability] = await admin<{ revoked_at: Date | null }[]>`
      select revoked_at from app.product_availability where product_id = ${PRODUCT_A}
    `;
    expect(availability?.revoked_at).not.toBeNull();

    const [offerVersion] = await admin<{ content_hash: string }[]>`
      select content_hash from app.offer_versions where id = ${OFFER_VERSION_A1}
    `;
    expect(offerVersion).toEqual({ content_hash: SHARED_CONTENT_HASH });

    await admin`
      update app.product_availability set revoked_at = null where product_id = ${PRODUCT_A}
    `;
  });
});
