import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
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
  const query = await searchParams;
  return (
    <PreArrivalOrderFlow
      requestedPlan={typeof query.plan === 'string' ? query.plan : undefined}
      requestedAudience={typeof query.audience === 'string' ? query.audience : undefined}
    />
  );
}
