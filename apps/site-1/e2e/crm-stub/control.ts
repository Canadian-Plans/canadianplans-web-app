import { apiErrorCodeSchema, websitePlanSchema } from '@canadian-plans/crm-contracts';
import { z } from 'zod';

import type { Reply, StubRequest } from './http';
import { normalizeEmail, resetState, state } from './state';
import { referenceOf } from './tracking';

/**
 * Test-only controls, all under `/__stub/`. They are not part of the CRM's API:
 * a spec uses them to reset the stub, change what it sells, read back what the
 * storefront sent, make the next call fail and read the code that "was emailed".
 */

const failureSchema = z
  .object({
    method: z.enum(['GET', 'POST', 'PATCH']),
    pathPrefix: z.string().startsWith('/api/v1/'),
    /**
     * `transport`: the connection is dropped before the request is handled.
     * `drop_response`: the request is handled, then the connection is dropped.
     * `error`: the CRM's error envelope with this status and code.
     */
    mode: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('transport') }),
      z.object({ kind: z.literal('drop_response') }),
      z.object({
        kind: z.literal('error'),
        status: z.int().min(400).max(599),
        code: apiErrorCodeSchema,
      }),
    ]),
    times: z.int().min(1).max(10).default(1),
  })
  .strict();

const stageSchema = z.object({ reference: z.string().min(1), stage: z.string().min(1) }).strict();

const ok = (body: unknown = { ok: true }): Reply => ({ status: 200, body });
const bad = (): Reply => ({ status: 400, body: { ok: false } });

export function handleControl(request: StubRequest): Reply {
  const route = `${request.method} ${request.path.slice('/__stub'.length)}`;
  switch (route) {
    case 'POST /reset':
      resetState();
      return ok();
    case 'GET /plans':
      return ok({ plans: state.plans });
    case 'PUT /plans': {
      const plans = z.array(websitePlanSchema).safeParse(request.body);
      if (!plans.success) return bad();
      state.plans = plans.data;
      return ok();
    }
    case 'GET /leads':
      return ok({
        leads: [...state.leads.values()].map((lead) => ({
          id: lead.id,
          leadType: lead.leadType,
          status: lead.status,
          stage: lead.stage,
          reference: referenceOf(lead),
          externalRef: lead.externalRef,
          contact: lead.contact,
          form: lead.form,
          order: lead.order,
          attribution: lead.attribution,
          consentVersions: lead.consentVersions,
          files: lead.files.map((file) => ({
            documentType: file.documentType,
            contentType: file.contentType,
            sizeBytes: file.sizeBytes,
          })),
          pendingChange: lead.pendingChange,
        })),
      });
    case 'GET /requests':
      return ok({ requests: state.requests });
    case 'POST /failures': {
      const failure = failureSchema.safeParse(request.body);
      if (!failure.success) return bad();
      const { method, pathPrefix, mode, times } = failure.data;
      state.failures.push({ method, pathPrefix, mode, remaining: times });
      return ok();
    }
    case 'GET /tracking-code': {
      const sent = state.trackingCodes.get(normalizeEmail(request.query.get('email') ?? ''));
      return sent ? ok({ code: sent.code }) : { status: 404, body: { ok: false } };
    }
    case 'POST /expire-tracking-grants':
      for (const grant of state.trackingGrants.values()) grant.expiresAt = 0;
      return ok();
    case 'POST /expire-draft-grants':
      for (const lead of state.leads.values()) {
        if (lead.grant) lead.grant.expiresAt = new Date(0).toISOString();
      }
      return ok();
    case 'POST /stage': {
      const input = stageSchema.safeParse(request.body);
      const lead = input.success
        ? [...state.leads.values()].find(
            (candidate) => referenceOf(candidate) === input.data.reference,
          )
        : undefined;
      if (!input.success || !lead) return bad();
      lead.stage = input.data.stage;
      return ok();
    }
    default:
      return { status: 404, body: { ok: false } };
  }
}
