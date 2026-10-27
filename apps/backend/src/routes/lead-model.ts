import { Router, type Request, type Response, type RequestHandler } from 'express';
import { z } from 'zod';
import {
  createLeadFieldSchema,
  dataModelGrantSchema,
  leadFieldEditsSchema,
  leadLayoutSchema,
  leadObjectSettingsSchema,
  leadSearchSchema,
  leadTypeSchema,
  LeadFieldValidationError,
  updateLeadFieldSchema,
  writeLeadViewSchema,
} from '@canadian-plans/contracts';
import {
  createAuthorize,
  denyReasonOf,
  type StaffAccessStore,
  type StaffAction,
} from '../staff/authorization.js';
import { sendStaffAuthError } from '../http/staff-errors.js';
import { sendDomainError } from '../http/domain-errors.js';
import { logRequestError } from '../http/logger.js';
import { DatabaseLeadFieldStore, LeadModelError, type LeadContext } from '../leads/model.js';
import { DatabaseStaffLeadStore } from '../leads/staff-store.js';
import { DatabaseDataModelPermissions } from '../leads/permissions.js';

export interface LeadModelRouteDependencies {
  fields: DatabaseLeadFieldStore;
  leads: DatabaseStaffLeadStore;
  permissions: DatabaseDataModelPermissions;
}
export function defaultLeadModelDependencies(): LeadModelRouteDependencies {
  return {
    fields: new DatabaseLeadFieldStore(),
    leads: new DatabaseStaffLeadStore(),
    permissions: new DatabaseDataModelPermissions(),
  };
}
type Capabilities = { canReadPersonal: boolean; canEdit: boolean; canManageDataModel: boolean };
export function createLeadModelRouter(
  accessStore: StaffAccessStore,
  deps: LeadModelRouteDependencies,
): Router {
  const router = Router();
  const prefix = '/workspaces/:workspaceId';
  const model = `${prefix}/data-model/leads`;
  function guarded(
    action: StaffAction,
    handler: (
      req: Request,
      res: Response,
      context: LeadContext,
      capabilities: Capabilities,
    ) => Promise<void>,
    personalRequired = false,
  ): RequestHandler {
    return async (req, res) => {
      let canReadPersonal = false;
      try {
        const actor = req.staffSession;
        if (!actor) {
          sendStaffAuthError(res, req.id, 'missing_session', 401);
          return;
        }
        const workspace = z.uuid().safeParse(req.params['workspaceId']);
        if (!workspace.success) {
          sendStaffAuthError(res, req.id, 'invalid_request', 400);
          return;
        }
        const context = { workspaceId: workspace.data, actorId: actor.actorId, requestId: req.id };
        // One fresh membership snapshot per request, shared by all decisions.
        const snapshot = await accessStore.loadStaffAccess(actor.actorId, workspace.data);
        const authorize = createAuthorize({
          accessStore: { loadStaffAccess: async () => snapshot },
          assuranceLevel: actor.assuranceLevel,
        });
        const decide = (candidate: StaffAction) => authorize({ ...context, action: candidate });
        const decision = await decide(action);
        if (!decision.allowed) {
          sendStaffAuthError(res, req.id, denyReasonOf(decision), 403);
          return;
        }
        const [manage, finance, modelAccess] = await Promise.all([
          decide('order.manage'),
          decide('financial.read'),
          decide('data_model.manage'),
        ]);
        canReadPersonal = manage.allowed || finance.allowed;
        if (personalRequired && !canReadPersonal) {
          sendStaffAuthError(res, req.id, 'permission_denied', 403);
          return;
        }
        await handler(req, res, context, {
          canReadPersonal,
          canEdit: manage.allowed,
          canManageDataModel: modelAccess.allowed,
        });
      } catch (error) {
        if (error instanceof LeadFieldValidationError || error instanceof z.ZodError) {
          sendDomainError(res, req.id, 'validation_error', 400);
          return;
        }
        if (error instanceof LeadModelError) {
          sendDomainError(
            res,
            req.id,
            error.code,
            error.code === 'not_found' ? 404 : error.code === 'validation_error' ? 400 : 409,
            canReadPersonal && error.count !== undefined ? { leadCount: error.count } : undefined,
          );
          return;
        }
        // Never hand a payload-bearing database/Zod exception to logs or telemetry.
        logRequestError({
          requestId: req.id,
          route: '/api/v1/staff/lead-model',
          code: 'internal_error',
          flag: 'not_retryable',
        });
        sendStaffAuthError(res, req.id, 'internal_error', 500);
      }
    };
  }
  const id = (req: Request) => z.uuid().parse(req.params['id']);
  router.get(
    `${model}/fields`,
    guarded('data_model.manage', async (_req, res, ctx) => {
      res.json({ fields: await deps.fields.list(ctx), requestId: ctx.requestId });
    }),
  );
  router.post(
    `${model}/fields`,
    guarded('data_model.manage', async (req, res, ctx) => {
      const field = await deps.fields.create(ctx, createLeadFieldSchema.parse(req.body));
      res.status(201).json({ field, requestId: ctx.requestId });
    }),
  );
  router.patch(
    `${model}/fields/:id`,
    guarded('data_model.manage', async (req, res, ctx) => {
      res.json({
        field: await deps.fields.update(ctx, id(req), updateLeadFieldSchema.parse(req.body)),
        requestId: ctx.requestId,
      });
    }),
  );
  router.delete(
    `${model}/fields/:id`,
    guarded('data_model.manage', async (req, res, ctx) => {
      await deps.fields.delete(ctx, id(req));
      res.json({ ok: true, requestId: ctx.requestId });
    }),
  );
  router.get(
    `${model}/settings`,
    guarded('data_model.manage', async (_req, res, ctx) => {
      res.json({ settings: (await deps.leads.model(ctx)).settings, requestId: ctx.requestId });
    }),
  );
  router.patch(
    `${model}/settings`,
    guarded('data_model.manage', async (req, res, ctx) => {
      res.json({
        settings: await deps.leads.saveSettings(ctx, leadObjectSettingsSchema.parse(req.body)),
        requestId: ctx.requestId,
      });
    }),
  );
  router.get(
    `${model}/layouts/:type`,
    guarded('data_model.manage', async (req, res, ctx) => {
      const type = leadTypeSchema.parse(req.params['type']);
      res.json({ layout: (await deps.leads.model(ctx)).layouts[type], requestId: ctx.requestId });
    }),
  );
  router.patch(
    `${model}/layouts/:type`,
    guarded('data_model.manage', async (req, res, ctx) => {
      res.json({
        layout: await deps.leads.saveLayout(
          ctx,
          leadTypeSchema.parse(req.params['type']),
          leadLayoutSchema.parse(req.body),
        ),
        requestId: ctx.requestId,
      });
    }),
  );
  router.get(
    `${prefix}/leads/model`,
    guarded('workspace.read', async (_req, res, ctx, capabilities) => {
      const model = await deps.leads.model(ctx);
      const fields = model.fields.filter(
        (f) => f.active && (capabilities.canReadPersonal || !f.sensitive),
      );
      res.json({ ...model, fields, capabilities, requestId: ctx.requestId });
    }),
  );
  router.post(
    `${prefix}/leads/search`,
    guarded('workspace.read', async (req, res, ctx, caps) => {
      const input = leadSearchSchema.parse(req.body);
      if (!caps.canReadPersonal && (input.columns.length || input.filters.length || input.sort)) {
        sendStaffAuthError(res, ctx.requestId, 'permission_denied', 403);
        return;
      }
      res.json({
        ...(await deps.leads.search(ctx, input, caps.canReadPersonal)),
        requestId: ctx.requestId,
      });
    }),
  );
  router.get(
    `${prefix}/leads/views`,
    guarded(
      'workspace.read',
      async (_req, res, ctx) => {
        res.json({ views: await deps.leads.listViews(ctx), requestId: ctx.requestId });
      },
      true,
    ),
  );
  router.post(
    `${prefix}/leads/views`,
    guarded(
      'workspace.read',
      async (req, res, ctx) => {
        res.status(201).json({
          view: await deps.leads.saveView(ctx, writeLeadViewSchema.parse(req.body)),
          requestId: ctx.requestId,
        });
      },
      true,
    ),
  );
  router.patch(
    `${prefix}/leads/views/:id`,
    guarded(
      'workspace.read',
      async (req, res, ctx) => {
        res.json({
          view: await deps.leads.saveView(ctx, writeLeadViewSchema.parse(req.body), id(req)),
          requestId: ctx.requestId,
        });
      },
      true,
    ),
  );
  router.delete(
    `${prefix}/leads/views/:id`,
    guarded(
      'workspace.read',
      async (req, res, ctx) => {
        await deps.leads.deleteView(ctx, id(req));
        res.json({ ok: true, requestId: ctx.requestId });
      },
      true,
    ),
  );
  router.get(
    `${prefix}/leads/:id`,
    guarded('workspace.read', async (req, res, ctx, caps) => {
      res.json({
        ...(await deps.leads.detail(ctx, id(req), caps.canReadPersonal)),
        requestId: ctx.requestId,
      });
    }),
  );
  router.patch(
    `${prefix}/leads/:id`,
    guarded('order.manage', async (req, res, ctx) => {
      await deps.leads.edit(ctx, id(req), leadFieldEditsSchema.parse(req.body));
      res.json({ ...(await deps.leads.detail(ctx, id(req), true)), requestId: ctx.requestId });
    }),
  );
  router.get(
    `${prefix}/memberships/data-model`,
    guarded('staff.roles.manage', async (_req, res, ctx) => {
      res.json({ members: await deps.permissions.list(ctx), requestId: ctx.requestId });
    }),
  );
  router.patch(
    `${prefix}/memberships/:id/data-model`,
    guarded('staff.roles.manage', async (req, res, ctx) => {
      await deps.permissions.grant(ctx, id(req), dataModelGrantSchema.parse(req.body).allowed);
      res.json({ ok: true, requestId: ctx.requestId });
    }),
  );
  return router;
}
