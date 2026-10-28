import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import express from 'express';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createDatabaseClient, type DatabaseClient } from '@canadian-plans/db';
import { applyMigrations } from '@canadian-plans/db/migrations';
import { setTestRuntimePassword, TEST_RUNTIME_PASSWORD } from '@canadian-plans/db/test-helpers';
import {
  createLeadFieldSchema,
  leadSearchSchema,
  leadFieldTypes,
  type LeadField,
  type LeadFieldFilter,
  type LeadType,
} from '@canadian-plans/contracts';
import { DatabaseLeadFieldStore, type LeadContext } from '../src/leads/model.js';
import { DatabaseStaffLeadStore } from '../src/leads/staff-store.js';
import { DatabaseDataModelPermissions } from '../src/leads/permissions.js';
import { DatabaseLeadStore } from '../src/leads/store.js';
import { restrictSubject } from '../src/deletion/store.js';
import { DatabaseAbandonedLeadPruner } from '../src/retention/abandoned-leads.js';
import { DatabaseStaffStore } from '../src/staff/store.js';
import { requireStaffSession } from '../src/auth/session.js';
import { createLeadModelRouter } from '../src/routes/lead-model.js';
import { requestId } from '../src/requestId.js';

const url = process.env.TEST_MIGRATION_DATABASE_URL;
if (
  (url || process.env.DB_TEST_ALLOW_DESTRUCTIVE) &&
  (!url ||
    process.env.DB_TEST_ALLOW_DESTRUCTIVE !== '1' ||
    !new URL(url).pathname.endsWith('_test'))
)
  throw new Error('Disposable database and explicit test opt-in required.');
