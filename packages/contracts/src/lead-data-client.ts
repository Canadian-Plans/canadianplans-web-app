import type { z } from 'zod';
import * as c from './lead-fields';

type Transport = <T>(config: {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  responseSchema: z.ZodType<T>;
}) => Promise<T>;
/** Uses the same authenticated, bounded transport and response validation as all other API families. */
export function createLeadDataClient(call: Transport) {
  const root = (workspace: string) => `/api/v1/staff/workspaces/${encodeURIComponent(workspace)}`;
  const model = (workspace: string) => `${root(workspace)}/data-model/leads`;
  const id = encodeURIComponent;
  return {
    fields: (workspace: string) =>
      call({
        method: 'GET',
        path: `${model(workspace)}/fields`,
        responseSchema: c.leadFieldsResponseSchema,
      }),
    createField: (workspace: string, body: c.CreateLeadField) =>
      call({
        method: 'POST',
        path: `${model(workspace)}/fields`,
        body: c.createLeadFieldSchema.parse(body),
        responseSchema: c.leadFieldResponseSchema,
      }),
    updateField: (workspace: string, field: string, body: c.UpdateLeadField) =>
      call({
        method: 'PATCH',
        path: `${model(workspace)}/fields/${id(field)}`,
        body: c.updateLeadFieldSchema.parse(body),
        responseSchema: c.leadFieldResponseSchema,
      }),
    deleteField: (workspace: string, field: string) =>
      call({
        method: 'DELETE',
        path: `${model(workspace)}/fields/${id(field)}`,
        responseSchema: c.leadOperationResponseSchema,
      }),
    settings: (workspace: string) =>
      call({
        method: 'GET',
        path: `${model(workspace)}/settings`,
        responseSchema: c.leadSettingsResponseSchema,
      }),
    saveSettings: (workspace: string, body: c.LeadObjectSettings) =>
      call({
        method: 'PATCH',
        path: `${model(workspace)}/settings`,
        body: c.leadObjectSettingsSchema.parse(body),
        responseSchema: c.leadSettingsResponseSchema,
      }),
    layout: (workspace: string, type: c.LeadType) =>
      call({
        method: 'GET',
        path: `${model(workspace)}/layouts/${type}`,
        responseSchema: c.leadLayoutResponseSchema,
      }),
    saveLayout: (workspace: string, type: c.LeadType, body: c.LeadLayout) =>
      call({
        method: 'PATCH',
        path: `${model(workspace)}/layouts/${type}`,
        body: c.leadLayoutSchema.parse(body),
        responseSchema: c.leadLayoutResponseSchema,
      }),
    model: (workspace: string) =>
      call({
        method: 'GET',
        path: `${root(workspace)}/leads/model`,
        responseSchema: c.leadModelResponseSchema,
      }),
    search: (workspace: string, body: c.LeadSearch) =>
      call({
        method: 'POST',
        path: `${root(workspace)}/leads/search`,
        body: c.leadSearchSchema.parse(body),
        responseSchema: c.leadSearchResponseSchema,
      }),
    detail: (workspace: string, lead: string) =>
      call({
        method: 'GET',
        path: `${root(workspace)}/leads/${id(lead)}`,
        responseSchema: c.leadDetailResponseSchema,
      }),
    edit: (workspace: string, lead: string, body: c.LeadFieldEdits) =>
      call({
        method: 'PATCH',
        path: `${root(workspace)}/leads/${id(lead)}`,
        body: c.leadFieldEditsSchema.parse(body),
        responseSchema: c.leadDetailResponseSchema,
      }),
    views: (workspace: string) =>
      call({
        method: 'GET',
        path: `${root(workspace)}/leads/views`,
        responseSchema: c.leadViewsResponseSchema,
      }),
    createView: (workspace: string, body: c.WriteLeadView) =>
      call({
        method: 'POST',
        path: `${root(workspace)}/leads/views`,
        body: c.writeLeadViewSchema.parse(body),
        responseSchema: c.leadViewResponseSchema,
      }),
    updateView: (workspace: string, view: string, body: c.WriteLeadView) =>
      call({
        method: 'PATCH',
        path: `${root(workspace)}/leads/views/${id(view)}`,
        body: c.writeLeadViewSchema.parse(body),
        responseSchema: c.leadViewResponseSchema,
      }),
    deleteView: (workspace: string, view: string) =>
      call({
        method: 'DELETE',
        path: `${root(workspace)}/leads/views/${id(view)}`,
        responseSchema: c.leadOperationResponseSchema,
      }),
    members: (workspace: string) =>
      call({
        method: 'GET',
        path: `${root(workspace)}/memberships/data-model`,
        responseSchema: c.dataModelMembersResponseSchema,
      }),
    grant: (workspace: string, member: string, allowed: boolean) =>
      call({
        method: 'PATCH',
        path: `${root(workspace)}/memberships/${id(member)}/data-model`,
        body: { allowed },
        responseSchema: c.leadOperationResponseSchema,
      }),
  };
}
