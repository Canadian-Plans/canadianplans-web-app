import { and, eq } from 'drizzle-orm';
import {
  auditEvents,
  leads,
  memberships,
  orderAmendments,
  orderChangeRequests,
  orderNotes,
  orderReminders,
  orders,
  paymentRecords,
  withTenantTx,
  type TenantTransaction,
} from '@canadian-plans/db';
import {
  amendableContactPatchSchema,
  amendableFormPatchSchema,
  orderChangeRequestStatusSchema,
  orderSnapshotSchema,
  paymentStateSchema,
  type BulkAssignOrderResult,
  type OrderChangeRequest,
  type OrderChangeRequestPatch,
  type OrderNote,
  type OrderReminder,
  type PaymentState,
} from '@canadian-plans/contracts';

import { changeRequestPayloadSchema, type ChangeRequestPayload } from './query-store.js';

type ActionDatabase = Pick<import('@canadian-plans/db').DatabaseClient, 'withTenantTx'>;
const defaultDatabase: ActionDatabase = { withTenantTx };

/** The outcome of a write that is guarded by the order's optimistic-concurrency version. */
export type OrderWriteOutcome =
  | { status: 'updated' }
  | {
      status:
        | 'not_found'
        | 'version_conflict'
        | 'assignee_not_found'
        | 'reminder_not_found'
        | 'change_request_not_found'
        | 'change_request_resolved';
    };

export interface AddOrderNoteInput {
  workspaceId: string;
  actorId: string;
  requestId: string;
  orderId: string;
  body: string;
}

export type AddOrderNoteOutcome = { status: 'created'; note: OrderNote } | { status: 'not_found' };

export interface ListOrderNotesInput {
  workspaceId: string;
  actorId: string;
  orderId: string;
}

export type ListOrderNotesOutcome =
  { status: 'found'; notes: OrderNote[] } | { status: 'not_found' };

export interface CreateOrderReminderInput {
  workspaceId: string;
  actorId: string;
  requestId: string;
  orderId: string;
  remindAt: string;
  note?: string;
}

export type CreateOrderReminderOutcome =
  { status: 'created'; reminder: OrderReminder } | { status: 'not_found' };

export interface DeleteOrderReminderInput {
  workspaceId: string;
  actorId: string;
  requestId: string;
  orderId: string;
  reminderId: string;
}

export type DeleteOrderReminderOutcome =
  { status: 'deleted' } | { status: 'not_found' | 'reminder_not_found' };

export interface AssignOrderInput {
  workspaceId: string;
  actorId: string;
  requestId: string;
  orderId: string;
  assigneeId: string | null;
  expectedVersion: number;
}

export interface ArchiveOrderInput {
  workspaceId: string;
  actorId: string;
  requestId: string;
  orderId: string;
  archived: boolean;
  expectedVersion: number;
}

export interface BulkAssignInput {
  workspaceId: string;
  actorId: string;
  requestId: string;
  assigneeId: string | null;
  orders: readonly { orderId: string; expectedVersion: number }[];
}

export type BulkAssignOutcome =
  { status: 'assigned'; results: BulkAssignOrderResult[] } | { status: 'assignee_not_found' };

export interface RecordOrderPaymentInput {
  workspaceId: string;
  actorId: string;
  requestId: string;
  orderId: string;
  paymentState: PaymentState;
  method?: string;
  reference?: string;
  amountMinor?: number;
  expectedVersion: number;
}

export interface CreateOrderChangeRequestInput {
  workspaceId: string;
  actorId: string;
  requestId: string;
  orderId: string;
  payload: ChangeRequestPayload;
}

export type CreateOrderChangeRequestOutcome =
  { status: 'created'; changeRequest: OrderChangeRequest } | { status: 'not_found' };

export interface ResolveOrderChangeRequestInput {
  workspaceId: string;
  actorId: string;
  requestId: string;
  orderId: string;
  changeRequestId: string;
  decision: 'approve' | 'reject';
  reason?: string;
  expectedVersion: number;
}

