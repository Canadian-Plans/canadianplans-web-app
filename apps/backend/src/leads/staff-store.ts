import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import {
  auditEvents,
  leadFields,
  leadLayouts,
  leadObjectSettings,
  leadViews,
  leads,
} from '@canadian-plans/db';
import {
  applyLeadFieldEdits,
  builtInLeadFields,
  fieldApplies,
  leadLayoutSchema,
  leadObjectSettingsSchema,
  leadTypeSchema,
  leadViewSchema,
  leadViewStateSchema,
  LeadFieldValidationError,
  validateLeadQuery,
  type LeadDetailResponse,
  type LeadField,
  type LeadFieldEdits,
  type LeadLayout,
  type LeadObjectSettings,
  type LeadRecord,
  type LeadSearch,
  type LeadSearchResponse,
  type LeadType,
  type LeadView,
  type LeadViewState,
  type WriteLeadView,
} from '@canadian-plans/contracts';
import { z } from 'zod';
import {
  auditLeadChange,
  defaultLeadDatabase,
  formValues,
  humanizeLeadKey,
  LeadModelError,
  loadLeadFields,
  lockLeadModel,
  mergedLeadValues,
  recordSchema,
  toLeadField,
  visibleLeadValues,
  type LeadContext,
  type LeadDatabase,
} from './model.js';
import { leadFilterCondition, leadSortExpression } from './search.js';

