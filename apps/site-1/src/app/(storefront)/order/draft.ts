import 'server-only';
import { cookies } from 'next/headers';
import { provinceCodeSchema } from '@canadian-plans/contracts';
import { z } from 'zod';

/**
 * The order in progress lives in a server-set, httpOnly cookie so the scoped
 * draft grant and the submission's idempotency key never reach the browser as
 * readable state.
 *
 * A SIM order is a resumable draft in the CRM: the cookie holds its lead id and
 * draft grant. An internet or mobile order is sent to the CRM once, when the
 * customer submits it, so until then the cookie holds only the chosen plan.
 *
 * The idempotency key is issued each time the details are saved and reused by
 * every submit attempt after it, which is what makes a timeout retry return the
 * existing order rather than a second one. `consentedAt` is set by the first
 * submit attempt and kept, so a retry sends the same body under the same key.
 *
 * The cookie deliberately SURVIVES a successful submission: if the customer
 * never received the confirmation, their retry must still land on the existing
 * order. A customer who comes back to order another plan is handled in
 * `saveDetails`, which starts a fresh draft and key.
 */

const DRAFT_COOKIE = 'cp_order_draft';
const DRAFT_TTL_SECONDS = 60 * 60 * 24 * 30;

export const orderDraftSchema = z
  .object({
    /** The CRM lead of a SIM order's draft, with the grant that edits it. */
    leadId: z.uuid().optional(),
    draftGrant: z.string().min(1).max(4_096).optional(),
    idempotencyKey: z.string().min(8).max(200),
    /** The CRM plan the customer chose. */
    productId: z.uuid(),
    /** The province the plan is sold in: chosen for internet, from the postal code for mobile. */
    province: provinceCodeSchema.optional(),
    /** When the first submit attempt was made (ISO); see above. */
    consentedAt: z.iso.datetime().optional(),
  })
  .refine((draft) => (draft.leadId === undefined) === (draft.draftGrant === undefined));
export type OrderDraft = z.infer<typeof orderDraftSchema>;

/** A draft the CRM holds: its lead id and the grant that edits it. */
export type SavedLeadDraft = OrderDraft & { leadId: string; draftGrant: string };

export function hasSavedLead(draft: OrderDraft | undefined): draft is SavedLeadDraft {
  return draft?.leadId !== undefined && draft.draftGrant !== undefined;
}

/** Reads and validates the draft cookie; a corrupt or stale value is ignored. */
export async function readOrderDraft(): Promise<OrderDraft | undefined> {
  const store = await cookies();
  const raw = store.get(DRAFT_COOKIE)?.value;
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = orderDraftSchema.safeParse(parsed);
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

/** Persists the draft cookie. Only callable from a Server Action or Route Handler. */
export async function writeOrderDraft(draft: OrderDraft): Promise<void> {
  const store = await cookies();
  store.set(DRAFT_COOKIE, JSON.stringify(draft), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/order',
    maxAge: DRAFT_TTL_SECONDS,
  });
}

export async function clearOrderDraft(): Promise<void> {
  const store = await cookies();
  store.set(DRAFT_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/order',
    maxAge: 0,
  });
}
