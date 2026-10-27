import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  SAVED_VIEW_LIMIT,
  apiErrorResponseSchema,
  deleteSavedViewResponseSchema,
  listSavedViewsResponseSchema,
  savedViewResponseSchema,
  type CreateSavedViewRequest,
  type OrderViewState,
  type SavedView,
  type SavedViewObject,
  type UpdateSavedViewRequest,
} from '@canadian-plans/contracts';

import { createApp } from '../src/app.js';
import type { StaffSessionVerifier, VerifiedStaffSession } from '../src/auth/session.js';
import type { StaffAccessSnapshot } from '../src/staff/authorization.js';
import type { LeadStore } from '../src/leads/store.js';
import type { BootstrapStaffInput, RevokeResult, StaffStore } from '../src/staff/store.js';
import type { WebsiteCredentialStore } from '../src/website/store.js';
import type {
  CreateSavedViewOutcome,
  DeleteSavedViewOutcome,
  SavedViewContext,
  SavedViewStore,
  UpdateSavedViewOutcome,
} from '../src/views/store.js';

const ACTOR = '20000000-0000-4000-8000-000000000301';
const COLLEAGUE = '20000000-0000-4000-8000-000000000302';
const WORKSPACE = '10000000-0000-4000-8000-000000000301';
const FOREIGN_WORKSPACE = '10000000-0000-4000-8000-0000000003ff';
const MEMBERSHIP = '30000000-0000-4000-8000-000000000301';
const NOW = '2026-10-27T12:00:00.000Z';

const DEFAULT_STATE: OrderViewState = {
  filters: { archiveState: 'active' },
  sort: { field: 'submittedAt', direction: 'desc' },
  hiddenColumns: [],
};

const noopCredentialStore: WebsiteCredentialStore = {
  createCredential: async () => {
    throw new Error('not used');
  },
  listCredentials: async () => [],
  revokeCredential: async () => ({ status: 'not_found' }),
};

const noopLeadStore: LeadStore = {
  readLead: async () => ({ status: 'grant_invalid' }),
  createLead: () => {
    throw new Error('not used');
  },
  updateLead: () => {
    throw new Error('not used');
  },
  listLeads: async () => ({ leads: [], page: { page: 1, pageSize: 25, total: 0 } }),
};

class MemoryStaffStore implements StaffStore {
  access: StaffAccessSnapshot = {
    membershipId: MEMBERSHIP,
    status: 'active',
    roles: ['viewer'],
    permissions: [],
  };

  async bootstrapStaff(_input: BootstrapStaffInput) {
    return [];
  }

  async loadStaffAccess(actorId: string, workspaceId: string) {
    const member = actorId === ACTOR || actorId === COLLEAGUE;
    return member && workspaceId === WORKSPACE ? this.access : undefined;
  }

  inviteStaff = async (): Promise<string> => MEMBERSHIP;
  revokeStaff = async (): Promise<RevokeResult> => 'revoked';
}

interface StoredView extends SavedView {
  workspaceId: string;
  actorId: string;
}

/** Keeps the store's ownership rule: a view exists only for the actor who made it. */
class MemorySavedViewStore implements SavedViewStore {
  readonly views: StoredView[] = [];
  readonly audits: string[] = [];

  private own(context: Omit<SavedViewContext, 'requestId'>, viewId: string) {
    return this.views.find(
      (view) =>
        view.id === viewId &&
        view.workspaceId === context.workspaceId &&
        view.actorId === context.actorId,
    );
  }

  private nameTaken(context: SavedViewContext, name: string, exceptId?: string) {
    return this.views.some(
      (view) =>
        view.workspaceId === context.workspaceId &&
        view.actorId === context.actorId &&
        view.id !== exceptId &&
        view.name.toLowerCase() === name.toLowerCase(),
    );
  }

