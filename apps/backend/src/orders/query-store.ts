import { and, asc, eq } from 'drizzle-orm';
import { orderStatusHistory, orders, partners, withTenantTx } from '@canadian-plans/db';
import {
  leadFormSchema,
  orderConsentSchema,
  orderDetailSchema,
  orderFulfilmentStatusSchema,
  orderSnapshotSchema,
  orderSummarySchema,
  type OrderDetail,
} from '@canadian-plans/contracts';

type OrderQueryDatabase = Pick<import('@canadian-plans/db').DatabaseClient, 'withTenantTx'>;
const defaultDatabase: OrderQueryDatabase = { withTenantTx };

export interface OrderQueryStore {
  getOrder(workspaceId: string, actorId: string, orderId: string): Promise<OrderDetail | undefined>;
}

export class DatabaseOrderQueryStore implements OrderQueryStore {
  constructor(private readonly database: OrderQueryDatabase = defaultDatabase) {}

  getOrder(
    workspaceId: string,
    actorId: string,
    orderId: string,
  ): Promise<OrderDetail | undefined> {
    return this.database.withTenantTx({ workspaceId, actorId }, async (tx) => {
      const [row] = await tx
        .select({ order: orders, partnerCode: partners.referralCode })
        .from(orders)
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
      const historyRows = await tx
        .select()
        .from(orderStatusHistory)
        .where(
          and(
            eq(orderStatusHistory.workspaceId, workspaceId),
            eq(orderStatusHistory.orderId, orderId),
          ),
        )
        .orderBy(asc(orderStatusHistory.createdAt));
      return orderDetailSchema.parse({
        ...summary,
        assigneeId: row.order.assigneeId,
        partnerCode: row.partnerCode,
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
      });
    });
  }
}
