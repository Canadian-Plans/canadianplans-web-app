import { TrackClient } from './track-client';
import { metadataCopy } from '@content/metadata';
import { pageMetadata } from '@/lib/page-metadata';
export const metadata = pageMetadata('/track', {
  title: metadataCopy.trackTitle,
  robots: { index: false, follow: false },
});

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
