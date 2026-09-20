'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { PartnerStatus, PartnerSummary } from '@canadian-plans/contracts';
import {
  Badge,
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

import { BackendError, listPartners } from '../../lib/api';
import { useStaffSession } from '../staff-session-provider';

const STATUS_VARIANT: Readonly<Record<PartnerStatus, 'default' | 'secondary' | 'outline'>> = {
  approved: 'default',
  pending: 'secondary',
  suspended: 'outline',
};

export function PartnersList({ workspaceSlug }: { workspaceSlug: string }) {
  const staff = useStaffSession();
  const workspace = staff.workspaces.find((item) => item.slug === workspaceSlug);
  const workspaceId = workspace?.id;
  const accessToken = staff.accessToken;

  const [partners, setPartners] = useState<readonly PartnerSummary[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workspaceId || !accessToken) return;
    setLoading(true);
    setError(undefined);
    try {
      const result = await listPartners(accessToken, workspaceId);
      setPartners(result.partners);
    } catch (cause) {
      setError(cause instanceof BackendError ? cause.code : 'load_failed');
    } finally {
      setLoading(false);
    }
  }, [accessToken, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h1>Partners</h1>
        </CardTitle>
        <CardDescription>
          Referral agencies for this workspace, their referral codes and referred-order counts.
          Commission is earned on activation; payout figures are visible only to Finance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">Could not load partners ({error}).</p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading partners…</p>
        ) : partners.length === 0 ? (
          <p className="text-sm text-muted-foreground">No partners in this workspace yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Referral code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Referred orders</TableHead>
                <TableHead className="text-right">Commission lines</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell>
                    <Link
                      className="font-medium underline-offset-2 hover:underline"
                      href={`/w/${workspaceSlug}/partners/${partner.id}`}
                    >
                      {partner.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs">{partner.referralCode}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[partner.status]}>{partner.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{partner.referredOrderCount}</TableCell>
                  <TableCell className="text-right">{partner.commissionLineCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
