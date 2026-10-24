import { describe, expect, it } from 'vitest';
import { buildOrganizationSchema, serializeOrganizationSchema } from './organization-schema';

describe('organization schema', () => {
  it('describes the business at the deployment origin without a trailing slash problem', () => {
    const schema = buildOrganizationSchema('https://example.test/');
    expect(schema['@type']).toBe('Organization');
    expect(schema['@id']).toBe('https://example.test/#organization');
    expect(schema.url).toBe('https://example.test/');
    expect(schema.logo).toMatch(/^https:\/\/example\.test\/design\//u);
    expect(schema.address.addressLocality).toBe('Surrey');
    expect(schema.address.addressCountry).toBe('CA');
    expect(schema.contactPoint[0]?.hoursAvailable.dayOfWeek).toHaveLength(6);
  });

  it('publishes only business contact details, never a personal name or token', () => {
    const serialized = serializeOrganizationSchema(buildOrganizationSchema('https://example.test'));
    const parsed: unknown = JSON.parse(serialized);
    expect(parsed).toMatchObject({ email: 'info@canadianplans.com' });
    expect(serialized).not.toContain('<');
    expect(serialized).not.toMatch(/takib/iu);
  });
});