export interface StaffOrderActionStore {
  addNote(input: AddOrderNoteInput): Promise<AddOrderNoteOutcome>;
  listNotes(input: ListOrderNotesInput): Promise<ListOrderNotesOutcome>;
  createReminder(input: CreateOrderReminderInput): Promise<CreateOrderReminderOutcome>;
  deleteReminder(input: DeleteOrderReminderInput): Promise<DeleteOrderReminderOutcome>;
  assign(input: AssignOrderInput): Promise<OrderWriteOutcome>;
  archive(input: ArchiveOrderInput): Promise<OrderWriteOutcome>;
  bulkAssign(input: BulkAssignInput): Promise<BulkAssignOutcome>;
  recordPayment(input: RecordOrderPaymentInput): Promise<OrderWriteOutcome>;
  createChangeRequest(
    input: CreateOrderChangeRequestInput,
  ): Promise<CreateOrderChangeRequestOutcome>;
  resolveChangeRequest(input: ResolveOrderChangeRequestInput): Promise<OrderWriteOutcome>;
}

interface OrderLockRow {
  id: string;
  version: number;
  paymentState: string;
  snapshot: unknown;
}

/** Locks the order row so its version check and write are one atomic decision. */
async function lockOrder(
  tx: TenantTransaction,
  workspaceId: string,
  orderId: string,
): Promise<OrderLockRow | undefined> {
  const [row] = await tx
    .select({
      id: orders.id,
      version: orders.version,
      paymentState: orders.paymentState,
      snapshot: orders.snapshot,
    })
    .from(orders)
    .where(and(eq(orders.workspaceId, workspaceId), eq(orders.id, orderId)))
    .limit(1)
    .for('update');
  return row;
}

async function orderExists(
  tx: TenantTransaction,
  workspaceId: string,
  orderId: string,
): Promise<boolean> {
  const [row] = await tx
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.workspaceId, workspaceId), eq(orders.id, orderId)))
    .limit(1);
  return row !== undefined;
}

async function activeAssignableMembership(
  tx: TenantTransaction,
  workspaceId: string,
  membershipId: string,
): Promise<boolean> {
  const [row] = await tx
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.workspaceId, workspaceId),
        eq(memberships.id, membershipId),
        eq(memberships.membershipType, 'staff'),
        eq(memberships.status, 'active'),
      ),
    )
    .limit(1);
  return row !== undefined;
}

interface AuditInput {
  workspaceId: string;
  actorId: string;
  requestId: string;
  action: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

async function insertAudit(tx: TenantTransaction, input: AuditInput): Promise<void> {
  await tx.insert(auditEvents).values({
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    actorLabel: 'staff',
    action: input.action,
    entity: 'order',
    entityId: input.entityId,
    requestId: input.requestId,
    ...(input.before ? { before: input.before } : {}),
    ...(input.after ? { after: input.after } : {}),
  });
}

/** Applies the version-guarded order update; false means a concurrent edit won. */
async function bumpOrder(
  tx: TenantTransaction,
  input: {
    workspaceId: string;
    orderId: string;
    expectedVersion: number;
    set: Record<string, unknown>;
    now: Date;
  },
): Promise<boolean> {
  const [updated] = await tx
    .update(orders)
    .set({ ...input.set, version: input.expectedVersion + 1, updatedAt: input.now })
    .where(
      and(
        eq(orders.workspaceId, input.workspaceId),
        eq(orders.id, input.orderId),
        eq(orders.version, input.expectedVersion),
      ),
    )
    .returning({ id: orders.id });
  return updated !== undefined;
}

export class DatabaseStaffOrderActionStore implements StaffOrderActionStore {
  constructor(
    private readonly database: ActionDatabase = defaultDatabase,
    private readonly now: () => Date = () => new Date(),
  ) {}

