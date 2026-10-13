'use client';
import { useState } from 'react';
import { CpAsset, CpButton } from '@canadian-plans/ui/canadian-plans';
import {
  searchCopy as copy,
  systemAssets as assets,
  type SearchCategory,
  type SearchItem,
} from '@content/system';
import { SiteSearchForm } from '@/components/shared/site-search-form';
export function SearchResults({
  query,
  items,
  invalid,
}: {
  query: string;
  items: readonly SearchItem[];
  invalid: boolean;
}) {
  const [category, setCategory] = useState<SearchCategory>('all');
  const visible = items.filter((item) => category === 'all' || item.category === category);
  return (
    <div className="cp-system-results">
      <SiteSearchForm query={query} />
      <h1 aria-live="polite">
        {invalid ? (
          copy.error
        ) : (
          <>
            {visible.length} {copy.results} {copy.openQuote}
            {query}
            {copy.closeQuote}
          </>
        )}
      </h1>
      <div className="cp-system-filters" role="group" aria-label={copy.filtersLabel}>
        {copy.categories.map((filter) => (
          <button
            key={filter.id}
            type="button"
            aria-pressed={category === filter.id}
            onClick={() => setCategory(filter.id)}
          >
            {filter.label} (
            {items.filter((item) => filter.id === 'all' || item.category === filter.id).length})
          </button>
        ))}
      </div>
      {visible.map((item) =>
        item.featured ? (
          <article className="cp-system-featured" key={item.id} data-preview-only="true">
            <div className="cp-system-featured-copy">
              <p>{item.label}</p>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </div>
            <div className="cp-system-price">
              <strong>{copy.featured.price}</strong>
              <span>{copy.featured.period}</span>
            </div>
            <CpButton asChild>
              <a href={item.href}>{copy.featured.button}</a>
            </CpButton>
          </article>
        ) : (
          <article className="cp-system-result" key={item.id}>
            <div className="cp-system-result-meta">
              <span>{item.label}</span>
              <p>{item.crumb}</p>
            </div>
            <h2>
              <a href={item.href}>{item.title}</a>
            </h2>
            <p>{item.description}</p>
          </article>
        ),
      )}
      {!visible.length && <p role="status">{copy.empty}</p>}
      <aside className="cp-system-search-help">
        <div>
          <h2>{copy.helpTitle}</h2>
          <p>{copy.helpDescription}</p>
        </div>
        <CpButton asChild tone="outline">
          <a href="/contact#contact-options">
            <CpAsset asset={assets.chat} />
            {copy.helpButton}
          </a>
        </CpButton>
      </aside>
    </div>
  );
}
