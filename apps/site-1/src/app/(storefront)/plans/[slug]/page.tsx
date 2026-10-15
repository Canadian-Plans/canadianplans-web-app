import { Placeholder } from '@/components/placeholder';
import { metadataCopy } from '@content/metadata';
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
      title="Plan details"
      description="Plan details will be connected to the catalogue in a later task."
    />
  );
}
