import { describe, expect, it } from 'vitest';

import { selectRetainedRunIds, type RetentionCandidate } from './select.js';

function daysAgo(n: number): Date {
  const d = new Date('2026-09-14T02:00:00.000Z');
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

describe('selectRetainedRunIds', () => {
  it('retains the most recent 30 distinct days', () => {
    const candidates: RetentionCandidate[] = Array.from({ length: 40 }, (_, i) => ({
      runId: `run-${i}`,
      capturedAt: daysAgo(i),
    }));
    const retained = selectRetainedRunIds(candidates, { dailyPoints: 30, monthlyPoints: 0 });
    expect(retained.size).toBe(30);
    expect(retained.has('run-0')).toBe(true);
    expect(retained.has('run-29')).toBe(true);
    expect(retained.has('run-30')).toBe(false);
  });

  it('keeps only the latest run when several exist on the same calendar day', () => {
    const sameDay = new Date('2026-09-14T01:00:00.000Z');
    const laterSameDay = new Date('2026-09-14T20:00:00.000Z');
    const candidates: RetentionCandidate[] = [
      { runId: 'morning', capturedAt: sameDay },
      { runId: 'evening', capturedAt: laterSameDay },
    ];
    const retained = selectRetainedRunIds(candidates, { dailyPoints: 30, monthlyPoints: 0 });
    expect(retained).toEqual(new Set(['evening']));
  });

  it('adds up to 12 monthly points beyond the daily window', () => {
    const candidates: RetentionCandidate[] = Array.from({ length: 400 }, (_, i) => ({
      runId: `run-${i}`,
      capturedAt: daysAgo(i),
    }));
    const retained = selectRetainedRunIds(candidates, { dailyPoints: 30, monthlyPoints: 12 });
    // 30 daily + up to 12 additional distinct months (some months overlap the
    // daily window, so the total is <= 42 and > 30).
    expect(retained.size).toBeGreaterThan(30);
    expect(retained.size).toBeLessThanOrEqual(42);
  });

  it('retains nothing when there are no candidates', () => {
    expect(selectRetainedRunIds([]).size).toBe(0);
  });
});
