import { describe, it, expect } from 'vitest';
import {
  finderArrivalMatches,
  finderSteps,
  type FinderAnswers,
  type FinderConfig,
  type FinderQuestion,
} from '@content/plan-finder';
import {
  initialFinderState,
  selectFinderAnswer,
  continueFinder,
  backFinder,
  editFinder,
  finderPath,
  finderProgress,
  finderSummary,
  finderMatches,
  type FinderState,
} from './plan-finder-flow';

const config: FinderConfig = finderSteps;
/** Answer one question with the given value, or its first option when none is given. */
const pickers: {
  readonly [K in FinderQuestion]: (
    state: FinderState,
    picks: Partial<FinderAnswers>,
  ) => FinderState;
} = {
  location: (state, picks) => answer(state, 'location', picks.location),
  need: (state, picks) => answer(state, 'need', picks.need),
  province: (state, picks) => answer(state, 'province', picks.province),
  provider: (state, picks) => answer(state, 'provider', picks.provider),
  priority: (state, picks) => answer(state, 'priority', picks.priority),
  arrivalKind: (state, picks) => answer(state, 'arrivalKind', picks.arrivalKind),
  stay: (state, picks) => answer(state, 'stay', picks.stay),
};
function answer<K extends FinderQuestion>(
  state: FinderState,
  step: K,
  value: FinderAnswers[K] | undefined,
): FinderState {
  const chosen = value ?? config[step].options[0]?.value;
  return chosen === undefined ? state : selectFinderAnswer(state, step, chosen);
}
/** Answer each question (given value or first option) and continue to the result. */
function finish(state: FinderState, picks: Partial<FinderAnswers> = {}) {
  let current = state;
  for (let i = 0; i < 8; i++) {
    const step = current.step;
    if (step === 'result') break;
    if (current.answers[step] === undefined) current = pickers[step](current, picks);
    current = continueFinder(current);
  }
  return current;
}

