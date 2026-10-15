import { describe, it, expect } from 'vitest';
import { finderArrivalMatches } from '@content/plan-finder';
import {
  initialFinderState,
  selectFinderAnswer,
  continueFinder,
  backFinder,
  editFinder,
  finderSummary,
  finderMatches,
  type FinderState,
} from './plan-finder-flow';
function finish(state: FinderState) {
  let current = state;
  for (let i = 0; i < 8 && current.step !== 'result'; i++) current = continueFinder(current);
  return current;
}
describe('global finder flow', () => {
  it('takes the newcomer path to results with only its answers', () => {
    const first = continueFinder(initialFinderState);
    expect(first.step).toBe('arrivalKind');
    const final = finish(first);
    expect(final.history).toEqual(['location', 'arrivalKind', 'stay']);
    expect(final.step).toBe('result');
    expect(finderSummary(final)).toEqual(['Moving to Canada', 'Student', '6+ months']);
    expect(finderMatches(final)).toEqual(finderArrivalMatches);
  });
  it('takes the resident path through all four questions', () => {
    const final = finish(selectFinderAnswer(initialFinderState, 'location', 'canada'));
    expect(final.history).toEqual(['location', 'need', 'province', 'provider', 'priority']);
    expect(final.step).toBe('result');
    expect(finderSummary(final)).toEqual([
      'Already in Canada',
      'Phone plan',
      'Ontario',
      'Rogers',
      'Best value',
    ]);
    expect(finderMatches(final).map((plan) => plan.id)).toEqual([
      'preview-mobile-fido-60',
      'preview-mobile-rogers-100',
    ]);
  });
  it('Back returns to the actual previous step and retains its answer', () => {
    const final = finish(initialFinderState);
    const previous = backFinder(final);
    expect(previous.step).toBe('stay');
    expect(previous.answers.stay).toBe('long');
    expect(backFinder(previous).step).toBe('arrivalKind');
    expect(backFinder(backFinder(previous)).step).toBe('location');
  });
  it('changing an earlier answer clears dependent answers', () => {
    let state = backFinder(finish(selectFinderAnswer(initialFinderState, 'location', 'canada')));
    state = backFinder(state);
    state = backFinder(state);
    state = backFinder(state);
    expect(state.step).toBe('need');
    const changed = selectFinderAnswer(state, 'need', 'internet');
    expect(changed.answers).toEqual({ location: 'canada', need: 'internet' });
    expect(continueFinder(changed).answers.province).toBe('on');
  });
  it('switching branches after Edit discards all old branch answers', () => {
    const edited = editFinder(finish(initialFinderState));
    expect(edited.answers.stay).toBe('long');
    const switched = selectFinderAnswer(edited, 'location', 'canada');
    expect(switched.answers).toEqual({ location: 'canada' });
    expect(continueFinder(switched).step).toBe('need');
  });
  it('editing without changing answers preserves the existing choices', () => {
    let state = continueFinder(initialFinderState);
    state = selectFinderAnswer(state, 'arrivalKind', 'worker');
    const final = finish(state);
    expect(finish(editFinder(final)).answers).toEqual(final.answers);
  });
  it('does not advance an unanswered step or change an inactive question', () => {
    const empty: FinderState = { ...initialFinderState, answers: {} };
    expect(continueFinder(empty)).toBe(empty);
    expect(selectFinderAnswer(initialFinderState, 'province', 'bc')).toBe(initialFinderState);
    expect(backFinder(initialFinderState)).toBe(initialFinderState);
    expect(finderMatches(empty)).toEqual([]);
  });
  it.each([
    ['price', ['preview-mobile-chatr-20', 'preview-mobile-fido-60']],
    ['speed', ['preview-mobile-rogers-150', 'preview-mobile-rogers-100']],
  ] as const)('uses the configured %s ordering', (priority, ids) => {
    let state = backFinder(finish(selectFinderAnswer(initialFinderState, 'location', 'canada')));
    state = selectFinderAnswer(state, 'priority', priority);
    expect(finderMatches(continueFinder(state)).map((plan) => plan.id)).toEqual(ids);
  });
  it('uses internet fixtures without inferring live availability', () => {
    let state = continueFinder(selectFinderAnswer(initialFinderState, 'location', 'canada'));
    state = selectFinderAnswer(state, 'need', 'internet');
    const matches = finderMatches(finish(state));
    expect(matches.map((plan) => plan.id)).toEqual([
      'preview-internet-500',
      'preview-internet-150',
    ]);
    expect(matches.every((plan) => plan.previewOnly)).toBe(true);
  });
});
