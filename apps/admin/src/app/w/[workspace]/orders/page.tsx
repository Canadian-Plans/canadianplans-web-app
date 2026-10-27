import { OrdersIndex } from '../../../../components/orders/orders-index';

type Param = string | string[] | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Only ids reach the list from the URL; anything malformed is ignored. */
function uuidParam(value: Param): string | undefined {
  return typeof value === 'string' && UUID.test(value) ? value : undefined;
}

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ partnerCode?: Param; view?: Param; order?: Param }>;
}) {
  const { workspace } = await params;
  // The partner page links here with ?partnerCode= to list all of a partner's orders.
  const { partnerCode, view, order } = await searchParams;
  return (
    <OrdersIndex
      workspaceSlug={workspace}
      initialPartnerCode={typeof partnerCode === 'string' ? partnerCode.slice(0, 64) : undefined}
      initialViewId={uuidParam(view)}
      initialOrderId={uuidParam(order)}
    />
  );
}
