import { describe, expect, it } from 'vitest';

import { cappedListNote } from './partner-detail';

describe('cappedListNote (PERF-02)', () => {
  it('says how many rows are shown when the backend capped the list', () => {
    expect(cappedListNote(200, 340)).toBe('Showing the newest 200 of 340.');
  });
  it('says nothing when every row is shown or an older backend sent no total', () => {
    expect(cappedListNote(12, 12)).toBeUndefined();
    expect(cappedListNote(12, undefined)).toBeUndefined();
  });
});
