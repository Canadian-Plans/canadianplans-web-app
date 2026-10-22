import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PreArrivalOrderFlow } from '@/components/pre-arrival-order/flow';
import { preArrivalOrderCopy as copy } from '@content/pre-arrival-order';
export const metadata: Metadata = pageMetadata('/order/pre-arrival', {
  title: copy.title,
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
});
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string | string[]; audience?: string | string[] }>;
}) {
  // Owner decision (22 Oct 2026): design previews 404 in production; Vercel
  // previews and local builds keep them for design checks.
  if (process.env.VERCEL_ENV === 'production') notFound();
  const query = await searchParams;
  return (
    <PreArrivalOrderFlow
      requestedPlan={typeof query.plan === 'string' ? query.plan : undefined}
      requestedAudience={typeof query.audience === 'string' ? query.audience : undefined}
    />
  );
}
