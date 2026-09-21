import { describe, expect, it } from 'vitest';

import { InMemoryR2DocumentStore } from '@canadian-plans/adapters';

import { InMemoryDocumentRecordStore } from './memory-store.js';
import { DocumentService, type BackupLeaseGate, type DocumentContextResolver } from './service.js';

const resolver: DocumentContextResolver = {
  resolveChecklist: async () => ({ found: true, allowed: ['passport'] }),
  resolveOrderLeadId: async () => undefined,
};

/**
 * IMPLEMENTATION_PLAN §13: the expired-upload sweep must not hand back
 * physical-delete keys while the independent backup runner's lease is active,
 * so it cannot race the backup's referenced-object manifest/copy step.
 */
describe('DocumentService.runCleanup backup-lease gate', () => {
  it('withholds cleanedObjects while a backup lease is active, without losing the DB-side expiry', async () => {
    const store = new InMemoryDocumentRecordStore();
    const r2 = new InMemoryR2DocumentStore();
    let active = true;
    const backupLease: BackupLeaseGate = { isActive: async () => active };
    const service = new DocumentService(store, r2, resolver, { backupLease });

    const intent = await service.createIntent({
      workspaceId: 'w1',
      actorId: 'a1',
      requestId: 'r1',
      recordType: 'order',
      recordId: 'order-1',
      documentType: 'passport',
      declaredContentType: 'application/pdf',
      declaredSizeBytes: 10,
    });
    expect(intent.status).toBe('created');

    // Force the intent to be treated as expired regardless of TTL.
    const expiredService = new DocumentService(store, r2, resolver, {
      backupLease,
      now: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      cleanupGraceSeconds: 0,
    });

    const whileLeased = await expiredService.runCleanup({ workspaceId: 'w1', actorId: 'a1' });
    expect(whileLeased.expiredIntents).toBe(1);
    expect(whileLeased.cleanedObjects).toEqual([]);

    active = false;
    const store2 = new InMemoryDocumentRecordStore();
    const service2 = new DocumentService(store2, r2, resolver, { backupLease });
    const intent2 = await service2.createIntent({
      workspaceId: 'w1',
      actorId: 'a1',
      requestId: 'r2',
      recordType: 'order',
      recordId: 'order-2',
      documentType: 'passport',
      declaredContentType: 'application/pdf',
      declaredSizeBytes: 10,
    });
    expect(intent2.status).toBe('created');
    const expiredService2 = new DocumentService(store2, r2, resolver, {
      backupLease,
      now: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      cleanupGraceSeconds: 0,
    });
    const withoutLease = await expiredService2.runCleanup({ workspaceId: 'w1', actorId: 'a1' });
    expect(withoutLease.expiredIntents).toBe(1);
    expect(withoutLease.cleanedObjects.length).toBeGreaterThan(0);
  });

  it('defaults to no-op (never withholds) when no backup lease is configured', async () => {
    const store = new InMemoryDocumentRecordStore();
    const r2 = new InMemoryR2DocumentStore();
    const service = new DocumentService(store, r2, resolver);
    const intent = await service.createIntent({
      workspaceId: 'w1',
      actorId: 'a1',
      requestId: 'r1',
      recordType: 'order',
      recordId: 'order-1',
      documentType: 'passport',
      declaredContentType: 'application/pdf',
      declaredSizeBytes: 10,
    });
    expect(intent.status).toBe('created');
    const expiredService = new DocumentService(store, r2, resolver, {
      now: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      cleanupGraceSeconds: 0,
    });
    const result = await expiredService.runCleanup({ workspaceId: 'w1', actorId: 'a1' });
    expect(result.cleanedObjects.length).toBeGreaterThan(0);
  });
});
