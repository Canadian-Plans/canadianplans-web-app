import { describe, expect, it } from 'vitest';
import { mobileCopy, mobilePlans } from '@content/mobile-plans';

describe('mobile plans page', () => {
  it('keeps the comparison table in step with the plan cards', () => {
    const price = mobileCopy.comparison.rows.find((row) => row.label === 'Price');
    expect(mobileCopy.comparison.columns).toEqual(mobilePlans.map((plan) => plan.carrier));
    expect(price?.values).toEqual(mobilePlans.map((plan) => `${plan.amount}${plan.period}`));
    for (const plan of mobilePlans) expect(plan.amount).toBe(`$${plan.priceCad}`);
  });

  it('links every card to a catalogue mobile plan', () => {
    for (const plan of mobilePlans) expect(plan.id).toMatch(/^mobile-[a-z0-9-]+$/);
  });
});
