import { OrderDetailView } from '../../../../../components/orders/order-detail';
import { PageBody } from '../../../../../components/crm/page-body';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace, id } = await params;
  return (
    <PageBody>
      <OrderDetailView workspaceSlug={workspace} orderId={id} />
    </PageBody>
  );
}
