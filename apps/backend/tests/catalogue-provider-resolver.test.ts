import { describe, expect, it } from 'vitest';

import { catalogueProviderResolver } from '../src/catalogue/provider-resolver.js';

const SITE_1 = '10000000-0000-4000-8000-000000000101';
const OTHER = '20000000-0000-4000-8000-000000000202';

const noSanity = { sanityForWorkspace: () => undefined };

const sanityFor = (workspaceId: string) => ({
  sanityForWorkspace: (id: string) =>
    id === workspaceId
      ? {
          selector: 'sanity-site-1',
          workspaceId,
          providerAccount: 'account',
          projectId: 'project',
          dataset: 'production',
          apiVersion: '2025-01-01',
          readToken: 'token',
          revalidateUrl: 'https://example.invalid/api/revalidate',
          revalidateSecret: 'secret',
        }
      : undefined,
});

describe('catalogueProviderResolver', () => {
  it('has no provider for a workspace without a Sanity entry when no static catalogue is configured', () => {
    const resolve = catalogueProviderResolver(noSanity, {});
    expect(resolve(SITE_1)).toBeUndefined();
  });

  it('serves the repo catalogue to the configured workspace only', () => {
    const resolve = catalogueProviderResolver(noSanity, {
      SITE_1_STATIC_CATALOGUE_WORKSPACE_ID: SITE_1,
      DEPLOYMENT_ENV: 'development',
    });
    expect(resolve(SITE_1)?.account).toBe('static-catalogue');
    expect(resolve(OTHER)).toBeUndefined();
  });

  it('matches the workspace id regardless of letter case', () => {
    const resolve = catalogueProviderResolver(noSanity, {
      SITE_1_STATIC_CATALOGUE_WORKSPACE_ID: SITE_1.toUpperCase(),
      DEPLOYMENT_ENV: 'development',
    });
    expect(resolve(SITE_1)?.account).toBe('static-catalogue');
  });

  it('prefers a Sanity registry entry over the repo catalogue', () => {
    const resolve = catalogueProviderResolver(sanityFor(SITE_1), {
      SITE_1_STATIC_CATALOGUE_WORKSPACE_ID: SITE_1,
      DEPLOYMENT_ENV: 'development',
    });
    expect(resolve(SITE_1)?.account).toBe('account');
  });

  it('rejects a workspace id that is not a UUID at startup', () => {
    expect(() =>
      catalogueProviderResolver(noSanity, { SITE_1_STATIC_CATALOGUE_WORKSPACE_ID: 'site-1' }),
    ).toThrow('static_catalogue_workspace_invalid');
  });

  it('publishes plans in development and preview', async () => {
    for (const DEPLOYMENT_ENV of ['development', 'preview']) {
      const provider = catalogueProviderResolver(noSanity, {
        SITE_1_STATIC_CATALOGUE_WORKSPACE_ID: SITE_1,
        DEPLOYMENT_ENV,
      })(SITE_1);
      const offers = await provider?.catalogue.listPublished();
      expect(offers?.length).toBeGreaterThan(0);
    }
  });

  it('publishes the launch catalogue in production and when the environment is unknown, now that no owner decision is open', async () => {
    for (const env of [{ DEPLOYMENT_ENV: 'production' }, {}]) {
      const provider = catalogueProviderResolver(noSanity, {
        SITE_1_STATIC_CATALOGUE_WORKSPACE_ID: SITE_1,
        ...env,
      })(SITE_1);
      const offers = await provider?.catalogue.listPublished();
      expect(offers?.length).toBeGreaterThan(0);
    }
  });

  it('has a revalidator that does nothing', async () => {
    const provider = catalogueProviderResolver(noSanity, {
      SITE_1_STATIC_CATALOGUE_WORKSPACE_ID: SITE_1,
      DEPLOYMENT_ENV: 'development',
    })(SITE_1);
    await expect(provider?.revalidator.revalidate('internet-sk-1000')).resolves.toBeUndefined();
  });
});
