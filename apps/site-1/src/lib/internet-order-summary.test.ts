import { describe, expect, it } from 'vitest';
import { internetPlansByProvince } from '@content/home-internet';
import { internetOrderSummaryFor } from '@content/internet-order';

describe('internetOrderSummaryFor', () => {
  it('never prints "undefined" for a plan card without a unit', () => {
    for (const plans of Object.values(internetPlansByProvince)) {
      for (const plan of plans) {
        const summary = internetOrderSummaryFor(plan);
        expect(summary.compactTitle).not.toContain('undefined');
        expect(summary.compactTitle).toContain(plan.allowance);
      }
    }
  });
});
