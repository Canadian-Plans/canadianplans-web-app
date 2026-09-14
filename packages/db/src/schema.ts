import { sql } from 'drizzle-orm';
import {
  membershipStatuses,
  permissionEffects,
  staffPermissionNames,
  staffRoleNames,
} from '@canadian-plans/types';
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgRole,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

export const appSchema = pgSchema('app');

export const membershipType = appSchema.enum('membership_type', ['staff', 'partner']);
export const roleName = appSchema.enum('role_name', staffRoleNames);
export const permissionName = appSchema.enum('permission_name', staffPermissionNames);
export const permissionEffect = appSchema.enum('permission_effect', permissionEffects);

const appRuntimeRole = pgRole('app_runtime').existing();

function tenantPolicy(name: string, workspaceId: AnyPgColumn) {
  const predicate = sql`${workspaceId} = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null`;

  return pgPolicy(name, {
    for: 'all',
    to: appRuntimeRole,
    using: predicate,
    withCheck: predicate,
  });
}

const createdAt = () =>
  timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull();

const membershipStatusList = sql.raw(membershipStatuses.map((status) => `'${status}'`).join(', '));

/** Global workspace registry: the sole non-tenant table in this migration. */
export const workspaces = appSchema.table('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  createdAt: createdAt(),
});

