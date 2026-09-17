'use client';

import { useState } from 'react';
import type {
  AmendableContactPatch,
  AmendableFormPatch,
  OrderChangeRequest,
  OrderDetail,
} from '@canadian-plans/contracts';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from '@canadian-plans/ui';

import {
  createOrderChangeRequest,
  createOrderNote,
  createOrderReminder,
  deleteOrderReminder,
  resolveOrderChangeRequest,
} from '../../lib/api';
import { formatDateTime } from './format';
import type { OrderWrite } from './order-write';

export interface CollaborationProps {
  workspaceId: string;
  accessToken: string;
  order: OrderDetail;
  write: OrderWrite;
}

export function OrderNotes({ workspaceId, accessToken, order, write }: CollaborationProps) {
  const [body, setBody] = useState('');
  const canManage = order.capabilities.canManageOrders;

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Notes</h2>
        </CardTitle>
        <CardDescription>Operational contact notes, attributed and audited.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {order.notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {order.notes.map((note) => (
              <li key={note.id} className="rounded-md border p-3 text-sm">
                <p>{note.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(note.createdAt)} · {note.authorId.slice(0, 8)}
                </p>
              </li>
            ))}
          </ul>
        )}
        {canManage ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-note">Add a note</Label>
            <Textarea
              id="new-note"
              value={body}
              maxLength={2000}
              onChange={(event) => setBody(event.target.value)}
            />
            <Button
              type="button"
              disabled={write.busy || body.trim() === ''}
              onClick={async () => {
                const result = await write.run(() =>
                  createOrderNote(accessToken, workspaceId, order.id, { body: body.trim() }),
                );
                if (result) setBody('');
              }}
            >
              Add note
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function OrderReminders({ workspaceId, accessToken, order, write }: CollaborationProps) {
  const [remindAt, setRemindAt] = useState('');
  const [note, setNote] = useState('');
  const canManage = order.capabilities.canManageOrders;

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Reminders</h2>
        </CardTitle>
        <CardDescription>Scheduled follow-ups; removing one cancels it.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {order.reminders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reminders scheduled.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {order.reminders.map((reminder) => (
              <li
                key={reminder.id}
                className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm"
              >
                <span>
                  {formatDateTime(reminder.remindAt)}
                  {reminder.note ? ` — ${reminder.note}` : ''}
                </span>
                {canManage ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Cancel reminder at ${formatDateTime(reminder.remindAt)}`}
                    disabled={write.busy}
                    onClick={() =>
                      void write.run(() =>
                        deleteOrderReminder(accessToken, workspaceId, order.id, reminder.id),
                      )
                    }
                  >
                    Cancel
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {canManage ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="reminder-at">Remind at</Label>
              <Input
                id="reminder-at"
                type="datetime-local"
                value={remindAt}
                onChange={(event) => setRemindAt(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="reminder-note">Note</Label>
              <Input
                id="reminder-note"
                value={note}
                maxLength={2000}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
            <Button
              type="button"
              disabled={write.busy || remindAt === ''}
              onClick={async () => {
                const result = await write.run(() =>
                  createOrderReminder(accessToken, workspaceId, order.id, {
                    remindAt: new Date(remindAt).toISOString(),
                    ...(note.trim() ? { note: note.trim() } : {}),
                  }),
                );
                if (result) {
                  setRemindAt('');
                  setNote('');
                }
              }}
            >
              Add reminder
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function patchSummary(changeRequest: OrderChangeRequest): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(changeRequest.patch.contact ?? {})) {
    parts.push(`contact.${key} → ${String(value)}`);
  }
  for (const [key, value] of Object.entries(changeRequest.patch.form ?? {})) {
    parts.push(`form.${key} → ${String(value)}`);
  }
  return parts.join(', ');
}

/**
 * A customer change request becomes a pending record; approval writes exactly
 * one audited amendment (applied to the customer's mutable details) and
 * rejection changes nothing. External users never edit verified data directly.
 */
export function OrderChangeRequests({
  workspaceId,
  accessToken,
  order,
  write,
}: CollaborationProps) {
  const [reason, setReason] = useState('');
  const [contact, setContact] = useState<AmendableContactPatch>({});
  const [form, setForm] = useState<AmendableFormPatch>({});
  const [note, setNote] = useState('');
  const canManage = order.capabilities.canManageOrders;

  const hasProposal =
    Object.values(contact).some((value) => value !== undefined && value !== '') ||
    Object.values(form).some((value) => value !== undefined && value !== '');

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Change requests</h2>
        </CardTitle>
        <CardDescription>
          Proposed customer or partner edits wait here; approval creates the audited amendment.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {order.changeRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No change requests.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {order.changeRequests.map((changeRequest) => (
              <li
                key={changeRequest.id}
                className="flex flex-col gap-2 rounded-md border p-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      changeRequest.status === 'pending'
                        ? 'default'
                        : changeRequest.status === 'approved'
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {changeRequest.status}
                  </Badge>
                  <span>{patchSummary(changeRequest)}</span>
                </div>
                {changeRequest.note ? (
                  <p className="text-xs text-muted-foreground">{changeRequest.note}</p>
                ) : null}
                {canManage && changeRequest.status === 'pending' ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`resolve-reason-${changeRequest.id}`}>
                        Resolution reason
                      </Label>
                      <Input
                        id={`resolve-reason-${changeRequest.id}`}
                        value={reason}
                        maxLength={2000}
                        onChange={(event) => setReason(event.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      disabled={write.busy}
                      onClick={() =>
                        void write.run(() =>
                          resolveOrderChangeRequest(
                            accessToken,
                            workspaceId,
                            order.id,
                            changeRequest.id,
                            'approve',
                            {
                              ...(reason.trim() ? { reason: reason.trim() } : {}),
                              expectedVersion: order.recordVersion,
                            },
                          ),
                        )
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={write.busy}
                      onClick={() =>
                        void write.run(() =>
                          resolveOrderChangeRequest(
                            accessToken,
                            workspaceId,
                            order.id,
                            changeRequest.id,
                            'reject',
                            {
                              ...(reason.trim() ? { reason: reason.trim() } : {}),
                              expectedVersion: order.recordVersion,
                            },
                          ),
                        )
                      }
                    >
                      Reject
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {order.amendments.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Applied amendments</h3>
            <ul className="flex flex-col gap-2">
              {order.amendments.map((amendment) => (
                <li key={amendment.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{amendment.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(amendment.createdAt)} · {amendment.actorId.slice(0, 8)}
                  </p>
                  <p className="mt-1 text-xs">
                    before {JSON.stringify(amendment.before)} → after{' '}
                    {JSON.stringify(amendment.after)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {canManage ? (
          <details className="rounded-md border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Record a change request
            </summary>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="cr-full-name">Full name</Label>
                  <Input
                    id="cr-full-name"
                    onChange={(event) =>
                      setContact((current) => ({
                        ...current,
                        ...(event.target.value ? { fullName: event.target.value } : {}),
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="cr-email">Email</Label>
                  <Input
                    id="cr-email"
                    type="email"
                    onChange={(event) =>
                      setContact((current) => ({
                        ...current,
                        ...(event.target.value ? { email: event.target.value } : {}),
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="cr-phone">Phone</Label>
                  <Input
                    id="cr-phone"
                    onChange={(event) =>
                      setContact((current) => ({
                        ...current,
                        ...(event.target.value ? { phone: event.target.value } : {}),
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="cr-destination">Destination</Label>
                  <Input
                    id="cr-destination"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        ...(event.target.value ? { destination: event.target.value } : {}),
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="cr-arrival">Arrival date</Label>
                  <Input
                    id="cr-arrival"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        ...(event.target.value ? { arrivalDate: event.target.value } : {}),
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="cr-note">Note</Label>
                <Input
                  id="cr-note"
                  value={note}
                  maxLength={2000}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
              <Button
                type="button"
                disabled={write.busy || !hasProposal}
                onClick={async () => {
                  const result = await write.run(() =>
                    createOrderChangeRequest(accessToken, workspaceId, order.id, {
                      patch: { contact, form },
                      ...(note.trim() ? { note: note.trim() } : {}),
                    }),
                  );
                  if (result) {
                    setContact({});
                    setForm({});
                    setNote('');
                  }
                }}
              >
                Submit change request
              </Button>
            </div>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}
