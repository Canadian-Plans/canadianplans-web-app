import { OrdersList } from '../../../../components/orders/orders-list';

export default async function OrdersPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return <OrdersList workspaceSlug={workspace} />;
}
