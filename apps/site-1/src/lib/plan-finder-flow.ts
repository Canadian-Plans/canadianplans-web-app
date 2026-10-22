import {
  finderSteps,
  finderQuestionIds,
  finderPaths,
  type FinderAnswers,
  type FinderQuestion,
  type FinderStepId,
  type FinderConfig,
  type FinderMatch,
  type FinderCatalogMatch,
  finderArrivalMatches,
  finderPhoneMatches,
  finderInternetMatches,
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

const rankings: Record<
  FinderAnswers['priority'],
  (a: FinderCatalogMatch, b: FinderCatalogMatch) => number
> = {
  price: (a, b) => a.priceCad - b.priceCad,
  speed: (a, b) => b.speedRank - a.speedRank || a.priceCad - b.priceCad,
  value: (a, b) => Number(b.popular) - Number(a.popular) || a.priceCad - b.priceCad,
};

/**
 * The top two catalogue plans for the answers. Internet uses the chosen province's plans,
 * so a province with no internet plans gets no match. Provider/audience eligibility is not inferred.
 */
export function finderMatches(state: FinderState): readonly FinderMatch[] {
  if (state.step !== 'result') return [];
  if (state.answers.location === 'arrival') return finderArrivalMatches;
  const catalog =
    state.answers.need === 'internet'
      ? finderInternetMatches(state.answers.province)
      : finderPhoneMatches;
  return [...catalog].sort(rankings[state.answers.priority ?? 'value']).slice(0, 2);
}
