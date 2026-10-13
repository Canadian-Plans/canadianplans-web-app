'use client';

import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@canadian-plans/ui';
import { CpAsset, CpButton, CpFaqAccordion, CpLinkPill } from '@canadian-plans/ui/canadian-plans';
import { faqAssets, faqChrome, faqCopy, faqGroups, type HelpFaqGroup } from '@content/faq';
import { filterFaqGroup, normalizeFaqSearch } from '@/lib/faq-content';
import { Navigation } from '@/components/shared/component-lab-client';

interface SearchContext {
  readonly query: string;
  readonly setQuery: (value: string) => void;
}
const Context = createContext<SearchContext | null>(null);
function useFaqSearch() {
  const value = useContext(Context);
  if (!value) throw new Error('FAQ search provider missing');
  return value;
}
export function FaqSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  return <Context value={{ query, setQuery }}>{children}</Context>;
}
export function FaqNavigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  return (
    <Navigation
      content={faqChrome}
      assets={faqAssets}
      brandHref="/"
      menuOpen={menuOpen}
      onMenuOpenChange={setMenuOpen}
      onAction={() => router.push(faqCopy.destinations.contact)}
      onContact={() => router.push(faqCopy.destinations.whatsapp)}
    />
  );
}
export function FaqSearchControls() {
  const { query, setQuery } = useFaqSearch();
  const input = useRef<HTMLInputElement>(null);
  const count = faqGroups.reduce(
    (sum, group) => sum + filterFaqGroup(group, query).items.length,
    0,
  );
  const searching = Boolean(normalizeFaqSearch(query));
  return (
    <>
      <div className="cp-faq-page-search" role="search" aria-label={faqCopy.controls.searchLabel}>
        <CpAsset asset={faqAssets.faqSearch} />
        <Input
          id="faq-page-search"
          ref={input}
          type="search"
          aria-label={faqCopy.controls.searchLabel}
          aria-controls="faq-results"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={faqCopy.controls.searchPlaceholder}
          maxLength={160}
          autoComplete="off"
        />
      </div>
      <nav className="cp-faq-page-topics" aria-label={faqCopy.controls.topicsLabel}>
        {faqGroups.map((group) => (
          <CpLinkPill
            key={group.id}
            href={`#${group.id}`}
            onClick={() => {
              setQuery('');
              requestAnimationFrame(() => {
                const target = document.getElementById(group.id);
                target?.scrollIntoView({
                  behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                    ? 'instant'
                    : 'smooth',
                });
                target?.focus({ preventScroll: true });
              });
            }}
          >
            {group.topic}
          </CpLinkPill>
        ))}
      </nav>
      <div className={searching ? 'cp-faq-page-search-feedback' : 'sr-only'}>
        <p role="status">
          {count} {count === 1 ? faqCopy.controls.resultsSingular : faqCopy.controls.resultsPlural}
        </p>
        {searching ? (
          <CpButton
            tone="outline"
            onClick={() => {
              setQuery('');
              input.current?.focus();
            }}
          >
            {faqCopy.controls.clear}
          </CpButton>
        ) : null}
      </div>
    </>
  );
}
export function FaqFilteredGroup({
  group,
  children,
}: {
  group: HelpFaqGroup;
  children: ReactNode;
}) {
  const { query } = useFaqSearch();
  const filtered = filterFaqGroup(group, query);
  if (!filtered.items.length) return null;
  return (
    <section
      id={group.id}
      className="cp-faq-page-group"
      tabIndex={-1}
      aria-label={group.heading.title.join(' ')}
    >
      <div className="cp-faq-page-group-inner cp-container">
        <div className="cp-faq-page-sidebar">{children}</div>
        <CpFaqAccordion
          key={normalizeFaqSearch(query)}
          items={filtered.items}
          name={group.id}
          defaultOpenId={filtered.items[0]?.id}
          symbols={faqCopy.controls}
        />
      </div>
    </section>
  );
}
export function FaqEmptyState() {
  const { query, setQuery } = useFaqSearch();
  if (faqGroups.some((group) => filterFaqGroup(group, query).items.length)) return null;
  return (
    <section className="cp-faq-page-empty cp-container">
      <h2>{faqCopy.controls.emptyTitle}</h2>
      <p>{faqCopy.controls.emptyDescription}</p>
      <CpButton
        tone="outline"
        onClick={() => {
          setQuery('');
          document.getElementById('faq-page-search')?.focus();
        }}
      >
        {faqCopy.controls.clear}
      </CpButton>
      <CpButton asChild>
        <a href={faqCopy.destinations.contact}>{faqCopy.final.secondary}</a>
      </CpButton>
    </section>
  );
}
