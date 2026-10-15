import {
  finderSteps,
  finderQuestionIds,
  finderPaths,
  type FinderAnswers,
  type FinderQuestion,
  type FinderStepId,
  type FinderConfig,
  type FinderMatch,
  finderArrivalMatches,
  finderResidentCatalog,
  finderMatchPriorities,
} from '@content/plan-finder';

export interface FinderState {
  readonly step: FinderStepId;
  readonly answers: Partial<FinderAnswers>;
  readonly history: readonly FinderQuestion[];
}
export const initialFinderState: FinderState = {
  step: 'location',
  answers: { location: 'arrival' },
  history: [],
};
const config: FinderConfig = finderSteps;
function defaultFinderAnswer<K extends FinderQuestion>(
  answers: Partial<FinderAnswers>,
  key: K,
): void {
  if (answers[key] === undefined) answers[key] = config[key].defaultValue;
}
export function selectFinderAnswer<K extends FinderQuestion>(
  state: FinderState,
  step: K,
  value: FinderAnswers[K],
): FinderState {
  if (state.step !== step || !config[step].options.some((option) => option.value === value))
    return state;
  if (state.answers[step] === value) return state;
  const answers: Partial<FinderAnswers> = { ...state.answers, [step]: value };
  const keep = new Set<FinderQuestion>([...state.history, step]);
  for (const key of finderQuestionIds) if (!keep.has(key)) delete answers[key];
  return { ...state, answers };
}
export function continueFinder(state: FinderState): FinderState {
  if (state.step === 'result') return state;
  const step = config[state.step];
  const value = state.answers[state.step];
  if (!value || !step.options.some((option) => option.value === value)) return state;
  const edge = step.routes.find((route) => route.value === undefined || route.value === value);
  if (!edge) return state;
  const answers: Partial<FinderAnswers> = { ...state.answers };
  if (edge.to !== 'result') defaultFinderAnswer(answers, edge.to);
  return { step: edge.to, answers, history: [...state.history, state.step] };
}
export function backFinder(state: FinderState): FinderState {
  const previous = state.history.at(-1);
  if (!previous) return state;
  return { ...state, step: previous, history: state.history.slice(0, -1) };
}
export function editFinder(state: FinderState): FinderState {
  return { ...state, step: 'location', history: [] };
}
export function finderSummary(state: FinderState): readonly string[] {
  const path = finderPaths[state.answers.location ?? 'arrival'];
  return path.flatMap((key) => {
    const option = config[key].options.find((o) => o.value === state.answers[key]);
    return option ? [option.summary] : [];
  });
}

/** Fixture recommendations only: province/provider/audience eligibility is not inferred. */
export function finderMatches(state: FinderState): readonly FinderMatch[] {
  if (state.step !== 'result') return [];
  if (state.answers.location === 'arrival') return finderArrivalMatches;
  const order = finderMatchPriorities[state.answers.priority ?? 'value'];
  return [...finderResidentCatalog[state.answers.need ?? 'phone']]
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    .filter((plan) => order.includes(plan.id))
    .slice(0, 2);
}
