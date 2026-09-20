import { PartnersList } from '../../../../components/partners/partners-list';

export default async function PartnersPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return <PartnersList workspaceSlug={workspace} />;
}
