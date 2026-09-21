import { and, eq } from 'drizzle-orm';
import {
  auditEvents,
  commissionLineEvents,
  commissionLines,
  commissionRules,
  type TenantTransaction,
} from '@canadian-plans/db';

import {
  planCommissionForActivation,
  type CommissionConfigIncompleteReason,
  type CommissionRuleCandidate,
} from './commission-rule.js';

export interface CommissionActivationInput {
  workspaceId: string;
  actorId: string;
  requestId: string;
  orderId: string;
  partnerId: string;
  now: Date;
}

export type CommissionActivationOutcome =
  /** A new `earned` line was created for this activation. */
  | { status: 'created'; commissionLineId: string; amountMinor: number; currency: string }
  /** A line already existed for this order — activation is idempotent (invariant 10). */
  | { status: 'exists'; commissionLineId: string }
  /**
   * No usable rule is effective at activation time (none configured, a
   * percentage rule with OPEN_INPUTS #17 unresolved, or a TEST rule barred from
   * live records). The caller must abort the activation and leave order state
   * unchanged — a commission-on-activation order cannot activate without one.
   */
  | { status: 'config_incomplete'; reason: CommissionConfigIncompleteReason };

/**
 * The commission-on-activation hook (invariant 10). Called from inside the
 * order-transition transaction when a *partnered* order activates, so the
 * commission line and the order's activated status commit together or not at
 * all. Never runs on submission and never for an unpartnered order.
 */
export interface CommissionActivationHook {
  onOrderActivated(
    tx: TenantTransaction,
    input: CommissionActivationInput,
  ): Promise<CommissionActivationOutcome>;
}

export class DatabaseCommissionActivationHook implements CommissionActivationHook {
  constructor(private readonly nodeEnv: string | undefined = process.env['NODE_ENV']) {}

  async onOrderActivated(
    tx: TenantTransaction,
    input: CommissionActivationInput,
  ): Promise<CommissionActivationOutcome> {
    // Idempotency guard: if a line already exists for this order, do nothing.
    // The unique (workspace_id, order_id) below is the real guarantee; this
    // read keeps the common retry path from even attempting an insert.
    const [existing] = await tx
      .select({ id: commissionLines.id })
      .from(commissionLines)
      .where(
        and(
          eq(commissionLines.workspaceId, input.workspaceId),
          eq(commissionLines.orderId, input.orderId),
        ),
      )
      .limit(1);
    if (existing) return { status: 'exists', commissionLineId: existing.id };

    const ruleRows = await tx
      .select({
        id: commissionRules.id,
        ruleType: commissionRules.ruleType,
        valueMinor: commissionRules.valueMinor,
        currency: commissionRules.currency,
        isTest: commissionRules.isTest,
        effectiveFrom: commissionRules.effectiveFrom,
        effectiveTo: commissionRules.effectiveTo,
      })
      .from(commissionRules)
      .where(eq(commissionRules.workspaceId, input.workspaceId));

    const candidates: CommissionRuleCandidate[] = ruleRows.map((row) => ({
      id: row.id,
      // The DB check constrains rule_type to the contract values; narrow here.
      ruleType: row.ruleType === 'percentage' ? 'percentage' : 'fixed',
      valueMinor: row.valueMinor,
      currency: row.currency,
      isTest: row.isTest,
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo,
    }));

    // `alreadyHasLine` is false here: the existing-line case returned above, so
    // the planner yields only `create` or `config_incomplete`.
    const plan = planCommissionForActivation({
      alreadyHasLine: false,
      rules: candidates,
      at: input.now,
      nodeEnv: this.nodeEnv,
    });
    if (plan.status === 'config_incomplete') {
      return { status: 'config_incomplete', reason: plan.reason };
    }
    if (plan.status !== 'create')
      return { status: 'config_incomplete', reason: 'no_effective_rule' };

    const [line] = await tx
      .insert(commissionLines)
      .values({
        workspaceId: input.workspaceId,
        orderId: input.orderId,
        partnerId: input.partnerId,
        ruleId: plan.ruleId,
        ruleSnapshot: plan.snapshot,
        amountMinor: plan.amountMinor,
        currency: plan.currency,
        state: 'earned',
        earnedAt: input.now,
        updatedAt: input.now,
      })
      // Exactly one line per order: a concurrent activation that also passed the
      // order row lock (or a retry) conflicts here rather than double-inserting.
      .onConflictDoNothing({
        target: [commissionLines.workspaceId, commissionLines.orderId],
      })
      .returning({ id: commissionLines.id });

    if (!line) {
      const [raced] = await tx
        .select({ id: commissionLines.id })
        .from(commissionLines)
        .where(
          and(
            eq(commissionLines.workspaceId, input.workspaceId),
            eq(commissionLines.orderId, input.orderId),
          ),
        )
        .limit(1);
      if (!raced) throw new Error('commission_line_insert_conflict_without_row');
      return { status: 'exists', commissionLineId: raced.id };
    }

    await tx.insert(commissionLineEvents).values({
      workspaceId: input.workspaceId,
      commissionLineId: line.id,
      actorId: input.actorId,
      fromState: null,
      toState: 'earned',
    });

    await tx.insert(auditEvents).values({
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      actorLabel: 'staff',
      action: 'commission.earned',
      entity: 'commission_line',
      entityId: line.id,
      requestId: input.requestId,
      after: {
        orderId: input.orderId,
        partnerId: input.partnerId,
        ruleId: plan.ruleId,
        state: 'earned',
        amountMinor: plan.amountMinor,
        currency: plan.currency,
      },
    });

    return {
      status: 'created',
      commissionLineId: line.id,
      amountMinor: plan.amountMinor,
      currency: plan.currency,
    };
  }
}