const defaultSettings: LeadObjectSettings = {
  name: 'Leads',
  defaultSort: { key: 'updatedAt', direction: 'desc' },
};
function defaultLayout(fields: readonly LeadField[], type: LeadType): LeadLayout {
  return {
    sections: [
      {
        id: 'details',
        label: 'Details',
        fields: fields.filter((f) => fieldApplies(f, type)).map((f) => f.key),
      },
    ],
  };
}
function toRecord(
  row: typeof leads.$inferSelect,
  fields: readonly LeadField[],
  personal: boolean,
  columns?: readonly string[],
): LeadRecord {
  return {
    id: row.id,
    leadType: leadTypeSchema.parse(row.leadType),
    status: row.status === 'submitted' ? 'submitted' : 'incomplete',
    version: row.fieldVersion,
    updatedAt: row.updatedAt.toISOString(),
    fields: visibleLeadValues(row, fields, personal, columns),
  };
}
function visibleLead(context: LeadContext, id: string) {
  return and(
    eq(leads.workspaceId, context.workspaceId),
    eq(leads.id, id),
    isNull(leads.customerDataRestrictedAt),
  );
}
function ownView(context: LeadContext, id?: string) {
  return and(
    eq(leadViews.workspaceId, context.workspaceId),
    eq(leadViews.actorId, context.actorId),
    id ? eq(leadViews.id, id) : undefined,
  );
}
function cleanViewState(state: LeadViewState, fields: readonly LeadField[]): LeadViewState {
  const allowed = (key: string) =>
    fields.some(
      (f) =>
        f.key === key &&
        f.active &&
        !f.sensitive &&
        (!state.leadType || fieldApplies(f, state.leadType)),
    );
  return {
    ...state,
    columns: state.columns.filter(allowed),
    filters: state.filters.filter((f) => {
      if (!allowed(f.key)) return false;
      try {
        validateLeadQuery({ columns: [], filters: [f], leadType: state.leadType }, fields, true);
        return true;
      } catch {
        return false;
      }
    }),
    sort: state.sort && allowed(state.sort.key) ? state.sort : undefined,
  };
}
export class DatabaseStaffLeadStore {
  constructor(private readonly database: LeadDatabase = defaultLeadDatabase) {}
  model(context: LeadContext) {
    return this.database.withTenantTx(context, async (tx) => {
      await lockLeadModel(tx, context.workspaceId, true);
      const fields = await loadLeadFields(tx, context.workspaceId);
      const [settingsRow] = await tx
        .select()
        .from(leadObjectSettings)
        .where(eq(leadObjectSettings.workspaceId, context.workspaceId));
      let settings = settingsRow
        ? leadObjectSettingsSchema.parse(settingsRow.settings)
        : defaultSettings;
      try {
        validateLeadQuery({ columns: [], filters: [], sort: settings.defaultSort }, fields, true);
      } catch {
        settings = { ...settings, defaultSort: defaultSettings.defaultSort };
      }
      const rows = await tx
        .select()
        .from(leadLayouts)
        .where(eq(leadLayouts.workspaceId, context.workspaceId));
      const layoutFor = (type: LeadType) =>
        leadLayoutSchema.parse(
          rows.find((r) => r.leadType === type)?.layout ?? defaultLayout(fields, type),
        );
      return {
        fields,
        settings,
        layouts: {
          sim: layoutFor('sim'),
          mobile: layoutFor('mobile'),
          internet: layoutFor('internet'),
          legacy: layoutFor('legacy'),
        },
      };
    });
  }
  saveSettings(context: LeadContext, settings: LeadObjectSettings): Promise<LeadObjectSettings> {
    return this.database.withTenantTx(context, async (tx) => {
      await lockLeadModel(tx, context.workspaceId);
      const fields = await loadLeadFields(tx, context.workspaceId);
      validateLeadQuery({ columns: [], filters: [], sort: settings.defaultSort }, fields, true);
      const [row] = await tx
        .insert(leadObjectSettings)
        .values({ workspaceId: context.workspaceId, settings, updatedBy: context.actorId })
        .onConflictDoUpdate({
          target: leadObjectSettings.workspaceId,
          set: { settings, updatedBy: context.actorId, updatedAt: new Date() },
        })
        .returning();
      if (!row) throw new Error('lead_settings_insert_failed');
      await auditLeadChange(
        tx,
        context,
        'lead_model.settings_updated',
        row.id,
        ['name', 'defaultSort'],
        'lead_model',
      );
      return settings;
    });
  }
  saveLayout(context: LeadContext, type: LeadType, layout: LeadLayout): Promise<LeadLayout> {
    return this.database.withTenantTx(context, async (tx) => {
      await lockLeadModel(tx, context.workspaceId);
      const fields = await loadLeadFields(tx, context.workspaceId);
      for (const key of layout.sections.flatMap((s) => s.fields))
        if (!fields.some((f) => f.key === key && fieldApplies(f, type)))
          throw new LeadFieldValidationError();
      const [row] = await tx
        .insert(leadLayouts)
        .values({
          workspaceId: context.workspaceId,
          leadType: type,
          layout,
          updatedBy: context.actorId,
        })
        .onConflictDoUpdate({
          target: [leadLayouts.workspaceId, leadLayouts.leadType],
          set: { layout, updatedBy: context.actorId, updatedAt: new Date() },
        })
        .returning();
      if (!row) throw new Error('lead_layout_insert_failed');
      await auditLeadChange(
        tx,
        context,
        'lead_model.layout_updated',
        row.id,
        ['sections'],
        'lead_layout',
      );
      return layout;
    });
  }
  search(
    context: LeadContext,
    input: LeadSearch,
    personal: boolean,
  ): Promise<Omit<LeadSearchResponse, 'requestId'>> {
    return this.database.withTenantTx(context, async (tx) => {
      await lockLeadModel(tx, context.workspaceId, true);
      const fields = await loadLeadFields(tx, context.workspaceId);
      validateLeadQuery(input, fields, personal);
      const conditions = and(
        eq(leads.workspaceId, context.workspaceId),
        isNull(leads.customerDataRestrictedAt),
        input.leadType ? eq(leads.leadType, input.leadType) : undefined,
        input.status ? eq(leads.status, input.status) : undefined,
        ...input.filters.map((filter) => {
          const field = fields.find((f) => f.key === filter.key);
          if (!field) throw new LeadFieldValidationError();
          const applies = field.leadTypes.length
            ? sql`${leads.leadType} = any(ARRAY(select jsonb_array_elements_text(${JSON.stringify(field.leadTypes)}::jsonb)))`
            : undefined;
          return and(applies, leadFilterCondition(field, filter));
        }),
      );
      let sort = input.sort;
      if (!sort && personal) {
        const [row] = await tx
          .select()
          .from(leadObjectSettings)
          .where(eq(leadObjectSettings.workspaceId, context.workspaceId));
        if (row) {
          const candidate = leadObjectSettingsSchema.parse(row.settings).defaultSort;
          try {
            validateLeadQuery(
              { columns: [], filters: [], sort: candidate, leadType: input.leadType },
              fields,
              true,
            );
            sort = candidate;
          } catch {
            /* A hidden or now-sensitive default falls back to updated time. */
          }
        }
      }
      const sortField = sort && fields.find((f) => f.key === sort.key);
      const ordering =
        sort && sortField
          ? leadSortExpression(sortField, sort)
          : sql`${leads.updatedAt} desc nulls last`;
      // Window count and rows share the same database statement snapshot.
      const rows = await tx
        .select({ lead: leads, total: sql<number>`count(*) over()::int` })
        .from(leads)
        .where(conditions)
        .orderBy(ordering, asc(leads.id))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);
      let total = rows[0]?.total;
      if (total === undefined) {
        const [count] = await tx
          .select({ total: sql<number>`count(*)::int` })
          .from(leads)
          .where(conditions);
        total = count?.total ?? 0;
      }
      return {
        leads: rows.map(({ lead }) => toRecord(lead, fields, personal, input.columns)),
        page: { page: input.page, pageSize: input.pageSize, total },
      };
    });
  }
  detail(
    context: LeadContext,
    id: string,
    personal: boolean,
  ): Promise<Omit<LeadDetailResponse, 'requestId'>> {
    return this.database.withTenantTx(context, async (tx) => {
      await lockLeadModel(tx, context.workspaceId, true);
      const fields = await loadLeadFields(tx, context.workspaceId);
      const [row] = await tx.select().from(leads).where(visibleLead(context, id));
      if (!row) throw new LeadModelError('not_found');
      const known = new Set(builtInLeadFields.map((f) => f.key));
      const legacy = personal
        ? Object.entries(formValues(row.payload))
            .filter(([key]) => !known.has(key))
            .map(([key, value]) => ({ key, label: humanizeLeadKey(key), value }))
        : [];
      const events = await tx
        .select()
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.workspaceId, context.workspaceId),
            eq(auditEvents.entity, 'lead'),
            eq(auditEvents.entityId, id),
          ),
        )
        .orderBy(desc(auditEvents.createdAt), desc(auditEvents.id))
        .limit(100);
      const historicalFields = (
        await tx.select().from(leadFields).where(eq(leadFields.workspaceId, context.workspaceId))
      ).map(toLeadField);
      const history = events.map((event) => {
        const after = z
          .object({ changedFields: z.array(z.string()).optional() })
          .safeParse(event.after);
        const keys = after.success ? (after.data.changedFields ?? []) : [];
        return {
          id: event.id,
          actorId: event.actorId,
          action: event.action,
          at: event.createdAt.toISOString(),
          fields: historicalFields
            .filter((f) => keys.includes(f.key) && (personal || !f.sensitive))
            .map((f) => ({ key: f.key, label: f.label })),
        };
      });
      return { lead: toRecord(row, fields, personal), legacy, history };
    });
  }
  edit(context: LeadContext, id: string, input: LeadFieldEdits): Promise<void> {
    return this.database.withTenantTx(context, async (tx) => {
      await lockLeadModel(tx, context.workspaceId);
      const fields = await loadLeadFields(tx, context.workspaceId);
      const [row] = await tx.select().from(leads).where(visibleLead(context, id)).for('update');
      if (!row) throw new LeadModelError('not_found');
      if (row.fieldVersion !== input.expectedVersion) throw new LeadModelError('version_conflict');
      const edited = applyLeadFieldEdits({
        fields,
        leadType: leadTypeSchema.parse(row.leadType),
        current: mergedLeadValues(row),
        edits: input.values,
        audience: 'staff',
      });
      if (edited.changedKeys.length === 0) return;
      const custom = recordSchema.parse(row.customValues);
      const form = formValues(row.payload);
      const updates: Partial<typeof leads.$inferInsert> = {};
      for (const key of edited.changedKeys) {
        const field = fields.find((f) => f.key === key);
        if (!field) throw new LeadFieldValidationError();
        const value = edited.values[key];
        if (field.origin === 'custom') {
          if (value === undefined) delete custom[key];
          else custom[key] = value;
        } else if (key === 'fullName')
          updates.fullName = value === undefined ? null : z.string().max(160).parse(value);
        else if (key === 'email')
          updates.email =
            value === undefined ? null : z.object({ address: z.string() }).parse(value).address;
        else if (key === 'phone') {
          const phone =
            value === undefined
              ? undefined
              : z.object({ number: z.string(), countryCode: z.string() }).parse(value);
          updates.phone = phone?.number ?? null;
          updates.countryCode = phone?.countryCode ?? null;
        } else {
          if (value === undefined) delete form[key];
          else form[key] = value;
        }
      }
      const envelope = z.object({ schemaVersion: z.number() }).safeParse(row.payload);
      await tx
        .update(leads)
        .set({
          ...updates,
          customValues: custom,
          payload: {
            schemaVersion: envelope.success ? envelope.data.schemaVersion : 1,
            payload: form,
          },
          updatedAt: new Date(),
        })
        .where(visibleLead(context, id));
      await auditLeadChange(tx, context, 'lead.fields_updated', id, edited.changedKeys);
    });
  }
  listViews(context: LeadContext): Promise<LeadView[]> {
    return this.database.withTenantTx(context, async (tx) => {
      await lockLeadModel(tx, context.workspaceId, true);
      const fields = await loadLeadFields(tx, context.workspaceId);
      const rows = await tx
        .select()
        .from(leadViews)
        .where(ownView(context))
        .orderBy(asc(leadViews.name))
        .limit(30);
      return rows.map((row) =>
        leadViewSchema.parse({
          ...row,
          state: cleanViewState(leadViewStateSchema.parse(row.state), fields),
        }),
      );
    });
  }
  saveView(context: LeadContext, input: WriteLeadView, id?: string): Promise<LeadView> {
    return this.database.withTenantTx(context, async (tx) => {
      await lockLeadModel(tx, context.workspaceId);
      const fields = await loadLeadFields(tx, context.workspaceId);
      validateLeadQuery(input.state, fields, true);
      const rows = await tx.select().from(leadViews).where(ownView(context));
      if (rows.some((r) => r.id !== id && r.name.toLowerCase() === input.name.toLowerCase()))
        throw new LeadModelError('conflict');
      if (!id && rows.length >= 30) throw new LeadModelError('conflict');
      const current = id ? rows.find((r) => r.id === id) : undefined;
      if (id && !current) throw new LeadModelError('not_found');
      if (current && current.version !== input.expectedVersion)
        throw new LeadModelError('version_conflict');
      const [row] = current
        ? await tx
            .update(leadViews)
            .set({
              name: input.name,
              state: input.state,
              version: current.version + 1,
              updatedAt: new Date(),
            })
            .where(ownView(context, current.id))
            .returning()
        : await tx
            .insert(leadViews)
            .values({
              workspaceId: context.workspaceId,
              actorId: context.actorId,
              name: input.name,
              state: input.state,
            })
            .returning();
      if (!row) throw new LeadModelError('not_found');
      await auditLeadChange(
        tx,
        context,
        id ? 'lead_view.updated' : 'lead_view.created',
        row.id,
        ['view'],
        'lead_view',
      );
      return leadViewSchema.parse(row);
    });
  }
  deleteView(context: LeadContext, id: string): Promise<void> {
    return this.database.withTenantTx(context, async (tx) => {
      const [row] = await tx.delete(leadViews).where(ownView(context, id)).returning();
      if (!row) throw new LeadModelError('not_found');
      await auditLeadChange(tx, context, 'lead_view.deleted', id, ['view'], 'lead_view');
    });
  }
}
