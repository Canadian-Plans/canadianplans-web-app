import { TrackClient } from './track-client';

export default function Page() {
  return (
    <article className="space-y-6">
      <h1 className="text-3xl">Track your order</h1>
      <p className="text-sm text-muted-foreground">
        Enter your order reference and email. We&apos;ll send a six-digit code to confirm it&apos;s
        you.
      </p>
      <TrackClient />
    </article>
  );
}
