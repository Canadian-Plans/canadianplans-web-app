import { afterEach, describe, expect, it, vi } from 'vitest';

import { trackPlanSelected } from './analytics';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('trackPlanSelected', () => {
  it('emits a sanitized plan_selected event when Umami is loaded', () => {
    const track = vi.fn();
    vi.stubGlobal('window', { umami: { track } });

    trackPlanSelected('90000000-0000-4000-8000-000000000001');

    expect(track).toHaveBeenCalledWith('plan_selected', {
      plan: '90000000-0000-4000-8000-000000000001',
    });
  });

  it('is a no-op when Umami is not configured', () => {
    vi.stubGlobal('window', {});
    expect(() => trackPlanSelected('plan-x')).not.toThrow();
  });
});
