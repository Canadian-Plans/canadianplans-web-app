import 'server-only';
import { cookies } from 'next/headers';
import { z } from 'zod';

/**
 * The order draft lives in a server-set, httpOnly cookie so the scoped draft
 * grant and the submission's idempotency key never reach the browser as
 * readable state. The key is generated exactly once per draft (on the first
 * successful `POST /leads`) and reused by every later attempt, which is what
 * makes a timeout retry return the existing order rather than a second one
 * (REQ 18, PLATFORM_CONTEXT.md invariant 6).
 */

const DRAFT_COOKIE = 'cp_order_draft';
const DRAFT_TTL_SECONDS = 60 * 60 * 24 * 30;

export const orderDraftSchema = z.object({
  leadId: z.uuid(),
  draftGrant: z.string().min(1).max(4_096),
  idempotencyKey: z.string().min(8).max(200),
  productId: z.uuid(),
});
export type OrderDraft = z.infer<typeof orderDraftSchema>;

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
  store.delete(DRAFT_COOKIE);
}
