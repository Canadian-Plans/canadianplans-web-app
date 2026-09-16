import type { ApiErrorCode } from '@canadian-plans/contracts';
import type { Response } from 'express';

/**
 * Only the codes actually used by a website route so far (plus the shared
 * `internal_error`). Extend alongside the route that first needs a new one —
 * this is not meant to pre-declare every code in `apiErrorCodeSchema`.
 */
const messages: Partial<Record<ApiErrorCode, string>> = {
  validation_error: 'The request body is invalid.',
  draft_not_found: 'No draft grant matches this lead.',
  draft_expired: 'The draft grant has expired or been revoked.',
  internal_error: 'An internal error occurred.',
};

export function sendDomainError(
  res: Response,
  requestId: string,
  code: ApiErrorCode,
  status: number,
): void {
  res.status(status).json({
    error: { code, message: messages[code] ?? 'Request failed.', requestId },
  });
}
