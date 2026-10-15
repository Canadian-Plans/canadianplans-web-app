import { Placeholder } from '@/components/placeholder';
import { metadataCopy } from '@content/metadata';
import { pageMetadata } from '@/lib/page-metadata';
export const metadata = pageMetadata('/plans', {
  title: metadataCopy.plansTitle,
  robots: { index: false, follow: false },
});
export default function Page() {
  return (
    <Placeholder
      title="Plans"
      description="The plan catalogue is not available yet. No offers or prices are published."
    />
  );
}
