'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@canadian-plans/ui';

import { getStaffAuth, isStaffAuthConfigured } from '../../lib/supabase-auth';

/**
 * Where the recovery link leads after the email step. With a verified authenticator the
 * recovery session is only aal1, and Supabase refuses a password change until the person
 * passes the authenticator check, so that check happens here before the password form.
 */
type UpdateStep = 'checking' | 'expired' | 'code' | 'password';
interface Factor {
  readonly id: string;
  readonly name: string;
}

const GENERIC_UPDATE_ERROR = 'The password could not be updated. Request a new recovery email.';
const EMAIL_SENT = 'If that account exists, a recovery email has been sent.';

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  if ('code' in error && typeof error.code === 'string') return error.code;
  if ('name' in error && error.name === 'AuthSessionMissingError') return 'session_not_found';
  return undefined;
}

async function loadVerifiedFactors(auth: ReturnType<typeof getStaffAuth>): Promise<Factor[]> {
  const result = await auth.mfa.listFactors();
  if (result.error) throw result.error;
  return result.data.totp
    .filter((factor) => factor.status === 'verified')
    .map((factor, index) => ({
      id: factor.id,
      name: factor.friendly_name?.trim() || `Authenticator ${index + 1}`,
    }));
}

export default function RecoveryPage() {
  const [updateMode, setUpdateMode] = useState(false);
  const configured = isStaffAuthConfigured();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [step, setStep] = useState<UpdateStep>('checking');
  const [factors, setFactors] = useState<readonly Factor[]>([]);
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    setUpdateMode(new URLSearchParams(window.location.search).get('mode') === 'update');
  }, []);

  function askForCode(available: readonly Factor[]) {
    setFactors(available);
    setFactorId(available[0]?.id ?? '');
    setCode('');
    setStep('code');
  }

  useEffect(() => {
    if (!updateMode || !configured) return;
    let active = true;
    async function prepare() {
      const auth = getStaffAuth();
      try {
        // getSession waits for the recovery link in the address bar to be read.
        const session = await auth.getSession();
        if (!active) return;
        if (!session.data.session) {
          setStep('expired');
          return;
        }
        const level = await auth.mfa.getAuthenticatorAssuranceLevel();
        if (level.error) throw level.error;
        if (level.data.nextLevel === 'aal2' && level.data.currentLevel !== 'aal2') {
          const available = await loadVerifiedFactors(auth);
          if (!active) return;
          if (available.length) {
            askForCode(available);
            return;
          }
        }
        setStep('password');
      } catch {
        // Let the password attempt itself report the real reason.
        if (active) setStep('password');
      }
    }
    void prepare();
    return () => {
      active = false;
    };
  }, [updateMode, configured]);

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || busy || !factorId) return;
    setBusy(true);
    setMessage(undefined);
    try {
      const verified = await getStaffAuth().mfa.challengeAndVerify({ factorId, code });
      if (verified.error) throw verified.error;
      setMessage('Code accepted. Now choose your new password.');
      setStep('password');
    } catch {
      setMessage('The verification code was not accepted. Try a new code.');
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || busy) return;
    setBusy(true);
    const auth = getStaffAuth();
    try {
      if (updateMode) {
        const result = await auth.updateUser({ password });
        if (result.error) throw result.error;
        setMessage('Password updated. MFA is still required for privileged actions.');
      } else {
        await auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/recovery?mode=update`,
        });
        setMessage(EMAIL_SENT);
      }
    } catch (error) {
      if (!updateMode) {
        setMessage(EMAIL_SENT);
      } else {
        const reason = errorCode(error);
        if (reason === 'insufficient_aal') {
          try {
            const available = await loadVerifiedFactors(auth);
            if (available.length) {
              askForCode(available);
              setMessage('Enter your authenticator code first, then set the new password.');
              return;
            }
          } catch {
            // Fall through to the generic message below.
          }
          setMessage(GENERIC_UPDATE_ERROR);
        } else if (reason === 'same_password') {
          setMessage('Choose a password that is different from your current one.');
        } else if (reason === 'weak_password') {
          setMessage(
            'That password is too weak. Use a longer one with letters, numbers and symbols.',
          );
        } else if (reason === 'session_not_found') {
          setStep('expired');
          setMessage(undefined);
        } else {
          setMessage(GENERIC_UPDATE_ERROR);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-svh items-center justify-center p-6 outline-none"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle asChild>
            <h1>Recover staff access</h1>
          </CardTitle>
          <CardDescription>
            Password recovery never bypasses the backend&apos;s verified aal2 requirement.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {updateMode && step === 'checking' ? (
            <p role="status" className="text-sm text-muted-foreground">
              Checking your recovery link…
            </p>
          ) : null}
          {updateMode && step === 'expired' ? (
            <p role="alert" className="text-sm text-destructive">
              This recovery link has expired or was already used.{' '}
              <Link href="/recovery" className="text-primary underline">
                Request a new recovery email
              </Link>
              .
            </p>
          ) : null}
          {updateMode && step === 'code' ? (
            <form onSubmit={verifyCode} className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Your account uses an authenticator app. Enter the current code before choosing a new
                password.
              </p>
              {factors.length > 1 ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="recovery-factor">Authenticator</Label>
                  <select
                    id="recovery-factor"
                    value={factorId}
                    disabled={busy}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    onChange={(event) => {
                      setFactorId(event.target.value);
                      setCode('');
                    }}
                  >
                    {factors.map((factor) => (
                      <option key={factor.id} value={factor.id}>
                        {factor.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="flex flex-col gap-2">
                <Label htmlFor="recovery-code">Authenticator code</Label>
                <Input
                  id="recovery-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  minLength={6}
                  maxLength={6}
                  required
                  disabled={!configured || busy}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
              </div>
              <Button type="submit" disabled={!configured || busy || !factorId}>
                {busy ? 'Verifying…' : 'Verify code'}
              </Button>
            </form>
          ) : null}
          {(!updateMode || step === 'password') && (
            <form onSubmit={submit} className="flex flex-col gap-4">
              {updateMode ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    disabled={!configured || busy}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="recovery-email">Email</Label>
                  <Input
                    id="recovery-email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                    disabled={!configured || busy}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              )}
              <Button type="submit" disabled={!configured || busy}>
                {busy ? 'Please wait…' : updateMode ? 'Update password' : 'Send recovery email'}
              </Button>
            </form>
          )}
          {message ? (
            <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
              {message}
            </p>
          ) : null}
          <section className="space-y-2 border-t pt-4" aria-labelledby="lost-mfa-title">
            <h2 id="lost-mfa-title" className="font-medium">
              Lost an authenticator?
            </h2>
            <p className="text-sm text-muted-foreground">
              Use another enrolled TOTP factor. If every factor is lost, follow the controlled staff
              recovery runbook; a factor reset must be performed in the provider console and a new
              factor enrolled before privileged work resumes.
            </p>
            <Link href="/mfa/challenge" className="text-sm text-primary underline">
              Try a backup authenticator
            </Link>
          </section>
          <Button asChild variant="outline">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
