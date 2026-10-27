'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { AssignableMember, OrderDetail } from '@canadian-plans/contracts';
import { Badge, Button, Card, CardDescription, CardHeader, CardTitle } from '@canadian-plans/ui';

import { BackendError, getWorkspaceOrder, listOrderAssignees } from '../../lib/api';
import { useStaffSession } from '../staff-session-provider';
import { OrderActions } from './order-actions';
import { OrderChangeRequests, OrderNotes, OrderReminders } from './order-collaboration';
import { OrderDocuments } from './order-documents';
import { PAYMENT_STATE_LABELS } from './format';
import { StatusTag } from './orders-table';
import {
  OrderCustomerPanel,
  OrderPlanPanel,
  OrderSnapshotPanel,
  OrderTimelinePanel,
} from './order-panels';
import { OrderPayment } from './order-payment';
import { useOrderWrite } from './order-write';

/**
 * One order with every staff action. `page` is the full two-column page;
 * `panel` is the single column shown in the orders list's side panel, which
 * also reports writes so the list behind it can refresh.
 */
export function OrderDetailView({
  workspaceSlug,
  orderId,
  variant = 'page',
  onChanged,
}: {
  workspaceSlug: string;
  orderId: string;
  variant?: 'page' | 'panel';
  onChanged?(): void;
}) {
  const staff = useStaffSession();
  const workspace = staff.workspaces.find((item) => item.slug === workspaceSlug);
  const workspaceId = workspace?.id;
  const accessToken = staff.accessToken;

  const [order, setOrder] = useState<OrderDetail>();
  const [members, setMembers] = useState<readonly AssignableMember[]>([]);
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!accessToken || !workspaceId) return;
    setLoading(true);
    try {
      const result = await getWorkspaceOrder(accessToken, workspaceId, orderId);
      setOrder(result.order);
      setMessage(undefined);
    } catch (error) {
      setMessage(
        `Could not load this order. Reason: ${error instanceof BackendError ? error.code : 'internal_error'}.`,
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, workspaceId, orderId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!accessToken || !workspaceId) return;
    let current = true;
    void listOrderAssignees(accessToken, workspaceId)
      .then((result) => {
        if (current) setMembers(result.members);
      })
      .catch(() => {
        if (current) setMembers([]);
      });
    return () => {
      current = false;
    };
  }, [accessToken, workspaceId]);

  const refreshAfterWrite = useCallback(async () => {
    await refresh();
    onChanged?.();
  }, [refresh, onChanged]);

  const write = useOrderWrite(refreshAfterWrite);

  if (loading && !order) {
    return <p className="text-sm text-muted-foreground">Loading order…</p>;
  }
  if (!order) {
    return (
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h1>Order</h1>
          </CardTitle>
          <CardDescription>{message ?? 'This order is not available.'}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const panel = variant === 'panel';
  const scope = { workspaceId: workspaceId ?? '', accessToken: accessToken ?? '' };
  const showDocuments =
    order.customerDataState !== 'restricted' && order.customerDataState !== 'deleted';

  return (
    <section className="flex flex-col gap-4">
      {panel ? (
        <div className="flex flex-wrap items-center gap-2">
          <StatusTag status={order.fulfilmentStatus} />
          <Badge variant="outline">{PAYMENT_STATE_LABELS[order.paymentState]}</Badge>
          {order.archiveState === 'archived' ? <Badge variant="secondary">Archived</Badge> : null}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{order.reference}</h1>
            <Badge>{order.fulfilmentStatus}</Badge>
            <Badge variant="outline">{order.paymentState}</Badge>
            {order.archiveState === 'archived' ? <Badge variant="secondary">Archived</Badge> : null}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/w/${workspaceSlug}/orders`}>Back to orders</Link>
          </Button>
        </div>
      )}

      {write.message ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"
        >
          <span>{write.message}</span>
          {write.stale ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                write.dismiss();
                void refresh();
              }}
            >
              Reload order
            </Button>
          ) : null}
        </div>
      ) : null}

      {panel ? (
        <div className="flex flex-col gap-4">
          <OrderActions {...scope} order={order} members={members} write={write} />
          <OrderSnapshotPanel order={order} />
          <OrderCustomerPanel order={order} />
          <OrderPayment {...scope} order={order} write={write} />
          {showDocuments ? <OrderDocuments {...scope} orderId={orderId} /> : null}
          <OrderNotes {...scope} order={order} write={write} />
          <OrderReminders {...scope} order={order} write={write} />
          <OrderChangeRequests {...scope} order={order} write={write} />
          <OrderPlanPanel order={order} />
          <OrderTimelinePanel order={order} />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <OrderSnapshotPanel order={order} />
            <OrderCustomerPanel order={order} />
            <OrderPlanPanel order={order} />
            <OrderTimelinePanel order={order} />
          </div>
          <div className="flex flex-col gap-4">
            <OrderActions
              workspaceId={workspaceId ?? ''}
              accessToken={accessToken ?? ''}
              order={order}
              members={members}
              write={write}
            />
            <OrderPayment
              workspaceId={workspaceId ?? ''}
              accessToken={accessToken ?? ''}
              order={order}
              write={write}
            />
            {order.customerDataState !== 'restricted' && order.customerDataState !== 'deleted' ? (
              <OrderDocuments
                workspaceId={workspaceId ?? ''}
                accessToken={accessToken ?? ''}
                orderId={orderId}
              />
            ) : null}
            <OrderNotes
              workspaceId={workspaceId ?? ''}
              accessToken={accessToken ?? ''}
              order={order}
              write={write}
            />
            <OrderReminders
              workspaceId={workspaceId ?? ''}
              accessToken={accessToken ?? ''}
              order={order}
              write={write}
            />
            <OrderChangeRequests
              workspaceId={workspaceId ?? ''}
              accessToken={accessToken ?? ''}
              order={order}
              write={write}
            />
          </div>
        </div>
      )}
    </section>
  );
}
