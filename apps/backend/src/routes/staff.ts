import { Router, type Request, type Response } from 'express';
import {
  bulkAssignOrdersRequestSchema,
  changeCommissionStateRequestSchema,
  createOrderChangeRequestRequestSchema,
  createOrderNoteRequestSchema,
  createOrderReminderRequestSchema,
  createServiceCredentialRequestSchema,
  deleteCustomerDataRequestSchema,
  inviteStaffRequestSchema,
  listWorkspaceLeadsQuerySchema,
  listWorkspaceOrdersQuerySchema,
  orderDetailSchema,
  patchOrderArchiveRequestSchema,
  patchOrderAssigneeRequestSchema,
  patchWorkspaceOrderRequestSchema,
  recordOrderPaymentRequestSchema,
  resolveOrderChangeRequestRequestSchema,
  reviewFileRequestSchema,
  sourceReportQuerySchema,
  type OrderCapabilities,
} from '@canadian-plans/contracts';
import { z } from 'zod';

import { createDocumentServiceFromEnv } from '../documents/factory.js';
import type { DocumentService } from '../documents/service.js';
import { toStaffFile } from '../documents/summary.js';

import {
  requireStaffSession,
  SupabaseStaffSessionVerifier,
  type StaffSessionVerifier,
  type VerifiedStaffSession,
} from '../auth/session.js';
import { sendStaffAuthError } from '../http/staff-errors.js';
import { sendDomainError } from '../http/domain-errors.js';
import { sendWebsiteError } from '../http/website-errors.js';
import { DatabaseCatalogueStore, type CatalogueStore } from '../catalogue/store.js';
import { DatabaseLeadStore, type LeadStore } from '../leads/store.js';
import { DatabaseOutboxStore, type JobAdminStore } from '../jobs/store.js';
import { DatabaseOrderQueryStore, type OrderQueryStore } from '../orders/query-store.js';
import {
  DatabaseStaffOrderActionStore,
  type OrderWriteOutcome,
  type StaffOrderActionStore,
} from '../orders/staff-actions.js';
import { loadOperationalTransitionsEnabled } from '../orders/transitions-config.js';
import { DatabaseDeletionStore, type DeletionStore } from '../deletion/store.js';
import { DatabaseReportStore, type ReportStore } from '../reports/store.js';
import { DatabaseCommissionActivationHook } from '../partners/activation.js';
import {
  DatabasePartnerStore,
  type PartnerStore,
  type CommissionStateOutcome,
} from '../partners/store.js';
import {
  allowedTransitionsFor,
  DatabaseOrderTransitionStore,
  type OrderTransitionStore,
  type TransitionOrderInput,
} from '../orders/transitions.js';
import { createAuthorize, denyReasonOf, type StaffAction } from '../staff/authorization.js';
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
  reportStore?: ReportStore;
  deletionStore?: DeletionStore;
  orderQueryStore?: OrderQueryStore;
  orderTransitionStore?: OrderTransitionStore;
  orderActionStore?: StaffOrderActionStore;
  partnerStore?: PartnerStore;
  jobStore?: JobAdminStore;
  documentService?: Pick<DocumentService, 'listForOrder' | 'review' | 'issueDownload'>;
  /** Kept beside the transition store so the rendered action set matches what the write path accepts. */
  operationalTransitionsEnabled?: boolean;
}

