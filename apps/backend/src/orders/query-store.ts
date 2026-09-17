import { and, asc, desc, eq, gte, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';
import {
  auditEvents,
  dispatchRecords,
  leads,
  memberships,
  membershipRoles,
  orderAmendments,
  orderChangeRequests,
  orderNotes,
  orderReminders,
  orderStatusHistory,
  orders,
  partners,
  paymentRecords,
  roles,
  withTenantTx,
} from '@canadian-plans/db';
import {
  leadFormSchema,
  moneySchema,
  orderChangeRequestPatchSchema,
  orderChangeRequestStatusSchema,
  orderConsentSchema,
  orderFulfilmentStatusSchema,
  orderSnapshotSchema,
  orderSummarySchema,
  paymentStateSchema,
  staffRoleNameSchema,
  type AssignableMember,
  type OrderArchiveFilter,
  type OrderDetail,
  type OrderFulfilmentStatus,
  type OrderListItem,
  type PageInfo,
  type PaymentState,
} from '@canadian-plans/contracts';
import { z } from 'zod';

/** The detail a route receives; capabilities and allowed transitions are policy, added at the HTTP edge. */
export type OrderDetailRecord = Omit<OrderDetail, 'allowedTransitions' | 'capabilities'>;

type OrderQueryDatabase = Pick<import('@canadian-plans/db').DatabaseClient, 'withTenantTx'>;
const defaultDatabase: OrderQueryDatabase = { withTenantTx };

export interface ListOrdersInput {
  workspaceId: string;
  actorId: string;
  status?: OrderFulfilmentStatus;
  paymentState?: PaymentState;
  assigneeId?: string;
  partnerId?: string;
  partnerCode?: string;
  source?: string;
  submittedFrom?: string;
  submittedTo?: string;
  archiveState?: OrderArchiveFilter;
  search?: string;
  /** Contact-field matching requires the actor's contact-search capability (permission-aware search). */
  includeContactSearch: boolean;
  page?: number;
  pageSize?: number;
}

export interface ListOrdersResult {
  orders: OrderListItem[];
  page: PageInfo;
}

export interface OrderQueryStore {
  listOrders(input: ListOrdersInput): Promise<ListOrdersResult>;
  getOrder(
    workspaceId: string,
    actorId: string,
    orderId: string,
  ): Promise<OrderDetailRecord | undefined>;
  listAssignableMembers(workspaceId: string, actorId: string): Promise<AssignableMember[]>;
}

/**
 * The stored shape of a change request's `payload` column: the proposed patch
 * plus the requester's optional note. Kept in one JSONB column so no extra
 * migration was needed beyond the tables T12 already created.
 */
export const changeRequestPayloadSchema = z.object({
  patch: orderChangeRequestPatchSchema,
  note: z.string().max(2000).optional(),
});
export type ChangeRequestPayload = z.infer<typeof changeRequestPayloadSchema>;

/**
 * The derived source label as SQL, kept byte-for-byte consistent with
 * `deriveSource` in `../leads/source.ts` (an integration test pins them
 * together). It lets the list filter and display a source without loading and
 * filtering rows in the browser.
 */
function sourceLabelSql() {
  const attribution = leads.attribution;
  return sql<string>`case
    when coalesce(${attribution}->>'partnerCode', '') <> '' then
      case when coalesce(${attribution}->>'partnerCodeMatched', 'false') = 'true'
        then 'partner:' || (${attribution}->>'partnerCode')
        else 'partner:' || (${attribution}->>'partnerCode') || ' (unmatched)'
      end
    when coalesce(${attribution}->>'utmSource', '') <> '' then
      case when coalesce(${attribution}->>'utmMedium', '') <> ''
        then 'utm:' || (${attribution}->>'utmSource') || '/' || (${attribution}->>'utmMedium')
        else 'utm:' || (${attribution}->>'utmSource')
      end
    when coalesce(${attribution}->>'referrerHost', '') <> '' then
      'referrer:' || (${attribution}->>'referrerHost')
    else 'direct'
  end`;
}

/** Substring matching, never a LIKE pattern, so a search term cannot inject wildcards. */
function searchCondition(term: string, includeContact: boolean) {
  const needle = term.trim().toLowerCase();
  const referenceMatch = sql`strpos(lower(${orders.reference}), ${needle}) > 0`;
  if (!includeContact) return referenceMatch;
  return or(
    referenceMatch,
    sql`strpos(lower(coalesce(${leads.fullName}, '')), ${needle}) > 0`,
    sql`strpos(lower(coalesce(${leads.email}, '')), ${needle}) > 0`,
    sql`strpos(lower(coalesce(${leads.phone}, '')), ${needle}) > 0`,
  );
}

function archiveCondition(archiveState: OrderArchiveFilter | undefined) {
  if (archiveState === 'archived') return isNotNull(orders.archivedAt);
  if (archiveState === 'all') return undefined;
  return isNull(orders.archivedAt);
}

export class DatabaseOrderQueryStore implements OrderQueryStore {
  constructor(private readonly database: OrderQueryDatabase = defaultDatabase) {}

  listOrders(input: ListOrdersInput): Promise<ListOrdersResult> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        const page = input.page ?? 1;
        const pageSize = input.pageSize ?? 25;
        const offset = (page - 1) * pageSize;

        const conditions = [eq(orders.workspaceId, input.workspaceId)];
        if (input.status) conditions.push(eq(orders.status, input.status));
        if (input.paymentState) conditions.push(eq(orders.paymentState, input.paymentState));
        if (input.assigneeId) conditions.push(eq(orders.assigneeId, input.assigneeId));
        if (input.partnerId) conditions.push(eq(orders.partnerId, input.partnerId));
        if (input.partnerCode) conditions.push(eq(partners.referralCode, input.partnerCode));
        if (input.submittedFrom) {
          conditions.push(gte(orders.submittedAt, new Date(input.submittedFrom)));
        }
        if (input.submittedTo) conditions.push(lt(orders.submittedAt, new Date(input.submittedTo)));
        const archive = archiveCondition(input.archiveState);
        if (archive) conditions.push(archive);
        if (input.source) conditions.push(sql`${sourceLabelSql()} = ${input.source}`);
        if (input.search) {
          const search = searchCondition(input.search, input.includeContactSearch);
          if (search) conditions.push(search);
        }
        const where = and(...conditions);

        const rows = await tx
          .select({
            order: orders,
            partnerCode: partners.referralCode,
            fullName: leads.fullName,
            email: leads.email,
            phone: leads.phone,
            countryCode: leads.countryCode,
            source: sourceLabelSql(),
          })
          .from(orders)
          .innerJoin(
            leads,
            and(eq(leads.workspaceId, orders.workspaceId), eq(leads.id, orders.leadId)),
          )
          .leftJoin(
            partners,
            and(eq(partners.workspaceId, orders.workspaceId), eq(partners.id, orders.partnerId)),
          )
          .where(where)
          .orderBy(desc(orders.submittedAt))
          .limit(pageSize)
          .offset(offset);

        const [totalRow] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(orders)
          .innerJoin(
            leads,
            and(eq(leads.workspaceId, orders.workspaceId), eq(leads.id, orders.leadId)),
          )
          .where(where);

        const items: OrderListItem[] = rows.map((row) => {
          const snapshot = orderSnapshotSchema.parse(row.order.snapshot);
          const summary = orderSummarySchema.parse({
            id: row.order.id,
            workspaceId: row.order.workspaceId,
            reference: row.order.reference,
            fulfilmentStatus: row.order.status,
            paymentState: row.order.paymentState,
            deliveryState: row.order.deliveryState,
            archiveState: row.order.archivedAt ? 'archived' : 'active',
            total: snapshot.total,
            amountPayableToday: snapshot.amountPayableToday,
            recordVersion: row.order.version,
            createdAt: row.order.createdAt.toISOString(),
            updatedAt: row.order.updatedAt.toISOString(),
          });
          return {
            ...summary,
            assigneeId: row.order.assigneeId,
            partnerCode: row.partnerCode,
            customer: {
              fullName: row.fullName,
              email: row.email,
              phone: row.phone,
              countryCode: row.countryCode,
            },
            source: row.source,
            submittedAt: row.order.submittedAt.toISOString(),
          };
        });

        return { orders: items, page: { page, pageSize, total: totalRow?.count ?? 0 } };
      },
    );
  }

  getOrder(
    workspaceId: string,
    actorId: string,
    orderId: string,
  ): Promise<OrderDetailRecord | undefined> {
    return this.database.withTenantTx({ workspaceId, actorId }, async (tx) => {
      const [row] = await tx
        .select({
          order: orders,
          partnerCode: partners.referralCode,
          fullName: leads.fullName,
          email: leads.email,
          phone: leads.phone,
          countryCode: leads.countryCode,
          source: sourceLabelSql(),
        })
        .from(orders)
        .innerJoin(
          leads,
          and(eq(leads.workspaceId, orders.workspaceId), eq(leads.id, orders.leadId)),
        )
        .leftJoin(
          partners,
          and(eq(partners.workspaceId, orders.workspaceId), eq(partners.id, orders.partnerId)),
        )
        .where(and(eq(orders.workspaceId, workspaceId), eq(orders.id, orderId)))
        .limit(1);
      if (!row) return undefined;

      const snapshot = orderSnapshotSchema.parse(row.order.snapshot);
      const payload = leadFormSchema.parse(row.order.payload);
      const consent =
        row.order.consent === null ? null : orderConsentSchema.parse(row.order.consent);
      const summary = orderSummarySchema.parse({
        id: row.order.id,
        workspaceId: row.order.workspaceId,
        reference: row.order.reference,
        fulfilmentStatus: row.order.status,
        paymentState: row.order.paymentState,
        deliveryState: row.order.deliveryState,
        archiveState: row.order.archivedAt ? 'archived' : 'active',
        total: snapshot.total,
        amountPayableToday: snapshot.amountPayableToday,
        recordVersion: row.order.version,
        createdAt: row.order.createdAt.toISOString(),
        updatedAt: row.order.updatedAt.toISOString(),
      });

      const [
        historyRows,
        auditRows,
        noteRows,
        reminderRows,
        changeRequestRows,
        amendmentRows,
        paymentRows,
        dispatchRows,
      ] = await Promise.all([
        tx
          .select()
          .from(orderStatusHistory)
          .where(
            and(
              eq(orderStatusHistory.workspaceId, workspaceId),
              eq(orderStatusHistory.orderId, orderId),
            ),
          )
          .orderBy(asc(orderStatusHistory.createdAt)),
        tx
          .select()
          .from(auditEvents)
          .where(
            and(
              eq(auditEvents.workspaceId, workspaceId),
              eq(auditEvents.entity, 'order'),
              eq(auditEvents.entityId, orderId),
            ),
          )
          .orderBy(asc(auditEvents.createdAt)),
        tx
          .select()
          .from(orderNotes)
          .where(and(eq(orderNotes.workspaceId, workspaceId), eq(orderNotes.orderId, orderId)))
          .orderBy(asc(orderNotes.createdAt)),
        tx
          .select()
          .from(orderReminders)
          .where(
            and(eq(orderReminders.workspaceId, workspaceId), eq(orderReminders.orderId, orderId)),
          )
          .orderBy(asc(orderReminders.remindAt)),
        tx
          .select()
          .from(orderChangeRequests)
          .where(
            and(
              eq(orderChangeRequests.workspaceId, workspaceId),
              eq(orderChangeRequests.orderId, orderId),
            ),
          )
          .orderBy(asc(orderChangeRequests.createdAt)),
        tx
          .select()
          .from(orderAmendments)
          .where(
            and(eq(orderAmendments.workspaceId, workspaceId), eq(orderAmendments.orderId, orderId)),
          )
          .orderBy(asc(orderAmendments.createdAt)),
        tx
          .select()
          .from(paymentRecords)
          .where(
            and(eq(paymentRecords.workspaceId, workspaceId), eq(paymentRecords.orderId, orderId)),
          )
          .orderBy(asc(paymentRecords.recordedAt)),
        tx
          .select()
          .from(dispatchRecords)
          .where(
            and(eq(dispatchRecords.workspaceId, workspaceId), eq(dispatchRecords.orderId, orderId)),
          )
          .orderBy(desc(dispatchRecords.dispatchedAt))
          .limit(1),
      ]);

      const dispatchRow = dispatchRows[0];

      return {
        ...summary,
        assigneeId: row.order.assigneeId,
        partnerCode: row.partnerCode,
        customer: {
          fullName: row.fullName,
          email: row.email,
          phone: row.phone,
          countryCode: row.countryCode,
        },
        source: row.source,
        submittedAt: row.order.submittedAt.toISOString(),
        snapshot,
        payload,
        consent,
        history: historyRows.map((history) => ({
          at: history.createdAt.toISOString(),
          actorId: history.actorId,
          action: history.fromStatus === null ? 'order_submitted' : 'status_changed',
          fromStatus:
            history.fromStatus === null
              ? null
              : orderFulfilmentStatusSchema.parse(history.fromStatus),
          toStatus: orderFulfilmentStatusSchema.parse(history.toStatus),
          recordVersion: history.orderVersion,
          ...(history.reason ? { note: history.reason } : {}),
        })),
        audit: auditRows.map((audit) => ({
          id: audit.id,
          at: audit.createdAt.toISOString(),
          actorId: audit.actorId,
          action: audit.action,
          before: jsonRecordOrNull(audit.before),
          after: jsonRecordOrNull(audit.after),
        })),
        notes: noteRows.map((note) => ({
          id: note.id,
          authorId: note.authorId,
          body: note.body,
          createdAt: note.createdAt.toISOString(),
        })),
        reminders: reminderRows.map((reminder) => ({
          id: reminder.id,
          createdBy: reminder.createdBy,
          remindAt: reminder.remindAt.toISOString(),
          note: reminder.note,
          createdAt: reminder.createdAt.toISOString(),
        })),
        changeRequests: changeRequestRows.map((changeRequest) => {
          const stored = changeRequestPayloadSchema.parse(changeRequest.payload);
          return {
            id: changeRequest.id,
            requestedBy: changeRequest.requestedBy,
            status: orderChangeRequestStatusSchema.parse(changeRequest.status),
            patch: stored.patch,
            note: stored.note ?? null,
            resolvedBy: changeRequest.resolvedBy,
            resolvedAt: changeRequest.resolvedAt?.toISOString() ?? null,
            createdAt: changeRequest.createdAt.toISOString(),
          };
        }),
        amendments: amendmentRows.map((amendment) => ({
          id: amendment.id,
          actorId: amendment.actorId,
          reason: amendment.reason,
          patch: orderChangeRequestPatchSchema.parse(amendment.patch),
          before: jsonRecord(amendment.before),
          after: jsonRecord(amendment.after),
          createdAt: amendment.createdAt.toISOString(),
        })),
        payments: paymentRows.map((payment) => ({
          id: payment.id,
          actorId: payment.actorId,
          fromState: paymentStateSchema.parse(payment.fromState),
          toState: paymentStateSchema.parse(payment.toState),
          method: payment.method,
          reference: payment.paymentReference,
          amount:
            payment.amountMinor === null || payment.currency === null
              ? null
              : moneySchema.parse({
                  amountMinor: payment.amountMinor,
                  currency: payment.currency,
                }),
          recordedAt: payment.recordedAt.toISOString(),
        })),
        dispatch: dispatchRow
          ? {
              id: dispatchRow.id,
              actorId: dispatchRow.actorId,
              courier: dispatchRow.courier,
              trackingReference: dispatchRow.trackingReference,
              dispatchedAt: dispatchRow.dispatchedAt.toISOString(),
            }
          : null,
      };
    });
  }

  listAssignableMembers(workspaceId: string, actorId: string): Promise<AssignableMember[]> {
    return this.database.withTenantTx({ workspaceId, actorId }, async (tx) => {
      const rows = await tx
        .select({
          membershipId: memberships.id,
          userId: memberships.userId,
          roleName: roles.name,
        })
        .from(memberships)
        .leftJoin(
          membershipRoles,
          and(
            eq(membershipRoles.workspaceId, memberships.workspaceId),
            eq(membershipRoles.membershipId, memberships.id),
          ),
        )
        .leftJoin(
          roles,
          and(
            eq(roles.workspaceId, membershipRoles.workspaceId),
            eq(roles.id, membershipRoles.roleId),
          ),
        )
        .where(
          and(
            eq(memberships.workspaceId, workspaceId),
            eq(memberships.membershipType, 'staff'),
            eq(memberships.status, 'active'),
          ),
        )
        .orderBy(asc(memberships.createdAt));

      const byMembership = new Map<string, AssignableMember>();
      for (const row of rows) {
        const existing = byMembership.get(row.membershipId);
        const member: AssignableMember = existing ?? {
          membershipId: row.membershipId,
          roles: [],
          isSelf: row.userId === actorId,
        };
        if (row.roleName) member.roles.push(staffRoleNameSchema.parse(row.roleName));
        byMembership.set(row.membershipId, member);
      }
      return [...byMembership.values()];
    });
  }
}

/** JSONB objects come back as `unknown`; audit values are always objects or null. */
function jsonRecordOrNull(value: unknown): Record<string, unknown> | null {
  return value === null || value === undefined ? null : jsonRecord(value);
}

function jsonRecord(value: unknown): Record<string, unknown> {
  const parsed = z.record(z.string(), z.unknown()).safeParse(value);
  return parsed.success ? parsed.data : {};
}
