import type { CommissionRuleType } from '@canadian-plans/contracts';

/**
 * Commission rule selection and amount computation (T19; REQ 32).
 *
 * These are pure functions with no database or environment access so the money
 * decisions are unit-testable in isolation. The activation hook
 * (`activation.ts`) reads the candidate rules inside the transaction and feeds
 * them here; nothing about "which rule applies" or "how much" lives in SQL.
 */

/** The commission-rule fields the activation path needs to reason about a rule. */
export interface CommissionRuleCandidate {
  id: string;
  ruleType: CommissionRuleType;
  valueMinor: number;
  currency: string;
  isTest: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

/** The immutable rule terms snapshotted onto a commission line at activation. */
export interface CommissionRuleSnapshotValue {
  ruleId: string;
  ruleType: CommissionRuleType;
  value: { amountMinor: number; currency: string };
  isTest: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
}

/**
 * The rule *in effect at* `at`: its window contains the instant
 * (`effectiveFrom <= at < effectiveTo`, open end when `effectiveTo` is null).
 * When several overlap, the one that most recently took effect wins, so
 * replacing a rule (a new row with a later `effectiveFrom`) supersedes the old
 * one without editing it — leaving already-earned lines untouched (invariant 10).
 */
export function selectEffectiveRule(
  rules: readonly CommissionRuleCandidate[],
  at: Date,
): CommissionRuleCandidate | undefined {
  const instant = at.getTime();
  const inWindow = rules.filter(
    (rule) =>
      rule.effectiveFrom.getTime() <= instant &&
      (rule.effectiveTo === null || rule.effectiveTo.getTime() > instant),
  );
  if (inWindow.length === 0) return undefined;
  return inWindow.reduce((latest, rule) =>
    rule.effectiveFrom.getTime() > latest.effectiveFrom.getTime() ? rule : latest,
  );
}

export type CommissionAmountResult =
  | { status: 'computed'; amountMinor: number; currency: string }
  /**
   * `percentage` rules apply a rate to a basis whose exact definition and
   * rounding are OPEN_INPUTS #17. That is unresolved, so a percentage rule
   * cannot be turned into a live commission amount — activation is rejected
   * rather than guessing a basis (do not invent business rules).
   */
  | { status: 'unsupported_rule_type' };

/** The commission amount a rule produces for an activated order. */
export function computeCommissionAmount(rule: CommissionRuleCandidate): CommissionAmountResult {
  switch (rule.ruleType) {
    case 'fixed':
      return { status: 'computed', amountMinor: rule.valueMinor, currency: rule.currency };
    case 'percentage':
      return { status: 'unsupported_rule_type' };
  }
}

/**
 * A TEST rule (e.g. the fixed-zero placeholder used while OPEN_INPUTS #7/#17 are
 * unresolved) must never produce a live, immutable commission line. It may only
 * be applied outside production. `nodeEnv` is `process.env.NODE_ENV`.
 */
export function ruleAllowedForLiveRecords(
  rule: Pick<CommissionRuleCandidate, 'isTest'>,
  nodeEnv: string | undefined,
): boolean {
  if (!rule.isTest) return true;
  return nodeEnv !== 'production';
}

export type CommissionConfigIncompleteReason =
  | 'no_effective_rule'
  | 'unsupported_rule_type'
  | 'test_rule_barred_from_live';

export type CommissionPlan =
  /** A new line should be created with these terms. */
  | {
      status: 'create';
      ruleId: string;
      amountMinor: number;
      currency: string;
      snapshot: CommissionRuleSnapshotValue;
    }
  /** A line already exists for this order — nothing to do (idempotent). */
  | { status: 'exists' }
  /** No usable rule; the activation must abort and leave order state unchanged. */
  | { status: 'config_incomplete'; reason: CommissionConfigIncompleteReason };

/**
 * The full commission decision for an activating order, as a pure function of
 * already-fetched state. Kept free of any database or environment access so the
 * money decision — including the exactly-once "a line already exists" branch and
 * the TEST-rule live guard — is unit-testable in isolation. `activation.ts`
 * fetches `alreadyHasLine`/`rules` inside the transaction and executes this plan.
 */
export function planCommissionForActivation(input: {
  alreadyHasLine: boolean;
  rules: readonly CommissionRuleCandidate[];
  at: Date;
  nodeEnv: string | undefined;
}): CommissionPlan {
  if (input.alreadyHasLine) return { status: 'exists' };
  const rule = selectEffectiveRule(input.rules, input.at);
  if (!rule) return { status: 'config_incomplete', reason: 'no_effective_rule' };
  if (!ruleAllowedForLiveRecords(rule, input.nodeEnv)) {
    return { status: 'config_incomplete', reason: 'test_rule_barred_from_live' };
  }
  const amount = computeCommissionAmount(rule);
  if (amount.status !== 'computed') {
    return { status: 'config_incomplete', reason: 'unsupported_rule_type' };
  }
  return {
    status: 'create',
    ruleId: rule.id,
    amountMinor: amount.amountMinor,
    currency: amount.currency,
    snapshot: buildRuleSnapshot(rule),
  };
}

export function buildRuleSnapshot(rule: CommissionRuleCandidate): CommissionRuleSnapshotValue {
  return {
    ruleId: rule.id,
    ruleType: rule.ruleType,
    value: { amountMinor: rule.valueMinor, currency: rule.currency },
    isTest: rule.isTest,
    effectiveFrom: rule.effectiveFrom.toISOString(),
    effectiveTo: rule.effectiveTo ? rule.effectiveTo.toISOString() : null,
  };
}
