import { sql } from 'drizzle-orm';
import {
  deliveryStates,
  leadStatuses,
  membershipStatuses,
  orderStatuses,
  partnerStatuses,
  paymentStates,
  permissionEffects,
  staffPermissionNames,
  staffRoleNames,
} from '@canadian-plans/types';
import {
  check,
  boolean,
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
const orderStatusList = sql.raw(orderStatuses.map((status) => `'${status}'`).join(', '));
const paymentStateList = sql.raw(paymentStates.map((state) => `'${state}'`).join(', '));
const deliveryStateList = sql.raw(deliveryStates.map((state) => `'${state}'`).join(', '));

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
      unique('offer_versions_workspace_product_id_unique').on(
        table.workspaceId,
        table.productId,
        table.id,
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
      currentOfferVersionId: uuid('current_offer_version_id'),
      revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
      lastSyncedAt: timestamp('last_synced_at', { withTimezone: true, mode: 'date' }),
    },
    (table) => [
      foreignKey({
        name: 'product_availability_workspace_product_fk',
        columns: [table.workspaceId, table.productId],
        foreignColumns: [products.workspaceId, products.id],
      }).onDelete('cascade'),
      foreignKey({
        name: 'product_availability_workspace_current_version_fk',
        columns: [table.workspaceId, table.productId, table.currentOfferVersionId],
        foreignColumns: [offerVersions.workspaceId, offerVersions.productId, offerVersions.id],
      }),
      tenantPolicy('product_availability_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

/** Durable, tenant-scoped Sanity webhook inbox. Payloads are retained only as
 * delivery evidence/selectors; commercial fields are always re-fetched. */
export const catalogueSyncEvents = appSchema
  .table(
    'catalogue_sync_events',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      selector: text('selector').notNull(),
      providerAccount: text('provider_account').notNull(),
      deliveryId: text('delivery_id').notNull(),
      documentId: text('document_id').notNull(),
      payload: jsonb('payload').notNull(),
      status: text('status').default('pending').notNull(),
      attempts: integer('attempts').default(0).notNull(),
      errorCode: text('error_code'),
      cmsRevisionId: text('cms_revision_id'),
      occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' }),
      processedAt: timestamp('processed_at', { withTimezone: true, mode: 'date' }),
      createdAt: createdAt(),
      updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
        .defaultNow()
        .notNull(),
    },
    (table) => [
      unique('catalogue_sync_events_workspace_id_id_unique').on(table.workspaceId, table.id),
      unique('catalogue_sync_events_delivery_unique').on(
        table.workspaceId,
        table.providerAccount,
        table.deliveryId,
      ),
      check(
        'catalogue_sync_events_status_check',
        sql`${table.status} in ('pending', 'processing', 'completed', 'failed', 'ignored')`,
      ),
      index('catalogue_sync_events_workspace_status_created_idx').on(
        table.workspaceId,
        table.status,
        table.createdAt,
      ),
      tenantPolicy('catalogue_sync_events_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

/** Short database-backed lease; process memory is not durable on Vercel. */
export const catalogueSyncLeases = appSchema
  .table(
    'catalogue_sync_leases',
    {
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      productKey: text('product_key').notNull(),
      ownerId: uuid('owner_id').notNull(),
      expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
      createdAt: createdAt(),
      updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
        .defaultNow()
        .notNull(),
    },
    (table) => [
      primaryKey({ columns: [table.workspaceId, table.productKey] }),
      index('catalogue_sync_leases_workspace_expires_idx').on(table.workspaceId, table.expiresAt),
      tenantPolicy('catalogue_sync_leases_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

/** One operational summary row per workspace for the read-only admin view. */
export const catalogueSyncState = appSchema
  .table(
    'catalogue_sync_state',
    {
      workspaceId: uuid('workspace_id')
        .primaryKey()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true, mode: 'date' }),
      lastSuccessAt: timestamp('last_success_at', { withTimezone: true, mode: 'date' }),
      lastErrorCode: text('last_error_code'),
      createdAt: createdAt(),
      updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
        .defaultNow()
        .notNull(),
    },
    (table) => [tenantPolicy('catalogue_sync_state_tenant_policy', table.workspaceId)],
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

/** Immutable-at-submission order envelope. Commercial details live in snapshot. */
export const orders = appSchema
  .table(
    'orders',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      reference: text('reference').notNull(),
      leadId: uuid('lead_id').notNull(),
      status: text('status').notNull(),
      paymentState: text('payment_state').notNull(),
      deliveryState: text('delivery_state').notNull(),
      archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'date' }),
      assigneeId: uuid('assignee_id'),
      version: integer('version').default(1).notNull(),
      snapshot: jsonb('snapshot').notNull(),
      payload: jsonb('payload').notNull(),
      consent: jsonb('consent'),
      partnerId: uuid('partner_id'),
      submittedAt: timestamp('submitted_at', { withTimezone: true, mode: 'date' }).notNull(),
      createdAt: createdAt(),
      updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
        .defaultNow()
        .notNull(),
    },
    (table) => [
      unique('orders_workspace_id_id_unique').on(table.workspaceId, table.id),
      unique('orders_workspace_reference_unique').on(table.workspaceId, table.reference),
      unique('orders_workspace_lead_unique').on(table.workspaceId, table.leadId),
      foreignKey({
        name: 'orders_workspace_lead_fk',
        columns: [table.workspaceId, table.leadId],
        foreignColumns: [leads.workspaceId, leads.id],
      }),
      foreignKey({
        name: 'orders_workspace_assignee_fk',
        columns: [table.workspaceId, table.assigneeId],
        foreignColumns: [memberships.workspaceId, memberships.id],
      }),
      foreignKey({
        name: 'orders_workspace_partner_fk',
        columns: [table.workspaceId, table.partnerId],
        foreignColumns: [partners.workspaceId, partners.id],
      }),
      check('orders_status_check', sql`${table.status} in (${orderStatusList})`),
      check('orders_payment_state_check', sql`${table.paymentState} in (${paymentStateList})`),
      check('orders_delivery_state_check', sql`${table.deliveryState} in (${deliveryStateList})`),
      check('orders_version_positive_check', sql`${table.version} > 0`),
      check('orders_snapshot_object_check', sql`jsonb_typeof(${table.snapshot}) = 'object'`),
      check('orders_payload_object_check', sql`jsonb_typeof(${table.payload}) = 'object'`),
      check(
        'orders_consent_object_check',
        sql`${table.consent} is null or jsonb_typeof(${table.consent}) = 'object'`,
      ),
      index('orders_workspace_status_submitted_idx').on(
        table.workspaceId,
        table.status,
        table.submittedAt,
      ),
      index('orders_workspace_assignee_idx').on(table.workspaceId, table.assigneeId),
      index('orders_workspace_partner_idx').on(table.workspaceId, table.partnerId),
      tenantPolicy('orders_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

/** A 15-minute, server-authoritative commercial snapshot tied to one draft. */
export const quotes = appSchema
  .table(
    'quotes',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      draftId: uuid('draft_id').notNull(),
      productId: uuid('product_id').notNull(),
      offerVersionId: uuid('offer_version_id').notNull(),
      currency: text('currency').notNull(),
      charges: jsonb('charges').notNull(),
      totalAmountMinor: integer('total_amount_minor').notNull(),
      amountPayableTodayMinor: integer('amount_payable_today_minor').notNull(),
      paymentRequired: boolean('payment_required').notNull(),
      documentChecklist: text('document_checklist').array().notNull(),
      termsVersion: text('terms_version').notNull(),
      expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
      revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
      consumedByOrderId: uuid('consumed_by_order_id'),
      consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),
      createdAt: createdAt(),
      updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
        .defaultNow()
        .notNull(),
    },
    (table) => [
      unique('quotes_workspace_id_id_unique').on(table.workspaceId, table.id),
      unique('quotes_workspace_consumed_order_unique').on(
        table.workspaceId,
        table.consumedByOrderId,
      ),
      foreignKey({
        name: 'quotes_workspace_draft_fk',
        columns: [table.workspaceId, table.draftId],
        foreignColumns: [leads.workspaceId, leads.id],
      }),
      foreignKey({
        name: 'quotes_workspace_product_fk',
        columns: [table.workspaceId, table.productId],
        foreignColumns: [products.workspaceId, products.id],
      }),
      foreignKey({
        name: 'quotes_workspace_product_offer_version_fk',
        columns: [table.workspaceId, table.productId, table.offerVersionId],
        foreignColumns: [offerVersions.workspaceId, offerVersions.productId, offerVersions.id],
      }),
      foreignKey({
        name: 'quotes_workspace_consumed_order_fk',
        columns: [table.workspaceId, table.consumedByOrderId],
        foreignColumns: [orders.workspaceId, orders.id],
      }),
      check('quotes_currency_check', sql`${table.currency} ~ '^[A-Z]{3}$'`),
      check('quotes_charges_array_check', sql`jsonb_typeof(${table.charges}) = 'array'`),
      check('quotes_total_nonnegative_check', sql`${table.totalAmountMinor} >= 0`),
      check('quotes_payable_today_nonnegative_check', sql`${table.amountPayableTodayMinor} >= 0`),
      check(
        'quotes_consumption_pair_check',
        sql`(${table.consumedByOrderId} is null) = (${table.consumedAt} is null)`,
      ),
      index('quotes_workspace_draft_created_idx').on(
        table.workspaceId,
        table.draftId,
        table.createdAt,
      ),
      index('quotes_workspace_product_expires_idx').on(
        table.workspaceId,
        table.productId,
        table.expiresAt,
      ),
      tenantPolicy('quotes_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

export const orderStatusHistory = appSchema
  .table(
    'order_status_history',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      orderId: uuid('order_id').notNull(),
      actorId: uuid('actor_id').notNull(),
      fromStatus: text('from_status'),
      toStatus: text('to_status').notNull(),
      orderVersion: integer('order_version').notNull(),
      reason: text('reason'),
      createdAt: createdAt(),
    },
    (table) => [
      unique('order_status_history_workspace_id_id_unique').on(table.workspaceId, table.id),
      foreignKey({
        name: 'order_status_history_workspace_order_fk',
        columns: [table.workspaceId, table.orderId],
        foreignColumns: [orders.workspaceId, orders.id],
      }).onDelete('cascade'),
      check(
        'order_status_history_from_status_check',
        sql`${table.fromStatus} is null or ${table.fromStatus} in (${orderStatusList})`,
      ),
      check('order_status_history_to_status_check', sql`${table.toStatus} in (${orderStatusList})`),
      check('order_status_history_version_positive_check', sql`${table.orderVersion} > 0`),
      index('order_status_history_workspace_order_created_idx').on(
        table.workspaceId,
        table.orderId,
        table.createdAt,
      ),
      tenantPolicy('order_status_history_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

export const orderAmendments = appSchema
  .table(
    'order_amendments',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      orderId: uuid('order_id').notNull(),
      actorId: uuid('actor_id').notNull(),
      reason: text('reason').notNull(),
      patch: jsonb('patch').notNull(),
      before: jsonb('before').notNull(),
      after: jsonb('after').notNull(),
      createdAt: createdAt(),
    },
    (table) => [
      unique('order_amendments_workspace_id_id_unique').on(table.workspaceId, table.id),
      foreignKey({
        name: 'order_amendments_workspace_order_fk',
        columns: [table.workspaceId, table.orderId],
        foreignColumns: [orders.workspaceId, orders.id],
      }).onDelete('cascade'),
      index('order_amendments_workspace_order_created_idx').on(
        table.workspaceId,
        table.orderId,
        table.createdAt,
      ),
      tenantPolicy('order_amendments_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

export const orderChangeRequests = appSchema
  .table(
    'order_change_requests',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      orderId: uuid('order_id').notNull(),
      requestedBy: uuid('requested_by').notNull(),
      payload: jsonb('payload').notNull(),
      status: text('status').default('pending').notNull(),
      resolvedBy: uuid('resolved_by'),
      resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
      createdAt: createdAt(),
    },
    (table) => [
      unique('order_change_requests_workspace_id_id_unique').on(table.workspaceId, table.id),
      foreignKey({
        name: 'order_change_requests_workspace_order_fk',
        columns: [table.workspaceId, table.orderId],
        foreignColumns: [orders.workspaceId, orders.id],
      }).onDelete('cascade'),
      check(
        'order_change_requests_status_check',
        sql`${table.status} in ('pending', 'approved', 'rejected')`,
      ),
      index('order_change_requests_workspace_order_status_idx').on(
        table.workspaceId,
        table.orderId,
        table.status,
      ),
      tenantPolicy('order_change_requests_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

export const idempotencyKeys = appSchema
  .table(
    'idempotency_keys',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      scope: text('scope').notNull(),
      keyHash: text('key_hash').notNull(),
      requestFingerprint: text('request_fingerprint').notNull(),
      leadId: uuid('lead_id').notNull(),
      orderId: uuid('order_id'),
      responseReference: text('response_reference'),
      status: text('status').default('pending').notNull(),
      createdAt: createdAt(),
      completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
    },
    (table) => [
      unique('idempotency_keys_workspace_id_id_unique').on(table.workspaceId, table.id),
      unique('idempotency_keys_workspace_scope_key_unique').on(
        table.workspaceId,
        table.scope,
        table.keyHash,
      ),
      foreignKey({
        name: 'idempotency_keys_workspace_lead_fk',
        columns: [table.workspaceId, table.leadId],
        foreignColumns: [leads.workspaceId, leads.id],
      }),
      foreignKey({
        name: 'idempotency_keys_workspace_order_fk',
        columns: [table.workspaceId, table.orderId],
        foreignColumns: [orders.workspaceId, orders.id],
      }),
      check('idempotency_keys_status_check', sql`${table.status} in ('pending', 'completed')`),
      check(
        'idempotency_keys_completion_check',
        sql`(${table.status} = 'pending' and ${table.orderId} is null and ${table.responseReference} is null and ${table.completedAt} is null) or (${table.status} = 'completed' and ${table.orderId} is not null and ${table.responseReference} is not null and ${table.completedAt} is not null)`,
      ),
      index('idempotency_keys_workspace_order_idx').on(table.workspaceId, table.orderId),
      tenantPolicy('idempotency_keys_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

export const outboxJobs = appSchema
  .table(
    'outbox_jobs',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      jobType: text('job_type').notNull(),
      dedupeKey: text('dedupe_key').notNull(),
      messageId: uuid('message_id').defaultRandom().notNull(),
      payloadVersion: integer('payload_version').default(1).notNull(),
      payload: jsonb('payload').notNull(),
      status: text('status').default('pending').notNull(),
      attempts: integer('attempts').default(0).notNull(),
      availableAt: timestamp('available_at', { withTimezone: true, mode: 'date' })
        .defaultNow()
        .notNull(),
      lockedAt: timestamp('locked_at', { withTimezone: true, mode: 'date' }),
      leaseOwnerId: uuid('lease_owner_id'),
      leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true, mode: 'date' }),
      lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true, mode: 'date' }),
      completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
      uncertainAt: timestamp('uncertain_at', { withTimezone: true, mode: 'date' }),
      lastErrorCode: text('last_error_code'),
      providerId: text('provider_id'),
      outcome: jsonb('outcome'),
      createdAt: createdAt(),
      updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
        .defaultNow()
        .notNull(),
    },
    (table) => [
      unique('outbox_jobs_workspace_id_id_unique').on(table.workspaceId, table.id),
      unique('outbox_jobs_workspace_type_dedupe_unique').on(
        table.workspaceId,
        table.jobType,
        table.dedupeKey,
      ),
      check(
        'outbox_jobs_status_check',
        sql`${table.status} in ('pending', 'processing', 'completed', 'failed', 'uncertain')`,
      ),
      check('outbox_jobs_attempts_check', sql`${table.attempts} >= 0`),
      check('outbox_jobs_payload_version_check', sql`${table.payloadVersion} > 0`),
      check(
        'outbox_jobs_lease_check',
        sql`(${table.status} = 'processing' and ${table.leaseOwnerId} is not null and ${table.leaseExpiresAt} is not null and ${table.lockedAt} is not null) or (${table.status} <> 'processing' and ${table.leaseOwnerId} is null and ${table.leaseExpiresAt} is null)`,
      ),
      index('outbox_jobs_workspace_status_available_idx').on(
        table.workspaceId,
        table.status,
        table.availableAt,
      ),
      tenantPolicy('outbox_jobs_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

export const outboxJobAlerts = appSchema
  .table(
    'outbox_job_alerts',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      jobId: uuid('job_id').notNull(),
      alertCode: text('alert_code').notNull(),
      resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
      createdAt: createdAt(),
    },
    (table) => [
      unique('outbox_job_alerts_workspace_id_id_unique').on(table.workspaceId, table.id),
      foreignKey({
        name: 'outbox_job_alerts_workspace_job_fk',
        columns: [table.workspaceId, table.jobId],
        foreignColumns: [outboxJobs.workspaceId, outboxJobs.id],
      }).onDelete('cascade'),
      index('outbox_job_alerts_workspace_unresolved_idx').on(
        table.workspaceId,
        table.resolvedAt,
        table.createdAt,
      ),
      tenantPolicy('outbox_job_alerts_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

export const dispatchRecords = appSchema
  .table(
    'dispatch_records',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      orderId: uuid('order_id').notNull(),
      actorId: uuid('actor_id').notNull(),
      courier: text('courier').notNull(),
      trackingReference: text('tracking_reference'),
      dispatchedAt: timestamp('dispatched_at', { withTimezone: true, mode: 'date' }).notNull(),
      createdAt: createdAt(),
    },
    (table) => [
      unique('dispatch_records_workspace_id_id_unique').on(table.workspaceId, table.id),
      foreignKey({
        name: 'dispatch_records_workspace_order_fk',
        columns: [table.workspaceId, table.orderId],
        foreignColumns: [orders.workspaceId, orders.id],
      }).onDelete('cascade'),
      index('dispatch_records_workspace_order_idx').on(table.workspaceId, table.orderId),
      tenantPolicy('dispatch_records_tenant_policy', table.workspaceId),
    ],
  )
  .enableRLS();

export const paymentRecords = appSchema
  .table(
    'payment_records',
    {
      id: uuid('id').defaultRandom().primaryKey(),
      workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
      orderId: uuid('order_id').notNull(),
      actorId: uuid('actor_id').notNull(),
      fromState: text('from_state').notNull(),
      toState: text('to_state').notNull(),
      method: text('method'),
      paymentReference: text('payment_reference'),
      amountMinor: integer('amount_minor'),
      currency: text('currency'),
      recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' }).notNull(),
      createdAt: createdAt(),
    },
    (table) => [
      unique('payment_records_workspace_id_id_unique').on(table.workspaceId, table.id),
      foreignKey({
        name: 'payment_records_workspace_order_fk',
        columns: [table.workspaceId, table.orderId],
        foreignColumns: [orders.workspaceId, orders.id],
      }).onDelete('cascade'),
      check('payment_records_from_state_check', sql`${table.fromState} in (${paymentStateList})`),
      check('payment_records_to_state_check', sql`${table.toState} in (${paymentStateList})`),
      check(
        'payment_records_amount_check',
        sql`${table.amountMinor} is null or ${table.amountMinor} >= 0`,
      ),
      index('payment_records_workspace_order_recorded_idx').on(
        table.workspaceId,
        table.orderId,
        table.recordedAt,
      ),
      tenantPolicy('payment_records_tenant_policy', table.workspaceId),
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
  catalogueSyncEvents,
  catalogueSyncLeases,
  catalogueSyncState,
  leads,
  draftGrants,
  orders,
  quotes,
  orderStatusHistory,
  orderAmendments,
  orderChangeRequests,
  idempotencyKeys,
  outboxJobs,
  outboxJobAlerts,
  dispatchRecords,
  paymentRecords,
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
export type CatalogueSyncEvent = typeof catalogueSyncEvents.$inferSelect;
export type CatalogueSyncLease = typeof catalogueSyncLeases.$inferSelect;
export type CatalogueSyncState = typeof catalogueSyncState.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type DraftGrant = typeof draftGrants.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type OrderAmendment = typeof orderAmendments.$inferSelect;
export type OrderChangeRequest = typeof orderChangeRequests.$inferSelect;
export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;
export type OutboxJob = typeof outboxJobs.$inferSelect;
export type OutboxJobAlert = typeof outboxJobAlerts.$inferSelect;
export type DispatchRecord = typeof dispatchRecords.$inferSelect;
export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type ServiceCredential = typeof serviceCredentials.$inferSelect;
export type RateLimitBucket = typeof rateLimitBuckets.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
