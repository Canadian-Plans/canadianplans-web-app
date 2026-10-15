'use client';
import { useActionState, useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CpAsset, CpButton } from '@canadian-plans/ui/canadian-plans';
import { searchCopy as copy, systemAssets as assets } from '@content/system';
import { normalizeSiteQuery, type SiteSearchState } from '@/lib/site-search';
import { siteSearchAction } from '@/app/(system)/search/actions';

async function submitSearch(previous: SiteSearchState, form: FormData): Promise<SiteSearchState> {
  try {
    return await siteSearchAction(previous, form);
  } catch {
    return { status: 'failed' };
  }
}

export function SiteSearchForm({
  compact = false,
  query = '',
}: {
  compact?: boolean;
  query?: string;
}) {
  const router = useRouter();
  const id = useId();
  const [clientError, setClientError] = useState(false);
  const [input, setInput] = useState(query);
  const [state, action, pending] = useActionState<SiteSearchState, FormData>(submitSearch, {
    status: 'idle',
  });
  const invalid = clientError || state.status === 'invalid';
  useEffect(() => {
    if (state.status === 'ready') router.push(`/search?q=${encodeURIComponent(state.query)}`);
  }, [state, router]);
  return (
    <form
      className={compact ? 'cp-search' : 'cp-system-search-form'}
      action={action}
      onSubmit={(event) => {
        if (!normalizeSiteQuery(new FormData(event.currentTarget).get('query'))) {
          event.preventDefault();
          setClientError(true);
        } else setClientError(false);
      }}
    >
      {!compact && <CpAsset asset={assets.searchBody} />}
      <input
        value={input}
        name="query"
        type="search"
        aria-label={copy.label}
        placeholder={copy.placeholder}
        required
        minLength={2}
        maxLength={80}
        autoComplete="off"
        aria-invalid={invalid}
        aria-describedby={id}
        onChange={(event) => {
          setInput(event.currentTarget.value);
          setClientError(false);
        }}
      />
      {compact ? (
        <button type="submit" aria-label={copy.submit} disabled={pending}>
          <CpAsset asset={assets.search} />
        </button>
      ) : (
        <CpButton type="submit" disabled={pending}>
          {copy.submit}
        </CpButton>
      )}
      <p
        id={id}
        role="status"
        className={
          invalid || pending || state.status === 'failed' ? 'cp-search-feedback' : 'sr-only'
        }
      >
        {pending
          ? copy.pending
          : invalid
            ? copy.error
            : state.status === 'failed'
              ? copy.failed
              : null}
      </p>
    </form>
  );
}
