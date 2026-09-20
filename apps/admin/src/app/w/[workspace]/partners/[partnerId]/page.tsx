import { PartnerDetail } from '../../../../../components/partners/partner-detail';

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ workspace: string; partnerId: string }>;
}) {
  const { workspace, partnerId } = await params;
  return <PartnerDetail workspaceSlug={workspace} partnerId={partnerId} />;
}
