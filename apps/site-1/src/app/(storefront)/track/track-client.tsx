'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { TrackingStatusResponse } from '@canadian-plans/contracts';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
} from '@canadian-plans/ui';

import { loadTrackingStatus, requestTrackingCode, verifyTrackingCode } from './actions';

type Phase = 'identify' | 'verify' | 'status';

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Order received',
  in_progress: 'In progress',
  awaiting_customer: 'Awaiting you',
  ready_for_delivery: 'Ready for delivery',
  dispatched: 'Dispatched',
  activated: 'Activated',
  cancelled: 'Cancelled',
};

const DOC_LABELS: Record<string, string> = {
  passport: 'Passport',
  visa: 'Visa or permit',
  address_proof: 'Proof of address',
};

function docLabel(key: string): string {
  return DOC_LABELS[key] ?? key.replace(/_/g, ' ');
}

export function TrackClient() {
  const [phase, setPhase] = useState<Phase>('identify');
  const [email, setEmail] = useState('');
  const [reference, setReference] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<TrackingStatusResponse>();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    void (async () => {
      const result = await loadTrackingStatus();
      if (result.ok) {
        setStatus(result.data);
        setPhase('status');
      }
      setChecking(false);
    })();
  }, []);

  async function handleIdentify(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setMessage(undefined);
    const result = await requestTrackingCode({ email, orderReference: reference });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setCode('');
    setPhase('verify');
    // Identical whether or not the recipient exists.
    setMessage('If we found your order, a six-digit code has been sent to that email.');
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setMessage(undefined);
    const result = await verifyTrackingCode({ email, orderReference: reference, code });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    const loaded = await loadTrackingStatus();
    if (loaded.ok) {
      setStatus(loaded.data);
      setPhase('status');
    } else {
      setMessage(loaded.message);
    }
  }

  if (checking) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (phase === 'status' && status) {
    const documents = status.documentsRequired.filter((key) => key !== 'none');
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-xl">Order {status.reference}</h2>
          </CardTitle>
          <CardDescription>
            {STATUS_LABELS[status.fulfilmentStatus] ?? status.fulfilmentStatus}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p data-testid="tracking-status">
            Status: {STATUS_LABELS[status.fulfilmentStatus] ?? status.fulfilmentStatus}
          </p>
          <p>
            Delivery:{' '}
            {status.deliveryState === 'dispatched'
              ? `Dispatched${status.trackingReference ? ` — tracking ${status.trackingReference}` : ''}`
              : 'Not dispatched yet'}
          </p>
          <p>Payment: {status.paymentState.replace(/_/g, ' ')}</p>
          {documents.length > 0 ? (
            <div data-testid="tracking-documents">
              <p className="font-medium">Still required</p>
              <ul className="list-disc pl-5">
                {documents.map((key) => (
                  <li key={key}>{docLabel(key)}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p>No documents outstanding.</p>
          )}
          <p className="text-muted-foreground">
            Last updated {new Date(status.updatedAt).toLocaleString()}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (phase === 'verify') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-xl">Enter your code</h2>
          </CardTitle>
          <CardDescription>We sent a six-digit code to {email}.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleVerify} noValidate>
            <FormField id="track-code" label="Six-digit code" required>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                maxLength={6}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              />
            </FormField>
            <div className="flex flex-wrap gap-4">
              <Button type="submit" disabled={busy || code.length !== 6}>
                {busy ? 'Checking…' : 'View my order'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setPhase('identify')}>
                Back
              </Button>
            </div>
          </form>
          {message ? (
            <p role="status" aria-live="polite" className="mt-4 text-sm text-muted-foreground">
              {message}
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-xl">Find your order</h2>
        </CardTitle>
        <CardDescription>
          Enter the reference from your confirmation email and the email you used.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleIdentify} noValidate>
          <FormField id="track-reference" label="Order reference" required>
            <Input value={reference} onChange={(event) => setReference(event.target.value)} />
          </FormField>
          <FormField id="track-email" label="Email" required>
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </FormField>
          <Button type="submit" disabled={busy}>
            {busy ? 'Requesting…' : 'Email me a code'}
          </Button>
        </form>
        {message ? (
          <p role="status" aria-live="polite" className="mt-4 text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