  async list(context: Omit<SavedViewContext, 'requestId'>, object: SavedViewObject) {
    return this.views
      .filter(
        (view) =>
          view.workspaceId === context.workspaceId &&
          view.actorId === context.actorId &&
          view.object === object,
      )
      .map(({ workspaceId: _w, actorId: _a, ...view }) => view);
  }

  async create(
    context: SavedViewContext,
    input: CreateSavedViewRequest,
  ): Promise<CreateSavedViewOutcome> {
    if ((await this.list(context, input.object)).length >= SAVED_VIEW_LIMIT) {
      return { status: 'limit_reached' };
    }
    if (this.nameTaken(context, input.name)) return { status: 'name_taken' };
    const view: StoredView = {
      id: randomUUID(),
      workspaceId: context.workspaceId,
      actorId: context.actorId,
      object: input.object,
      name: input.name,
      state: input.state,
      version: 1,
      updatedAt: NOW,
    };
    this.views.push(view);
    this.audits.push('saved_view.created');
    const { workspaceId: _w, actorId: _a, ...saved } = view;
    return { status: 'created', view: saved };
  }

  async update(
    context: SavedViewContext,
    viewId: string,
    input: UpdateSavedViewRequest,
  ): Promise<UpdateSavedViewOutcome> {
    const view = this.own(context, viewId);
    if (!view) return { status: 'not_found' };
    if (view.version !== input.expectedVersion) return { status: 'version_conflict' };
    if (input.name !== undefined && this.nameTaken(context, input.name, viewId)) {
      return { status: 'name_taken' };
    }
    if (input.name !== undefined) view.name = input.name;
    if (input.state !== undefined) view.state = input.state;
    view.version += 1;
    this.audits.push('saved_view.updated');
    const { workspaceId: _w, actorId: _a, ...saved } = view;
    return { status: 'updated', view: saved };
  }

  async delete(context: SavedViewContext, viewId: string): Promise<DeleteSavedViewOutcome> {
    const view = this.own(context, viewId);
    if (!view) return { status: 'not_found' };
    this.views.splice(this.views.indexOf(view), 1);
    this.audits.push('saved_view.deleted');
    return { status: 'deleted' };
  }
}

class TokenVerifier implements StaffSessionVerifier {
  readonly sessions = new Map<string, VerifiedStaffSession>();
  async verify(accessToken: string) {
    return this.sessions.get(accessToken);
  }
}

let server: Server;
let baseUrl: string;
let staffStore: MemoryStaffStore;
let viewStore: MemorySavedViewStore;

