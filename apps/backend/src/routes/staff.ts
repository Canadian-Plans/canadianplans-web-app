import { Router, type Request } from 'express';
import {
  createServiceCredentialRequestSchema,
  inviteStaffRequestSchema,
  listWorkspaceLeadsQuerySchema,
  patchWorkspaceOrderRequestSchema,
} from '@canadian-plans/contracts';
import { z } from 'zod';

import {
  requireStaffSession,
  SupabaseStaffSessionVerifier,
  type StaffSessionVerifier,
} from '../auth/session.js';
import { sendStaffAuthError } from '../http/staff-errors.js';
import { sendDomainError } from '../http/domain-errors.js';
import { sendWebsiteError } from '../http/website-errors.js';
import { DatabaseCatalogueStore, type CatalogueStore } from '../catalogue/store.js';
import { DatabaseLeadStore, type LeadStore } from '../leads/store.js';
import { DatabaseOutboxStore, type JobAdminStore } from '../jobs/store.js';
import { DatabaseOrderQueryStore, type OrderQueryStore } from '../orders/query-store.js';
import { loadOperationalTransitionsEnabled } from '../orders/transitions-config.js';
import {
  DatabaseOrderTransitionStore,
  type OrderTransitionStore,
  type TransitionOrderInput,
} from '../orders/transitions.js';
import { createAuthorize, denyReasonOf } from '../staff/authorization.js';
import { DatabaseStaffStore, type StaffStore } from '../staff/store.js';
import { generateServiceSecret } from '../website/credential.js';
import {
  DatabaseWebsiteCredentialStore,
  type ServiceCredentialRecord,
  type WebsiteCredentialStore,
} from '../website/store.js';

export interface StaffRouteDependencies {
  sessionVerifier: StaffSessionVerifier;
  store: StaffStore;
  credentialStore: WebsiteCredentialStore;
  leadStore: LeadStore;
  catalogueStore?: CatalogueStore;
  orderQueryStore?: OrderQueryStore;
  orderTransitionStore?: OrderTransitionStore;
  jobStore?: JobAdminStore;
}

export function createDefaultStaffRouteDependencies(): StaffRouteDependencies {
  return {
    sessionVerifier: new SupabaseStaffSessionVerifier(),
    store: new DatabaseStaffStore(),
    credentialStore: new DatabaseWebsiteCredentialStore(),
    leadStore: new DatabaseLeadStore(),
    catalogueStore: new DatabaseCatalogueStore(),
    orderQueryStore: new DatabaseOrderQueryStore(),
    orderTransitionStore: new DatabaseOrderTransitionStore(
      undefined,
      loadOperationalTransitionsEnabled(),
    ),
    jobStore: new DatabaseOutboxStore(),
  };
}

function credentialSummary(record: ServiceCredentialRecord) {
  return {
    id: record.id,
    scopes: record.scopes,
    createdAt: record.createdAt,
    revokedAt: record.revokedAt,
  };
}

function session(req: Request) {
  const value = req.staffSession;
  if (!value) throw new Error('staff session middleware did not run');
  return value;
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if ('code' in error && error.code === '23505') return true;
  if (!('cause' in error) || typeof error.cause !== 'object' || error.cause === null) return false;
  return 'code' in error.cause && error.cause.code === '23505';
}

