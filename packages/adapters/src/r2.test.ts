import { describe, expect, it } from 'vitest';

import {
  InMemoryR2DocumentStore,
  detectDocumentType,
  sha256Hex,
} from './r2.js';
import { presignUrl, type R2Config } from './r2-s3.js';

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const HTML = new Uint8Array([0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50, 0x45]);

describe('detectDocumentType', () => {
  it('recognises PDF/JPEG/PNG by signature, ignoring declared type', () => {
    expect(detectDocumentType(PDF)).toBe('application/pdf');
    expect(detectDocumentType(JPEG)).toBe('image/jpeg');
    expect(detectDocumentType(PNG)).toBe('image/png');
  });

  it('rejects anything else', () => {
    expect(detectDocumentType(HTML)).toBeUndefined();
    expect(detectDocumentType(new Uint8Array())).toBeUndefined();
  });
});

describe('InMemoryR2DocumentStore.verifyUpload', () => {
  const base = {
    workspaceId: 'w1',
    stagingKey: 'staging/abc',
    candidateKey: 'candidate/xyz',
    maxBytes: 1024,
  };

  it('verifies a well-formed staged object against its checksum', async () => {
    const store = new InMemoryR2DocumentStore();
    store.putStagingObject(base.stagingKey, PDF);
    const result = await store.verifyUpload({ ...base, expectedChecksumSha256: sha256Hex(PDF) });
    expect(result.status).toBe('verified');
    if (result.status !== 'verified') throw new Error('unreachable');
    expect(result.detectedMediaType).toBe('application/pdf');
    expect(result.sizeBytes).toBe(PDF.byteLength);
    expect(result.checksumSha256).toBe(sha256Hex(PDF));
    // The verified candidate object exists and equals the staged bytes.
    expect(store.getObject(result.candidateKey)).toEqual(PDF);
  });

  it('rejects a mislabelled type by signature (declared PDF, bytes are HTML)', async () => {
    const store = new InMemoryR2DocumentStore();
    store.putStagingObject(base.stagingKey, HTML);
    const result = await store.verifyUpload({ ...base, expectedChecksumSha256: sha256Hex(HTML) });
    expect(result).toEqual({ status: 'rejected', reason: 'unsupported_signature' });
  });

  it('rejects an oversize object', async () => {
    const store = new InMemoryR2DocumentStore();
    const big = new Uint8Array(2048);
    big.set(PNG);
    store.putStagingObject(base.stagingKey, big);
    const result = await store.verifyUpload({ ...base, expectedChecksumSha256: sha256Hex(big) });
    expect(result).toEqual({ status: 'rejected', reason: 'too_large' });
  });

  it('rejects a checksum mismatch', async () => {
    const store = new InMemoryR2DocumentStore();
    store.putStagingObject(base.stagingKey, PNG);
    const result = await store.verifyUpload({ ...base, expectedChecksumSha256: sha256Hex(PDF) });
    expect(result).toEqual({ status: 'rejected', reason: 'checksum_mismatch' });
  });

  it('rejects when staging is missing', async () => {
    const store = new InMemoryR2DocumentStore();
    const result = await store.verifyUpload({ ...base, expectedChecksumSha256: sha256Hex(PDF) });
    expect(result).toEqual({ status: 'rejected', reason: 'staging_missing' });
  });

  it('freezes the verified bytes: swapping staging after the copy cannot change the candidate', async () => {
    const store = new InMemoryR2DocumentStore();
    store.putStagingObject(base.stagingKey, PDF);
    const result = await store.verifyUpload({ ...base, expectedChecksumSha256: sha256Hex(PDF) });
    expect(result.status).toBe('verified');
    if (result.status !== 'verified') throw new Error('unreachable');

    // Attacker overwrites the staging object with malicious bytes after the check.
    store.overwriteStaging(base.stagingKey, HTML);

    // The candidate — the object that becomes available and is served — is unchanged.
    const served = store.getObject(result.candidateKey);
    expect(served).toEqual(PDF);
    expect(sha256Hex(served ?? new Uint8Array())).toBe(result.checksumSha256);
  });
});

describe('presignUrl (SigV4 query signing)', () => {
  const config: R2Config = {
    accountId: 'acct',
    accessKeyId: 'AKIDEXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
    bucket: 'docs',
    endpoint: 'https://acct.r2.cloudflarestorage.com',
    region: 'auto',
  };
  const now = new Date('2026-09-20T12:00:00.000Z');

  it('produces a deterministic, fully-signed URL with the expected structure', () => {
    const url = presignUrl(config, { method: 'GET', key: 'a/b.pdf', expiresInSeconds: 120, now });
    expect(url).toContain('https://acct.r2.cloudflarestorage.com/docs/a/b.pdf?');
    expect(url).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
    expect(url).toContain('X-Amz-Expires=120');
    expect(url).toContain('X-Amz-SignedHeaders=host');
    expect(url).toMatch(/X-Amz-Signature=[0-9a-f]{64}$/);
    // Same inputs → same signature (deterministic).
    expect(presignUrl(config, { method: 'GET', key: 'a/b.pdf', expiresInSeconds: 120, now })).toBe(
      url,
    );
    // A different key changes the signature.
    expect(
      presignUrl(config, { method: 'GET', key: 'a/c.pdf', expiresInSeconds: 120, now }),
    ).not.toBe(url);
  });
});