  addNote(input: AddOrderNoteInput): Promise<AddOrderNoteOutcome> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        if (!(await orderExists(tx, input.workspaceId, input.orderId))) {
          return { status: 'not_found' };
        }
        const [row] = await tx
          .insert(orderNotes)
          .values({
            workspaceId: input.workspaceId,
            orderId: input.orderId,
            authorId: input.actorId,
            body: input.body.trim(),
          })
          .returning();
        if (!row) throw new Error('order note insert did not return a row');
        // The note text stays in order_notes; the audit records only the reference
        // so a free-text note never duplicates customer data into audit values.
        await insertAudit(tx, {
          workspaceId: input.workspaceId,
          actorId: input.actorId,
          requestId: input.requestId,
          action: 'order.note_added',
          entityId: input.orderId,
          after: { noteId: row.id },
        });
        return {
          status: 'created',
          note: {
            id: row.id,
            authorId: row.authorId,
            body: row.body,
            createdAt: row.createdAt.toISOString(),
          },
        };
      },
    );
  }

  listNotes(input: ListOrderNotesInput): Promise<ListOrderNotesOutcome> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        if (!(await orderExists(tx, input.workspaceId, input.orderId))) {
          return { status: 'not_found' };
        }
        const rows = await tx
          .select()
          .from(orderNotes)
          .where(
            and(
              eq(orderNotes.workspaceId, input.workspaceId),
              eq(orderNotes.orderId, input.orderId),
            ),
          )
          .orderBy(orderNotes.createdAt);
        return {
          status: 'found',
          notes: rows.map((row) => ({
            id: row.id,
            authorId: row.authorId,
            body: row.body,
            createdAt: row.createdAt.toISOString(),
          })),
        };
      },
    );
  }

  createReminder(input: CreateOrderReminderInput): Promise<CreateOrderReminderOutcome> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        if (!(await orderExists(tx, input.workspaceId, input.orderId))) {
          return { status: 'not_found' };
        }
        const remindAt = new Date(input.remindAt);
        const [row] = await tx
          .insert(orderReminders)
          .values({
            workspaceId: input.workspaceId,
            orderId: input.orderId,
            createdBy: input.actorId,
            remindAt,
            note: input.note?.trim() || null,
          })
          .returning();
        if (!row) throw new Error('order reminder insert did not return a row');
        await insertAudit(tx, {
          workspaceId: input.workspaceId,
          actorId: input.actorId,
          requestId: input.requestId,
          action: 'order.reminder_scheduled',
          entityId: input.orderId,
          after: { reminderId: row.id, remindAt: remindAt.toISOString() },
        });
        return {
          status: 'created',
          reminder: {
            id: row.id,
            createdBy: row.createdBy,
            remindAt: row.remindAt.toISOString(),
            note: row.note,
            createdAt: row.createdAt.toISOString(),
          },
        };
      },
    );
  }

  deleteReminder(input: DeleteOrderReminderInput): Promise<DeleteOrderReminderOutcome> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        if (!(await orderExists(tx, input.workspaceId, input.orderId))) {
          return { status: 'not_found' };
        }
        const [deleted] = await tx
          .delete(orderReminders)
          .where(
            and(
              eq(orderReminders.workspaceId, input.workspaceId),
              eq(orderReminders.orderId, input.orderId),
              eq(orderReminders.id, input.reminderId),
            ),
          )
          .returning({ id: orderReminders.id });
        if (!deleted) return { status: 'reminder_not_found' };
        await insertAudit(tx, {
          workspaceId: input.workspaceId,
          actorId: input.actorId,
          requestId: input.requestId,
          action: 'order.reminder_cancelled',
          entityId: input.orderId,
          before: { reminderId: input.reminderId },
        });
        return { status: 'deleted' };
      },
    );
  }

  assign(input: AssignOrderInput): Promise<OrderWriteOutcome> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        const current = await lockOrder(tx, input.workspaceId, input.orderId);
        if (!current) return { status: 'not_found' };
        if (current.version !== input.expectedVersion) return { status: 'version_conflict' };
        if (
          input.assigneeId !== null &&
          !(await activeAssignableMembership(tx, input.workspaceId, input.assigneeId))
        ) {
          return { status: 'assignee_not_found' };
        }
        const now = this.now();
        const ok = await bumpOrder(tx, {
          workspaceId: input.workspaceId,
          orderId: input.orderId,
          expectedVersion: input.expectedVersion,
          set: { assigneeId: input.assigneeId },
          now,
        });
        if (!ok) return { status: 'version_conflict' };
        await insertAudit(tx, {
          workspaceId: input.workspaceId,
          actorId: input.actorId,
          requestId: input.requestId,
          action: input.assigneeId === null ? 'order.unassigned' : 'order.assigned',
          entityId: input.orderId,
          after: { assigneeId: input.assigneeId },
        });
        return { status: 'updated' };
      },
    );
  }

  archive(input: ArchiveOrderInput): Promise<OrderWriteOutcome> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        const current = await lockOrder(tx, input.workspaceId, input.orderId);
        if (!current) return { status: 'not_found' };
        if (current.version !== input.expectedVersion) return { status: 'version_conflict' };
        const now = this.now();
        const ok = await bumpOrder(tx, {
          workspaceId: input.workspaceId,
          orderId: input.orderId,
          expectedVersion: input.expectedVersion,
          set: { archivedAt: input.archived ? now : null },
          now,
        });
        if (!ok) return { status: 'version_conflict' };
        await insertAudit(tx, {
          workspaceId: input.workspaceId,
          actorId: input.actorId,
          requestId: input.requestId,
          action: input.archived ? 'order.archived' : 'order.restored',
          entityId: input.orderId,
        });
        return { status: 'updated' };
      },
    );
  }

  bulkAssign(input: BulkAssignInput): Promise<BulkAssignOutcome> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        if (
          input.assigneeId !== null &&
          !(await activeAssignableMembership(tx, input.workspaceId, input.assigneeId))
        ) {
          return { status: 'assignee_not_found' };
        }
        const now = this.now();
        const results: BulkAssignOrderResult[] = [];
        // Sequential and per-order: one stale row never hides or rolls back the
        // outcome of the others (T14 — partial failures are reported, not silent).
        for (const item of input.orders) {
          const current = await lockOrder(tx, input.workspaceId, item.orderId);
          if (!current) {
            results.push({ orderId: item.orderId, status: 'not_found' });
            continue;
          }
          if (current.version !== item.expectedVersion) {
            results.push({ orderId: item.orderId, status: 'version_conflict' });
            continue;
          }
          const ok = await bumpOrder(tx, {
            workspaceId: input.workspaceId,
            orderId: item.orderId,
            expectedVersion: item.expectedVersion,
            set: { assigneeId: input.assigneeId },
            now,
          });
          if (!ok) {
            results.push({ orderId: item.orderId, status: 'version_conflict' });
            continue;
          }
          await insertAudit(tx, {
            workspaceId: input.workspaceId,
            actorId: input.actorId,
            requestId: input.requestId,
            action: input.assigneeId === null ? 'order.unassigned' : 'order.assigned',
            entityId: item.orderId,
            after: { assigneeId: input.assigneeId, bulk: true },
          });
          results.push({
            orderId: item.orderId,
            status: 'assigned',
            version: item.expectedVersion + 1,
          });
        }
        return { status: 'assigned', results };
      },
    );
  }

  recordPayment(input: RecordOrderPaymentInput): Promise<OrderWriteOutcome> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        const current = await lockOrder(tx, input.workspaceId, input.orderId);
        if (!current) return { status: 'not_found' };
        if (current.version !== input.expectedVersion) return { status: 'version_conflict' };
        const snapshot = orderSnapshotSchema.parse(current.snapshot);
        const fromState = paymentStateSchema.parse(current.paymentState);
        const now = this.now();
        await tx.insert(paymentRecords).values({
          workspaceId: input.workspaceId,
          orderId: input.orderId,
          actorId: input.actorId,
          fromState,
          toState: input.paymentState,
          method: input.method?.trim() || null,
          paymentReference: input.reference?.trim() || null,
          amountMinor: input.amountMinor ?? null,
          currency: input.amountMinor === undefined ? null : snapshot.currency,
          recordedAt: now,
        });
        const ok = await bumpOrder(tx, {
          workspaceId: input.workspaceId,
          orderId: input.orderId,
          expectedVersion: input.expectedVersion,
          set: { paymentState: input.paymentState },
          now,
        });
        if (!ok) return { status: 'version_conflict' };
        await insertAudit(tx, {
          workspaceId: input.workspaceId,
          actorId: input.actorId,
          requestId: input.requestId,
          action: 'order.payment_recorded',
          entityId: input.orderId,
          before: { paymentState: fromState },
          after: {
            paymentState: input.paymentState,
            method: input.method?.trim() || null,
            reference: input.reference?.trim() || null,
            amount:
              input.amountMinor === undefined
                ? null
                : { amountMinor: input.amountMinor, currency: snapshot.currency },
          },
        });
        return { status: 'updated' };
      },
    );
  }

  createChangeRequest(
    input: CreateOrderChangeRequestInput,
  ): Promise<CreateOrderChangeRequestOutcome> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        if (!(await orderExists(tx, input.workspaceId, input.orderId))) {
          return { status: 'not_found' };
        }
        const [row] = await tx
          .insert(orderChangeRequests)
          .values({
            workspaceId: input.workspaceId,
            orderId: input.orderId,
            requestedBy: input.actorId,
            payload: changeRequestPayloadSchema.parse(input.payload),
            status: 'pending',
          })
          .returning();
        if (!row) throw new Error('change request insert did not return a row');
        await insertAudit(tx, {
          workspaceId: input.workspaceId,
          actorId: input.actorId,
          requestId: input.requestId,
          action: 'order.change_request_created',
          entityId: input.orderId,
          after: { changeRequestId: row.id, fields: patchFieldNames(input.payload.patch) },
        });
        return {
          status: 'created',
          changeRequest: {
            id: row.id,
            requestedBy: row.requestedBy,
            status: orderChangeRequestStatusSchema.parse(row.status),
            patch: input.payload.patch,
            note: input.payload.note?.trim() || null,
            resolvedBy: row.resolvedBy,
            resolvedAt: row.resolvedAt?.toISOString() ?? null,
            createdAt: row.createdAt.toISOString(),
          },
        };
      },
    );
  }

  resolveChangeRequest(input: ResolveOrderChangeRequestInput): Promise<OrderWriteOutcome> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        const current = await lockOrder(tx, input.workspaceId, input.orderId);
        if (!current) return { status: 'not_found' };
        if (current.version !== input.expectedVersion) return { status: 'version_conflict' };

        const [changeRequest] = await tx
          .select()
          .from(orderChangeRequests)
          .where(
            and(
              eq(orderChangeRequests.workspaceId, input.workspaceId),
              eq(orderChangeRequests.orderId, input.orderId),
              eq(orderChangeRequests.id, input.changeRequestId),
            ),
          )
          .limit(1)
          .for('update');
        if (!changeRequest) return { status: 'change_request_not_found' };
        if (changeRequest.status !== 'pending') return { status: 'change_request_resolved' };

        const stored = changeRequestPayloadSchema.parse(changeRequest.payload);
        const now = this.now();

        if (input.decision === 'approve') {
          const contact = await applyContactPatch(
            tx,
            input.workspaceId,
            input.orderId,
            stored.patch,
            now,
          );
          const formPatch = amendableFormPatchSchema.parse(stored.patch.form ?? {});
          // The submitted order envelope is immutable (invariant 5), so the
          // amendment row is the durable record of the approved change; a
          // customer-detail change is additionally applied to the lead, which is
          // mutable operational data.
          await tx.insert(orderAmendments).values({
            workspaceId: input.workspaceId,
            orderId: input.orderId,
            actorId: input.actorId,
            reason: input.reason?.trim() || 'Change request approved',
            patch: stored.patch,
            before: contact.before,
            after: { ...contact.after, ...formPatch },
          });
          await insertAudit(tx, {
            workspaceId: input.workspaceId,
            actorId: input.actorId,
            requestId: input.requestId,
            action: 'order.change_request_approved',
            entityId: input.orderId,
            after: {
              changeRequestId: input.changeRequestId,
              fields: patchFieldNames(stored.patch),
            },
          });
        } else {
          await insertAudit(tx, {
            workspaceId: input.workspaceId,
            actorId: input.actorId,
            requestId: input.requestId,
            action: 'order.change_request_rejected',
            entityId: input.orderId,
            after: { changeRequestId: input.changeRequestId },
          });
        }

        await tx
          .update(orderChangeRequests)
          .set({
            status: input.decision === 'approve' ? 'approved' : 'rejected',
            resolvedBy: input.actorId,
            resolvedAt: now,
          })
          .where(
            and(
              eq(orderChangeRequests.workspaceId, input.workspaceId),
              eq(orderChangeRequests.id, input.changeRequestId),
            ),
          );

        const ok = await bumpOrder(tx, {
          workspaceId: input.workspaceId,
          orderId: input.orderId,
          expectedVersion: input.expectedVersion,
          set: {},
          now,
        });
        if (!ok) return { status: 'version_conflict' };
        return { status: 'updated' };
      },
    );
  }
}

