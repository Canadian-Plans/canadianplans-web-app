import type { SubmitOrderRequest } from '@canadian-plans/contracts';

import type { QuoteWithdrawalPolicy } from '../catalogue/policy.js';
import { idempotencyKeyHash, requestFingerprint } from './fingerprint.js';
import { generateOrderReference } from './reference.js';
import type { OrderSubmissionStore, SubmitOrderStoreResult } from './store.js';

const MAX_REFERENCE_ATTEMPTS = 3;

export interface SubmitOrderInput {
  workspaceId: string;
  actorId: string;
  requestId: string;
  grantToken: string;
  idempotencyKey: string;
  body: SubmitOrderRequest;
}

export type SubmitOrderOutcome = SubmitOrderStoreResult | { status: 'checkout_disabled' };

export class OrderService {
  constructor(
    private readonly store: OrderSubmissionStore,
    private readonly withdrawalPolicy: QuoteWithdrawalPolicy,
    private readonly now: () => Date = () => new Date(),
    private readonly createReference: () => string = generateOrderReference,
  ) {}

  async submit(input: SubmitOrderInput): Promise<SubmitOrderOutcome> {
    if (this.withdrawalPolicy === 'unresolved') return { status: 'checkout_disabled' };
    const keyHash = idempotencyKeyHash(input.idempotencyKey);
    const fingerprint = requestFingerprint(input.body);
    for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt += 1) {
      const result = await this.store.submit({
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        requestId: input.requestId,
        grantToken: input.grantToken,
        keyHash,
        requestFingerprint: fingerprint,
        reference: this.createReference(),
        body: input.body,
        now: this.now(),
      });
      if (result.status !== 'reference_collision') return result;
    }
    throw new Error('order_reference_generation_failed');
  }
}