beforeEach(async () => {
  const verifier = new TokenVerifier();
  verifier.sessions.set('me', {
    actorId: ACTOR,
    verifiedEmail: 'owner@example.test',
    assuranceLevel: 'aal1',
  });
  verifier.sessions.set('colleague', {
    actorId: COLLEAGUE,
    verifiedEmail: 'colleague@example.test',
    assuranceLevel: 'aal1',
  });
  staffStore = new MemoryStaffStore();
  viewStore = new MemorySavedViewStore();
  server = createApp({
    staff: {
      sessionVerifier: verifier,
      store: staffStore,
      credentialStore: noopCredentialStore,
      leadStore: noopLeadStore,
      savedViewStore: viewStore,
    },
  }).listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('expected TCP server');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function viewsUrl(path = '', workspace = WORKSPACE) {
  return `${baseUrl}/api/v1/staff/workspaces/${workspace}/views${path}`;
}

function send(method: string, url: string, body?: unknown, token = 'me') {
  return fetch(url, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function errorCode(response: Response) {
  return apiErrorResponseSchema.parse(await response.json()).error.code;
}

async function createView(name = 'Unpaid orders', token = 'me') {
  const response = await send(
    'POST',
    viewsUrl(),
    { object: 'orders', name, state: DEFAULT_STATE },
    token,
  );
  expect(response.status).toBe(201);
  return savedViewResponseSchema.parse(await response.json()).view;
}

describe('private saved views', () => {
  it('lets any staff member with read access save a view and lists it back', async () => {
    const view = await createView();
    expect(view).toMatchObject({ name: 'Unpaid orders', version: 1, state: DEFAULT_STATE });
    expect(viewStore.audits).toEqual(['saved_view.created']);

    const response = await send('GET', viewsUrl('?object=orders'));
    expect(response.status).toBe(200);
    const body = listSavedViewsResponseSchema.parse(await response.json());
    expect(body.views.map((item) => item.id)).toEqual([view.id]);
  });

  it("never shows, changes or deletes another staff member's view", async () => {
    const view = await createView();

    const list = await send('GET', viewsUrl('?object=orders'), undefined, 'colleague');
    expect(listSavedViewsResponseSchema.parse(await list.json()).views).toEqual([]);

    const patch = await send(
      'PATCH',
      viewsUrl(`/${view.id}`),
      { expectedVersion: 1, name: 'Mine now' },
      'colleague',
    );
    expect(patch.status).toBe(404);
    expect(await errorCode(patch)).toBe('saved_view_not_found');

    const removal = await send('DELETE', viewsUrl(`/${view.id}`), undefined, 'colleague');
    expect(removal.status).toBe(404);
    expect(viewStore.views).toHaveLength(1);
  });

  it('refuses a second view with the same name', async () => {
    await createView('Unpaid orders');
    const response = await send('POST', viewsUrl(), {
      object: 'orders',
      name: 'unpaid ORDERS',
      state: DEFAULT_STATE,
    });
    expect(response.status).toBe(409);
    expect(await errorCode(response)).toBe('saved_view_name_taken');
  });

  it('stops at the per-person view limit', async () => {
    for (let index = 0; index < SAVED_VIEW_LIMIT; index += 1) await createView(`View ${index}`);
    const response = await send('POST', viewsUrl(), {
      object: 'orders',
      name: 'One too many',
      state: DEFAULT_STATE,
    });
    expect(response.status).toBe(409);
    expect(await errorCode(response)).toBe('saved_view_limit');
  });

  it('refuses a search term inside a saved view', async () => {
    const response = await send('POST', viewsUrl(), {
      object: 'orders',
      name: 'Jane',
      state: { ...DEFAULT_STATE, filters: { search: 'jane@example.test' } },
    });
    expect(response.status).toBe(400);
    expect(viewStore.views).toEqual([]);
  });

  it('updates with the expected version and reports a stale one', async () => {
    const view = await createView();
    const updated = await send('PATCH', viewsUrl(`/${view.id}`), {
      expectedVersion: 1,
      state: { ...DEFAULT_STATE, filters: { paymentState: 'pending' } },
    });
    expect(updated.status).toBe(200);
    const body = savedViewResponseSchema.parse(await updated.json());
    expect(body.view.version).toBe(2);
    expect(body.view.state.filters).toEqual({ paymentState: 'pending' });

    const stale = await send('PATCH', viewsUrl(`/${view.id}`), {
      expectedVersion: 1,
      name: 'Old tab',
    });
    expect(stale.status).toBe(409);
    expect(await errorCode(stale)).toBe('version_conflict');
  });

  it('deletes its own view', async () => {
    const view = await createView();
    const response = await send('DELETE', viewsUrl(`/${view.id}`));
    expect(response.status).toBe(200);
    expect(deleteSavedViewResponseSchema.parse(await response.json()).viewId).toBe(view.id);
    expect(viewStore.views).toEqual([]);
    expect(viewStore.audits).toEqual(['saved_view.created', 'saved_view.deleted']);
  });

  it('denies a workspace the actor does not belong to', async () => {
    const response = await send('GET', viewsUrl('?object=orders', FOREIGN_WORKSPACE));
    expect(response.status).toBe(403);
  });

  it('requires a staff session', async () => {
    const response = await fetch(viewsUrl('?object=orders'));
    expect(response.status).toBe(401);
  });
});
