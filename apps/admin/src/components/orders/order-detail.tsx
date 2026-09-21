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
import {
  OrderCustomerPanel,
  OrderPlanPanel,
  OrderSnapshotPanel,
  OrderTimelinePanel,
} from './order-panels';
import { OrderPayment } from './order-payment';
import { useOrderWrite } from './order-write';

export function OrderDetailView({
  workspaceSlug,
  orderId,
}: {
  workspaceSlug: string;
  orderId: string;
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

  const write = useOrderWrite(refresh);

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

  return (
    <section className="flex flex-col gap-4">
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
          <OrderDocuments
            workspaceId={workspaceId ?? ''}
            accessToken={accessToken ?? ''}
            orderId={orderId}
          />
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
    </section>
  );
}
