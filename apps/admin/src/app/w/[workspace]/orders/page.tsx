import { OrdersList } from '../../../../components/orders/orders-list';

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ partnerCode?: string | string[] }>;
}) {
  const { workspace } = await params;
  // The partner page links here with ?partnerCode= to list all of a partner's orders.
  const { partnerCode } = await searchParams;
  return (
    <OrdersList
      workspaceSlug={workspace}
      initialPartnerCode={typeof partnerCode === 'string' ? partnerCode.slice(0, 64) : undefined}
    />
  );
}