export function createStaffRouter(dependencies: StaffRouteDependencies): Router {
  const router = Router();
  router.use(requireStaffSession(dependencies.sessionVerifier));

  router.get('/workspaces', async (req, res) => {
    try {
      const actor = session(req);
      const workspaces = await dependencies.store.bootstrapStaff({
        actorId: actor.actorId,
        verifiedEmail: actor.verifiedEmail,
        requestId: req.id,
      });
      res.json({ workspaces, requestId: req.id });
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.get('/workspaces/:workspaceId/access', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    if (!workspaceId.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }

    try {
      const actor = session(req);
      const authorize = createAuthorize({
        accessStore: dependencies.store,
        assuranceLevel: actor.assuranceLevel,
      });
      const decision = await authorize({
        actorId: actor.actorId,
        workspaceId: workspaceId.data,
        action: 'workspace.read',
      });
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }

      const workspaces = await dependencies.store.bootstrapStaff({
        actorId: actor.actorId,
        verifiedEmail: actor.verifiedEmail,
        requestId: req.id,
      });
      const workspace = workspaces.find((item) => item.id === workspaceId.data);
      if (!workspace) {
        sendStaffAuthError(res, req.id, 'workspace_not_found', 404);
        return;
      }
      res.json({
        workspace,
        permissions: decision.access.permissions
          .filter((permission) => permission.effect === 'allow')
          .map((permission) => permission.name),
        requestId: req.id,
      });
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.get('/workspaces/:workspaceId/leads', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    const query = listWorkspaceLeadsQuerySchema.safeParse(req.query);
    if (!workspaceId.success || !query.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }

    try {
      const actor = session(req);
      const authorize = createAuthorize({
        accessStore: dependencies.store,
        assuranceLevel: actor.assuranceLevel,
      });
      const decision = await authorize({
        actorId: actor.actorId,
        workspaceId: workspaceId.data,
        action: 'workspace.read',
      });
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }

      const result = await dependencies.leadStore.listLeads({
        workspaceId: workspaceId.data,
        actorId: actor.actorId,
        status: query.data.status,
        page: query.data.page,
        pageSize: query.data.pageSize,
      });
      res.json({ leads: result.leads, page: result.page, requestId: req.id });
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.get('/workspaces/:workspaceId/catalogue', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    if (!workspaceId.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }
    try {
      const actor = session(req);
      const authorize = createAuthorize({
        accessStore: dependencies.store,
        assuranceLevel: actor.assuranceLevel,
      });
      const decision = await authorize({
        actorId: actor.actorId,
        workspaceId: workspaceId.data,
        action: 'workspace.read',
      });
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }
      if (!dependencies.catalogueStore) {
        sendStaffAuthError(res, req.id, 'internal_error', 500);
        return;
      }
      res.json(
        await dependencies.catalogueStore.catalogueStatus(workspaceId.data, actor.actorId, req.id),
      );
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.get('/workspaces/:workspaceId/jobs', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    if (!workspaceId.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }
    try {
      const actor = session(req);
      const authorize = createAuthorize({
        accessStore: dependencies.store,
        assuranceLevel: actor.assuranceLevel,
      });
      const decision = await authorize({
        actorId: actor.actorId,
        workspaceId: workspaceId.data,
        action: 'workspace.read',
      });
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }
      if (!dependencies.jobStore) {
        sendStaffAuthError(res, req.id, 'internal_error', 500);
        return;
      }
      const jobs = await dependencies.jobStore.listActive(workspaceId.data, actor.actorId);
      const retryDecision = await authorize({
        actorId: actor.actorId,
        workspaceId: workspaceId.data,
        action: 'integration.manage',
      });
      res.json({
        jobs: jobs.map((job) => ({
          ...job,
          availableAt: job.availableAt.toISOString(),
          leaseExpiresAt: job.leaseExpiresAt?.toISOString() ?? null,
          createdAt: job.createdAt.toISOString(),
          updatedAt: job.updatedAt.toISOString(),
        })),
        canRetry: retryDecision.allowed,
        requestId: req.id,
      });
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.post('/workspaces/:workspaceId/jobs/:jobId/retry', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    const jobId = z.uuid().safeParse(req.params['jobId']);
    if (!workspaceId.success || !jobId.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }
    try {
      const actor = session(req);
      const authorize = createAuthorize({
        accessStore: dependencies.store,
        assuranceLevel: actor.assuranceLevel,
      });
      const decision = await authorize({
        actorId: actor.actorId,
        workspaceId: workspaceId.data,
        action: 'integration.manage',
      });
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }
      if (!dependencies.jobStore) {
        sendStaffAuthError(res, req.id, 'internal_error', 500);
        return;
      }
      const outcome = await dependencies.jobStore.retry({
        workspaceId: workspaceId.data,
        actorId: actor.actorId,
        jobId: jobId.data,
        requestId: req.id,
      });
      if (outcome === 'not_found') {
        sendDomainError(res, req.id, 'job_not_found', 404);
        return;
      }
      if (outcome === 'not_failed') {
        sendDomainError(res, req.id, 'job_not_retryable', 409);
        return;
      }
      res.json({ jobId: jobId.data, status: 'pending', requestId: req.id });
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.patch('/workspaces/:workspaceId/orders/:orderId', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    const orderId = z.uuid().safeParse(req.params['orderId']);
    const body = patchWorkspaceOrderRequestSchema.safeParse(req.body);
    if (!workspaceId.success || !orderId.success || !body.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }
    try {
      const actor = session(req);
      const authorize = createAuthorize({
        accessStore: dependencies.store,
        assuranceLevel: actor.assuranceLevel,
      });
      const decision = await authorize({
        actorId: actor.actorId,
        workspaceId: workspaceId.data,
        action: 'order.manage',
      });
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }
      if (!dependencies.orderTransitionStore || !dependencies.orderQueryStore) {
        sendDomainError(res, req.id, 'feature_not_ready', 409);
        return;
      }

      let transition: Pick<TransitionOrderInput, 'toStatus' | 'reason'> | undefined;
      if (body.data.action === 'transition') {
        transition = { toStatus: body.data.toStatus, reason: body.data.reason };
      } else if (body.data.action === 'dispatch') {
        transition = { toStatus: 'dispatched' };
      } else if (body.data.action === 'activate') {
        transition = { toStatus: 'activated' };
      } else if (body.data.action === 'cancel') {
        transition = { toStatus: 'cancelled', reason: body.data.reason };
      }
      if (!transition) {
        sendDomainError(res, req.id, 'feature_not_ready', 409);
        return;
      }

      const outcome = await dependencies.orderTransitionStore.transition({
        workspaceId: workspaceId.data,
        actorId: actor.actorId,
        requestId: req.id,
        orderId: orderId.data,
        expectedVersion: body.data.expectedVersion,
        ...transition,
      });
      if (outcome.status === 'not_found') {
        sendDomainError(res, req.id, 'order_not_found', 404);
        return;
      }
      if (outcome.status === 'version_conflict') {
        sendDomainError(res, req.id, 'version_conflict', 409);
        return;
      }
      if (outcome.status === 'illegal_transition') {
        sendDomainError(res, req.id, 'illegal_transition', 409);
        return;
      }
      if (outcome.status === 'cancellation_reason_required') {
        sendDomainError(res, req.id, 'cancellation_reason_required', 400);
        return;
      }
      if (outcome.status === 'feature_not_ready') {
        sendDomainError(res, req.id, 'feature_not_ready', 409);
        return;
      }
      const order = await dependencies.orderQueryStore.getOrder(
        workspaceId.data,
        actor.actorId,
        orderId.data,
      );
      if (!order) {
        sendDomainError(res, req.id, 'order_not_found', 404);
        return;
      }
      res.json({ order, requestId: req.id });
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.post('/workspaces/:workspaceId/invitations', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    const body = inviteStaffRequestSchema.safeParse(req.body);
    if (!workspaceId.success || !body.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }

    try {
      const actor = session(req);
      const authorize = createAuthorize({
        accessStore: dependencies.store,
        assuranceLevel: actor.assuranceLevel,
      });
      const decision = await authorize({
        actorId: actor.actorId,
        workspaceId: workspaceId.data,
        action: 'staff.invite',
      });
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }

      const membershipId = await dependencies.store.inviteStaff({
        actorId: actor.actorId,
        workspaceId: workspaceId.data,
        normalizedEmail: body.data.email.trim().toLowerCase(),
        roleNames: body.data.roles,
        requestId: req.id,
      });
      res.status(201).json({ membershipId, status: 'pending', requestId: req.id });
    } catch (error) {
      sendStaffAuthError(
        res,
        req.id,
        isUniqueViolation(error) ? 'membership_conflict' : 'internal_error',
        isUniqueViolation(error) ? 409 : 500,
      );
    }
  });

  router.delete('/workspaces/:workspaceId/memberships/:membershipId', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    const membershipId = z.uuid().safeParse(req.params['membershipId']);
    if (!workspaceId.success || !membershipId.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }

    try {
      const actor = session(req);
      const authorize = createAuthorize({
        accessStore: dependencies.store,
        assuranceLevel: actor.assuranceLevel,
      });
      const decision = await authorize({
        actorId: actor.actorId,
        workspaceId: workspaceId.data,
        action: 'staff.remove',
      });
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }

      const result = await dependencies.store.revokeStaff({
        actorId: actor.actorId,
        workspaceId: workspaceId.data,
        membershipId: membershipId.data,
        requestId: req.id,
      });
      if (result === 'not_found') {
        sendStaffAuthError(res, req.id, 'membership_not_found', 404);
        return;
      }
      if (result === 'self') {
        sendStaffAuthError(res, req.id, 'invalid_request', 400);
        return;
      }
      res.json({ membershipId: membershipId.data, status: 'revoked', requestId: req.id });
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.post('/workspaces/:workspaceId/service-credentials', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    const body = createServiceCredentialRequestSchema.safeParse(req.body);
    if (!workspaceId.success || !body.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }

    try {
      const actor = session(req);
      const authorize = createAuthorize({
        accessStore: dependencies.store,
        assuranceLevel: actor.assuranceLevel,
      });
      const decision = await authorize({
        actorId: actor.actorId,
        workspaceId: workspaceId.data,
        action: 'integration.manage',
      });
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }

      // The plaintext secret exists only in this response; only its hash persists.
      const { secret, secretHash } = generateServiceSecret();
      const record = await dependencies.credentialStore.createCredential({
        actorId: actor.actorId,
        workspaceId: workspaceId.data,
        scopes: body.data.scopes,
        secretHash,
        requestId: req.id,
      });
      res.status(201).json({ credential: credentialSummary(record), secret, requestId: req.id });
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.get('/workspaces/:workspaceId/service-credentials', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    if (!workspaceId.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }

    try {
      const actor = session(req);
      const authorize = createAuthorize({
        accessStore: dependencies.store,
        assuranceLevel: actor.assuranceLevel,
      });
      const decision = await authorize({
        actorId: actor.actorId,
        workspaceId: workspaceId.data,
        action: 'integration.manage',
      });
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }

      const records = await dependencies.credentialStore.listCredentials({
        actorId: actor.actorId,
        workspaceId: workspaceId.data,
      });
      res.json({ credentials: records.map(credentialSummary), requestId: req.id });
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.delete('/workspaces/:workspaceId/service-credentials/:credentialId', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    const credentialId = z.uuid().safeParse(req.params['credentialId']);
    if (!workspaceId.success || !credentialId.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }

    try {
      const actor = session(req);
      const authorize = createAuthorize({
        accessStore: dependencies.store,
        assuranceLevel: actor.assuranceLevel,
      });
      const decision = await authorize({
        actorId: actor.actorId,
        workspaceId: workspaceId.data,
        action: 'integration.manage',
      });
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }

      const result = await dependencies.credentialStore.revokeCredential({
        actorId: actor.actorId,
        workspaceId: workspaceId.data,
        credentialId: credentialId.data,
        requestId: req.id,
      });
      if (result.status === 'not_found') {
        sendWebsiteError(res, req.id, 'credential_not_found', 404);
        return;
      }
      // Idempotent: revoking an already-revoked credential returns its first revocation time.
      res.json({ id: credentialId.data, revokedAt: result.revokedAt, requestId: req.id });
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  return router;
}
