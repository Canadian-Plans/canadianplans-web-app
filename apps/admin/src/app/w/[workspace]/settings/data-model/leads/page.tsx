import { LeadDataModel } from '@/components/leads/data-model';
export default async function Page({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return <LeadDataModel workspaceSlug={workspace} />;
}
