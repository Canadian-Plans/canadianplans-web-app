import { StaticCatalogue, site1CommercialOffers } from '@canadian-plans/adapters';

import { loadDeploymentEnvironment } from '../config/deployment.js';
import type { MachineRegistry } from '../machines/registry.js';
import {
  providerResolverFromRegistry,
  type CatalogueProvider,
  type CatalogueProviderResolver,
} from './service.js';

/** The one workspace that reads its plans from the repo catalogue (ADR 0005). */
export const STATIC_CATALOGUE_WORKSPACE_VARIABLE = 'SITE_1_STATIC_CATALOGUE_WORKSPACE_ID';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Chooses where a workspace's plans come from. A Sanity registry entry always
 * wins, so adding Sanity later needs no code change. Otherwise the workspace
 * named by `SITE_1_STATIC_CATALOGUE_WORKSPACE_ID`, and only that one, reads the
 * repo catalogue, so one site's plans can never be served to another tenant.
 *
 * Plans that still carry `TEST-` placeholders are published only in `development`
 * and `preview` deployments, or when `CATALOGUE_ALLOW_OPEN_INPUTS=1` is set
 * deliberately. An unknown deployment environment is treated as guarded.
 */
export function catalogueProviderResolver(
  registry: Pick<MachineRegistry, 'sanityForWorkspace'>,
  env: NodeJS.ProcessEnv = process.env,
): CatalogueProviderResolver {
  const fromSanity = providerResolverFromRegistry(registry);
  const workspaceId = env[STATIC_CATALOGUE_WORKSPACE_VARIABLE]?.trim();
  if (!workspaceId) return fromSanity;
  if (!UUID.test(workspaceId)) throw new Error('static_catalogue_workspace_invalid');

  const deployment = loadDeploymentEnvironment(env);
  const allowOpenInputs =
    deployment === 'development' ||
    deployment === 'preview' ||
    env['CATALOGUE_ALLOW_OPEN_INPUTS'] === '1';

  const fromRepo: CatalogueProvider = {
    account: 'static-catalogue',
    catalogue: new StaticCatalogue(site1CommercialOffers, { allowOpenInputs }),
    // Storefront pages read offers from the backend, so there is no cache to refresh.
    revalidator: { revalidate: async () => undefined },
  };

  const target = workspaceId.toLowerCase();
  return (id) => fromSanity(id) ?? (id.toLowerCase() === target ? fromRepo : undefined);
}
