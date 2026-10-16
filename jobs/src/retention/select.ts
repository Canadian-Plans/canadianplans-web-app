/**
 * Pure GFS-style (grandfather/father/son) retention selection: 30 daily
 * points plus 12 monthly points (IMPLEMENTATION_PLAN §13, REQ 44). Kept
 * separate from any I/O so the policy itself is exhaustively unit-testable.
 */

export interface RetentionCandidate {
  runId: string;
  capturedAt: Date;
}

export interface RetentionPolicy {
  dailyPoints: number;
  monthlyPoints: number;
}

export const defaultRetentionPolicy: RetentionPolicy = { dailyPoints: 30, monthlyPoints: 12 };

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/** Returns the run ids that must be retained under the policy. */
export function selectRetainedRunIds(
  candidates: readonly RetentionCandidate[],
  policy: RetentionPolicy = defaultRetentionPolicy,
): Set<string> {
  const sorted = [...candidates].sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime());
  const retained = new Set<string>();

  const seenDays = new Set<string>();
  for (const candidate of sorted) {
    if (seenDays.size >= policy.dailyPoints) break;
    const key = dayKey(candidate.capturedAt);
    if (seenDays.has(key)) continue;
    seenDays.add(key);
    retained.add(candidate.runId);
  }

  const seenMonths = new Set<string>();
  for (const candidate of sorted) {
    if (seenMonths.size >= policy.monthlyPoints) break;
    const key = monthKey(candidate.capturedAt);
    if (seenMonths.has(key)) continue;
    seenMonths.add(key);
    retained.add(candidate.runId);
  }

  return retained;
}
