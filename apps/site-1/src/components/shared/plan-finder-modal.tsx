'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@canadian-plans/ui';
import { CpAsset, CpButton } from '@canadian-plans/ui/canadian-plans';
import {
  finderCopy as copy,
  finderSteps,
  finderAssets,
  type FinderAssetPair,
  type FinderConfig,
  type FinderMatch,
} from '@content/plan-finder';
import {
  initialFinderState,
  selectFinderAnswer,
  continueFinder,
  backFinder,
  editFinder,
  finderSummary,
  finderMatches,
} from '@/lib/plan-finder-flow';

const config: FinderConfig = finderSteps;
function AssetPair({ pair }: { pair: FinderAssetPair }) {
  return (
    <>
      <span className="cp-finder-mobile-asset">
        <CpAsset asset={pair.mobile} />
      </span>
      <span className="cp-finder-desktop-asset">
        <CpAsset asset={pair.desktop} />
      </span>
    </>
  );
}
function ResponsiveCopy({ desktop, mobile }: { desktop: string; mobile?: string }) {
  return mobile ? (
    <>
      <span className="cp-finder-mobile-description">{mobile}</span>
      <span className="cp-finder-desktop-description">{desktop}</span>
    </>
  ) : (
    desktop
  );
}
export function PlanFinderModal({
  onClose,
  onReturnFocus,
}: {
  onClose: () => void;
  onReturnFocus: () => void;
}) {
  const [state, setState] = useState(initialFinderState);
  const [view, setView] = useState<'flow' | 'details' | 'selected' | 'advisor'>('flow');
  const [chosen, setChosen] = useState<FinderMatch>();
  const title = useRef<HTMLHeadingElement | null>(null);
  const body = useRef<HTMLDivElement | null>(null);
  const current = state.step === 'result' ? null : config[state.step];
  const matches = finderMatches(state);
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
    body.current?.scrollTo({ top: 0 });
  }, [state.step, view]);
  const progress = current?.progress ?? copy.allDone;
  const ratios = current?.progressRatio ?? { desktop: 1, mobile: 1 };
  function resultBack() {
    setView('flow');
    setState(backFinder(state));
  }
  return (
    <Dialog
      open
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent
        className="cp-design cp-finder-modal"
        data-step={state.step}
        data-view={view}
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          title.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onReturnFocus();
        }}
      >
        <div className="cp-finder-grabber" aria-hidden="true" />
        <div className="cp-finder-header">
          {state.step === 'result' ? (
            <CpButton
              className="cp-finder-header-back"
              tone="ghost"
              scale="icon"
              aria-label={copy.back}
              onClick={view === 'flow' ? resultBack : () => setView('flow')}
            >
              {copy.backSymbol}
            </CpButton>
          ) : null}
          <div className="cp-finder-progress">
            <p>{progress}</p>
            <div
              className="cp-finder-track"
              role="progressbar"
              aria-label={copy.progressLabel}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(ratios.desktop * 100)}
              aria-valuetext={progress}
            >
              <span
                className="cp-finder-desktop-progress"
                style={{ width: `${ratios.desktop * 100}%` }}
              />
              <span
                className="cp-finder-mobile-progress"
                style={{ width: `${ratios.mobile * 100}%` }}
              />
            </div>
          </div>
          <DialogClose asChild>
            <CpButton className="cp-finder-close" tone="ghost" scale="icon" aria-label={copy.close}>
              {copy.closeSymbol}
            </CpButton>
          </DialogClose>
        </div>
        <div className="cp-finder-body" ref={body}>
          {view !== 'flow' ? (
            <div className="cp-finder-secondary">
              <DialogTitle tabIndex={-1} ref={title}>
                {view === 'advisor'
                  ? copy.advisorTitle
                  : view === 'details'
                    ? copy.detailsTitle
                    : copy.continueTitle}
              </DialogTitle>
              <DialogDescription>
                {view === 'advisor' ? copy.advisorDescription : copy.continueDescription}
              </DialogDescription>
              {chosen && view !== 'advisor' ? (
                <>
                  <h3>
                    {chosen.title} · {chosen.price}
                  </h3>
                  <p>{chosen.description}</p>
                  {view === 'details' ? (
                    <ul>
                      {chosen.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : null}
              <CpButton tone="outline" onClick={() => setView('flow')}>
                {copy.backToMatches}
              </CpButton>
            </div>
          ) : current ? (
            <>
              {current.id === 'location' ? (
                <div className="cp-finder-intro-visual" aria-hidden="true">
                  {[
                    { asset: finderAssets['291-3-imgIconPlane'], tone: 'blue' },
                    { asset: finderAssets['291-3-imgIconPhone'], tone: 'violet' },
                    { asset: finderAssets['291-3-imgIconWifi'], tone: 'mint' },
                    { asset: finderAssets['291-3-imgIconHome'], tone: 'warm' },
                  ].map(({ asset, tone }) => (
                    <span key={asset.src} data-tone={tone}>
                      <CpAsset asset={asset} />
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="cp-finder-question" data-intro={current.id === 'location'}>
                {current.headerIcon ? (
                  <span className="cp-finder-question-icon" data-tone={current.headerTone}>
                    <AssetPair pair={current.headerIcon} />
                  </span>
                ) : null}
                <div>
                  <DialogTitle ref={title} tabIndex={-1}>
                    {current.title}
                  </DialogTitle>
                  <DialogDescription>
                    <ResponsiveCopy
                      desktop={current.description}
                      mobile={current.mobileDescription}
                    />
                  </DialogDescription>
                </div>
              </div>
              {current.question ? (
                <p className="cp-finder-intro-question">{current.question}</p>
              ) : null}
              <fieldset
                className="cp-finder-options"
                role="radiogroup"
                aria-label={current.question ?? current.title}
                data-layout={current.layout}
              >
                {current.options.map((option) => {
                  const selected = state.answers[current.id] === option.value;
                  return (
                    <label
                      key={option.value}
                      className="cp-finder-option"
                      data-selected={selected}
                      data-tone={option.tone}
                    >
                      <input
                        className="cp-finder-radio-input"
                        type="radio"
                        name={`finder-${current.id}`}
                        value={option.value}
                        aria-label={option.label}
                        checked={selected}
                        onChange={() =>
                          setState(selectFinderAnswer(state, current.id, option.value))
                        }
                      />
                      {option.icon ? (
                        <span className="cp-finder-option-icon" data-tone={option.tone}>
                          <AssetPair pair={option.icon} />
                        </span>
                      ) : option.symbol ? (
                        <span className="cp-finder-symbol" data-tone={option.tone}>
                          {option.symbol}
                        </span>
                      ) : null}
                      <span className="cp-finder-option-copy">
                        {option.badge ? (
                          <span className="cp-finder-option-badge">{option.badge}</span>
                        ) : null}
                        <strong>{option.label}</strong>
                        {option.description ? (
                          <span>
                            <ResponsiveCopy
                              desktop={option.description}
                              mobile={option.mobileDescription}
                            />
                          </span>
                        ) : null}
                      </span>
                      <span className="cp-finder-radio-visual" aria-hidden="true">
                        {selected ? <CpAsset asset={finderAssets['291-3-imgRadioOn']} /> : null}
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            </>
          ) : (
            <>
              <div className="cp-finder-result-hero">
                <span className="cp-finder-result-icon">
                  <AssetPair
                    pair={{
                      desktop: finderAssets['293-73-imgIconSparkle'],
                      mobile: finderAssets['305-492-imgIconSparkle'],
                    }}
                  />
                </span>
                <DialogTitle ref={title} tabIndex={-1}>
                  {copy.resultPrefix} {matches.length} {copy.resultSuffix}
                </DialogTitle>
                <DialogDescription>{copy.resultDescription}</DialogDescription>
                <div className="cp-finder-answer-chips">
                  {finderSummary(state).map((summary) => (
                    <span key={summary}>{summary}</span>
                  ))}
                  <CpButton tone="ghost" onClick={() => setState(editFinder(state))}>
                    {copy.edit}
                  </CpButton>
                </div>
              </div>
              <div className="cp-finder-matches">
                {matches.map((match, index) => (
                  <article key={match.id} className="cp-finder-match" data-best={index === 0}>
                    <div className="cp-finder-match-top">
                      <span className="cp-finder-match-symbol" data-tone={match.tone}>
                        {match.symbol}
                      </span>
                      <div className="cp-finder-match-copy">
                        <div>
                          <h3>{match.title}</h3>
                          {index === 0 ? <span className="cp-finder-best">{copy.best}</span> : null}
                        </div>
                        <p>{match.description}</p>
                      </div>
                      <p className="cp-finder-match-price">
                        <strong>{match.price}</strong>
                        {match.comparison ? <span>{match.comparison}</span> : null}
                      </p>
                    </div>
                    <ul className="cp-finder-match-features">
                      {match.features.map((feature) => (
                        <li key={feature}>
                          <CpAsset asset={finderAssets['293-73-imgIconCheck']} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="cp-finder-match-actions">
                      <CpButton
                        tone="outline"
                        onClick={() => {
                          setChosen(match);
                          setView('details');
                        }}
                      >
                        {copy.details}
                      </CpButton>
                      <CpButton
                        tone={index === 0 ? 'primary' : 'outline'}
                        onClick={() => {
                          setChosen(match);
                          setView('selected');
                        }}
                      >
                        {index === 0 ? copy.getPlan : copy.choosePlan}
                      </CpButton>
                    </div>
                  </article>
                ))}
              </div>
              <div className="cp-finder-help">
                <button type="button" onClick={() => setView('advisor')}>
                  <span>
                    <CpAsset asset={finderAssets['293-73-imgIconChat']} />
                  </span>
                  <span>{copy.help}</span>
                </button>
                <a
                  href={
                    state.answers.location === 'arrival'
                      ? '/pre-arrival-sim'
                      : state.answers.need === 'internet'
                        ? '/home-internet'
                        : '/mobile-plans'
                  }
                  onClick={onClose}
                >
                  {copy.allPlans}
                </a>
              </div>
              <p className="cp-finder-preview-notice">{copy.previewNotice}</p>
            </>
          )}
        </div>
        {view === 'flow' && current?.tip ? (
          <div className="cp-finder-tip">
            <span>
              <CpAsset asset={finderAssets['292-3-imgIconSwap']} />
            </span>
            <p>{current.tip}</p>
          </div>
        ) : null}
        {view === 'flow' && current ? (
          <div className="cp-finder-footer" data-intro={current.id === 'location'}>
            {current.id === 'location' ? <p>{copy.privacy}</p> : null}
            <div>
              {state.history.length ? (
                <CpButton tone="outline" onClick={() => setState(backFinder(state))}>
                  {copy.back}
                </CpButton>
              ) : null}
              <CpButton
                disabled={!state.answers[current.id]}
                onClick={() => setState(continueFinder(state))}
              >
                {current.routes.some((route) => route.to === 'result')
                  ? copy.matches
                  : copy.continue}
              </CpButton>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
