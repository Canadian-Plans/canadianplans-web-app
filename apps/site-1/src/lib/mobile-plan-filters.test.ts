import { describe, it, expect } from 'vitest';
import { mobilePlans } from '@content/mobile-plans';
import { defaultMobileFilters, filterMobilePlans } from './mobile-plan-filters';

describe('mobile preview plan filters', () => {
  it('uses content fixtures and retains their source order', () => {
    expect(filterMobilePlans(mobilePlans, defaultMobileFilters, 'recommended')).toEqual(
      mobilePlans,
    );
  });
  it.each([
    ['chatr', [20]],
    ['fido', [60]],
    ['rogers', [100, 150]],
  ] as const)('filters %s by metadata', (brand, expected) => {
    expect(
      filterMobilePlans(mobilePlans, { ...defaultMobileFilters, brand }, 'recommended').map(
        (p) => p.dataGb,
      ),
    ).toEqual(expected);
  });
  it.each([
    ['prepaid', [20, 60]],
    ['postpaid', [100, 150]],
  ] as const)('filters %s', (pay, expected) => {
    expect(
      filterMobilePlans(mobilePlans, { ...defaultMobileFilters, pay }, 'recommended').map(
        (p) => p.dataGb,
      ),
    ).toEqual(expected);
  });
  it.each([
    ['under20', []],
    ['20to60', [20, 60]],
    ['over60', [100, 150]],
  ] as const)('uses nonoverlapping %s boundaries', (data, expected) => {
    expect(
      filterMobilePlans(mobilePlans, { ...defaultMobileFilters, data }, 'recommended').map(
        (p) => p.dataGb,
      ),
    ).toEqual(expected);
  });
  it('combines filters rather than adding their results', () => {
    expect(
      filterMobilePlans(
        mobilePlans,
        { ...defaultMobileFilters, brand: 'fido', pay: 'postpaid' },
        'recommended',
      ),
    ).toEqual([]);
  });
  it('uses phone compatibility metadata without inventing fixture offers', () => {
    const fixture = { ...mobilePlans[0]!, bringOwnPhone: false };
    expect(filterMobilePlans([fixture], defaultMobileFilters, 'recommended')).toEqual([]);
    expect(
      filterMobilePlans(
        [fixture],
        { ...defaultMobileFilters, bringOwnPhone: false },
        'recommended',
      ),
    ).toEqual([fixture]);
  });
  it('sorts numeric price and data, preserving the original array', () => {
    const ids = mobilePlans.map((p) => p.id);
    expect(
      filterMobilePlans(mobilePlans, defaultMobileFilters, 'price-high').map((p) => p.priceCad),
    ).toEqual([75, 55, 45, 29]);
    expect(
      filterMobilePlans(mobilePlans, defaultMobileFilters, 'data-high').map((p) => p.dataGb),
    ).toEqual([150, 100, 60, 20]);
    expect(
      filterMobilePlans([...mobilePlans].reverse(), defaultMobileFilters, 'price-low').map(
        (p) => p.priceCad,
      ),
    ).toEqual([29, 45, 55, 75]);
    expect(mobilePlans.map((p) => p.id)).toEqual(ids);
  });
});
