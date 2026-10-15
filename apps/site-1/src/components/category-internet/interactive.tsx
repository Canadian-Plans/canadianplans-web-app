'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { CpButton } from '@canadian-plans/ui/canadian-plans';
import { internetChromeAssets } from '@content/home-internet';
import {
  categoryAddressCopy,
  categoryInternetChrome,
  type CategoryInternetContent,
} from '@content/category-internet';
import { Navigation } from '@/components/shared/component-lab-client';
import { isValidPostalCode } from '@/lib/postal-preview';
import {
  checkCategoryAddress,
  type CategoryAddressResult,
} from '@/app/(category-internet)/actions';

export function CategoryNavigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <Navigation
      content={categoryInternetChrome}
      assets={internetChromeAssets}
      menuOpen={menuOpen}
      onMenuOpenChange={setMenuOpen}
      onAction={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
      onContact={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}
      brandHref="/"
    />
  );
}

export function CategoryAddressCheck({
  content,
}: {
  readonly content: Pick<CategoryInternetContent, 'slug' | 'postalPlaceholder'>;
}) {
  const [postalCode, setPostalCode] = useState('');
  const [result, setResult] = useState<CategoryAddressResult | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();
  const copy = categoryAddressCopy;

  useEffect(() => {
    if (!pending && result?.status === 'invalid') inputRef.current?.focus();
  }, [pending, result]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    if (!isValidPostalCode(postalCode)) {
      setResult({ status: 'invalid', previewOnly: true });
      return;
    }
    busy.current = true;
    setPending(true);
    try {
      const next = await checkCategoryAddress({ region: content.slug, postalCode });
      setResult(next);
    } catch {
      setResult({ status: 'error', previewOnly: true });
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  const message =
    result?.status === 'invalid'
      ? copy.invalid
      : result?.status === 'available'
        ? copy.available
        : result?.status === 'unavailable'
          ? copy.unavailable
          : result?.status === 'unconfigured'
            ? copy.unconfigured
            : result?.status === 'error'
              ? copy.error
              : null;

  return (
    <form
      id="address-check"
      className="cp-catnet-address"
      onSubmit={submit}
      noValidate
      aria-busy={pending}
    >
      <label className="sr-only" htmlFor={fieldId}>
        {copy.postalLabel}
      </label>
      <div className="cp-catnet-address-row">
        <input
          ref={inputRef}
          id={fieldId}
          name="postalCode"
          autoComplete="postal-code"
          maxLength={10}
          placeholder={content.postalPlaceholder}
          value={postalCode}
          disabled={pending}
          aria-invalid={result?.status === 'invalid'}
          aria-describedby={`${fieldId}-hint ${fieldId}-result`}
          onChange={(event) => {
            setPostalCode(event.currentTarget.value);
            setResult(null);
          }}
        />
        <CpButton type="submit" disabled={pending}>
          {pending ? copy.pending : result?.status === 'error' ? copy.retry : copy.submit}
        </CpButton>
      </div>
      <p id={`${fieldId}-hint`} className="sr-only">
        {copy.postalHint}
      </p>
      {message ? (
        <p
          id={`${fieldId}-result`}
          className="cp-catnet-address-result"
          role={result?.status === 'invalid' || result?.status === 'error' ? 'alert' : 'status'}
        >
          <strong>{copy.previewLabel}</strong> {message}
        </p>
      ) : (
        <span id={`${fieldId}-result`} className="sr-only" />
      )}
    </form>
  );
}
