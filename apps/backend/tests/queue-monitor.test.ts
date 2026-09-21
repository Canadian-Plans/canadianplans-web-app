import { describe, expect, it } from 'vitest';

import {
  INITIAL_QUEUE_HEALTH_STATE,
  QUEUE_STUCK_THRESHOLD_MS,
  trackQueueHealth,
} from '../src/jobs/queueMonitor.js';

const T0 = 1_000_000;

describe('trackQueueHealth', () => {
  it('does not alert on a clean queue', () => {
    const outcome = trackQueueHealth(INITIAL_QUEUE_HEALTH_STATE, { failed: 0, uncertain: 0 }, T0);
    expect(outcome.shouldAlert).toBe(false);
    expect(outcome.nextState.strugglingSinceMs).toBeUndefined();
  });

  it('does not alert on a single tick with failures', () => {
    const outcome = trackQueueHealth(INITIAL_QUEUE_HEALTH_STATE, { failed: 1, uncertain: 0 }, T0);
    expect(outcome.shouldAlert).toBe(false);
    expect(outcome.nextState.strugglingSinceMs).toBe(T0);
  });

  it('alerts once the struggling condition has persisted past the threshold', () => {
    let state = INITIAL_QUEUE_HEALTH_STATE;
    let outcome = trackQueueHealth(state, { failed: 2, uncertain: 0 }, T0);
    state = outcome.nextState;
    expect(outcome.shouldAlert).toBe(false);

    outcome = trackQueueHealth(state, { failed: 3, uncertain: 0 }, T0 + QUEUE_STUCK_THRESHOLD_MS + 1);
    expect(outcome.shouldAlert).toBe(true);
  });

  it('does not re-alert on every subsequent tick while still struggling', () => {
    let state = trackQueueHealth(INITIAL_QUEUE_HEALTH_STATE, { failed: 1, uncertain: 0 }, T0).nextState;
    let outcome = trackQueueHealth(state, { failed: 1, uncertain: 0 }, T0 + QUEUE_STUCK_THRESHOLD_MS + 1);
    expect(outcome.shouldAlert).toBe(true);
    state = outcome.nextState;

    outcome = trackQueueHealth(state, { failed: 1, uncertain: 0 }, T0 + QUEUE_STUCK_THRESHOLD_MS + 60_000);
    expect(outcome.shouldAlert).toBe(false);
  });

  it('resets and can alert again after a recovery and a new episode', () => {
    let state = trackQueueHealth(INITIAL_QUEUE_HEALTH_STATE, { failed: 1, uncertain: 0 }, T0).nextState;
    let outcome = trackQueueHealth(state, { failed: 1, uncertain: 0 }, T0 + QUEUE_STUCK_THRESHOLD_MS + 1);
    state = outcome.nextState;
    expect(outcome.shouldAlert).toBe(true);

    // Recovers.
    outcome = trackQueueHealth(state, { failed: 0, uncertain: 0 }, T0 + QUEUE_STUCK_THRESHOLD_MS + 2);
    state = outcome.nextState;
    expect(state.strugglingSinceMs).toBeUndefined();

    // Struggles again — a fresh episode restarts the clock.
    outcome = trackQueueHealth(state, { failed: 1, uncertain: 0 }, T0 + 10 * QUEUE_STUCK_THRESHOLD_MS);
    expect(outcome.shouldAlert).toBe(false);
  });
});