export const memberships = appSchema
  .table(
    'memberships',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      userId: uuid('user_id'),
      invitedEmail: text('invited_email'),
      membershipType: membershipType('membership_type').notNull(),
      status: text('status').notNull(),
      acceptedAt: timestamp('accepted_at', { withTimezone: true, mode: 'date' }),
      revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
      createdAt: createdAt(),
    },
    (table) => [
      unique('memberships_workspace_id_id_unique').on(table.workspaceId, table.id),
      unique('memberships_workspace_id_user_id_unique').on(table.workspaceId, table.userId),
      uniqueIndex('memberships_workspace_pending_email_unique')
        .on(table.workspaceId, sql`lower(${table.invitedEmail})`)
        .where(sql`${table.status} = 'pending'`),
      index('memberships_workspace_id_status_idx').on(
        table.workspaceId,
        table.status,
        table.userId,
      ),
      index('memberships_user_id_status_workspace_id_idx').on(
        table.userId,
        table.status,
        table.workspaceId,
      ),
      check('memberships_status_check', sql`${table.status} in (${membershipStatusList})`),
      check(
        'memberships_identity_state_check',
        sql`(
          ${table.status} = 'pending'
          and ${table.userId} is null
          and ${table.invitedEmail} is not null
        ) or (
          ${table.status} = 'active'
          and ${table.userId} is not null
          and ${table.invitedEmail} is null
        ) or ${table.status} = 'revoked'`,
      ),
      tenantPolicy('memberships_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

export const roles = appSchema
  .table(
    'roles',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      name: roleName('name').notNull(),
      createdAt: createdAt(),
    },
    (table) => [
      unique('roles_workspace_id_id_unique').on(table.workspaceId, table.id),
      unique('roles_workspace_id_name_unique').on(table.workspaceId, table.name),
      tenantPolicy('roles_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

export const membershipRoles = appSchema
  .table(
    'membership_roles',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      membershipId: uuid('membership_id').notNull(),
      roleId: uuid('role_id').notNull(),
      createdAt: createdAt(),
    },
    (table) => [
      unique('membership_roles_workspace_id_id_unique').on(table.workspaceId, table.id),
      unique('membership_roles_workspace_membership_role_unique').on(
        table.workspaceId,
        table.membershipId,
        table.roleId,
      ),
      foreignKey({
        name: 'membership_roles_workspace_membership_fk',
        columns: [table.workspaceId, table.membershipId],
        foreignColumns: [memberships.workspaceId, memberships.id],
      }).onDelete('cascade'),
      foreignKey({
        name: 'membership_roles_workspace_role_fk',
        columns: [table.workspaceId, table.roleId],
        foreignColumns: [roles.workspaceId, roles.id],
      }).onDelete('cascade'),
      index('membership_roles_workspace_id_role_id_idx').on(table.workspaceId, table.roleId),
      tenantPolicy('membership_roles_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

export const permissions = appSchema
  .table(
    'permissions',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      name: permissionName('name').notNull(),
      createdAt: createdAt(),
    },
    (table) => [
      unique('permissions_workspace_id_id_unique').on(table.workspaceId, table.id),
      unique('permissions_workspace_id_name_unique').on(table.workspaceId, table.name),
      tenantPolicy('permissions_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

export const membershipPermissions = appSchema
  .table(
    'membership_permissions',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      membershipId: uuid('membership_id').notNull(),
      permissionId: uuid('permission_id').notNull(),
      effect: permissionEffect('effect').default('allow').notNull(),
      createdAt: createdAt(),
    },
    (table) => [
      unique('membership_permissions_workspace_id_id_unique').on(table.workspaceId, table.id),
      unique('membership_permissions_workspace_membership_permission_unique').on(
        table.workspaceId,
        table.membershipId,
        table.permissionId,
      ),
      foreignKey({
        name: 'membership_permissions_workspace_membership_fk',
        columns: [table.workspaceId, table.membershipId],
        foreignColumns: [memberships.workspaceId, memberships.id],
      }).onDelete('cascade'),
      foreignKey({
        name: 'membership_permissions_workspace_permission_fk',
        columns: [table.workspaceId, table.permissionId],
        foreignColumns: [permissions.workspaceId, permissions.id],
      }).onDelete('cascade'),
      index('membership_permissions_workspace_id_permission_id_idx').on(
        table.workspaceId,
        table.permissionId,
      ),
      tenantPolicy('membership_permissions_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

export const serviceCredentials = appSchema
  .table(
    'service_credentials',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      secretHash: text('secret_hash').notNull(),
      scopes: text('scopes')
        .array()
        .default(sql`array[]::text[]`)
        .notNull(),
      revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
      createdAt: createdAt(),
    },
    (table) => [
      unique('service_credentials_workspace_id_id_unique').on(table.workspaceId, table.id),
      // A credential secret resolves to exactly one workspace before tenant
      // context exists (the website bootstrap lookup in PLATFORM_CONTEXT §4b);
      // a global unique hash guarantees that resolution is unambiguous.
      unique('service_credentials_secret_hash_unique').on(table.secretHash),
      index('service_credentials_workspace_id_revoked_at_idx').on(
        table.workspaceId,
        table.revokedAt,
      ),
      tenantPolicy('service_credentials_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

/**
 * Durable, bounded per-key rate-limit buckets for public (pre-tenant) requests.
 * There is no tenant policy and no `app_runtime` table grant: the runtime role
 * reaches these rows only through the SECURITY DEFINER `app.rate_limit_hit`
 * function, so a bug in application code cannot read or scan the counters. Rows
 * are keyed per credential/IP + fixed window, never a single global counter.
 */
export const rateLimitBuckets = appSchema
  .table(
    'rate_limit_buckets',
    {
      bucketKey: text('bucket_key').notNull(),
      windowStart: timestamp('window_start', { withTimezone: true, mode: 'date' }).notNull(),
      requestCount: integer('request_count').default(1).notNull(),
      expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    },
    (table) => [
      primaryKey({ columns: [table.bucketKey, table.windowStart] }),
      index('rate_limit_buckets_expires_at_idx').on(table.expiresAt),
    ],
  )
  .enableRLS();

export const auditEvents = appSchema
  .table(
    'audit_events',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      actorId: uuid('actor_id').notNull(),
      actorLabel: text('actor_label').notNull(),
      action: text('action').notNull(),
      entity: text('entity').notNull(),
      entityId: uuid('entity_id').notNull(),
      before: jsonb('before'),
      after: jsonb('after'),
      requestId: uuid('request_id').notNull(),
      createdAt: createdAt(),
    },
    (table) => [
      unique('audit_events_workspace_id_id_unique').on(table.workspaceId, table.id),
      index('audit_events_workspace_id_created_at_idx').on(table.workspaceId, table.createdAt),
      index('audit_events_workspace_id_entity_idx').on(
        table.workspaceId,
        table.entity,
        table.entityId,
      ),
      index('audit_events_workspace_id_request_id_idx').on(table.workspaceId, table.requestId),
      tenantPolicy('audit_events_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

export const schema = {
  workspaces,
  memberships,
  roles,
  membershipRoles,
  permissions,
  membershipPermissions,
  serviceCredentials,
  rateLimitBuckets,
  auditEvents,
};

export type Workspace = typeof workspaces.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type MembershipRole = typeof membershipRoles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type MembershipPermission = typeof membershipPermissions.$inferSelect;
export type ServiceCredential = typeof serviceCredentials.$inferSelect;
export type RateLimitBucket = typeof rateLimitBuckets.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
