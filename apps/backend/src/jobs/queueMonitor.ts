/**
 * Pure "failed job queue growth" detector (REQ 40, IMPLEMENTATION_PLAN §10:
 * "Alerts route to the owner ... for: failed-job queue growth"). Kept
 * side-effect-free and timer-free so it is trivially unit-testable; the
 * scheduler wiring owns the actual mutable state and the alert send.
 */

export interface QueueHealthState {
  /** Epoch ms of the first tick that observed a non-zero failed/uncertain count, or undefined if healthy. */
  strugglingSinceMs: number | undefined;
  /** Whether the last observation already triggered an alert, so a repeat tick doesn't re-alert every 60s. */
  alerted: boolean;
}

export const INITIAL_QUEUE_HEALTH_STATE: QueueHealthState = {
  strugglingSinceMs: undefined,
  alerted: false,
};

export const QUEUE_STUCK_THRESHOLD_MS = 10 * 60_000;

export interface QueueHealthObservation {
  failed: number;
  uncertain: number;
}

export interface QueueHealthOutcome {
  nextState: QueueHealthState;
  /** True exactly once per struggling episode, when the threshold is first crossed. */
  shouldAlert: boolean;
}

/**
 * Observations count persisted failed/uncertain jobs across the scheduler's
 * authorized workspaces, not failures newly recorded by one run. This only
 * fires once that backlog has persisted continuously for
 * {@link QUEUE_STUCK_THRESHOLD_MS}, and resets the moment a tick reports a
 * clean queue again.
 */
export function trackQueueHealth(
  state: QueueHealthState,
  observation: QueueHealthObservation,
  nowMs: number,
): QueueHealthOutcome {
  const struggling = observation.failed > 0 || observation.uncertain > 0;
  if (!struggling) {
    return { nextState: INITIAL_QUEUE_HEALTH_STATE, shouldAlert: false };
  }
  const strugglingSinceMs = state.strugglingSinceMs ?? nowMs;
  const durationMs = nowMs - strugglingSinceMs;
  if (durationMs < QUEUE_STUCK_THRESHOLD_MS) {
    return { nextState: { strugglingSinceMs, alerted: false }, shouldAlert: false };
  }
  return {
    nextState: { strugglingSinceMs, alerted: true },
    shouldAlert: !state.alerted,
  };
}
