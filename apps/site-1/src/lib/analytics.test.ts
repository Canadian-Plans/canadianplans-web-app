import { afterEach, describe, expect, it, vi } from 'vitest';

import { trackPlanSelected, trackRegionSelected } from './analytics';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('trackPlanSelected', () => {
  it('emits a sanitized plan_selected event when Umami is loaded', () => {
    const track = vi.fn();
    vi.stubGlobal('window', {
      umami: { track },
      localStorage: {
        getItem: () => JSON.stringify({ version: 1, analytics: true, marketing: false }),
      },
    });

    trackPlanSelected('90000000-0000-4000-8000-000000000001');

    expect(track).toHaveBeenCalledWith('plan_selected', {
      plan: '90000000-0000-4000-8000-000000000001',
    });
  });

  it('does not emit before opt-in or after withdrawal', () => {
    const track = vi.fn();
    let choice: string | null = null;
    vi.stubGlobal('window', { umami: { track }, localStorage: { getItem: () => choice } });
    trackPlanSelected('plan-x');
    expect(track).not.toHaveBeenCalled();
    choice = JSON.stringify({ version: 1, analytics: true, marketing: false });
    trackPlanSelected('plan-x');
    expect(track).toHaveBeenCalledTimes(1);
    choice = JSON.stringify({ version: 1, analytics: false, marketing: false });
    trackPlanSelected('plan-x');
    expect(track).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when Umami is not configured', () => {
    vi.stubGlobal('window', {});
    expect(() => trackPlanSelected('plan-x')).not.toThrow();
  });

  it('is a no-op when window.umami exists but exposes no track function', () => {
    // A script mid-initialization (or a test stub) can define `window.umami`
    // before it is fully populated. This must never throw.
    vi.stubGlobal('window', { umami: {} });
    expect(() => trackPlanSelected('plan-x')).not.toThrow();
  });
});

describe('trackRegionSelected', () => {
  it('emits the province code and whether it is served, and nothing else', () => {
    const track = vi.fn();
    vi.stubGlobal('window', {
      umami: { track },
      localStorage: {
        getItem: () => JSON.stringify({ version: 1, analytics: true, marketing: false }),
      },
    });

    trackRegionSelected('NS', false);

    expect(track).toHaveBeenCalledWith('region_selected', { province: 'NS', served: false });
  });

  it('does not emit without analytics consent', () => {
    const track = vi.fn();
    vi.stubGlobal('window', { umami: { track }, localStorage: { getItem: () => null } });
    trackRegionSelected('NS', false);
    expect(track).not.toHaveBeenCalled();
  });
});
