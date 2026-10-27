import { describe, expect, it } from 'vitest';

import {
  createSavedViewRequestSchema,
  orderViewStateSchema,
  updateSavedViewRequestSchema,
} from './saved-views';

const defaultState = {
  filters: { archiveState: 'active' },
  sort: { field: 'submittedAt', direction: 'desc' },
  hiddenColumns: [],
};

describe('saved order views', () => {
  it('accepts the default orders view', () => {
    expect(orderViewStateSchema.parse(defaultState)).toEqual(defaultState);
  });

  it('never stores the free-text search, which can hold customer names or emails', () => {
    const result = orderViewStateSchema.safeParse({
      ...defaultState,
      filters: { archiveState: 'active', search: 'jane@example.test' },
    });
    expect(result.success).toBe(false);
  });

  it('stores submitted dates as calendar days, not timestamps', () => {
    expect(
      orderViewStateSchema.safeParse({ ...defaultState, filters: { submittedFrom: '2026-10-01' } })
        .success,
    ).toBe(true);
    expect(
      orderViewStateSchema.safeParse({
        ...defaultState,
        filters: { submittedFrom: '2026-10-01T00:00:00.000Z' },
      }).success,
    ).toBe(false);
  });

  it('rejects names that are blank or longer than 60 characters', () => {
    const base = { object: 'orders', state: defaultState };
    expect(createSavedViewRequestSchema.safeParse({ ...base, name: 'Unpaid' }).success).toBe(true);
    expect(createSavedViewRequestSchema.safeParse({ ...base, name: '   ' }).success).toBe(false);
    expect(createSavedViewRequestSchema.safeParse({ ...base, name: 'x'.repeat(61) }).success).toBe(
      false,
    );
  });

  it('requires an update to change the name or the state', () => {
    expect(updateSavedViewRequestSchema.safeParse({ expectedVersion: 1 }).success).toBe(false);
    expect(
      updateSavedViewRequestSchema.safeParse({ expectedVersion: 1, name: 'Renamed' }).success,
    ).toBe(true);
  });
});
