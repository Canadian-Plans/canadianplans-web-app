import { and, eq } from 'drizzle-orm';
import { auditEvents, orderStatusHistory, orders, withTenantTx } from '@canadian-plans/db';
import { orderFulfilmentStatusSchema, type OrderFulfilmentStatus } from '@canadian-plans/contracts';

type TransitionDatabase = Pick<import('@canadian-plans/db').DatabaseClient, 'withTenantTx'>;
const defaultDatabase: TransitionDatabase = { withTenantTx };

const allowedTransitions: Readonly<
  Record<OrderFulfilmentStatus, ReadonlySet<OrderFulfilmentStatus>>
> = {
  submitted: new Set(['in_progress', 'cancelled']),
  in_progress: new Set(['awaiting_customer', 'ready_for_delivery', 'cancelled']),
  awaiting_customer: new Set(['in_progress', 'cancelled']),
  ready_for_delivery: new Set(['dispatched', 'cancelled']),
  dispatched: new Set(['activated', 'cancelled']),
  activated: new Set(),
  cancelled: new Set(),
};

export interface TransitionOrderInput {
  workspaceId: string;
  actorId: string;
  requestId: string;
  orderId: string;
  expectedVersion: number;
  toStatus: OrderFulfilmentStatus;
  reason?: string;
}

export type TransitionOrderResult =
  | { status: 'transitioned'; orderId: string; orderStatus: OrderFulfilmentStatus; version: number }
  | {
      status:
        | 'not_found'
        | 'version_conflict'
        | 'illegal_transition'
        | 'cancellation_reason_required'
        | 'feature_not_ready';
    };

export interface TransitionPolicyContext {
  reason?: string;
  partnered: boolean;
  allowOperationalTransitions: boolean;
}

export function validateTransition(
  from: OrderFulfilmentStatus,
  to: OrderFulfilmentStatus,
  context: TransitionPolicyContext,
):
  | Exclude<TransitionOrderResult['status'], 'transitioned' | 'not_found' | 'version_conflict'>
  | undefined {
  if (to === 'cancelled' && !context.reason?.trim()) return 'cancellation_reason_required';
  if (!allowedTransitions[from].has(to)) return 'illegal_transition';
  if (to === 'activated' && context.partnered) return 'feature_not_ready';
  if (!context.allowOperationalTransitions && (to === 'dispatched' || to === 'activated')) {
    return 'feature_not_ready';
  }
  return undefined;
}

export interface OrderTransitionStore {
  transition(input: TransitionOrderInput): Promise<TransitionOrderResult>;
}

export class DatabaseOrderTransitionStore implements OrderTransitionStore {
  constructor(
    private readonly database: TransitionDatabase = defaultDatabase,
    private readonly allowOperationalTransitions = false,
    private readonly now: () => Date = () => new Date(),
  ) {}

  transition(input: TransitionOrderInput): Promise<TransitionOrderResult> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        const [current] = await tx
          .select({
            id: orders.id,
            status: orders.status,
            version: orders.version,
            partnerId: orders.partnerId,
          })
          .from(orders)
          .where(and(eq(orders.workspaceId, input.workspaceId), eq(orders.id, input.orderId)))
          .limit(1)
          .for('update');
        if (!current) return { status: 'not_found' };
        if (current.version !== input.expectedVersion) return { status: 'version_conflict' };
        const currentStatus = orderFulfilmentStatusSchema.parse(current.status);
        const policyError = validateTransition(currentStatus, input.toStatus, {
          reason: input.reason,
          partnered: current.partnerId !== null,
          allowOperationalTransitions: this.allowOperationalTransitions,
        });
        if (policyError) return { status: policyError };

        const changedAt = this.now();
        const nextVersion = current.version + 1;
        const [updated] = await tx
          .update(orders)
          .set({
            status: input.toStatus,
            ...(input.toStatus === 'dispatched' ? { deliveryState: 'dispatched' } : {}),
            version: nextVersion,
            updatedAt: changedAt,
          })
          .where(
            and(
              eq(orders.workspaceId, input.workspaceId),
              eq(orders.id, input.orderId),
              eq(orders.version, input.expectedVersion),
            ),
          )
          .returning({ id: orders.id });
        if (!updated) return { status: 'version_conflict' };

        await tx.insert(orderStatusHistory).values({
          workspaceId: input.workspaceId,
          orderId: input.orderId,
          actorId: input.actorId,
          fromStatus: currentStatus,
          toStatus: input.toStatus,
          orderVersion: nextVersion,
          reason: input.reason?.trim(),
        });
        await tx.insert(auditEvents).values({
          workspaceId: input.workspaceId,
          actorId: input.actorId,
          actorLabel: 'staff',
          action: 'order.status_changed',
          entity: 'order',
          entityId: input.orderId,
          requestId: input.requestId,
          before: { status: currentStatus, version: current.version },
          after: { status: input.toStatus, version: nextVersion },
        });
        return {
          status: 'transitioned',
          orderId: input.orderId,
          orderStatus: input.toStatus,
          version: nextVersion,
        };
      },
    );
  }
}

export function canTransition(from: OrderFulfilmentStatus, to: OrderFulfilmentStatus): boolean {
  return allowedTransitions[from].has(to);
}
