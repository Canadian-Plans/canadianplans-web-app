import { z } from 'zod';

import { isoDateTimeSchema, requestIdSchema } from './common';
import { orderFulfilmentStatusSchema, paymentStateSchema } from './domain';
import {
  orderArchiveFilterSchema,
  orderSortFieldSchema,
  sortDirectionSchema,
} from './workspace-orders';

/**
 * Saved list views — the `/workspaces/:id/views` family. A view belongs to the
 * staff member who made it and nobody else sees it (owner decision, 27 Oct
 * 2026). It stores only structured, non-personal filters: the free-text search
 * can hold a customer's name, email or phone, so it is never part of a view
 * (invariant 12).
 */

/** The lists a view can be saved for. Leads, partners and the board join later phases. */
export const savedViewObjectSchema = z.enum(['orders']);
export type SavedViewObject = z.infer<typeof savedViewObjectSchema>;

/** A calendar day (`YYYY-MM-DD`); the admin turns it into the list's time bounds. */
export const calendarDaySchema = z.iso.date();

export const orderViewFiltersSchema = z
  .object({
    status: orderFulfilmentStatusSchema.optional(),
    paymentState: paymentStateSchema.optional(),
    assigneeId: z.uuid().optional(),
    partnerCode: z.string().min(1).max(64).optional(),
    source: z.string().min(1).max(160).optional(),
    /** Inclusive first day. */
    submittedFrom: calendarDaySchema.optional(),
    /** Inclusive last day. */
    submittedTo: calendarDaySchema.optional(),
    archiveState: orderArchiveFilterSchema.optional(),
  })
  .strict();
export type OrderViewFilters = z.infer<typeof orderViewFiltersSchema>;

/** Optional columns of the orders table; the reference column is always shown. */
export const orderColumnKeySchema = z.enum([
  'customer',
  'status',
  'payment',
  'assignee',
  'source',
  'submittedAt',
  'total',
]);
export type OrderColumnKey = z.infer<typeof orderColumnKeySchema>;

export const orderViewSortSchema = z
  .object({ field: orderSortFieldSchema, direction: sortDirectionSchema })
  .strict();
export type OrderViewSort = z.infer<typeof orderViewSortSchema>;

export const orderViewStateSchema = z
  .object({
    filters: orderViewFiltersSchema,
    sort: orderViewSortSchema,
    hiddenColumns: z.array(orderColumnKeySchema).max(orderColumnKeySchema.options.length),
  })
  .strict();
export type OrderViewState = z.infer<typeof orderViewStateSchema>;

export const savedViewNameSchema = z.string().trim().min(1).max(60);

export const savedViewSchema = z.object({
  id: z.uuid(),
  object: savedViewObjectSchema,
  name: savedViewNameSchema,
  state: orderViewStateSchema,
  version: z.int().positive(),
  updatedAt: isoDateTimeSchema,
});
export type SavedView = z.infer<typeof savedViewSchema>;

export const listSavedViewsQuerySchema = z.object({ object: savedViewObjectSchema });
export type ListSavedViewsQuery = z.infer<typeof listSavedViewsQuerySchema>;

export const listSavedViewsResponseSchema = z.object({
  views: z.array(savedViewSchema),
  requestId: requestIdSchema,
});
export type ListSavedViewsResponse = z.infer<typeof listSavedViewsResponseSchema>;

export const createSavedViewRequestSchema = z
  .object({
    object: savedViewObjectSchema,
    name: savedViewNameSchema,
    state: orderViewStateSchema,
  })
  .strict();
export type CreateSavedViewRequest = z.infer<typeof createSavedViewRequestSchema>;

export const updateSavedViewRequestSchema = z
  .object({
    expectedVersion: z.int().positive(),
    name: savedViewNameSchema.optional(),
    state: orderViewStateSchema.optional(),
  })
  .strict()
  .refine((body) => body.name !== undefined || body.state !== undefined, {
    message: 'Change the name, the view, or both.',
  });
export type UpdateSavedViewRequest = z.infer<typeof updateSavedViewRequestSchema>;

export const savedViewResponseSchema = z.object({
  view: savedViewSchema,
  requestId: requestIdSchema,
});
export type SavedViewResponse = z.infer<typeof savedViewResponseSchema>;

export const deleteSavedViewResponseSchema = z.object({
  viewId: z.uuid(),
  requestId: requestIdSchema,
});
export type DeleteSavedViewResponse = z.infer<typeof deleteSavedViewResponseSchema>;

/** Most views one staff member may keep per list. */
export const SAVED_VIEW_LIMIT = 50;
