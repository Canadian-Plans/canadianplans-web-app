import { Placeholder } from '@/components/placeholder';
import { metadataCopy } from '@content/metadata';
import { plansHub } from '@content/site-chrome';
import { pageMetadata } from '@/lib/page-metadata';
export const metadata = pageMetadata('/plans', {
  title: metadataCopy.plansTitle,
  robots: { index: false, follow: false },
});
export default function Page() {
  return (
    <Placeholder title={plansHub.title} description={plansHub.description} links={plansHub.links} />
  );
}