export function createDefaultStaffRouteDependencies(): StaffRouteDependencies {
  const operationalTransitionsEnabled = loadOperationalTransitionsEnabled();
  return {
    sessionVerifier: new SupabaseStaffSessionVerifier(),
    store: new DatabaseStaffStore(),
    credentialStore: new DatabaseWebsiteCredentialStore(),
    leadStore: new DatabaseLeadStore(),
    catalogueStore: new DatabaseCatalogueStore(),
    reportStore: new DatabaseReportStore(),
    deletionStore: new DatabaseDeletionStore(),
    orderQueryStore: new DatabaseOrderQueryStore(),
    orderTransitionStore: new DatabaseOrderTransitionStore(
      undefined,
      operationalTransitionsEnabled,
      undefined,
      new DatabaseCommissionActivationHook(),
    ),
    orderActionStore: new DatabaseStaffOrderActionStore(),
    partnerStore: new DatabasePartnerStore(),
    jobStore: new DatabaseOutboxStore(),
    documentService: createDocumentServiceFromEnv(),
    operationalTransitionsEnabled,
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

  const operationalTransitionsEnabled = () =>
    dependencies.operationalTransitionsEnabled ?? loadOperationalTransitionsEnabled();

  function authorizeWith(actor: VerifiedStaffSession) {
    return createAuthorize({
      accessStore: dependencies.store,
      assuranceLevel: actor.assuranceLevel,
    });
  }

  /** One live authorization decision for this actor and workspace. */
  async function decide(req: Request, workspaceId: string, action: StaffAction) {
    const actor = session(req);
    const authorize = authorizeWith(actor);
    const decision = await authorize({ actorId: actor.actorId, workspaceId, action });
    return { actor, decision };
  }

  /**
   * What this actor may do with orders, from the same live permission read the
   * mutations use. The admin renders controls from these flags rather than
   * re-deriving policy from role names (T14).
   */
  async function orderCapabilities(req: Request, workspaceId: string): Promise<OrderCapabilities> {
    const actor = session(req);
    const authorize = authorizeWith(actor);
    const [manage, finance] = await Promise.all([
      authorize({ actorId: actor.actorId, workspaceId, action: 'order.manage' }),
      authorize({ actorId: actor.actorId, workspaceId, action: 'financial.read' }),
    ]);
    const contactSearch = manage.allowed || finance.allowed;
    return {
      canManageOrders: manage.allowed,
      canRecordPayment: contactSearch,
      canSearchContact: contactSearch,
    };
  }

  /** Maps a guarded write outcome to the shared error envelope; false means success. */
  function sendOrderWriteOutcome(
    res: Response,
    requestId: string,
    status: OrderWriteOutcome['status'],
  ): boolean {
    switch (status) {
      case 'updated':
        return false;
      case 'not_found':
        sendDomainError(res, requestId, 'order_not_found', 404);
        return true;
      case 'version_conflict':
        sendDomainError(res, requestId, 'version_conflict', 409);
        return true;
      case 'assignee_not_found':
        sendDomainError(res, requestId, 'assignee_not_found', 404);
        return true;
      case 'reminder_not_found':
        sendDomainError(res, requestId, 'reminder_not_found', 404);
        return true;
      case 'change_request_not_found':
        sendDomainError(res, requestId, 'change_request_not_found', 404);
        return true;
      case 'change_request_resolved':
        sendDomainError(res, requestId, 'change_request_resolved', 409);
        return true;
    }
  }

  /**
   * Re-reads and returns the full order detail after a write, including the
   * transitions this actor may perform — the UI never computes them itself.
   */
  async function sendOrderDetail(
    res: Response,
    req: Request,
    workspaceId: string,
    orderId: string,
    status = 200,
  ): Promise<void> {
    if (!dependencies.orderQueryStore) {
      sendDomainError(res, req.id, 'feature_not_ready', 409);
      return;
    }
    const record = await dependencies.orderQueryStore.getOrder(
      workspaceId,
      session(req).actorId,
      orderId,
    );
    if (!record) {
      sendDomainError(res, req.id, 'order_not_found', 404);
      return;
    }
    const capabilities = await orderCapabilities(req, workspaceId);
    const order = orderDetailSchema.parse({
      ...record,
      allowedTransitions: allowedTransitionsFor(record.fulfilmentStatus, {
        partnered: record.partnerCode !== null,
        allowOperationalTransitions: operationalTransitionsEnabled(),
      }),
      capabilities,
    });
    res.status(status).json({ order, requestId: req.id });
  }

  interface OrderWriteContext {
    workspaceId: string;
    orderId: string;
    actorId: string;
    actionStore: StaffOrderActionStore;
  }

  /** Parses the route ids and resolves the action store, without authorizing. */
  function orderWriteContext(req: Request, res: Response): OrderWriteContext | undefined {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    const orderId = z.uuid().safeParse(req.params['orderId']);
    if (!workspaceId.success || !orderId.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return undefined;
    }
    if (!dependencies.orderActionStore || !dependencies.orderQueryStore) {
      sendDomainError(res, req.id, 'feature_not_ready', 409);
      return undefined;
    }
    return {
      workspaceId: workspaceId.data,
      orderId: orderId.data,
      actorId: session(req).actorId,
      actionStore: dependencies.orderActionStore,
    };
  }

  /** Authorizes one action, then resolves the write context. */
  async function prepareOrderWrite(
    req: Request,
    res: Response,
    action: StaffAction,
  ): Promise<OrderWriteContext | undefined> {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    if (!workspaceId.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return undefined;
    }
    const { decision } = await decide(req, workspaceId.data, action);
    if (!decision.allowed) {
      sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
      return undefined;
    }
    return orderWriteContext(req, res);
  }

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

  router.get('/workspaces/:workspaceId/reports/sources', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    const query = sourceReportQuerySchema.safeParse(req.query);
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
      if (!dependencies.reportStore) {
        sendStaffAuthError(res, req.id, 'internal_error', 500);
        return;
      }

      const from = query.data.from ? new Date(query.data.from) : undefined;
      const to = query.data.to ? new Date(query.data.to) : undefined;
      const result = await dependencies.reportStore.sourceReport({
        workspaceId: workspaceId.data,
        actorId: actor.actorId,
        from,
        to,
      });
      res.json({
        from: from ? from.toISOString() : null,
        to: to ? to.toISOString() : null,
        groups: result.groups,
        totals: result.totals,
        requestId: req.id,
      });
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

  // ---- Staff order processing (T14) --------------------------------------
  // Every write is a backend endpoint carrying the order's expected version;
  // the admin holds no transition, payment or amendment rules of its own.

  router.get('/workspaces/:workspaceId/orders', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    const query = listWorkspaceOrdersQuerySchema.safeParse(req.query);
    if (!workspaceId.success || !query.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }
    try {
      const { decision } = await decide(req, workspaceId.data, 'workspace.read');
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }
      if (!dependencies.orderQueryStore) {
        sendDomainError(res, req.id, 'feature_not_ready', 409);
        return;
      }
      const capabilities = await orderCapabilities(req, workspaceId.data);
      const result = await dependencies.orderQueryStore.listOrders({
        workspaceId: workspaceId.data,
        actorId: session(req).actorId,
        status: query.data.status,
        paymentState: query.data.paymentState,
        assigneeId: query.data.assigneeId,
        partnerId: query.data.partnerId,
        partnerCode: query.data.partnerCode,
        source: query.data.source,
        submittedFrom: query.data.submittedFrom,
        submittedTo: query.data.submittedTo,
        archiveState: query.data.archiveState,
        search: query.data.search,
        includeContactSearch: capabilities.canSearchContact,
        page: query.data.page,
        pageSize: query.data.pageSize,
      });
      res.json({
        orders: result.orders,
        page: result.page,
        capabilities,
        requestId: req.id,
      });
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  /** Active staff members of this workspace, for the assignment controls. */
  router.get('/workspaces/:workspaceId/members', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    if (!workspaceId.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }
    try {
      const { actor, decision } = await decide(req, workspaceId.data, 'workspace.read');
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }
      if (!dependencies.orderQueryStore) {
        sendDomainError(res, req.id, 'feature_not_ready', 409);
        return;
      }
      const members = await dependencies.orderQueryStore.listAssignableMembers(
        workspaceId.data,
        actor.actorId,
      );
      res.json({ members, requestId: req.id });
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.post('/workspaces/:workspaceId/orders/bulk-assign', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    const body = bulkAssignOrdersRequestSchema.safeParse(req.body);
    if (!workspaceId.success || !body.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }
    try {
      const { actor, decision } = await decide(req, workspaceId.data, 'order.manage');
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }
      if (!dependencies.orderActionStore) {
        sendDomainError(res, req.id, 'feature_not_ready', 409);
        return;
      }
      const outcome = await dependencies.orderActionStore.bulkAssign({
        workspaceId: workspaceId.data,
        actorId: actor.actorId,
        requestId: req.id,
        assigneeId: body.data.assigneeId,
        orders: body.data.orders,
      });
      if (outcome.status === 'assignee_not_found') {
        sendDomainError(res, req.id, 'assignee_not_found', 404);
        return;
      }
      res.json({ results: outcome.results, requestId: req.id });
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.get('/workspaces/:workspaceId/orders/:orderId', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    const orderId = z.uuid().safeParse(req.params['orderId']);
    if (!workspaceId.success || !orderId.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }
    try {
      const { decision } = await decide(req, workspaceId.data, 'workspace.read');
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }
      await sendOrderDetail(res, req, workspaceId.data, orderId.data);
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
      const { actor, decision } = await decide(req, workspaceId.data, 'order.manage');
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }
      if (!dependencies.orderTransitionStore || !dependencies.orderQueryStore) {
        sendDomainError(res, req.id, 'feature_not_ready', 409);
        return;
      }

      let transition: Pick<TransitionOrderInput, 'toStatus' | 'reason' | 'dispatch'>;
      if (body.data.action === 'transition') {
        transition = { toStatus: body.data.toStatus, reason: body.data.reason };
      } else if (body.data.action === 'dispatch') {
        transition = {
          toStatus: 'dispatched',
          dispatch: {
            courier: body.data.courier,
            ...(body.data.trackingReference
              ? { trackingReference: body.data.trackingReference }
              : {}),
            dispatchedAt: body.data.dispatchDate ? new Date(body.data.dispatchDate) : new Date(),
          },
        };
      } else if (body.data.action === 'activate') {
        transition = { toStatus: 'activated' };
      } else {
        transition = { toStatus: 'cancelled', reason: body.data.reason };
      }

      const outcome = await dependencies.orderTransitionStore.transition({
        workspaceId: workspaceId.data,
        actorId: actor.actorId,
        requestId: req.id,
        orderId: orderId.data,
        expectedVersion: body.data.expectedVersion,
        ...transition,
      });
      switch (outcome.status) {
        case 'transitioned':
          break;
        case 'not_found':
          sendDomainError(res, req.id, 'order_not_found', 404);
          return;
        case 'version_conflict':
          sendDomainError(res, req.id, 'version_conflict', 409);
          return;
        case 'illegal_transition':
          sendDomainError(res, req.id, 'illegal_transition', 409);
          return;
        case 'cancellation_reason_required':
          sendDomainError(res, req.id, 'cancellation_reason_required', 400);
          return;
        case 'dispatch_details_required':
          sendDomainError(res, req.id, 'dispatch_details_required', 400);
          return;
        case 'feature_not_ready':
          sendDomainError(res, req.id, 'feature_not_ready', 409);
          return;
      }
      await sendOrderDetail(res, req, workspaceId.data, orderId.data);
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.patch('/workspaces/:workspaceId/orders/:orderId/assignee', async (req, res) => {
    const body = patchOrderAssigneeRequestSchema.safeParse(req.body);
    if (!body.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }
    try {
      const context = await prepareOrderWrite(req, res, 'order.manage');
      if (!context) return;
      const outcome = await context.actionStore.assign({
        workspaceId: context.workspaceId,
        orderId: context.orderId,
        actorId: context.actorId,
        requestId: req.id,
        assigneeId: body.data.assigneeId,
        expectedVersion: body.data.expectedVersion,
      });
      if (sendOrderWriteOutcome(res, req.id, outcome.status)) return;
      await sendOrderDetail(res, req, context.workspaceId, context.orderId);
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.patch('/workspaces/:workspaceId/orders/:orderId/archive', async (req, res) => {
    const body = patchOrderArchiveRequestSchema.safeParse(req.body);
    if (!body.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }
    try {
      const context = await prepareOrderWrite(req, res, 'order.manage');
      if (!context) return;
      const outcome = await context.actionStore.archive({
        workspaceId: context.workspaceId,
        orderId: context.orderId,
        actorId: context.actorId,
        requestId: req.id,
        archived: body.data.archived,
        expectedVersion: body.data.expectedVersion,
      });
      if (sendOrderWriteOutcome(res, req.id, outcome.status)) return;
      await sendOrderDetail(res, req, context.workspaceId, context.orderId);
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.get('/workspaces/:workspaceId/orders/:orderId/notes', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    const orderId = z.uuid().safeParse(req.params['orderId']);
    if (!workspaceId.success || !orderId.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }
    try {
      const { actor, decision } = await decide(req, workspaceId.data, 'workspace.read');
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }
      if (!dependencies.orderActionStore) {
        sendDomainError(res, req.id, 'feature_not_ready', 409);
        return;
      }
      const outcome = await dependencies.orderActionStore.listNotes({
        workspaceId: workspaceId.data,
        actorId: actor.actorId,
        orderId: orderId.data,
      });
      if (outcome.status === 'not_found') {
        sendDomainError(res, req.id, 'order_not_found', 404);
        return;
      }
      res.json({ notes: outcome.notes, requestId: req.id });
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.post('/workspaces/:workspaceId/orders/:orderId/notes', async (req, res) => {
    const body = createOrderNoteRequestSchema.safeParse(req.body);
    if (!body.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }
    try {
      const context = await prepareOrderWrite(req, res, 'order.manage');
      if (!context) return;
      const created = await context.actionStore.addNote({
        workspaceId: context.workspaceId,
        orderId: context.orderId,
        actorId: context.actorId,
        requestId: req.id,
        body: body.data.body,
      });
      if (created.status === 'not_found') {
        sendDomainError(res, req.id, 'order_not_found', 404);
        return;
      }
      const notes = await context.actionStore.listNotes({
        workspaceId: context.workspaceId,
        orderId: context.orderId,
        actorId: context.actorId,
      });
      res.status(201).json({
        notes: notes.status === 'found' ? notes.notes : [created.note],
        requestId: req.id,
      });
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.post('/workspaces/:workspaceId/orders/:orderId/reminders', async (req, res) => {
    const body = createOrderReminderRequestSchema.safeParse(req.body);
    if (!body.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }
    try {
      const context = await prepareOrderWrite(req, res, 'order.manage');
      if (!context) return;
      const outcome = await context.actionStore.createReminder({
        workspaceId: context.workspaceId,
        orderId: context.orderId,
        actorId: context.actorId,
        requestId: req.id,
        remindAt: body.data.remindAt,
        ...(body.data.note ? { note: body.data.note } : {}),
      });
      if (outcome.status === 'not_found') {
        sendDomainError(res, req.id, 'order_not_found', 404);
        return;
      }
      res.status(201).json({ reminder: outcome.reminder, requestId: req.id });
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.delete(
    '/workspaces/:workspaceId/orders/:orderId/reminders/:reminderId',
    async (req, res) => {
      const reminderId = z.uuid().safeParse(req.params['reminderId']);
      if (!reminderId.success) {
        sendStaffAuthError(res, req.id, 'invalid_request', 400);
        return;
      }
      try {
        const context = await prepareOrderWrite(req, res, 'order.manage');
        if (!context) return;
        const outcome = await context.actionStore.deleteReminder({
          workspaceId: context.workspaceId,
          orderId: context.orderId,
          actorId: context.actorId,
          requestId: req.id,
          reminderId: reminderId.data,
        });
        if (outcome.status === 'not_found') {
          sendDomainError(res, req.id, 'order_not_found', 404);
          return;
        }
        if (outcome.status === 'reminder_not_found') {
          sendDomainError(res, req.id, 'reminder_not_found', 404);
          return;
        }
        res.json({ reminderId: reminderId.data, requestId: req.id });
      } catch {
        sendStaffAuthError(res, req.id, 'internal_error', 500);
      }
    },
  );

  router.post('/workspaces/:workspaceId/orders/:orderId/change-requests', async (req, res) => {
    const body = createOrderChangeRequestRequestSchema.safeParse(req.body);
    if (!body.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }
    try {
      const context = await prepareOrderWrite(req, res, 'order.manage');
      if (!context) return;
      const outcome = await context.actionStore.createChangeRequest({
        workspaceId: context.workspaceId,
        orderId: context.orderId,
        actorId: context.actorId,
        requestId: req.id,
        payload: {
          patch: body.data.patch,
          ...(body.data.note ? { note: body.data.note } : {}),
        },
      });
      if (outcome.status === 'not_found') {
        sendDomainError(res, req.id, 'order_not_found', 404);
        return;
      }
      res.status(201).json({ changeRequest: outcome.changeRequest, requestId: req.id });
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  async function resolveChangeRequest(
    req: Request,
    res: Response,
    decision: 'approve' | 'reject',
  ): Promise<void> {
    const changeRequestId = z.uuid().safeParse(req.params['changeRequestId']);
    const body = resolveOrderChangeRequestRequestSchema.safeParse(req.body);
    if (!changeRequestId.success || !body.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }
    const context = await prepareOrderWrite(req, res, 'order.manage');
    if (!context) return;
    const outcome = await context.actionStore.resolveChangeRequest({
      workspaceId: context.workspaceId,
      orderId: context.orderId,
      actorId: context.actorId,
      requestId: req.id,
      changeRequestId: changeRequestId.data,
      decision,
      ...(body.data.reason ? { reason: body.data.reason } : {}),
      expectedVersion: body.data.expectedVersion,
    });
    if (sendOrderWriteOutcome(res, req.id, outcome.status)) return;
    await sendOrderDetail(res, req, context.workspaceId, context.orderId);
  }

  router.post(
    '/workspaces/:workspaceId/orders/:orderId/change-requests/:changeRequestId/approve',
    async (req, res) => {
      try {
        await resolveChangeRequest(req, res, 'approve');
      } catch {
        sendStaffAuthError(res, req.id, 'internal_error', 500);
      }
    },
  );

  router.post(
    '/workspaces/:workspaceId/orders/:orderId/change-requests/:changeRequestId/reject',
    async (req, res) => {
      try {
        await resolveChangeRequest(req, res, 'reject');
      } catch {
        sendStaffAuthError(res, req.id, 'internal_error', 500);
      }
    },
  );

  router.post('/workspaces/:workspaceId/orders/:orderId/payments', async (req, res) => {
    const body = recordOrderPaymentRequestSchema.safeParse(req.body);
    if (!body.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }
    try {
      // Orders record manual payments with `order.manage`; Finance uses the
      // `financial.read` role action (which additionally requires aal2).
      const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
      if (!workspaceId.success) {
        sendStaffAuthError(res, req.id, 'invalid_request', 400);
        return;
      }
      const manage = await decide(req, workspaceId.data, 'order.manage');
      if (!manage.decision.allowed) {
        const finance = await decide(req, workspaceId.data, 'financial.read');
        if (!finance.decision.allowed) {
          sendStaffAuthError(res, req.id, denyReasonOf(finance.decision), 403);
          return;
        }
      }
      const context = orderWriteContext(req, res);
      if (!context) return;
      const outcome = await context.actionStore.recordPayment({
        workspaceId: context.workspaceId,
        orderId: context.orderId,
        actorId: context.actorId,
        requestId: req.id,
        paymentState: body.data.paymentState,
        ...(body.data.method ? { method: body.data.method } : {}),
        ...(body.data.reference ? { reference: body.data.reference } : {}),
        ...(body.data.amountMinor !== undefined ? { amountMinor: body.data.amountMinor } : {}),
        expectedVersion: body.data.expectedVersion,
      });
      if (sendOrderWriteOutcome(res, req.id, outcome.status)) return;
      await sendOrderDetail(res, req, context.workspaceId, context.orderId, 201);
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.post('/workspaces/:workspaceId/orders/:orderId/deletion', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    const orderId = z.uuid().safeParse(req.params['orderId']);
    const body = deleteCustomerDataRequestSchema.safeParse(req.body);
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
      // `record.delete` is the `deletion` permission, privileged for Owner/Finance
      // (verified aal2). Requiring it explicitly means a deny override wins.
      const decision = await authorize({
        actorId: actor.actorId,
        workspaceId: workspaceId.data,
        action: 'record.delete',
      });
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }
      if (!dependencies.deletionStore) {
        sendStaffAuthError(res, req.id, 'internal_error', 500);
        return;
      }

      const outcome = await dependencies.deletionStore.deleteCustomerData({
        workspaceId: workspaceId.data,
        actorId: actor.actorId,
        requestId: req.id,
        orderId: orderId.data,
        reason: body.data.reason,
      });
      if (outcome.status === 'not_found') {
        sendDomainError(res, req.id, 'order_not_found', 404);
        return;
      }
      res.status(202).json({
        orderId: orderId.data,
        deletionId: outcome.deletionId,
        ledgerStatus: 'pending_acknowledgement',
        requestId: req.id,
      });
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

  // ---- Partners and commissions (T19) ------------------------------------
  // The partner directory is visible to any workspace reader (the Partners
  // role); commission *amounts* are payout details gated behind `financial.read`
  // (a Viewer sees states but no money). Marking a commission `carrier_paid`
  // needs `financial.read`, which for owner/finance additionally requires a
  // verified aal2 session; `partner_paid` stays disabled (OPEN_INPUTS #18).

  const PAYOUT_DISABLED_REASON =
    'Partner payout marking is disabled until B1 invoice approval exists or OPEN_INPUTS #18 defines an interim approval mechanism.';

  router.get('/workspaces/:workspaceId/partners', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    if (!workspaceId.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }
    try {
      const { actor, decision } = await decide(req, workspaceId.data, 'workspace.read');
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }
      if (!dependencies.partnerStore) {
        sendDomainError(res, req.id, 'feature_not_ready', 409);
        return;
      }
      const partners = await dependencies.partnerStore.listPartners(
        workspaceId.data,
        actor.actorId,
      );
      res.json({ partners, requestId: req.id });
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.get('/workspaces/:workspaceId/partners/:partnerId', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    const partnerId = z.uuid().safeParse(req.params['partnerId']);
    if (!workspaceId.success || !partnerId.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }
    try {
      const { actor, decision } = await decide(req, workspaceId.data, 'workspace.read');
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }
      if (!dependencies.partnerStore) {
        sendDomainError(res, req.id, 'feature_not_ready', 409);
        return;
      }
      const detail = await dependencies.partnerStore.getPartnerDetail(
        workspaceId.data,
        actor.actorId,
        partnerId.data,
      );
      if (!detail) {
        sendDomainError(res, req.id, 'not_found', 404);
        return;
      }
      // Payout details (commission amounts) require `financial.read`; the same
      // read decides whether the carrier-paid action is offered.
      const finance = await decide(req, workspaceId.data, 'financial.read');
      const canViewPayouts = finance.decision.allowed;
      const commissions = detail.commissions.map((commission) => ({
        ...commission,
        amount: canViewPayouts ? commission.amount : null,
      }));
      res.json({
        partner: detail.partner,
        referredOrders: detail.referredOrders,
        commissions,
        canViewPayouts,
        canMarkCarrierPaid: canViewPayouts,
        partnerPaidEnabled: false,
        payoutDisabledReason: PAYOUT_DISABLED_REASON,
        requestId: req.id,
      });
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.post('/workspaces/:workspaceId/partners/:partnerId/commissions', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    const partnerId = z.uuid().safeParse(req.params['partnerId']);
    const body = changeCommissionStateRequestSchema.safeParse(req.body);
    if (!workspaceId.success || !partnerId.success || !body.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }
    try {
      // Finance action: `financial.read` (which requires aal2 for owner/finance).
      // The Partners role lacks it, so it can never mark a commission paid.
      const { actor, decision } = await decide(req, workspaceId.data, 'financial.read');
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }
      if (!dependencies.partnerStore) {
        sendDomainError(res, req.id, 'feature_not_ready', 409);
        return;
      }
      const outcome: CommissionStateOutcome = await dependencies.partnerStore.changeCommissionState({
        workspaceId: workspaceId.data,
        actorId: actor.actorId,
        requestId: req.id,
        partnerId: partnerId.data,
        commissionId: body.data.commissionId,
        toState: body.data.toState,
      });
      switch (outcome.status) {
        case 'updated':
          res.json({
            commission: outcome.commission,
            history: outcome.history,
            requestId: req.id,
          });
          return;
        case 'partner_not_found':
        case 'commission_not_found':
          sendDomainError(res, req.id, 'commission_not_found', 404);
          return;
        case 'invalid_transition':
          sendDomainError(res, req.id, 'commission_state_invalid', 409);
          return;
        case 'partner_paid_disabled':
          sendDomainError(res, req.id, 'feature_not_ready', 409);
          return;
      }
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  // ---- Documents (T17) ---------------------------------------------------
  // Listing a document reveals only metadata (workspace.read); downloading the
  // original requires the separately-grantable `document.download` permission
  // (REQ 23; gate 5). Approve/reject is an order-management action.

  router.get('/workspaces/:workspaceId/orders/:orderId/files', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    const orderId = z.uuid().safeParse(req.params['orderId']);
    if (!workspaceId.success || !orderId.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }
    try {
      const { actor, decision } = await decide(req, workspaceId.data, 'workspace.read');
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }
      if (!dependencies.documentService) {
        sendDomainError(res, req.id, 'feature_not_ready', 409);
        return;
      }
      const outcome = await dependencies.documentService.listForOrder({
        workspaceId: workspaceId.data,
        actorId: actor.actorId,
        orderId: orderId.data,
      });
      if (outcome.status === 'not_found') {
        sendDomainError(res, req.id, 'order_not_found', 404);
        return;
      }
      res.json({ files: outcome.files.map(toStaffFile), requestId: req.id });
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.post('/workspaces/:workspaceId/files/:fileId/review', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    const fileId = z.uuid().safeParse(req.params['fileId']);
    const body = reviewFileRequestSchema.safeParse(req.body);
    if (!workspaceId.success || !fileId.success || !body.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }
    try {
      const { actor, decision } = await decide(req, workspaceId.data, 'order.manage');
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }
      if (!dependencies.documentService) {
        sendDomainError(res, req.id, 'feature_not_ready', 409);
        return;
      }
      const outcome = await dependencies.documentService.review({
        workspaceId: workspaceId.data,
        actorId: actor.actorId,
        requestId: req.id,
        fileId: fileId.data,
        decision: body.data.decision,
        ...(body.data.note ? { note: body.data.note } : {}),
      });
      if (outcome.status === 'not_found') {
        sendDomainError(res, req.id, 'file_not_found', 404);
        return;
      }
      res.json({ file: toStaffFile(outcome.file), requestId: req.id });
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  router.post('/workspaces/:workspaceId/files/:fileId/download-link', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    const fileId = z.uuid().safeParse(req.params['fileId']);
    if (!workspaceId.success || !fileId.success) {
      sendStaffAuthError(res, req.id, 'invalid_request', 400);
      return;
    }
    try {
      // Download of an original is gated on the explicit document.download
      // permission — not merely workspace membership (REQ 23; gate 5).
      const { actor, decision } = await decide(req, workspaceId.data, 'document.download');
      if (!decision.allowed) {
        sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
        return;
      }
      if (!dependencies.documentService) {
        sendDomainError(res, req.id, 'feature_not_ready', 409);
        return;
      }
      const outcome = await dependencies.documentService.issueDownload({
        workspaceId: workspaceId.data,
        actorId: actor.actorId,
        fileId: fileId.data,
      });
      if (outcome.status === 'issued') {
        res.json({
          url: outcome.url,
          expiresAt: outcome.expiresAt.toISOString(),
          requestId: req.id,
        });
        return;
      }
      if (outcome.status === 'not_available') {
        sendDomainError(res, req.id, 'file_not_available', 409);
        return;
      }
      sendDomainError(res, req.id, 'file_not_found', 404);
    } catch {
      sendStaffAuthError(res, req.id, 'internal_error', 500);
    }
  });

  return router;
}
