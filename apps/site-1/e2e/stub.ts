import { websitePlanSchema, type WebsitePlan } from '@canadian-plans/crm-contracts';
import { z } from 'zod';

import { STUB_URL } from './crm-stub/config';

/**
 * The specs' side of the CRM stub's test-only controls (`/__stub/...`): reset
 * it, change what it sells, read back what the storefront sent, make the next
 * call fail and read the tracking code that "was emailed".
 */

const receivedLeadSchema = z.object({
  id: z.string(),
  leadType: z.string(),
  status: z.enum(['incomplete', 'submitted']),
  stage: z.string(),
  reference: z.string(),
  externalRef: z.string().nullable(),
  contact: z.record(z.string(), z.string()),
  form: z
    .object({ schemaVersion: z.number(), payload: z.record(z.string(), z.unknown()) })
    .nullable(),
  order: z.object({ planId: z.string(), quantity: z.number() }).nullable(),
  attribution: z.record(z.string(), z.unknown()),
  consentVersions: z.array(z.string()),
  files: z.array(
    z.object({ documentType: z.string(), contentType: z.string(), sizeBytes: z.number() }),
  ),
  pendingChange: z
    .object({
      requestNo: z.number(),
      fields: z.record(z.string(), z.unknown()),
      documents: z.array(z.string()),
    })
    .nullable(),
});
export type ReceivedLead = z.infer<typeof receivedLeadSchema>;

const receivedRequestSchema = z.object({
  method: z.string(),
  path: z.string(),
  idempotencyKey: z.string().nullable(),
  botAction: z.string().nullable(),
  body: z.unknown(),
  /** 0 when the stub dropped the connection instead of answering. */
  status: z.number(),
});
export type ReceivedRequest = z.infer<typeof receivedRequestSchema>;

export type StubFailure =
  | { kind: 'transport' }
  | { kind: 'drop_response' }
  | { kind: 'error'; status: number; code: string };

async function control(method: string, path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`${STUB_URL}/__stub${path}`, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  });
  if (!response.ok) throw new Error(`stub control ${method} ${path} answered ${response.status}`);
  const answer: unknown = await response.json();
  return answer;
}

export const LEADS_PATH = '/api/v1/website/leads';
export const PLANS_PATH = '/api/v1/website/plans';

export const stub = {
  reset: () => control('POST', '/reset'),

  /** Every lead the stub holds, in the order they were created. */
  async leads(): Promise<ReceivedLead[]> {
    return z.object({ leads: z.array(receivedLeadSchema) }).parse(await control('GET', '/leads'))
      .leads;
  },

  /** Every `/api/v1` request the stub received since the last reset. */
  async requests(): Promise<ReceivedRequest[]> {
    return z
      .object({ requests: z.array(receivedRequestSchema) })
      .parse(await control('GET', '/requests')).requests;
  },

  /** The lead saves the storefront made: `POST` and `PATCH` under `/website/leads`. */
  async leadWrites(): Promise<ReceivedRequest[]> {
    return (await stub.requests()).filter(
      (request) => request.method !== 'GET' && request.path.startsWith(LEADS_PATH),
    );
  },

  async plans(): Promise<WebsitePlan[]> {
    return z.object({ plans: z.array(websitePlanSchema) }).parse(await control('GET', '/plans'))
      .plans;
  },

  setPlans: (plans: readonly WebsitePlan[]) => control('PUT', '/plans', plans),

  /** Makes the next `times` matching calls fail in the given way. */
  failNext: (failure: {
    method: 'GET' | 'POST' | 'PATCH';
    pathPrefix: string;
    mode: StubFailure;
    times?: number;
  }) => control('POST', '/failures', failure),

  /** The six-digit code "emailed" to an address, or undefined when none was sent. */
  async trackingCode(email: string): Promise<string | undefined> {
    const response = await fetch(
      `${STUB_URL}/__stub/tracking-code?email=${encodeURIComponent(email)}`,
    );
    if (response.status === 404) return undefined;
    return z.object({ code: z.string() }).parse(await response.json()).code;
  },

  expireTrackingGrants: () => control('POST', '/expire-tracking-grants'),
  expireDraftGrants: () => control('POST', '/expire-draft-grants'),

  /** Moves an order to a working stage, as staff would in the CRM. */
  setStage: (reference: string, stage: string) => control('POST', '/stage', { reference, stage }),
};
