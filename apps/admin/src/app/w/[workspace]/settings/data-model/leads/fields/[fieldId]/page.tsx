import { LeadDataModel } from '@/components/leads/data-model';
export default async function Page({
  params,
}: {
  params: Promise<{ workspace: string; fieldId: string }>;
}) {
  const { workspace, fieldId } = await params;
  return <LeadDataModel workspaceSlug={workspace} fieldId={fieldId} />;
}
