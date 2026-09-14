import { describe, expect, it } from 'vitest';

import { buildOpenApiDocument, endpoints } from './index';

/** Narrow an unknown JSON value to an object without a cast. */
function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('expected an object');
  }
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = entry;
  }
  return result;
}

describe('OpenAPI generation', () => {
  const doc = buildOpenApiDocument({ version: '9.9.9' });

  it('is an OpenAPI 3.1 document', () => {
    expect(doc['openapi']).toBe('3.1.0');
    expect(asObject(doc['info'])['version']).toBe('9.9.9');
  });

  it('declares the three security schemes', () => {
    const schemes = asObject(asObject(doc['components'])['securitySchemes']);
    expect(Object.keys(schemes).sort()).toEqual([
      'machineSignature',
      'staffSession',
      'websiteCredential',
    ]);
  });

  it('emits an operation for every registered endpoint', () => {
    const paths = asObject(doc['paths']);
    for (const endpoint of endpoints) {
      const item = asObject(paths[endpoint.path]);
      const operation = asObject(item[endpoint.method.toLowerCase()]);
      expect(operation['operationId']).toBe(endpoint.operationId);
      // Every operation documents the shared error envelope as its default response.
      const responses = asObject(operation['responses']);
      expect(responses['default']).toBeDefined();
      expect(responses[String(endpoint.successStatus)]).toBeDefined();
    }
  });

  it('secures website endpoints with the website credential and leaves health public', () => {
    const paths = asObject(doc['paths']);
    const health = asObject(asObject(paths['/api/v1/health'])['get']);
    expect(health['security']).toEqual([]);

    const createLead = asObject(asObject(paths['/api/v1/website/leads'])['post']);
    expect(createLead['security']).toEqual([{ websiteCredential: [] }]);

    const listWorkspaces = asObject(asObject(paths['/api/v1/staff/workspaces'])['get']);
    expect(listWorkspaces['security']).toEqual([{ staffSession: [] }]);
  });

  it('documents the idempotency-key and draft-grant headers on order submission', () => {
    const paths = asObject(doc['paths']);
    const submit = asObject(asObject(paths['/api/v1/website/orders'])['post']);
    const parameters = submit['parameters'];
    if (!Array.isArray(parameters)) {
      throw new Error('expected parameters array');
    }
    const headerNames = parameters
      .map((param) => asObject(param))
      .filter((param) => param['in'] === 'header')
      .map((param) => param['name']);
    expect(headerNames).toContain('Idempotency-Key');
    expect(headerNames).toContain('X-Draft-Grant');
  });
});
