import { LeadDetail } from '@/components/leads/lead-detail';
export default async function Page({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace, id } = await params;
  return <LeadDetail workspaceSlug={workspace} leadId={id} />;
}
