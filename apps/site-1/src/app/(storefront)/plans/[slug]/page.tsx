import { Placeholder } from '@/components/placeholder';
import { metadataCopy } from '@content/metadata';
import { plansHub } from '@content/site-chrome';
import { pageMetadata } from '@/lib/page-metadata';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return pageMetadata(`/plans/${encodeURIComponent(slug)}`, {
    title: metadataCopy.planTitle,
    description: metadataCopy.planTitle,
    robots: { index: false, follow: false },
  });
}
export default function Page() {
  return (
    <Placeholder
      title={plansHub.planTitle}
      description={plansHub.planDescription}
      links={plansHub.links}
    />
  );
}
