import { PartnersList } from '../../../../components/partners/partners-list';
import { PageBody } from '../../../../components/crm/page-body';

export default async function PartnersPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return (
    <PageBody>
      <PartnersList workspaceSlug={workspace} />
    </PageBody>
  );
}
