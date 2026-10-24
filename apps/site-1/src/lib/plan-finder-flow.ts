import {
  finderSteps,
  finderQuestionIds,
  type FinderAnswers,
  type FinderQuestion,
  type FinderStepId,
  type FinderConfig,
  type FinderMatch,
  type FinderCatalogMatch,
  type FinderRoute,
  finderArrivalMatches,
  finderPhoneMatches,
  finderInternetMatches,
} from '@content/plan-finder';

export interface FinderState {
  readonly step: FinderStepId;
  readonly answers: Partial<FinderAnswers>;
  readonly history: readonly FinderQuestion[];
}
/** Nothing is preselected: every question starts unanswered (owner request, 23 Oct 2026). */
export const initialFinderState: FinderState = {
  step: 'location',
  answers: {},
  history: [],
};
const config: FinderConfig = finderSteps;

function routeMatches<K extends FinderQuestion>(
  route: FinderRoute<K>,
  value: FinderAnswers[K],
  answers: Partial<FinderAnswers>,
): boolean {
  if (route.value !== undefined && route.value !== value) return false;
  if (route.when?.need !== undefined && route.when.need !== answers.need) return false;
  return true;
}

function nextStep<K extends FinderQuestion>(
  step: K,
  answers: Partial<FinderAnswers>,
): FinderStepId | undefined {
  const value = answers[step];
  if (value === undefined) return undefined;
  const routes = config[step].routes;
  return routes.find((route) => routeMatches(route, value, answers))?.to;
}

/** Where an unanswered step most likely leads: its first route that fits the answers so far. */
function assumedStep<K extends FinderQuestion>(
  step: K,
  answers: Partial<FinderAnswers>,
): FinderStepId | undefined {
  return config[step].routes.find(
    (route) => route.when?.need === undefined || route.when.need === answers.need,
  )?.to;
}

/**
 * The questions on the way to the result for these answers. Past an unanswered question
 * the walk follows each step's first route, so "Step x of y" has a stable total before the
 * branch is known.
 */
export function finderPath(answers: Partial<FinderAnswers>): readonly FinderQuestion[] {
  const path: FinderQuestion[] = [];
  let step: FinderStepId = 'location';
  while (step !== 'result' && path.length < finderQuestionIds.length) {
    path.push(step);
    const next: FinderStepId | undefined = nextStep(step, answers) ?? assumedStep(step, answers);
    if (!next) break;
    step = next;
  }
  return path;
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
  const to = nextStep(state.step, state.answers);
  if (!to) return state;
  return { step: to, answers: { ...state.answers }, history: [...state.history, state.step] };
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
  return finderPath(state.answers).flatMap((key) => {
    const option = config[key].options.find((o) => o.value === state.answers[key]);
    return option ? [option.summary] : [];
  });
}
/** 1-based position of the current question and the path length, for "Step x of y". */
export function finderProgress(state: FinderState): { ordinal: number; total: number } {
  const path = finderPath(state.answers);
  const index = state.step === 'result' ? path.length : path.indexOf(state.step);
  return { ordinal: Math.max(index, 0) + 1, total: path.length + 1 };
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
 * The top two catalogue plans for the answers. Internet and TV use the chosen province's
 * plans, so a province with no internet plans gets no match. Eligibility is not inferred.
 */
export function finderMatches(state: FinderState): readonly FinderMatch[] {
  if (state.step !== 'result') return [];
  if (state.answers.location === 'arrival') return finderArrivalMatches;
  const need = state.answers.need;
  const catalog =
    need === 'internet' || need === 'tv'
      ? finderInternetMatches(state.answers.province, need)
      : finderPhoneMatches;
  return [...catalog].sort(rankings[state.answers.priority ?? 'value']).slice(0, 2);
}
