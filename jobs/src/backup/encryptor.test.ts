import { describe, expect, it } from 'vitest';

import {
  AgeCliDecryptor,
  AgeCliEncryptor,
  DecryptionFailedError,
  TestEnvelopeDecryptor,
  TestEnvelopeEncryptor,
  generateTestRecipientKeyPair,
} from './encryptor.js';
import type { RunCommand } from './command.js';

describe('TestEnvelopeEncryptor / TestEnvelopeDecryptor', () => {
  it('round-trips plaintext through the disposable envelope', async () => {
    const { publicKeyBase64, privateKeyBase64 } = generateTestRecipientKeyPair();
    const encryptor = new TestEnvelopeEncryptor(publicKeyBase64);
    const decryptor = new TestEnvelopeDecryptor(privateKeyBase64);
    const plaintext = new TextEncoder().encode('synthetic backup payload');

    const ciphertext = await encryptor.encrypt(plaintext);
    expect(ciphertext).not.toEqual(plaintext);
    const decrypted = await decryptor.decrypt(ciphertext);
    expect(new TextDecoder().decode(decrypted)).toBe('synthetic backup payload');
  });

  it('rejects a different recipient key (recovery-key mismatch)', async () => {
    const recipient = generateTestRecipientKeyPair();
    const other = generateTestRecipientKeyPair();
    const encryptor = new TestEnvelopeEncryptor(recipient.publicKeyBase64);
    const wrongDecryptor = new TestEnvelopeDecryptor(other.privateKeyBase64);
    const ciphertext = await encryptor.encrypt(new TextEncoder().encode('secret'));
    await expect(wrongDecryptor.decrypt(ciphertext)).rejects.toBeInstanceOf(DecryptionFailedError);
  });

  it('rejects tampered/corrupt ciphertext', async () => {
    const { publicKeyBase64, privateKeyBase64 } = generateTestRecipientKeyPair();
    const encryptor = new TestEnvelopeEncryptor(publicKeyBase64);
    const decryptor = new TestEnvelopeDecryptor(privateKeyBase64);
    const ciphertext = Buffer.from(await encryptor.encrypt(new TextEncoder().encode('secret')));
    ciphertext.writeUInt8(
      ciphertext.readUInt8(ciphertext.length - 1) ^ 0xff,
      ciphertext.length - 1,
    );
    await expect(decryptor.decrypt(ciphertext)).rejects.toBeInstanceOf(DecryptionFailedError);
  });

  it('rejects truncated/garbage bytes', async () => {
    const { privateKeyBase64 } = generateTestRecipientKeyPair();
    const decryptor = new TestEnvelopeDecryptor(privateKeyBase64);
    await expect(decryptor.decrypt(new Uint8Array([1, 2, 3]))).rejects.toBeInstanceOf(
      DecryptionFailedError,
    );
  });
});

describe('AgeCliEncryptor / AgeCliDecryptor (command wiring, no real age binary required)', () => {
  it('passes the recipient flag and pipes stdin to the process, returning stdout', async () => {
    const calls: { command: string; args: readonly string[] }[] = [];
    const fakeAgeLikeRun: RunCommand = async (command, args, options) => {
      calls.push({ command, args });
      // Stand-in for `age`: an identity passthrough proves argv/stdin wiring.
      return { stdout: options?.input ?? new Uint8Array(), stderr: '', exitCode: 0 };
    };
    const encryptor = new AgeCliEncryptor('age1recipientexample', fakeAgeLikeRun, 'age');
    const plaintext = new TextEncoder().encode('payload');
    const result = await encryptor.encrypt(plaintext);
    expect(result).toEqual(plaintext);
    expect(calls).toEqual([{ command: 'age', args: ['-r', 'age1recipientexample'] }]);
  });

  it('throws CommandFailedError-shaped rejection when age exits non-zero', async () => {
    const failingRun: RunCommand = async () => ({
      stdout: new Uint8Array(),
      stderr: 'no identity',
      exitCode: 1,
    });
    const encryptor = new AgeCliEncryptor('age1recipientexample', failingRun, 'age');
    await expect(encryptor.encrypt(new Uint8Array([1]))).rejects.toThrow(/age_failed/);
  });

  it('decryptor uses -d -i <identity file> and surfaces auth failures as DecryptionFailedError', async () => {
    const calls: { command: string; args: readonly string[] }[] = [];
    const failingRun: RunCommand = async (command, args) => {
      calls.push({ command, args });
      return { stdout: new Uint8Array(), stderr: 'age: error: no identity matched', exitCode: 1 };
    };
    const decryptor = new AgeCliDecryptor('/escrow/recovery-private-key.txt', failingRun, 'age');
    await expect(decryptor.decrypt(new Uint8Array([9, 9]))).rejects.toBeInstanceOf(
      DecryptionFailedError,
    );
    expect(calls).toEqual([
      { command: 'age', args: ['-d', '-i', '/escrow/recovery-private-key.txt'] },
    ]);
  });

  it('rejects an empty recipient at construction time', () => {
    expect(() => new AgeCliEncryptor('  ')).toThrow(/recipient is required/);
  });
});
