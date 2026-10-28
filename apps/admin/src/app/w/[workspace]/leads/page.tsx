import { LeadsList } from '../../../../components/leads-list';
import { PageBody } from '../../../../components/crm/page-body';
export default async function LeadsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return (
    <PageBody>
      <LeadsList workspaceSlug={workspace} />
    </PageBody>
  );
}
