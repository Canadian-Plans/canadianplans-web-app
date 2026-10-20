'use client';

import { useState, type FormEvent } from 'react';
import { provinceNames, type ProvinceCode } from '@canadian-plans/contracts';
import { Button, FormField, Input } from '@canadian-plans/ui';

import { orderFormContent } from '@content/order-forms';

import { joinWaitlist } from './waitlist';

const copy = orderFormContent.waitlist;

/**
 * Shown where a province has no internet or TV plans yet: an email and nothing
 * else, so leaving a wish costs the visitor ten seconds.
 */
export function WaitlistForm({ province }: { province: ProvinceCode }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(undefined);
    const result = await joinWaitlist({ province, email });
    setBusy(false);
    if (result.ok) {
      setDone(true);
      return;
    }
    setError(result.fieldErrors?.email ?? result.message);
  }

  if (done) {
    return (
      <p role="status" className="font-medium">
        {copy.done}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate aria-labelledby="waitlist-title">
      <h4 id="waitlist-title" className="font-semibold">
        {copy.title} — {provinceNames[province]}
      </h4>
      <p>{copy.description}</p>
      <FormField id="waitlist-email" label={copy.emailLabel} required error={error}>
        <Input
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(undefined);
          }}
          autoComplete="email"
        />
      </FormField>
      <p className="text-sm">{copy.notice}</p>
      <Button type="submit" disabled={busy}>
        {copy.submit}
      </Button>
    </form>
  );
}
