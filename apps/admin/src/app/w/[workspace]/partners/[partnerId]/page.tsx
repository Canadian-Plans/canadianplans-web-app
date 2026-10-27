import { PartnerDetail } from '../../../../../components/partners/partner-detail';
import { PageBody } from '../../../../../components/crm/page-body';

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ workspace: string; partnerId: string }>;
}) {
  const { workspace, partnerId } = await params;
  return (
    <PageBody>
      <PartnerDetail workspaceSlug={workspace} partnerId={partnerId} />
    </PageBody>
  );
}
