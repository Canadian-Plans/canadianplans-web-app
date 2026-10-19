import type { CatalogueService } from '../catalogue/service.js';
import type { LeadStore } from '../leads/store.js';
import type { OrderService } from '../orders/service.js';
import type { OrderTransitionStore } from '../orders/transitions.js';

/**
 * Synthetic order check (REQ 40, IMPLEMENTATION_PLAN §10: "A synthetic order
 * check runs on a schedule against production with a test workspace and
 * alerts on failure"). Drives the exact same service classes the public
 * website routes use — `LeadStore`, `CatalogueService`, `OrderService`, the
 * order transition store — against a dedicated synthetic workspace/product,
 * then cancels the order it creates so nothing synthetic ever lingers as a
 * real order for staff to see. It never goes through the customer-facing
 * HTTP endpoints themselves (no bot check, no rate limiting to fight), but it
 * is a faithful check of the backend logic those endpoints call.
 */

export const SYNTHETIC_CONTACT_EMAIL = 'synthetic-check@canadianplans.internal';
const SYNTHETIC_TERMS_VERSION = 'synthetic-check-v1';
const SYNTHETIC_CONSENT_VERSION = 'synthetic-check-v1';
const CANCEL_REASON = 'Automated synthetic order check cleanup.';

export type SyntheticCheckStep = 'lead' | 'quote' | 'order' | 'cancel';

export type SyntheticCheckResult =
  | { status: 'ok'; orderId: string; reference: string; durationMs: number }
  | { status: 'failed'; step: SyntheticCheckStep; code: string; durationMs: number };

export interface SyntheticCheckDependencies {
  leads: Pick<LeadStore, 'createLead'>;
  quotes: Pick<CatalogueService, 'createQuote'>;
  orders: Pick<OrderService, 'submit'>;
  transitions: Pick<OrderTransitionStore, 'transition'>;
  workspaceId: string;
  productId: string;
  now?: () => Date;
}

export interface RunSyntheticCheckInput {
  actorId: string;
  requestId: string;
}

/**
 * Runs lead capture → quote → order submission → cancellation once. Every
 * step is attributed to the verified scheduler machine identity (invariant
 * 4b) — never a guessed or synthetic actor id — and stops at the first step
 * that does not report success, so a partial failure is reported at the
 * exact step it happened rather than surfacing only as a generic timeout.
 */
function safeCode(error: unknown): string {
  return error instanceof Error && /^[a-z][a-z0-9_]{0,63}$/.test(error.message)
    ? error.message
    : 'unexpected_error';
}

export async function runSyntheticOrderCheck(
  dependencies: SyntheticCheckDependencies,
  input: RunSyntheticCheckInput,
): Promise<SyntheticCheckResult> {
  const now = dependencies.now ?? (() => new Date());
  const startedAt = now().getTime();
  const durationMs = () => now().getTime() - startedAt;
  let step: SyntheticCheckStep = 'lead';

  try {
    return await runSteps(dependencies, input, now, (next) => {
      step = next;
    });
  } catch (error) {
    return { status: 'failed', step, code: safeCode(error), durationMs: durationMs() };
  }
}

async function runSteps(
  dependencies: SyntheticCheckDependencies,
  input: RunSyntheticCheckInput,
  now: () => Date,
  setStep: (step: SyntheticCheckStep) => void,
): Promise<SyntheticCheckResult> {
  const startedAt = now().getTime();
  const durationMs = () => now().getTime() - startedAt;

  const leadResult = await dependencies.leads.createLead({
    workspaceId: dependencies.workspaceId,
    actorId: input.actorId,
    requestId: input.requestId,
    contact: { email: SYNTHETIC_CONTACT_EMAIL },
    productId: dependencies.productId,
    consentVersion: SYNTHETIC_CONSENT_VERSION,
  });

  setStep('quote');
  const quoteOutcome = await dependencies.quotes.createQuote({
    workspaceId: dependencies.workspaceId,
    actorId: input.actorId,
    draftId: leadResult.lead.id,
    productId: dependencies.productId,
    grantToken: leadResult.grant.token,
    requestId: input.requestId,
  });
  if (quoteOutcome.status !== 'created') {
    return { status: 'failed', step: 'quote', code: quoteOutcome.status, durationMs: durationMs() };
  }

  setStep('order');
  const submitOutcome = await dependencies.orders.submit({
    workspaceId: dependencies.workspaceId,
    actorId: input.actorId,
    requestId: input.requestId,
    grantToken: leadResult.grant.token,
    idempotencyKey: `synthetic-check:${input.requestId}`,
    body: {
      quoteId: quoteOutcome.quote.id,
      termsVersion: SYNTHETIC_TERMS_VERSION,
      form: { schemaVersion: 1, payload: {} },
      consent: { termsVersion: SYNTHETIC_TERMS_VERSION, marketingOptIn: false },
    },
  });
  if (submitOutcome.status !== 'created' && submitOutcome.status !== 'existing') {
    return {
      status: 'failed',
      step: 'order',
      code: submitOutcome.status,
      durationMs: durationMs(),
    };
  }

  setStep('cancel');
  const cancelOutcome = await dependencies.transitions.transition({
    workspaceId: dependencies.workspaceId,
    actorId: input.actorId,
    requestId: input.requestId,
    orderId: submitOutcome.order.id,
    expectedVersion: submitOutcome.order.recordVersion,
    toStatus: 'cancelled',
    reason: CANCEL_REASON,
  });
  if (cancelOutcome.status !== 'transitioned') {
    return {
      status: 'failed',
      step: 'cancel',
      code: cancelOutcome.status,
      durationMs: durationMs(),
    };
  }

  return {
    status: 'ok',
    orderId: submitOutcome.order.id,
    reference: submitOutcome.order.reference,
    durationMs: durationMs(),
  };
}
