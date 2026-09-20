'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type {
  CommissionState,
  PartnerCommissionView,
  PartnerDetailResponse,
} from '@canadian-plans/contracts';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@canadian-plans/ui';

import { BackendError, changeCommissionState, getPartner } from '../../lib/api';
import { useStaffSession } from '../staff-session-provider';
import { formatDateTime, formatMoney, ORDER_STATUS_LABELS } from '../orders/format';

const COMMISSION_STATE_LABELS: Readonly<Record<CommissionState, string>> = {
  earned: 'Earned',
  carrier_paid: 'Carrier paid',
  partner_paid: 'Partner paid',
};

function payoutAmount(commission: PartnerCommissionView, canViewPayouts: boolean): string {
  if (!canViewPayouts) return 'Hidden';
  return commission.amount ? formatMoney(commission.amount) : '—';
}

export function PartnerDetail({
  workspaceSlug,
  partnerId,
}: {
  workspaceSlug: string;
  partnerId: string;
}) {
  const staff = useStaffSession();
  const workspace = staff.workspaces.find((item) => item.slug === workspaceSlug);
  const workspaceId = workspace?.id;
  const accessToken = staff.accessToken;

  const [detail, setDetail] = useState<PartnerDetailResponse | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | undefined>();

  const load = useCallback(async () => {
    if (!workspaceId || !accessToken) return;
    setLoading(true);
    setError(undefined);
    try {
      setDetail(await getPartner(accessToken, workspaceId, partnerId));
    } catch (cause) {
      setError(cause instanceof BackendError ? cause.code : 'load_failed');
    } finally {
      setLoading(false);
    }
  }, [accessToken, workspaceId, partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const markCarrierPaid = useCallback(
    async (commissionId: string) => {
      if (!workspaceId || !accessToken) return;
      setPendingId(commissionId);
      setError(undefined);
      try {
        await changeCommissionState(accessToken, workspaceId, partnerId, {
          commissionId,
          toState: 'carrier_paid',
        });
        await load();
      } catch (cause) {
        setError(cause instanceof BackendError ? cause.code : 'action_failed');
      } finally {
        setPendingId(undefined);
      }
    },
    [accessToken, workspaceId, partnerId, load],
  );

  if (loading) return <p className="text-sm text-muted-foreground">Loading partner…</p>;
  if (error && !detail) {
    return <p className="text-sm text-destructive">Could not load partner ({error}).</p>;
  }
  if (!detail) return <p className="text-sm text-muted-foreground">Partner not found.</p>;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h1>{detail.partner.name}</h1>
          </CardTitle>
          <CardDescription>
            Referral code <code className="text-xs">{detail.partner.referralCode}</code> ·{' '}
            <Badge variant="outline">{detail.partner.status}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <Link className="underline-offset-2 hover:underline" href={`/w/${workspaceSlug}/partners`}>
            ← All partners
          </Link>
        </CardContent>
      </Card>

      {!detail.partnerPaidEnabled ? (
        <Card>
          <CardHeader>
            <CardTitle asChild>
              <h2 className="text-base">Partner payout is disabled</h2>
            </CardTitle>
            <CardDescription>{detail.payoutDisabledReason}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2 className="text-base">Referred orders</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {detail.referredOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No referred orders yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Fulfilment</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.referredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        className="underline-offset-2 hover:underline"
                        href={`/w/${workspaceSlug}/orders/${order.id}`}
                      >
                        {order.reference}
                      </Link>
                    </TableCell>
                    <TableCell>{ORDER_STATUS_LABELS[order.fulfilmentStatus]}</TableCell>
                    <TableCell>{formatDateTime(order.submittedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2 className="text-base">Commission lines</h2>
          </CardTitle>
          <CardDescription>
            Commission is earned on activation with the rule snapshotted at that time.
            {detail.canViewPayouts
              ? ' Finance can mark a line carrier-paid once the carrier has paid Canadian Plans.'
              : ' Payout amounts are visible only to Finance.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && detail ? (
            <p className="mb-3 text-sm text-destructive">Action failed ({error}).</p>
          ) : null}
          {detail.commissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No commission lines yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Earned</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.commissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell>
                      <Link
                        className="underline-offset-2 hover:underline"
                        href={`/w/${workspaceSlug}/orders/${commission.orderId}`}
                      >
                        {commission.orderReference}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {COMMISSION_STATE_LABELS[commission.state]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {payoutAmount(commission, detail.canViewPayouts)}
                    </TableCell>
                    <TableCell>{formatDateTime(commission.earnedAt)}</TableCell>
                    <TableCell className="text-right">
                      {detail.canMarkCarrierPaid && commission.state === 'earned' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pendingId === commission.id}
                          onClick={() => void markCarrierPaid(commission.id)}
                        >
                          Mark carrier paid
                        </Button>
                      ) : commission.state === 'carrier_paid' ? (
                        <Button size="sm" variant="outline" disabled title={detail.payoutDisabledReason}>
                          Mark partner paid
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
