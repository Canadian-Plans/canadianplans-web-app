import { and, eq } from 'drizzle-orm';
import {
  auditEvents,
  dispatchRecords,
  orderStatusHistory,
  orders,
  withTenantTx,
} from '@canadian-plans/db';
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

/** The manual courier details recorded with the Dispatched transition (REQ 28). */
export interface DispatchDetails {
  courier: string;
  trackingReference?: string;
  dispatchedAt: Date;
}

export interface TransitionOrderInput {
  workspaceId: string;
  actorId: string;
  requestId: string;
  orderId: string;
  expectedVersion: number;
  toStatus: OrderFulfilmentStatus;
  reason?: string;
  dispatch?: DispatchDetails;
}

export type TransitionOrderResult =
  | { status: 'transitioned'; orderId: string; orderStatus: OrderFulfilmentStatus; version: number }
  | {
      status:
        | 'not_found'
        | 'version_conflict'
        | 'illegal_transition'
        | 'cancellation_reason_required'
        | 'dispatch_details_required'
        | 'feature_not_ready';
    };

export interface TransitionPolicyContext {
  reason?: string;
  partnered: boolean;
  allowOperationalTransitions: boolean;
  /**
   * Whether courier details accompany a Dispatched transition. The transition
   * store always requires them; the read-only projection used to render the
   * admin's buttons passes `true`, because the dialog collects them before the
   * write.
   */
  dispatchProvided?: boolean;
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
  if (to === 'dispatched' && context.dispatchProvided === false) {
    return 'dispatch_details_required';
  }
  return undefined;
}

/**
 * The statuses this order may move to right now, computed from the same map and
 * policy the write path enforces so the admin renders exactly the buttons the
 * backend will accept — no transition rules in the UI (T14).
 */
export function allowedTransitionsFor(
  from: OrderFulfilmentStatus,
  policy: Omit<TransitionPolicyContext, 'reason' | 'dispatchProvided'>,
): OrderFulfilmentStatus[] {
  return [...allowedTransitions[from]].filter(
    (to) =>
      validateTransition(from, to, {
        ...policy,
        // A cancellation always collects its reason in the dialog, and a
        // dispatch always collects courier details, so neither is a reason to
        // hide the action.
        reason: to === 'cancelled' ? 'collected by the caller' : undefined,
        dispatchProvided: true,
      }) === undefined,
  );
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
          dispatchProvided: input.toStatus === 'dispatched' ? input.dispatch !== undefined : true,
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
        // Internal write in the same transaction as the transition it belongs to
        // (invariant 7): the courier record and the Dispatched status can never
        // disagree.
        if (input.toStatus === 'dispatched' && input.dispatch) {
          await tx.insert(dispatchRecords).values({
            workspaceId: input.workspaceId,
            orderId: input.orderId,
            actorId: input.actorId,
            courier: input.dispatch.courier.trim(),
            trackingReference: input.dispatch.trackingReference?.trim() || null,
            dispatchedAt: input.dispatch.dispatchedAt,
          });
        }
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
