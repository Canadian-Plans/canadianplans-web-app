import { sql } from 'drizzle-orm';
import {
  leadStatuses,
  membershipStatuses,
  partnerStatuses,
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
const partnerStatusList = sql.raw(partnerStatuses.map((status) => `'${status}'`).join(', '));
const leadStatusList = sql.raw(leadStatuses.map((status) => `'${status}'`).join(', '));

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

/**
 * Referral agencies. T4P provides only identity, lifecycle state and the
 * referral code; T19 extends this same table with commission rules/lines and
 * invoices, so nothing here anticipates that shape.
 */
export const partners = appSchema
  .table(
    'partners',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      name: text('name').notNull(),
      referralCode: text('referral_code').notNull(),
      status: text('status').notNull(),
      createdAt: createdAt(),
    },
    (table) => [
      unique('partners_workspace_id_id_unique').on(table.workspaceId, table.id),
      uniqueIndex('partners_workspace_id_referral_code_unique').on(
        table.workspaceId,
        sql`lower(${table.referralCode})`,
      ),
      index('partners_workspace_id_status_idx').on(table.workspaceId, table.status),
      check('partners_status_check', sql`${table.status} in (${partnerStatusList})`),
      tenantPolicy('partners_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

/**
 * Product identity (T10A). Keyed by the CMS's stable `productKey` (never the
 * Sanity `_id`, `title` or `slug` — see `product` in
 * packages/contracts/src/cms/schema-types.ts). T10 owns creating these rows
 * during catalogue sync; this table only anchors workspace ownership.
 */
export const products = appSchema
  .table(
    'products',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      productKey: text('product_key').notNull(),
      createdAt: createdAt(),
    },
    (table) => [
      unique('products_workspace_id_id_unique').on(table.workspaceId, table.id),
      unique('products_workspace_id_product_key_unique').on(table.workspaceId, table.productKey),
      tenantPolicy('products_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

/**
 * Immutable commercial-content snapshots for a product (T10A;
 * IMPLEMENTATION_PLAN.md §6 "Offer synchronisation"). `content` is the exact
 * validated commercial payload T10's sync copies from the published CMS
 * offer document; `contentHash` is T10's canonical hash of that same payload,
 * unique per product so re-syncing unchanged content never creates a
 * duplicate version. `cmsDocumentId`/`cmsRevisionId` are provenance only —
 * nullable (synthetic/test fixtures have none) and excluded from the
 * uniqueness key, so reconfirming a version from a later CMS revision never
 * forces a new row. Rows are never updated or deleted: `app_runtime` is
 * granted only SELECT/INSERT, the same immutability enforcement already used
 * for `audit_events`.
 */
export const offerVersions = appSchema
  .table(
    'offer_versions',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      productId: uuid('product_id').notNull(),
      content: jsonb('content').notNull(),
      contentHash: text('content_hash').notNull(),
      cmsDocumentId: text('cms_document_id'),
      cmsRevisionId: text('cms_revision_id'),
      createdAt: createdAt(),
    },
    (table) => [
      unique('offer_versions_workspace_id_id_unique').on(table.workspaceId, table.id),
      unique('offer_versions_workspace_product_content_hash_unique').on(
        table.workspaceId,
        table.productId,
        table.contentHash,
      ),
      foreignKey({
        name: 'offer_versions_workspace_product_fk',
        columns: [table.workspaceId, table.productId],
        foreignColumns: [products.workspaceId, products.id],
      }),
      index('offer_versions_workspace_id_product_id_created_at_idx').on(
        table.workspaceId,
        table.productId,
        table.createdAt,
      ),
      tenantPolicy('offer_versions_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

/**
 * Mutable availability/revocation state, kept separate from immutable
 * `offer_versions` so unpublishing a product never edits offer history
 * (IMPLEMENTATION_PLAN.md §6). One row per product; `revokedAt` null means
 * available for new quotes, matching the `revokedAt` convention already used
 * by `memberships` and `service_credentials`.
 */
export const productAvailability = appSchema
  .table(
    'product_availability',
    {
      productId: uuid('product_id').primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
    },
    (table) => [
      foreignKey({
        name: 'product_availability_workspace_product_fk',
        columns: [table.workspaceId, table.productId],
        foreignColumns: [products.workspaceId, products.id],
      }).onDelete('cascade'),
      tenantPolicy('product_availability_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

/**
 * A prospective customer's in-progress plan application (T11; REQ 16/17).
 * `incomplete` while the customer is still filling in the form — repeated
 * saves update this same row via its draft grant; `submitted` once it
 * converts to an order (T12). Contact fields are individually nullable since
 * they are captured progressively. `payload` is the versioned form
 * (`{schemaVersion, payload}`); `attribution` is the bounded, allowlisted
 * UTM/referrer/landing-page/partner-code snapshot the backend sanitizes
 * before it is ever written (REQ 35) — never raw request data.
 */
export const leads = appSchema
  .table(
    'leads',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      status: text('status').notNull(),
      fullName: text('full_name'),
      email: text('email'),
      phone: text('phone'),
      countryCode: text('country_code'),
      partnerId: uuid('partner_id'),
      selectedOfferVersionId: uuid('selected_offer_version_id'),
      payload: jsonb('payload'),
      attribution: jsonb('attribution').notNull().default({}),
      consentVersion: text('consent_version').notNull(),
      createdAt: createdAt(),
      updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
        .defaultNow()
        .notNull(),
    },
    (table) => [
      unique('leads_workspace_id_id_unique').on(table.workspaceId, table.id),
      check('leads_status_check', sql`${table.status} in (${leadStatusList})`),
      foreignKey({
        name: 'leads_workspace_partner_fk',
        columns: [table.workspaceId, table.partnerId],
        foreignColumns: [partners.workspaceId, partners.id],
      }),
      foreignKey({
        name: 'leads_workspace_offer_version_fk',
        columns: [table.workspaceId, table.selectedOfferVersionId],
        foreignColumns: [offerVersions.workspaceId, offerVersions.id],
      }),
      index('leads_workspace_id_status_idx').on(table.workspaceId, table.status),
      index('leads_workspace_id_updated_at_idx').on(table.workspaceId, table.updatedAt),
      tenantPolicy('leads_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

/**
 * A scoped bearer token letting an anonymous visitor resume their own draft
 * lead (glossary; T11). Verified within the already-established website
 * tenant context — unlike the service credential itself, this never needs a
 * pre-tenant lookup. `revokedAt` is unused by this task (no revoke endpoint
 * yet) but reserved for the future deletion/withdrawal path.
 */
export const draftGrants = appSchema
  .table(
    'draft_grants',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      leadId: uuid('lead_id').notNull(),
      tokenHash: text('token_hash').notNull(),
      expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
      revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
      createdAt: createdAt(),
    },
    (table) => [
      unique('draft_grants_token_hash_unique').on(table.tokenHash),
      foreignKey({
        name: 'draft_grants_workspace_lead_fk',
        columns: [table.workspaceId, table.leadId],
        foreignColumns: [leads.workspaceId, leads.id],
      }).onDelete('cascade'),
      index('draft_grants_workspace_id_lead_id_idx').on(table.workspaceId, table.leadId),
      tenantPolicy('draft_grants_tenant_policy', table.workspaceId),
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
  partners,
  products,
  offerVersions,
  productAvailability,
  leads,
  draftGrants,
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
export type Partner = typeof partners.$inferSelect;
export type Product = typeof products.$inferSelect;
export type OfferVersion = typeof offerVersions.$inferSelect;
export type ProductAvailability = typeof productAvailability.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type DraftGrant = typeof draftGrants.$inferSelect;
export type ServiceCredential = typeof serviceCredentials.$inferSelect;
export type RateLimitBucket = typeof rateLimitBuckets.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