describe('global finder flow', () => {
  it('starts with nothing preselected and cannot continue until a choice is made', () => {
    expect(initialFinderState.answers).toEqual({});
    expect(continueFinder(initialFinderState)).toBe(initialFinderState);
    const next = continueFinder(selectFinderAnswer(initialFinderState, 'location', 'arrival'));
    expect(next.step).toBe('arrivalKind');
    expect(next.answers.arrivalKind).toBeUndefined();
  });

  it('takes the newcomer path to results with only its answers', () => {
    const final = finish(initialFinderState, {
      location: 'arrival',
      arrivalKind: 'student',
      stay: 'long',
    });
    expect(final.history).toEqual(['location', 'arrivalKind', 'stay']);
    expect(final.step).toBe('result');
    expect(finderSummary(final)).toEqual(['Moving to Canada', 'Student', '6+ months']);
    expect(finderMatches(final)).toEqual(finderArrivalMatches);
  });

  it('asks a resident about their provider only for a phone plan', () => {
    const phone = finish(initialFinderState, {
      location: 'canada',
      need: 'phone',
      province: 'on',
      provider: 'rogers',
      priority: 'value',
    });
    expect(phone.history).toEqual(['location', 'need', 'province', 'provider', 'priority']);
    expect(finderSummary(phone)).toEqual([
      'Already in Canada',
      'Phone plan',
      'Ontario',
      'Rogers',
      'Best value',
    ]);
    expect(finderMatches(phone).map((plan) => plan.id)).toEqual([
      'mobile-can-us-100',
      'mobile-can-us-mex-150',
    ]);
    const internet = finish(initialFinderState, {
      location: 'canada',
      need: 'internet',
      province: 'bc',
      priority: 'price',
    });
    expect(internet.history).toEqual(['location', 'need', 'province', 'priority']);
    expect(internet.answers.provider).toBeUndefined();
  });

  it('shows internet-only plans for internet and the bundles for internet + TV', () => {
    const result = (
      need: 'internet' | 'tv',
      province: 'bc' | 'sk' | 'on',
      priority: 'speed' | 'price',
    ) =>
      finderMatches({
        step: 'result',
        history: [],
        answers: { location: 'canada', need, province, priority },
      });
    expect(result('internet', 'bc', 'speed').map((plan) => plan.id)).toEqual([
      'internet-bc-1000',
      'internet-bc-500',
    ]);
    expect(result('internet', 'bc', 'price').map((plan) => plan.price)).toEqual([
      '$70/mo',
      '$80/mo',
    ]);
    expect(result('tv', 'bc', 'price').map((plan) => plan.id)).toEqual([
      'internet-streamsaver-bc-1000',
      'internet-tv-bc-1000',
    ]);
    expect(result('tv', 'sk', 'price').map((plan) => plan.id)).toEqual(['internet-tv-sk-1000']);
    expect(result('internet', 'on', 'price')).toEqual([]);
    for (const plan of result('tv', 'bc', 'speed')) expect(plan.href).toMatch(/^\/order\?plan=/);
  });

  it('reports step numbers from the path the answers imply', () => {
    // Before a branch is chosen the shortest resident path is assumed.
    expect(finderProgress(initialFinderState)).toEqual({ ordinal: 1, total: 5 });
    const canada = continueFinder(selectFinderAnswer(initialFinderState, 'location', 'canada'));
    expect(finderPath(canada.answers)).toEqual(['location', 'need', 'province', 'priority']);
    const phone = continueFinder(selectFinderAnswer(canada, 'need', 'phone'));
    expect(finderPath(phone.answers)).toEqual([
      'location',
      'need',
      'province',
      'provider',
      'priority',
    ]);
    expect(finderProgress(phone)).toEqual({ ordinal: 3, total: 6 });
    const tv = continueFinder(selectFinderAnswer(canada, 'need', 'tv'));
    expect(finderPath(tv.answers)).toEqual(['location', 'need', 'province', 'priority']);
    expect(finderProgress(tv)).toEqual({ ordinal: 3, total: 5 });
  });

  it('Back returns to the actual previous step and retains its answer', () => {
    const final = finish(initialFinderState, { location: 'arrival', stay: 'long' });
    const previous = backFinder(final);
    expect(previous.step).toBe('stay');
    expect(previous.answers.stay).toBe('long');
    expect(backFinder(previous).step).toBe('arrivalKind');
    expect(backFinder(backFinder(previous)).step).toBe('location');
  });

  it('changing an earlier answer clears dependent answers', () => {
    let state = finish(initialFinderState, { location: 'canada', need: 'phone' });
    while (state.step !== 'need') state = backFinder(state);
    const changed = selectFinderAnswer(state, 'need', 'internet');
    expect(changed.answers).toEqual({ location: 'canada', need: 'internet' });
    expect(continueFinder(changed).answers.province).toBeUndefined();
  });

  it('switching branches after Edit discards all old branch answers', () => {
    const edited = editFinder(finish(initialFinderState, { location: 'arrival', stay: 'long' }));
    expect(edited.answers.stay).toBe('long');
    const switched = selectFinderAnswer(edited, 'location', 'canada');
    expect(switched.answers).toEqual({ location: 'canada' });
    expect(continueFinder(switched).step).toBe('need');
  });

  it('editing without changing answers preserves the existing choices', () => {
    const final = finish(initialFinderState, { location: 'arrival', arrivalKind: 'worker' });
    expect(finish(editFinder(final)).answers).toEqual(final.answers);
  });

  it('does not advance an unanswered step or change an inactive question', () => {
    expect(continueFinder(initialFinderState)).toBe(initialFinderState);
    expect(selectFinderAnswer(initialFinderState, 'province', 'bc')).toBe(initialFinderState);
    expect(backFinder(initialFinderState)).toBe(initialFinderState);
    expect(finderMatches(initialFinderState)).toEqual([]);
  });

  it.each([
    ['price', ['mobile-can-us-100', 'mobile-can-us-mex-150']],
    ['speed', ['mobile-5g-plus-complete-unlimited', 'mobile-can-us-mex-150']],
  ] as const)('uses the configured %s ordering', async (priority, ids) => {
    const final = finish(initialFinderState, { location: 'canada', need: 'phone', priority });
    expect(finderMatches(final).map((plan) => plan.id)).toEqual(ids);
  });
});
