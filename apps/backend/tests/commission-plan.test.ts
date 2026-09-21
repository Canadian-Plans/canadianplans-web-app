import { describe, expect, it } from 'vitest';

import {
  planCommissionForActivation,
  type CommissionRuleCandidate,
} from '../src/partners/commission-rule.js';

const AT = new Date('2026-09-20T12:00:00.000Z');

function fixedRule(overrides: Partial<CommissionRuleCandidate> = {}): CommissionRuleCandidate {
  return {
    id: 'rule-1',
    ruleType: 'fixed',
    valueMinor: 1500,
    currency: 'CAD',
    isTest: false,
    effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    effectiveTo: null,
    ...overrides,
  };
}

describe('planCommissionForActivation (invariant 10)', () => {
  it('plans a single create for a fixed rule effective now', () => {
    const plan = planCommissionForActivation({
      alreadyHasLine: false,
      rules: [fixedRule({ valueMinor: 2500 })],
      at: AT,
      nodeEnv: 'test',
    });
    expect(plan).toMatchObject({
      status: 'create',
      ruleId: 'rule-1',
      amountMinor: 2500,
      currency: 'CAD',
    });
  });

  it('is idempotent: an order that already has a line plans nothing (exactly-once)', () => {
    const plan = planCommissionForActivation({
      alreadyHasLine: true,
      rules: [fixedRule()],
      at: AT,
      nodeEnv: 'test',
    });
    expect(plan).toEqual({ status: 'exists' });
  });

  it('the exists branch wins even when a valid rule is present', () => {
    // A retried activation must never produce a second line, regardless of rules.
    const plan = planCommissionForActivation({
      alreadyHasLine: true,
      rules: [fixedRule(), fixedRule({ id: 'rule-2', effectiveFrom: new Date('2026-06-01') })],
      at: AT,
      nodeEnv: 'test',
    });
    expect(plan.status).toBe('exists');
  });

  it('rejects activation when no rule is effective', () => {
    expect(
      planCommissionForActivation({ alreadyHasLine: false, rules: [], at: AT, nodeEnv: 'test' }),
    ).toEqual({ status: 'config_incomplete', reason: 'no_effective_rule' });
  });

  it('bars a TEST rule from live records in production, but allows it elsewhere', () => {
    const testRule = [fixedRule({ valueMinor: 0, isTest: true })];
    expect(
      planCommissionForActivation({
        alreadyHasLine: false,
        rules: testRule,
        at: AT,
        nodeEnv: 'production',
      }),
    ).toEqual({ status: 'config_incomplete', reason: 'test_rule_barred_from_live' });
    expect(
      planCommissionForActivation({
        alreadyHasLine: false,
        rules: testRule,
        at: AT,
        nodeEnv: 'test',
      }),
    ).toMatchObject({ status: 'create', amountMinor: 0 });
  });

  it('rejects a percentage rule while OPEN_INPUTS #17 is unresolved', () => {
    expect(
      planCommissionForActivation({
        alreadyHasLine: false,
        rules: [fixedRule({ ruleType: 'percentage', valueMinor: 500 })],
        at: AT,
        nodeEnv: 'test',
      }),
    ).toEqual({ status: 'config_incomplete', reason: 'unsupported_rule_type' });
  });

  it('picks the most recently effective rule for a new line', () => {
    const plan = planCommissionForActivation({
      alreadyHasLine: false,
      rules: [
        fixedRule({ id: 'old', valueMinor: 1000, effectiveFrom: new Date('2026-01-01') }),
        fixedRule({ id: 'new', valueMinor: 2000, effectiveFrom: new Date('2026-06-01') }),
      ],
      at: AT,
      nodeEnv: 'test',
    });
    expect(plan).toMatchObject({ status: 'create', ruleId: 'new', amountMinor: 2000 });
  });
});
