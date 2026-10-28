import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import {
  auditEvents,
  leadFields,
  leads,
  withTenantTx,
  type TenantTransaction,
} from '@canadian-plans/db';
import {
  attributionSchema,
  builtInLeadFields,
  createLeadFieldSchema,
  fieldApplies,
  generateLeadFieldKey,
  leadFieldSchema,
  LeadFieldValidationError,
  leadTypeSchema,
  type CreateLeadField,
  type LeadField,
  type UpdateLeadField,
} from '@canadian-plans/contracts';
import { z } from 'zod';
import { deriveSource } from './source.js';

export type LeadDatabase = Pick<import('@canadian-plans/db').DatabaseClient, 'withTenantTx'>;
export const defaultLeadDatabase: LeadDatabase = { withTenantTx };
export interface LeadContext {
  workspaceId: string;
  actorId: string;
  requestId: string;
}
export class LeadModelError extends Error {
  constructor(
    readonly code: 'not_found' | 'conflict' | 'version_conflict' | 'validation_error',
    readonly count?: number,
  ) {
    super(code);
  }
}
/** All model/value writers acquire this before any lead row lock, including website saves. */
export async function lockLeadModel(
  tx: TenantTransaction,
  workspaceId: string,
  shared = false,
): Promise<void> {
  if (shared)
    await tx.execute(
      sql`select pg_advisory_xact_lock_shared(hashtextextended(${`lead-model:${workspaceId}`}, 0))`,
    );
  else
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`lead-model:${workspaceId}`}, 0))`,
    );
}
const overridesSchema = z.object({
  label: z.string().optional(),
  active: z.boolean().optional(),
  options: z.array(z.unknown()).optional(),
});
export function toLeadField(row: typeof leadFields.$inferSelect): LeadField {
  const base = builtInLeadFields.find((f) => f.key === row.key);
  const config =
    row.origin === 'builtin' && base
      ? { ...base, ...overridesSchema.parse(row.config) }
      : createLeadFieldSchema.parse(row.config);
  return leadFieldSchema.parse({
    ...config,
    id: row.id,
    key: row.key,
    type: row.type,
    origin: row.origin,
    version: row.version,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}
/** Idempotent code seed also handles workspaces created after the release migration. */
export async function loadLeadFields(
  tx: TenantTransaction,
  workspaceId: string,
): Promise<LeadField[]> {
  const rows = await tx
    .select()
    .from(leadFields)
    .where(and(eq(leadFields.workspaceId, workspaceId), isNull(leadFields.deletedAt)))
    .orderBy(asc(leadFields.createdAt), asc(leadFields.key));
  const missing = builtInLeadFields.filter((f) => !rows.some((r) => r.key === f.key));
  if (missing.length) {
    const inserted = await tx
      .insert(leadFields)
      .values(
        missing.map((f) => ({
          workspaceId,
          key: f.key,
          type: f.type,
          origin: 'builtin',
          config: { label: f.label, active: f.active, options: f.options },
        })),
      )
      .onConflictDoNothing()
      .returning();
    rows.push(...inserted);
    if (inserted.length !== missing.length) return loadLeadFields(tx, workspaceId);
  }
  return rows.map(toLeadField);
}
export async function auditLeadChange(
  tx: TenantTransaction,
  context: LeadContext,
  action: string,
  entityId: string,
  keys: readonly string[],
  entity = 'lead',
): Promise<void> {
  // Callers supply validated definition keys/property names only, never values.
  await tx.insert(auditEvents).values({
    workspaceId: context.workspaceId,
    actorId: context.actorId,
    actorLabel: 'staff',
    action,
    entity,
    entityId,
    requestId: context.requestId,
    after: { changedFields: [...keys] },
  });
}
export function humanizeLeadKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replace(/^./, (v) => v.toUpperCase());
}
export const recordSchema = z.record(z.string(), z.unknown());
export function formValues(payload: unknown): Record<string, unknown> {
  const form = z.object({ payload: recordSchema }).safeParse(payload);
  return form.success ? form.data.payload : {};
}
export function mergedLeadValues(row: typeof leads.$inferSelect): Record<string, unknown> {
  const result: Record<string, unknown> = {
    ...attributionSchema.parse(row.attribution ?? {}),
    source: deriveSource(attributionSchema.parse(row.attribution ?? {})),
    partnerId: row.partnerId,
    selectedOfferVersionId: row.selectedOfferVersionId,
    consentVersion: row.consentVersion,
    ...Object.fromEntries(
      Object.entries(formValues(row.payload)).filter(([key]) =>
        builtInLeadFields.some((field) => field.key === key && field.source !== 'column'),
      ),
    ),
    ...recordSchema.parse(row.customValues),
    leadType: row.leadType,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  if (row.fullName !== null) result['fullName'] = row.fullName;
  if (row.email !== null) result['email'] = { address: row.email.toLowerCase() };
  if (row.phone !== null)
    result['phone'] = { number: row.phone, countryCode: row.countryCode ?? '' };
  if (row.countryCode !== null) result['countryCode'] = row.countryCode;
  for (const key of ['documents', 'creditCheck'])
    if (result[key] !== undefined) result[key] = JSON.stringify(result[key]);
  return result;
}
export function visibleLeadValues(
  row: typeof leads.$inferSelect,
  fields: readonly LeadField[],
  canReadPersonal: boolean,
  columns?: readonly string[],
): Record<string, unknown> {
  if (!canReadPersonal) return {};
  const values = mergedLeadValues(row);
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (
      !field.active ||
      !fieldApplies(field, leadTypeSchema.parse(row.leadType)) ||
      (columns && (field.sensitive || !columns.includes(field.key)))
    )
      continue;
    if (Object.hasOwn(values, field.key)) result[field.key] = values[field.key];
  }
  return result;
}
export class DatabaseLeadFieldStore {
  constructor(private readonly database: LeadDatabase = defaultLeadDatabase) {}
  list(context: LeadContext) {
    return this.database.withTenantTx(context, async (tx) => {
      await lockLeadModel(tx, context.workspaceId, true);
      return loadLeadFields(tx, context.workspaceId);
    });
  }
  create(context: LeadContext, input: CreateLeadField): Promise<LeadField> {
    return this.database.withTenantTx(context, async (tx) => {
      await lockLeadModel(tx, context.workspaceId);
      await loadLeadFields(tx, context.workspaceId);
      const reserved = await tx
        .select({ key: leadFields.key, deletedAt: leadFields.deletedAt })
        .from(leadFields)
        .where(eq(leadFields.workspaceId, context.workspaceId));
      if (reserved.filter((f) => !f.deletedAt).length >= 200) throw new LeadModelError('conflict');
      const config = createLeadFieldSchema.parse(input);
      const key = generateLeadFieldKey(config.label, new Set(reserved.map((f) => f.key)));
      const [row] = await tx
        .insert(leadFields)
        .values({
          workspaceId: context.workspaceId,
          key,
          type: config.type,
          origin: 'custom',
          config,
          createdBy: context.actorId,
          updatedBy: context.actorId,
        })
        .returning();
      if (!row) throw new Error('lead_field_insert_failed');
      await auditLeadChange(tx, context, 'lead_field.created', row.id, ['created'], 'lead_field');
      return toLeadField(row);
    });
  }
  update(context: LeadContext, id: string, input: UpdateLeadField): Promise<LeadField> {
    return this.database.withTenantTx(context, async (tx) => {
      await lockLeadModel(tx, context.workspaceId);
      const fields = await loadLeadFields(tx, context.workspaceId);
      const current = fields.find((f) => f.id === id);
      if (!current) throw new LeadModelError('not_found');
      if (current.version !== input.expectedVersion) throw new LeadModelError('version_conflict');
      const { expectedVersion: _version, ...patch } = input;
      if (
        current.origin === 'builtin' &&
        Object.keys(patch).some((key) => !['label', 'active', 'options'].includes(key))
      )
        throw new LeadFieldValidationError();
      if (input.options) {
        const removed = current.options.filter(
          (o) => !input.options?.some((n) => n.value === o.value),
        );
        if (
          current.origin === 'builtin' &&
          (removed.length ||
            input.options.some((n) => !current.options.some((o) => o.value === n.value)))
        )
          throw new LeadFieldValidationError();
        for (const option of removed) {
          const [usage] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(leads)
            .where(
              and(
                eq(leads.workspaceId, context.workspaceId),
                sql`(${leads.customValues}->${current.key}) @> ${JSON.stringify(current.type === 'multi_select' ? [option.value] : option.value)}::jsonb`,
              ),
            );
          if (usage && usage.count > 0) throw new LeadModelError('conflict', usage.count);
        }
      }
      const next = createLeadFieldSchema.parse({
        label: current.label,
        description: current.description,
        icon: current.icon,
        type: current.type,
        options: current.options,
        active: current.active,
        leadTypes: current.leadTypes,
        sensitive: current.sensitive,
        websiteAccepted: current.websiteAccepted,
        staffEditable: current.staffEditable,
        ...patch,
      });
      const config =
        current.origin === 'builtin'
          ? { label: next.label, active: next.active, options: next.options }
          : next;
      const [row] = await tx
        .update(leadFields)
        .set({
          config,
          version: current.version + 1,
          updatedBy: context.actorId,
          updatedAt: new Date(),
        })
        .where(and(eq(leadFields.workspaceId, context.workspaceId), eq(leadFields.id, id)))
        .returning();
      if (!row) throw new LeadModelError('not_found');
      const action =
        input.active === false
          ? 'deactivated'
          : input.active === true && !current.active
            ? 'reactivated'
            : 'updated';
      await auditLeadChange(
        tx,
        context,
        `lead_field.${action}`,
        id,
        Object.keys(patch),
        'lead_field',
      );
      return toLeadField(row);
    });
  }
  delete(context: LeadContext, id: string): Promise<void> {
    return this.database.withTenantTx(context, async (tx) => {
      await lockLeadModel(tx, context.workspaceId);
      const fields = await loadLeadFields(tx, context.workspaceId);
      const field = fields.find((f) => f.id === id);
      if (!field) throw new LeadModelError('not_found');
      if (field.origin === 'builtin') throw new LeadModelError('conflict');
      // Includes restricted and any future trash rows; a malformed non-null value still counts.
      const [usage] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(leads)
        .where(
          and(
            eq(leads.workspaceId, context.workspaceId),
            sql`${leads.customValues} ? ${field.key} and ${leads.customValues}->${field.key} <> 'null'::jsonb`,
          ),
        );
      if (usage && usage.count > 0) throw new LeadModelError('conflict', usage.count);
      await tx
        .update(leadFields)
        .set({
          deletedAt: new Date(),
          updatedBy: context.actorId,
          updatedAt: new Date(),
          version: field.version + 1,
        })
        .where(and(eq(leadFields.workspaceId, context.workspaceId), eq(leadFields.id, id)));
      await auditLeadChange(tx, context, 'lead_field.deleted', id, ['deleted'], 'lead_field');
    });
  }
}
