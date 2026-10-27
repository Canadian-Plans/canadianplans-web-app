import { and, asc, eq, sql } from 'drizzle-orm';
import { auditEvents, savedViews, withTenantTx, type TenantTransaction } from '@canadian-plans/db';
import {
  SAVED_VIEW_LIMIT,
  orderViewStateSchema,
  savedViewObjectSchema,
  type CreateSavedViewRequest,
  type SavedView,
  type SavedViewObject,
  type UpdateSavedViewRequest,
} from '@canadian-plans/contracts';

type ViewDatabase = Pick<import('@canadian-plans/db').DatabaseClient, 'withTenantTx'>;
const defaultDatabase: ViewDatabase = { withTenantTx };

/** Who is acting. A view is only ever visible to the actor who created it. */
export interface SavedViewContext {
  workspaceId: string;
  actorId: string;
  requestId: string;
}

export type CreateSavedViewOutcome =
  { status: 'created'; view: SavedView } | { status: 'name_taken' } | { status: 'limit_reached' };

export type UpdateSavedViewOutcome =
  | { status: 'updated'; view: SavedView }
  | { status: 'not_found' }
  | { status: 'version_conflict' }
  | { status: 'name_taken' };

export type DeleteSavedViewOutcome = { status: 'deleted' } | { status: 'not_found' };

export interface SavedViewStore {
  list(context: Omit<SavedViewContext, 'requestId'>, object: SavedViewObject): Promise<SavedView[]>;
  create(context: SavedViewContext, input: CreateSavedViewRequest): Promise<CreateSavedViewOutcome>;
  update(
    context: SavedViewContext,
    viewId: string,
    input: UpdateSavedViewRequest,
  ): Promise<UpdateSavedViewOutcome>;
  delete(context: SavedViewContext, viewId: string): Promise<DeleteSavedViewOutcome>;
}

type SavedViewRow = typeof savedViews.$inferSelect;

function toSavedView(row: SavedViewRow): SavedView {
  return {
    id: row.id,
    object: savedViewObjectSchema.parse(row.object),
    name: row.name,
    state: orderViewStateSchema.parse(row.state),
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if ('code' in error && error.code === '23505') return true;
  if (!('cause' in error) || typeof error.cause !== 'object' || error.cause === null) return false;
  return 'code' in error.cause && error.cause.code === '23505';
}

/** The audit row for a view write. The name and filters stay out: only what changed structurally. */
async function auditViewWrite(
  tx: TenantTransaction,
  context: SavedViewContext,
  action: 'saved_view.created' | 'saved_view.updated' | 'saved_view.deleted',
  view: { id: string; object: string; version: number },
): Promise<void> {
  await tx.insert(auditEvents).values({
    workspaceId: context.workspaceId,
    actorId: context.actorId,
    actorLabel: 'staff',
    action,
    entity: 'saved_view',
    entityId: view.id,
    requestId: context.requestId,
    after: { object: view.object, version: view.version },
  });
}

function ownView(context: Omit<SavedViewContext, 'requestId'>, viewId: string) {
  return and(
    eq(savedViews.workspaceId, context.workspaceId),
    eq(savedViews.actorId, context.actorId),
    eq(savedViews.id, viewId),
  );
}

/**
 * Saved views under the tenant context. Every query also names the actor, and
 * the row policy repeats that check in Postgres, so another staff member's view
 * reads as not found.
 */
export class DatabaseSavedViewStore implements SavedViewStore {
  constructor(private readonly database: ViewDatabase = defaultDatabase) {}

  list(context: Omit<SavedViewContext, 'requestId'>, object: SavedViewObject) {
    return this.database.withTenantTx(context, async (tx) => {
      const rows = await tx
        .select()
        .from(savedViews)
        .where(
          and(
            eq(savedViews.workspaceId, context.workspaceId),
            eq(savedViews.actorId, context.actorId),
            eq(savedViews.object, object),
          ),
        )
        .orderBy(asc(sql`lower(${savedViews.name})`), asc(savedViews.id));
      return rows.map(toSavedView);
    });
  }

  async create(
    context: SavedViewContext,
    input: CreateSavedViewRequest,
  ): Promise<CreateSavedViewOutcome> {
    try {
      return await this.database.withTenantTx(context, async (tx) => {
        const [existing] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(savedViews)
          .where(
            and(
              eq(savedViews.workspaceId, context.workspaceId),
              eq(savedViews.actorId, context.actorId),
              eq(savedViews.object, input.object),
            ),
          );
        if ((existing?.count ?? 0) >= SAVED_VIEW_LIMIT) return { status: 'limit_reached' };
        const [row] = await tx
          .insert(savedViews)
          .values({
            workspaceId: context.workspaceId,
            actorId: context.actorId,
            object: input.object,
            name: input.name,
            state: input.state,
          })
          .returning();
        if (!row) throw new Error('saved view insert did not return a row');
        await auditViewWrite(tx, context, 'saved_view.created', row);
        return { status: 'created', view: toSavedView(row) };
      });
    } catch (error) {
      if (isUniqueViolation(error)) return { status: 'name_taken' };
      throw error;
    }
  }

  async update(
    context: SavedViewContext,
    viewId: string,
    input: UpdateSavedViewRequest,
  ): Promise<UpdateSavedViewOutcome> {
    try {
      return await this.database.withTenantTx(context, async (tx) => {
        const [current] = await tx
          .select({ version: savedViews.version })
          .from(savedViews)
          .where(ownView(context, viewId));
        if (!current) return { status: 'not_found' };
        if (current.version !== input.expectedVersion) return { status: 'version_conflict' };
        const [row] = await tx
          .update(savedViews)
          .set({
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.state !== undefined ? { state: input.state } : {}),
            version: input.expectedVersion + 1,
            updatedAt: new Date(),
          })
          .where(and(ownView(context, viewId), eq(savedViews.version, input.expectedVersion)))
          .returning();
        if (!row) return { status: 'version_conflict' };
        await auditViewWrite(tx, context, 'saved_view.updated', row);
        return { status: 'updated', view: toSavedView(row) };
      });
    } catch (error) {
      if (isUniqueViolation(error)) return { status: 'name_taken' };
      throw error;
    }
  }

  delete(context: SavedViewContext, viewId: string): Promise<DeleteSavedViewOutcome> {
    return this.database.withTenantTx(context, async (tx) => {
      const [row] = await tx.delete(savedViews).where(ownView(context, viewId)).returning();
      if (!row) return { status: 'not_found' };
      await auditViewWrite(tx, context, 'saved_view.deleted', row);
      return { status: 'deleted' };
    });
  }
}
