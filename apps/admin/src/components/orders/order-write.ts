'use client';

import { useCallback, useState } from 'react';
import type { ApiErrorCode } from '@canadian-plans/contracts';

import { BackendError } from '../../lib/api';

/** The optimistic-concurrency message the task requires on a stale edit. */
export const STALE_ORDER_MESSAGE =
  'This order was changed by someone else. Reload to see the current version before you continue.';

const ERROR_MESSAGES: Partial<Record<ApiErrorCode | 'internal_error', string>> = {
  version_conflict: STALE_ORDER_MESSAGE,
  illegal_transition: 'The backend rejected that status transition.',
  cancellation_reason_required: 'A cancellation reason is required.',
  dispatch_details_required: 'A courier is required to dispatch this order.',
  feature_not_ready:
    'This action is not enabled yet: operational transitions and partnered activation stay gated until the required inputs are confirmed.',
  assignee_not_found: 'That person is not an active member of this workspace.',
  reminder_not_found: 'That reminder no longer exists.',
  change_request_not_found: 'That change request no longer exists.',
  change_request_resolved: 'That change request has already been resolved.',
  order_not_found: 'This order no longer exists in this workspace.',
  permission_denied: 'Your access does not include that action.',
  mfa_required: 'Verify multi-factor access before this action.',
  membership_revoked: 'Your workspace access was removed.',
  invalid_request: 'The request was rejected as invalid.',
  persistence_unavailable: 'The backend is temporarily unavailable. Try again.',
  internal_error: 'The backend returned an unexpected error.',
};

export function orderErrorMessage(error: unknown): string {
  if (error instanceof BackendError) {
    return ERROR_MESSAGES[error.code] ?? `Request failed (${error.code}).`;
  }
  return 'The request could not be completed.';
}

export interface OrderWrite {
  readonly busy: boolean;
  readonly message: string | undefined;
  readonly stale: boolean;
  /**
   * Runs a write, refreshes the order on success and turns a failure into a
   * message. A 409 version conflict is reported as a stale edit with an
   * explicit reload path rather than silently retried.
   */
  run<T>(operation: () => Promise<T>): Promise<T | undefined>;
  dismiss(): void;
}

/**
 * Shared optimistic-concurrency handling for every order write: the caller
 * always sends the `recordVersion` it rendered, and a conflict surfaces the
 * reload prompt instead of overwriting the other person's change.
 */
export function useOrderWrite(refresh: () => Promise<void>): OrderWrite {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [stale, setStale] = useState(false);

  const run = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T | undefined> => {
      setBusy(true);
      setMessage(undefined);
      try {
        const result = await operation();
        await refresh();
        setStale(false);
        return result;
      } catch (error) {
        setStale(error instanceof BackendError && error.code === 'version_conflict');
        setMessage(orderErrorMessage(error));
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const dismiss = useCallback(() => {
    setMessage(undefined);
    setStale(false);
  }, []);

  return { busy, message, stale, run, dismiss };
}