/** Lists the proposed field names for an audit value — never the proposed values. */
function patchFieldNames(patch: OrderChangeRequestPatch): string[] {
  return [
    ...Object.keys(patch.contact ?? {}).map((key) => `contact.${key}`),
    ...Object.keys(patch.form ?? {}).map((key) => `form.${key}`),
  ].sort();
}

/**
 * Applies the contact half of an approved change to the originating lead and
 * returns the exact previous and applied values, so the amendment's
 * before/after is complete without touching the frozen order envelope.
 */
async function applyContactPatch(
  tx: TenantTransaction,
  workspaceId: string,
  orderId: string,
  patch: OrderChangeRequestPatch,
  now: Date,
): Promise<{ before: Record<string, unknown>; after: Record<string, unknown> }> {
  const contact = amendableContactPatchSchema.parse(patch.contact ?? {});
  const [order] = await tx
    .select({ leadId: orders.leadId })
    .from(orders)
    .where(and(eq(orders.workspaceId, workspaceId), eq(orders.id, orderId)))
    .limit(1);
  if (!order) return { before: {}, after: {} };

  const [lead] = await tx
    .select({
      fullName: leads.fullName,
      email: leads.email,
      phone: leads.phone,
      countryCode: leads.countryCode,
    })
    .from(leads)
    .where(and(eq(leads.workspaceId, workspaceId), eq(leads.id, order.leadId)))
    .limit(1);
  if (!lead) return { before: {}, after: {} };

  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  const updates: Record<string, string> = {};
  for (const key of ['fullName', 'email', 'phone', 'countryCode'] as const) {
    const proposed = contact[key];
    if (proposed === undefined) continue;
    before[key] = lead[key];
    after[key] = proposed;
    updates[key] = proposed;
  }
  if (Object.keys(updates).length > 0) {
    await tx
      .update(leads)
      .set({ ...updates, updatedAt: now })
      .where(and(eq(leads.workspaceId, workspaceId), eq(leads.id, order.leadId)));
  }
  return { before, after };
}
