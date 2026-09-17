'use client';

import { useState } from 'react';
import type {
  AssignableMember,
  OrderDetail,
  OrderFulfilmentStatus,
} from '@canadian-plans/contracts';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@canadian-plans/ui';

import { patchOrderArchive, patchOrderAssignee, patchWorkspaceOrder } from '../../lib/api';
import { ORDER_STATUS_LABELS } from './format';
import type { OrderWrite } from './order-write';

const UNASSIGNED = 'unassigned';

export interface OrderActionProps {
  workspaceId: string;
  accessToken: string;
  order: OrderDetail;
  members: readonly AssignableMember[];
  write: OrderWrite;
}

function memberLabel(member: AssignableMember): string {
  const roles = member.roles.length > 0 ? member.roles.join(', ') : 'no role';
  return member.isSelf ? `You (${roles})` : `Member ${member.membershipId.slice(0, 8)} (${roles})`;
}

/**
 * Status transitions, dispatch, cancellation, assignment and archiving. The
 * button set comes from the backend's `allowedTransitions`; nothing here
 * decides which status may follow which.
 */
export function OrderActions({
  workspaceId,
  accessToken,
  order,
  members,
  write,
}: OrderActionProps) {
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [courier, setCourier] = useState('');
  const [trackingReference, setTrackingReference] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [assignee, setAssignee] = useState(order.assigneeId ?? UNASSIGNED);

  const expectedVersion = order.recordVersion;
  const canManage = order.capabilities.canManageOrders;

  const simpleTransitions = order.allowedTransitions.filter(
    (status) => status !== 'cancelled' && status !== 'dispatched' && status !== 'activated',
  );
  const canDispatch = order.allowedTransitions.includes('dispatched');
  const canActivate = order.allowedTransitions.includes('activated');
  const canCancel = order.allowedTransitions.includes('cancelled');

  function transition(toStatus: OrderFulfilmentStatus) {
    return write.run(() =>
      patchWorkspaceOrder(accessToken, workspaceId, order.id, {
        action: 'transition',
        toStatus,
        expectedVersion,
      }),
    );
  }

  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>Processing actions</h2>
          </CardTitle>
          <CardDescription>Your access lets you view this order but not change it.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Processing actions</h2>
        </CardTitle>
        <CardDescription>
          Only the transitions this workspace and actor allow are shown.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {simpleTransitions.map((status) => (
            <Button
              key={status}
              type="button"
              variant="secondary"
              disabled={write.busy}
              onClick={() => void transition(status)}
            >
              Move to {ORDER_STATUS_LABELS[status]}
            </Button>
          ))}
          {canDispatch ? (
            <Button type="button" disabled={write.busy} onClick={() => setDispatchOpen(true)}>
              Dispatch
            </Button>
          ) : null}
          {canActivate ? (
            <Button
              type="button"
              disabled={write.busy}
              onClick={() =>
                void write.run(() =>
                  patchWorkspaceOrder(accessToken, workspaceId, order.id, {
                    action: 'activate',
                    expectedVersion,
                  }),
                )
              }
            >
              Activate
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              type="button"
              variant="destructive"
              disabled={write.busy}
              onClick={() => setCancelOpen(true)}
            >
              Cancel order
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="order-assignee">Assignee</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger id="order-assignee" className="w-64">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.membershipId} value={member.membershipId}>
                    {memberLabel(member)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={write.busy}
            onClick={() =>
              void write.run(() =>
                patchOrderAssignee(accessToken, workspaceId, order.id, {
                  assigneeId: assignee === UNASSIGNED ? null : assignee,
                  expectedVersion,
                }),
              )
            }
          >
            Save assignee
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={write.busy}
            onClick={() =>
              void write.run(() =>
                patchOrderArchive(accessToken, workspaceId, order.id, {
                  archived: order.archiveState !== 'archived',
                  expectedVersion,
                }),
              )
            }
          >
            {order.archiveState === 'archived' ? 'Restore order' : 'Archive order'}
          </Button>
        </div>
      </CardContent>

      <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispatch order</DialogTitle>
            <DialogDescription>
              Courier, tracking reference and dispatch date are recorded with the Dispatched status.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="dispatch-courier">Courier</Label>
              <Input
                id="dispatch-courier"
                value={courier}
                maxLength={120}
                onChange={(event) => setCourier(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="dispatch-tracking">Tracking reference</Label>
              <Input
                id="dispatch-tracking"
                value={trackingReference}
                maxLength={120}
                onChange={(event) => setTrackingReference(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="dispatch-date">Dispatch date</Label>
              <Input
                id="dispatch-date"
                type="date"
                value={dispatchDate}
                onChange={(event) => setDispatchDate(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDispatchOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              disabled={write.busy || courier.trim() === ''}
              onClick={async () => {
                const result = await write.run(() =>
                  patchWorkspaceOrder(accessToken, workspaceId, order.id, {
                    action: 'dispatch',
                    courier: courier.trim(),
                    ...(trackingReference.trim()
                      ? { trackingReference: trackingReference.trim() }
                      : {}),
                    ...(dispatchDate ? { dispatchDate: `${dispatchDate}T00:00:00.000Z` } : {}),
                    expectedVersion,
                  }),
                );
                if (result) {
                  setDispatchOpen(false);
                  setCourier('');
                  setTrackingReference('');
                  setDispatchDate('');
                }
              }}
            >
              Record dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel order</DialogTitle>
            <DialogDescription>A cancellation reason is required and audited.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1">
            <Label htmlFor="cancel-reason">Reason</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              maxLength={2000}
              aria-invalid={cancelReason.trim() === ''}
              onChange={(event) => setCancelReason(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={write.busy || cancelReason.trim() === ''}
              onClick={async () => {
                const result = await write.run(() =>
                  patchWorkspaceOrder(accessToken, workspaceId, order.id, {
                    action: 'cancel',
                    reason: cancelReason.trim(),
                    expectedVersion,
                  }),
                );
                if (result) {
                  setCancelOpen(false);
                  setCancelReason('');
                }
              }}
            >
              Confirm cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
