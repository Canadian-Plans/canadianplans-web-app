import { OrderDetailView } from '../../../../../components/orders/order-detail';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace, id } = await params;
  return <OrderDetailView workspaceSlug={workspace} orderId={id} />;
}
