'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Input } from '@canadian-plans/ui';
import { CpButton, CpChip } from '@canadian-plans/ui/canadian-plans';
import { guidesIndexCopy, type GuideTopic } from '@content/guides';
import { filterGuides } from '@/lib/guide-list';
import { GuideIndexCard } from './guide-card';

export function GuidesIndexList({ featured }: { featured: ReactNode }) {
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<GuideTopic>('all');
  const [limit, setLimit] = useState<number>(guidesIndexCopy.initialCount);
  const input = useRef<HTMLInputElement>(null);
  const grid = useRef<HTMLUListElement>(null);
  const focusNew = useRef<number | null>(null);
  const matches = filterGuides(query, topic);
  const featuredEntry = matches.find((guide) => guide.featured);
  const rows = matches.filter((guide) => !guide.featured).slice(0, limit);
  const changed = query !== '' || topic !== 'all' || limit > guidesIndexCopy.initialCount;
  useEffect(() => {
    if (focusNew.current !== null) {
      grid.current?.querySelectorAll<HTMLAnchorElement>('a')[focusNew.current]?.focus();
      focusNew.current = null;
    }
  }, [limit]);
  function search() {
    setQuery(draft.trim());
    setLimit(guidesIndexCopy.initialCount);
  }
  function clear() {
    setDraft('');
    setQuery('');
    setTopic('all');
    setLimit(guidesIndexCopy.initialCount);
    input.current?.focus();
  }
  return (
    <>
      <section className="cp-guides-hero" aria-labelledby="guides-title">
        <div className="cp-container cp-guides-hero-inner">
          <p className="cp-guides-eyebrow">{guidesIndexCopy.eyebrow}</p>
          <h1 id="guides-title">{guidesIndexCopy.heading}</h1>
          <p className="cp-guides-intro">{guidesIndexCopy.description}</p>
          <div role="search" className="cp-guides-search">
            <Input
              ref={input}
              type="search"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  search();
                }
              }}
              aria-label={guidesIndexCopy.searchLabel}
              placeholder={guidesIndexCopy.searchPlaceholder}
            />
            <CpButton onClick={search}>{guidesIndexCopy.searchButton}</CpButton>
          </div>
          <div className="cp-guides-topics" role="group" aria-label={guidesIndexCopy.topicsLabel}>
            {guidesIndexCopy.topics.map((item) => (
              <CpChip
                key={item.id}
                selected={topic === item.id}
                onClick={() => {
                  setTopic(item.id);
                  setLimit(guidesIndexCopy.initialCount);
                }}
              >
                {item.label}
              </CpChip>
            ))}
          </div>
        </div>
      </section>
      <section className="cp-guides-results" aria-label={guidesIndexCopy.listLabel}>
        <div className="cp-container cp-guides-results-inner">
          <p role="status" className="sr-only">
            {changed ? guidesIndexCopy.results(matches.length) : ''}
          </p>
          {featuredEntry ? featured : null}
          {matches.length === 0 ? (
            <div className="cp-guides-empty">
              <h2>{guidesIndexCopy.emptyTitle}</h2>
              <p>{guidesIndexCopy.emptyDescription}</p>
              <CpButton tone="outline" onClick={clear}>
                {guidesIndexCopy.clear}
              </CpButton>
            </div>
          ) : null}
          {rows.length ? (
            <ul ref={grid} className="cp-guides-grid">
              {rows.map((guide) => (
                <li key={guide.id}>
                  <GuideIndexCard guide={guide} />
                </li>
              ))}
            </ul>
          ) : null}
          {matches.filter((guide) => !guide.featured).length > limit ? (
            <CpButton
              tone="outline"
              className="cp-guides-more"
              onClick={() => {
                focusNew.current = rows.length;
                setLimit(limit + guidesIndexCopy.pageSize);
              }}
            >
              {guidesIndexCopy.more}
            </CpButton>
          ) : null}
        </div>
      </section>
    </>
  );
}