const suite = url ? describe : describe.skip;
suite('lead data model with real Postgres and restricted-role HTTP handlers', () => {
  const workspaceId = randomUUID(),
    otherWorkspace = randomUUID(),
    actorId = randomUUID(),
    member = randomUUID(),
    viewer = randomUUID();
  const ctx: LeadContext = { workspaceId, actorId, requestId: randomUUID() };
  let admin: ReturnType<typeof postgres>,
    database: DatabaseClient,
    fields: DatabaseLeadFieldStore,
    staff: DatabaseStaffLeadStore,
    intake: DatabaseLeadStore,
    permissions: DatabaseDataModelPermissions,
    server: Server,
    origin: string;
  let memberId: string;
  beforeAll(async () => {
    if (!url) throw new Error('missing disposable database');
    await applyMigrations({ connectionString: url, ssl: false });
    admin = postgres(url, { ssl: false, max: 2, prepare: false });
    await setTestRuntimePassword(admin);
    for (const workspace of [workspaceId, otherWorkspace])
      await admin`insert into app.workspaces(id,slug,name) values (${workspace},${workspace},'Synthetic lead model')`;
    for (const [actor, role] of [
      [actorId, 'owner'],
      [member, 'orders'],
      [viewer, 'viewer'],
    ] as const) {
      const [membership] =
        await admin`insert into app.memberships(workspace_id,user_id,membership_type,status) values (${workspaceId},${actor},'staff','active') returning id`;
      const [roleRow] =
        await admin`insert into app.roles(workspace_id,name) values (${workspaceId},${role}) on conflict (workspace_id,name) do update set name=excluded.name returning id`;
      await admin`insert into app.membership_roles(workspace_id,membership_id,role_id) values (${workspaceId},${membership!.id},${roleRow!.id})`;
      if (actor === member) memberId = String(membership!.id);
    }
    await admin`insert into app.memberships(workspace_id,user_id,membership_type,status) values (${otherWorkspace},${actorId},'staff','active')`;
    const runtime = new URL(url);
    runtime.username = 'app_runtime';
    runtime.password = TEST_RUNTIME_PASSWORD;
    database = createDatabaseClient({
      connectionString: runtime.toString(),
      ssl: false,
      maxConnections: 4,
    });
    fields = new DatabaseLeadFieldStore(database);
    staff = new DatabaseStaffLeadStore(database);
    intake = new DatabaseLeadStore(database);
    permissions = new DatabaseDataModelPermissions(database);
    const app = express();
    app.use(express.json());
    app.use(requestId);
    app.use(
      requireStaffSession({
        verify: async (token) =>
          [actorId, member, viewer, `${actorId}:aal1`].includes(token)
            ? {
                actorId: token.split(':')[0]!,
                verifiedEmail: 'synthetic@example.test',
                assuranceLevel: token.endsWith(':aal1') ? 'aal1' : 'aal2',
              }
            : undefined,
      }),
    );
    app.use(
      createLeadModelRouter(new DatabaseStaffStore(database), {
        fields,
        leads: staff,
        permissions,
      }),
    );
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('missing test port');
    origin = `http://127.0.0.1:${address.port}`;
  });
  afterAll(async () => {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    await database?.close();
    await admin?.end();
  });
  const createField = (label: string, type: LeadField['type'] = 'text', extra = {}) =>
    fields.create(ctx, createLeadFieldSchema.parse({ label, type, ...extra }));
  const createLead = async (type: LeadType = 'sim') =>
    (await intake.createLead({ ...ctx, consentVersion: 'synthetic-v1', leadType: type })).lead.id;
  const setValue = async (id: string, field: LeadField, value: unknown) => {
    const current = await staff.detail(ctx, id, true);
    await staff.edit(ctx, id, {
      expectedVersion: current.lead.version,
      values: { [field.key]: value },
    });
  };
  const search = (field: LeadField, filters: LeadFieldFilter[], extra = {}) =>
    staff.search(ctx, leadSearchSchema.parse({ columns: [field.key], filters, ...extra }), true);
  const http = (path: string, token: string = actorId, method = 'GET', body?: unknown) =>
    fetch(`${origin}/workspaces/${workspaceId}/${path}`, {
      method,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        'content-type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  test('every data-model endpoint refuses ungranted members, missing sessions and AAL1', async () => {
    for (const [path, method, body] of [
      ['data-model/leads/fields', 'GET', undefined],
      ['data-model/leads/fields', 'POST', {}],
      [`data-model/leads/fields/${randomUUID()}`, 'PATCH', {}],
      [`data-model/leads/fields/${randomUUID()}`, 'DELETE', undefined],
      ['data-model/leads/settings', 'GET', undefined],
      ['data-model/leads/settings', 'PATCH', {}],
      ['data-model/leads/layouts/sim', 'GET', undefined],
      ['data-model/leads/layouts/sim', 'PATCH', {}],
    ] as const) {
      expect((await http(path, member, method, body)).status).toBe(403);
      expect((await http(path, `${actorId}:aal1`, method, body)).status).toBe(403);
      expect((await http(path, '', method, body)).status).toBe(401);
    }
    expect((await http('data-model/leads/fields')).status).toBe(200);
    expect(
      (await http(`memberships/${memberId}/data-model`, actorId, 'PATCH', { allowed: true }))
        .status,
    ).toBe(200);
    expect((await http('data-model/leads/fields', member)).status).toBe(200);
    expect(
      (await http(`memberships/${memberId}/data-model`, member, 'PATCH', { allowed: true })).status,
    ).toBe(403);
    await permissions.grant(ctx, memberId, false);
    expect((await http('data-model/leads/fields', member)).status).toBe(403);
  });
  test('field lifecycle protects values, reserves deleted keys and isolates workspaces', async () => {
    const field = await createField('Lifecycle');
    const lead = await createLead();
    await setValue(lead, field, 'kept');
    await expect(fields.delete(ctx, field.id)).rejects.toMatchObject({
      code: 'conflict',
      count: 1,
    });
    const hidden = await fields.update(ctx, field.id, { expectedVersion: 1, active: false });
    expect((await staff.detail(ctx, lead, true)).lead.fields).not.toHaveProperty(field.key);
    const active = await fields.update(ctx, field.id, {
      expectedVersion: hidden.version,
      active: true,
      label: 'Renamed',
    });
    expect(active.key).toBe(field.key);
    expect((await staff.detail(ctx, lead, true)).lead.fields[field.key]).toBe('kept');
    await expect(
      fields.delete({ ...ctx, workspaceId: otherWorkspace }, field.id),
    ).rejects.toMatchObject({ code: 'not_found' });
    await setValue(lead, active, null);
    await fields.delete(ctx, field.id);
    expect((await createField('Lifecycle')).key).not.toBe(field.key);
    const builtin = (await fields.list(ctx)).find((f) => f.key === 'fullName')!;
    await expect(fields.delete(ctx, builtin.id)).rejects.toMatchObject({ code: 'conflict' });
  });
  test('checks restricted/trash-equivalent values and options in the same transaction', async () => {
    const field = await createField('Choices', 'select', {
      options: [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
      ],
    });
    const lead = await createLead();
    await setValue(lead, field, 'one');
    await expect(
      fields.update(ctx, field.id, {
        expectedVersion: 1,
        options: field.options.filter((o) => o.value !== 'one'),
      }),
    ).rejects.toMatchObject({ code: 'conflict', count: 1 });
    const hidden = await fields.update(ctx, field.id, {
      expectedVersion: 1,
      options: field.options.map((o) => ({ ...o, hidden: o.value === 'one' })),
    });
    expect((await staff.detail(ctx, lead, true)).lead.fields[field.key]).toBe('one');
    await expect(setValue(await createLead(), hidden, 'one')).rejects.toThrow();
    // Existing non-null malformed/legacy values also prevent deletion.
    await admin`update app.leads set custom_values = ${admin.json({ [field.key]: { legacy: true } })} where workspace_id=${workspaceId} and id=${lead}`;
    await expect(fields.delete(ctx, field.id)).rejects.toMatchObject({ count: 1 });
  });
  test.each([
    ['text', 'A%_b', 'contains', '%_'],
    ['long_text', 'Long description', 'starts_with', 'long'],
    ['number', 12, 'gt', 10],
    ['boolean', false, 'eq', false],
    ['date', '2026-10-27', 'gte', '2026-10-01'],
    ['datetime', '2026-10-27T10:00:00Z', 'lt', '2026-11-01T00:00:00Z'],
    ['select', 'one', 'eq', 'one'],
    ['multi_select', ['one', 'two'], 'has_all', ['one', 'two']],
    ['phone', { number: '+1 (613) 555-0100', countryCode: 'CA' }, 'contains', '613-555'],
    ['email', { address: 'TEST@example.com' }, 'eq', 'test@EXAMPLE.COM'],
    ['address', { street: 'Test', city: 'Ottawa', postalCode: 'K1A 0B1' }, 'eq', 'ottawa'],
    ['links', [{ url: 'https://example.com/test' }], 'contains', 'EXAMPLE.COM'],
  ] as const)(
    'searches %s with typed operators and normalized values',
    async (type, value, operator, filterValue) => {
      const options =
        type === 'select' || type === 'multi_select'
          ? [
              { value: 'one', label: 'One' },
              { value: 'two', label: 'Two' },
            ]
          : [];
      const field = await createField(`Search ${type}`, type, { options });
      const lead = await createLead();
      await setValue(lead, field, value);
      const filter: LeadFieldFilter = {
        key: field.key,
        operator,
        value: typeof filterValue === 'object' ? [...filterValue] : filterValue,
        ...(type === 'address' ? { part: 'city' } : {}),
      };
      expect((await search(field, [filter])).leads.map((l) => l.id)).toEqual([lead]);
      if (type === 'multi_select')
        expect(
          (await search(field, [{ ...filter, operator: 'has_any', value: ['two'] }])).page.total,
        ).toBe(1);
      const scalar =
        type === 'phone'
          ? '+16135550100'
          : type === 'email'
            ? 'test@example.com'
            : type === 'address'
              ? 'Ottawa'
              : type === 'links'
                ? 'https://example.com/test'
                : typeof value === 'object'
                  ? ['one', 'two']
                  : value;
      const operators: LeadFieldFilter[] = leadFieldTypes[type].operators.map((operator) => ({
        key: field.key,
        operator,
        ...(type === 'address' ? { part: 'city' as const } : {}),
        ...(operator === 'empty' || operator === 'not_empty' ? {} : { value: scalar }),
      }));
      for (const operation of operators) {
        const found = (await search(field, [operation], { pageSize: 200 })).leads.some(
          (row) => row.id === lead,
        );
        expect(found, `${type} ${operation.operator}`).toBe(
          !['neq', 'gt', 'lt', 'empty'].includes(operation.operator),
        );
      }
      await admin`update app.leads set custom_values = ${admin.json({ [field.key]: { malformed: true } })} where id=${lead}`;
      for (const operation of operators)
        expect(
          (await search(field, [operation], { pageSize: 200 })).leads.some(
            (row) => row.id === lead,
          ),
          `malformed ${type} ${operation.operator}`,
        ).toBe(false);
      expect((await search(field, [filter])).page.total).toBe(0);
    },
  );
  test('guarded date casts, literal wildcards, pagination and null-last sorting', async () => {
    const field = await createField('Sort number', 'number');
    const a = await createLead(),
      b = await createLead(),
      c = await createLead();
    await setValue(a, field, 1);
    await setValue(b, field, 2);
    const filters: LeadFieldFilter[] = [{ key: field.key, operator: 'not_empty' }];
    const asc = await search(field, filters, {
      sort: { key: field.key, direction: 'asc' },
      pageSize: 1,
      page: 2,
    });
    expect(asc.page.total).toBe(2);
    expect(asc.leads[0]?.id).toBe(b);
    expect(
      (await search(field, filters, { sort: { key: field.key, direction: 'desc' } })).leads.map(
        (l) => l.id,
      ),
    ).toEqual([b, a]);
    for (const direction of ['asc', 'desc']) {
      const result = await search(field, [], {
        sort: { key: field.key, direction },
        pageSize: 200,
      });
      expect(result.leads.findIndex((l) => l.id === c)).toBeGreaterThan(1);
    }
    const date = await createField('Invalid calendar', 'date');
    await admin`update app.leads set custom_values=${admin.json({ [date.key]: '2026-02-30' })} where id=${c}`;
    expect(
      (await search(date, [{ key: date.key, operator: 'gte', value: '2026-01-01' }])).page.total,
    ).toBe(0);
  });
  test('sensitive fields, restricted leads and foreign leads never leak through queries', async () => {
    const f = await createField('Private answer', 'text', { sensitive: true });
    const id = await createLead();
    await setValue(id, f, 'secret-answer');
    for (const input of [
      { columns: [f.key], filters: [] },
      { columns: [], filters: [{ key: f.key, operator: 'eq', value: 'secret-answer' }] },
      { columns: [], filters: [], sort: { key: f.key, direction: 'asc' } },
    ])
      expect((await http('leads/search', actorId, 'POST', input)).status).toBe(400);
    expect(
      (await http('leads/search', viewer, 'POST', { columns: ['fullName'], filters: [] })).status,
    ).toBe(403);
    expect(JSON.stringify(await staff.detail(ctx, id, false))).not.toContain('secret-answer');
    await expect(
      staff.detail({ ...ctx, workspaceId: otherWorkspace }, id, true),
    ).rejects.toMatchObject({ code: 'not_found' });
    await admin`update app.leads set customer_data_restricted_at=now() where id=${id}`;
    await expect(staff.detail(ctx, id, true)).rejects.toMatchObject({ code: 'not_found' });
    const [row] = await admin`select custom_values from app.leads where id=${id}`;
    expect(row?.custom_values).toEqual({});
  });
  test('private views are actor scoped, revalidated and erased on restriction', async () => {
    const f = await createField('View field');
    const state = {
      columns: [f.key],
      filters: [{ key: f.key, operator: 'eq' as const, value: 'Private filter text' }],
    };
    const view = await staff.saveView(ctx, { name: 'My view', state });
    expect((await staff.listViews(ctx)).some((v) => v.id === view.id)).toBe(true);
    expect(await staff.listViews({ ...ctx, actorId: member })).toEqual([]);
    await expect(staff.deleteView({ ...ctx, actorId: member }, view.id)).rejects.toMatchObject({
      code: 'not_found',
    });
    expect(await staff.listViews({ ...ctx, workspaceId: otherWorkspace })).toEqual([]);
    await fields.update(ctx, f.id, { expectedVersion: 1, sensitive: true });
    expect(JSON.stringify(await staff.listViews(ctx))).not.toContain('Private filter text');
    expect(
      JSON.stringify(
        await admin`select state from app.lead_views where workspace_id=${workspaceId}`,
      ),
    ).not.toContain('Private filter text');
    const id = await createLead();
    await admin`update app.leads set customer_data_restricted_at=now() where id=${id}`;
    expect((await staff.listViews(ctx)).some((v) => v.id === view.id)).toBe(true);
  });
  test('restriction keeps personal views; customer deletion removes only free-text filter values', async () => {
    const text = await createField('Erasure text');
    const choice = await createField('Erasure choice', 'select', {
      options: [{ value: 'soon', label: 'Soon' }],
    });
    const state = {
      columns: [text.key, choice.key],
      filters: [
        { key: text.key, operator: 'contains' as const, value: 'Private customer text' },
        { key: choice.key, operator: 'eq' as const, value: 'soon' },
        { key: 'updatedAt', operator: 'gt' as const, value: '2026-01-01T00:00:00Z' },
      ],
      sort: { key: text.key, direction: 'asc' as const },
    };
    const view = await staff.saveView(ctx, { name: 'Erasure view', state });
    const mine = async () => (await staff.listViews(ctx)).find((v) => v.id === view.id);

    // The daily abandoned-draft prune restricts leads with the same column.
    const abandoned = await createLead();
    await setValue(abandoned, text, 'Old answer');
    await admin`update app.leads set updated_at = now() - interval '100 days' where id=${abandoned}`;
    const pruned = await new DatabaseAbandonedLeadPruner(database).restrictAbandoned({
      workspaceId,
      actorId,
      now: new Date(),
    });
    expect(pruned.restrictedLeads).toBeGreaterThanOrEqual(1);
    const [prunedRow] =
      await admin`select custom_values, customer_data_restricted_at from app.leads where id=${abandoned}`;
    expect(prunedRow?.['custom_values']).toEqual({});
    expect(prunedRow?.['customer_data_restricted_at']).not.toBeNull();
    expect(await mine()).toEqual(view);

    // A customer deletion request scrubs typed text but keeps the view.
    const erased = await createLead();
    await setValue(erased, text, 'Erase me');
    await database.withTenantTx(ctx, (tx) =>
      restrictSubject(tx, {
        workspaceId,
        subjectType: 'lead',
        subjectId: erased,
        leadId: erased,
        orderId: undefined,
      }),
    );
    const [erasedRow] = await admin`select custom_values from app.leads where id=${erased}`;
    expect(erasedRow?.['custom_values']).toEqual({});
    expect(await mine()).toEqual({
      ...view,
      version: 2,
      state: { ...state, filters: state.filters.slice(1) },
    });
    expect(
      JSON.stringify(
        await admin`select state from app.lead_views where workspace_id=${workspaceId}`,
      ),
    ).not.toContain('Private customer text');
    // The definer function refuses a workspace that is not the transaction's context.
    await expect(
      database.withTenantTx(ctx, (tx) =>
        tx.execute(sql`select app.scrub_lead_view_filters(${otherWorkspace})`),
      ),
    ).rejects.toThrow();
  });
  test('layout isolation and website allowlist retain unknown old draft answers', async () => {
    const f = await createField('Website answer', 'text', {
      websiteAccepted: true,
      leadTypes: ['sim'],
    });
    const draft = await intake.createLead({
      ...ctx,
      consentVersion: 'test',
      leadType: 'sim',
      form: { schemaVersion: 1, payload: { arrivalDate: '2026-12-01', [f.key]: 'Accepted' } },
    });
    const id = draft.lead.id;
    expect((await staff.detail(ctx, id, true)).lead.fields[f.key]).toBe('Accepted');
    const [stored] = await admin`select payload,custom_values from app.leads where id=${id}`;
    expect(stored?.payload.payload).not.toHaveProperty(f.key);
    const update = { ...ctx, leadId: id, grantToken: draft.grant.token };
    await expect(
      intake.updateLead({
        ...update,
        form: { schemaVersion: 1, payload: { surprise: 'rejected' } },
      }),
    ).rejects.toThrow();
    const staffOnly = await createField('Staff only');
    await expect(
      intake.updateLead({ ...update, customValues: { [staffOnly.key]: 'rejected' } }),
    ).rejects.toThrow();
    await admin`update app.leads set payload=jsonb_set(payload,'{payload,oldAnswer}','"preserved"') where id=${id}`;
    await intake.updateLead({
      ...update,
      form: { schemaVersion: 1, payload: { arrivalDate: '2026-12-02' } },
    });
    expect(await intake.readLead(update)).toMatchObject({
      status: 'read',
      draft: { customValues: { [f.key]: 'Accepted' } },
    });
    expect((await staff.detail(ctx, id, true)).legacy).toContainEqual({
      key: 'oldAnswer',
      label: 'Old Answer',
      value: 'preserved',
    });
    await expect(
      intake.updateLead({
        ...update,
        form: { schemaVersion: 1, payload: { oldAnswer: 'modified' } },
      }),
    ).rejects.toThrow();
    const layout = { sections: [{ id: 'arrival', label: 'Arrival', fields: [f.key] }] };
    await staff.saveLayout(ctx, 'sim', layout);
    expect((await staff.model(ctx)).layouts.sim).toEqual(layout);
    expect((await staff.model({ ...ctx, workspaceId: otherWorkspace })).layouts.sim).not.toEqual(
      layout,
    );
  });
  test('history and audit contain field names/keys but never values', async () => {
    const f = await createField('History answer');
    const id = await createLead();
    await setValue(id, f, 'Unique private sentinel');
    const detail = await staff.detail(ctx, id, true);
    expect(
      detail.history.some((h) => h.fields.some((v) => v.key === f.key && v.label === f.label)),
    ).toBe(true);
    const rows =
      await admin`select before,after from app.audit_events where workspace_id=${workspaceId}`;
    expect(JSON.stringify(rows)).not.toContain('Unique private sentinel');
    expect(JSON.stringify(detail.history)).not.toContain('Unique private sentinel');
  });
  test('address parts and any link normalize independently of their display labels', async () => {
    const address = await createField('All address parts', 'address');
    const id = await createLead();
    await setValue(id, address, {
      street: 'Test street',
      city: 'Ottawa',
      province: 'Ontario',
      postalCode: 'K1A 0B1',
      country: 'CA',
    });
    for (const [part, value] of [
      ['city', 'ottawa'],
      ['province', 'ontario'],
      ['postalCode', 'k1a-0b1'],
      ['country', 'ca'],
    ] as const)
      expect(
        (await search(address, [{ key: address.key, operator: 'eq', part, value }])).leads.map(
          (row) => row.id,
        ),
      ).toEqual([id]);
    const links = await createField('More than one link', 'links');
    await setValue(id, links, [
      { url: 'https://first.example.test' },
      { url: 'https://second.example.test/answer', label: 'A label' },
    ]);
    expect(
      (
        await search(links, [{ key: links.key, operator: 'contains', value: 'SECOND.example' }])
      ).leads.map((row) => row.id),
    ).toEqual([id]);
  });
  test('lead type inference follows category, offer and SIM signatures without guessing ambiguous rows', async () => {
    for (const [payload, offer, expected] of [
      [{ category: 'mobile', lines: 2 }, 'sim', 'mobile'],
      [{ category: 'internet', address: { city: 'Ottawa' } }, null, 'internet'],
      [{ documents: { acknowledged: true } }, 'sim', 'sim'],
      [{ arrivalDate: '2026-12-01' }, null, 'sim'],
      [{ oldAnswer: 'unknown' }, null, 'legacy'],
    ] as const) {
      const [row] =
        await admin`select app.infer_stored_lead_type(${admin.json({ schemaVersion: 1, payload })},${offer}) as type`;
      expect(row?.type).toBe(expected);
    }
  });
  test('RLS fails closed without context and tenant/actor composite references cannot cross sites', async () => {
    if (!url) throw new Error('missing test URL');
    const runtimeUrl = new URL(url);
    runtimeUrl.username = 'app_runtime';
    runtimeUrl.password = TEST_RUNTIME_PASSWORD;
    const runtime = postgres(runtimeUrl.toString(), { ssl: false, max: 1 });
    try {
      expect(await runtime`select id from app.lead_fields`).toEqual([]);
      expect(await runtime`select id from app.lead_layouts`).toEqual([]);
      expect(await runtime`select id from app.lead_object_settings`).toEqual([]);
      expect(await runtime`select id from app.lead_views`).toEqual([]);
      await expect(
        admin`insert into app.lead_views(workspace_id,actor_id,name,state) values (${otherWorkspace},${member},'Foreign','{}'::jsonb)`,
      ).rejects.toMatchObject({ code: '23503' });
      const field = await createField('Identity locked');
      await expect(
        database.withTenantTx(ctx, (tx) =>
          tx.execute(sql`update app.lead_fields set key='changed' where id=${field.id}`),
        ),
      ).rejects.toThrow();
    } finally {
      await runtime.end();
    }
  });
  test('concurrent deletion and value writes cannot lose an answer', async () => {
    const field = await createField('Concurrent answer');
    const id = await createLead();
    await Promise.allSettled([setValue(id, field, 'Kept'), fields.delete(ctx, field.id)]);
    const [row] =
      await admin`select f.deleted_at,l.custom_values from app.lead_fields f cross join app.leads l where f.id=${field.id} and l.id=${id}`;
    expect(row?.deleted_at !== null && row?.custom_values[field.key] !== undefined).toBe(false);
  });
});
