import { describe, expect, it } from 'vitest';

import {
  buildRuleSnapshot,
  computeCommissionAmount,
  ruleAllowedForLiveRecords,
  selectEffectiveRule,
  type CommissionRuleCandidate,
} from '../src/partners/commission-rule.js';
import { validateCommissionStateTransition } from '../src/partners/commission-state.js';

function rule(overrides: Partial<CommissionRuleCandidate> = {}): CommissionRuleCandidate {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    ruleType: 'fixed',
    valueMinor: 1500,
    currency: 'CAD',
    isTest: false,
    effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    effectiveTo: null,
    ...overrides,
  };
}

describe('selectEffectiveRule', () => {
  const at = new Date('2026-09-20T12:00:00.000Z');

  it('returns undefined when no rule window contains the instant', () => {
    expect(selectEffectiveRule([], at)).toBeUndefined();
    expect(
      selectEffectiveRule([rule({ effectiveFrom: new Date('2026-10-01T00:00:00.000Z') })], at),
    ).toBeUndefined();
    expect(
      selectEffectiveRule([rule({ effectiveTo: new Date('2026-09-01T00:00:00.000Z') })], at),
    ).toBeUndefined();
  });

  it('treats the window as [from, to): from is inclusive, to is exclusive', () => {
    const boundary = new Date('2026-09-20T12:00:00.000Z');
    expect(selectEffectiveRule([rule({ effectiveFrom: boundary })], boundary)?.id).toBeDefined();
    expect(selectEffectiveRule([rule({ effectiveTo: boundary })], boundary)).toBeUndefined();
  });

  it('when several rules overlap, the most recently effective one wins', () => {
    const older = rule({
      id: '00000000-0000-4000-8000-0000000000a1',
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      valueMinor: 1000,
    });
    const newer = rule({
      id: '00000000-0000-4000-8000-0000000000a2',
      effectiveFrom: new Date('2026-06-01T00:00:00.000Z'),
      valueMinor: 2000,
    });
    expect(selectEffectiveRule([older, newer], at)?.id).toBe(newer.id);
    // Order in the array must not matter.
    expect(selectEffectiveRule([newer, older], at)?.id).toBe(newer.id);
  });
});

describe('computeCommissionAmount', () => {
  it('returns the flat amount for a fixed rule', () => {
    expect(computeCommissionAmount(rule({ ruleType: 'fixed', valueMinor: 2500 }))).toEqual({
      status: 'computed',
      amountMinor: 2500,
      currency: 'CAD',
    });
  });

  it('supports a fixed-zero TEST rule amount', () => {
    expect(computeCommissionAmount(rule({ valueMinor: 0, isTest: true }))).toEqual({
      status: 'computed',
      amountMinor: 0,
      currency: 'CAD',
    });
  });

  it('refuses a percentage rule while OPEN_INPUTS #17 (basis + rounding) is unresolved', () => {
    expect(computeCommissionAmount(rule({ ruleType: 'percentage', valueMinor: 500 }))).toEqual({
      status: 'unsupported_rule_type',
    });
  });
});

describe('ruleAllowedForLiveRecords', () => {
  it('always allows a non-test rule', () => {
    expect(ruleAllowedForLiveRecords({ isTest: false }, 'production')).toBe(true);
    expect(ruleAllowedForLiveRecords({ isTest: false }, 'test')).toBe(true);
  });

  it('bars a TEST rule from production but allows it elsewhere', () => {
    expect(ruleAllowedForLiveRecords({ isTest: true }, 'production')).toBe(false);
    expect(ruleAllowedForLiveRecords({ isTest: true }, 'test')).toBe(true);
    expect(ruleAllowedForLiveRecords({ isTest: true }, undefined)).toBe(true);
  });
});

describe('buildRuleSnapshot', () => {
  it('captures the rule terms as ISO strings for the commission line', () => {
    const snapshot = buildRuleSnapshot(rule({ effectiveTo: new Date('2027-01-01T00:00:00.000Z') }));
    expect(snapshot).toEqual({
      ruleId: '00000000-0000-4000-8000-000000000001',
      ruleType: 'fixed',
      value: { amountMinor: 1500, currency: 'CAD' },
      isTest: false,
      effectiveFrom: '2026-01-01T00:00:00.000Z',
      effectiveTo: '2027-01-01T00:00:00.000Z',
    });
  });
});

describe('validateCommissionStateTransition', () => {
  it('allows the single forward step earned -> carrier_paid', () => {
    expect(validateCommissionStateTransition('earned', 'carrier_paid')).toEqual({ status: 'ok' });
  });

  it('keeps partner_paid disabled even from carrier_paid (OPEN_INPUTS #18)', () => {
    expect(validateCommissionStateTransition('carrier_paid', 'partner_paid')).toEqual({
      status: 'partner_paid_disabled',
    });
    expect(validateCommissionStateTransition('earned', 'partner_paid')).toEqual({
      status: 'partner_paid_disabled',
    });
  });

  it('rejects skips and backward moves', () => {
    expect(validateCommissionStateTransition('earned', 'earned')).toEqual({
      status: 'invalid_transition',
    });
    expect(validateCommissionStateTransition('carrier_paid', 'earned')).toEqual({
      status: 'invalid_transition',
    });
  });
});
