import { describe, expect, it } from 'vitest';

import { decryptCredentialPayload, encryptCredentialPayload } from '../src/lib/credential-encryption.js';

const key = 'abcdef0123456789'.repeat(4);
const otherKey = '9876543210fedcba'.repeat(4);

describe('credential encryption', () => {
  it('round-trips a plaintext payload through the same key', () => {
    const plaintext = JSON.stringify({ keyId: 'rzp_live_abc', keySecret: 'shh', webhookSecret: 'shh2' });

    const encrypted = encryptCredentialPayload(plaintext, key);
    expect(encrypted).not.toContain('rzp_live_abc');

    const decrypted = decryptCredentialPayload(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  it('produces a different ciphertext for the same plaintext each time (random IV)', () => {
    const plaintext = 'same-plaintext';
    const first = encryptCredentialPayload(plaintext, key);
    const second = encryptCredentialPayload(plaintext, key);

    expect(first).not.toBe(second);
    expect(decryptCredentialPayload(first, key)).toBe(plaintext);
    expect(decryptCredentialPayload(second, key)).toBe(plaintext);
  });

  it('fails to decrypt with the wrong key', () => {
    const encrypted = encryptCredentialPayload('secret-value', key);
    expect(() => decryptCredentialPayload(encrypted, otherKey)).toThrow();
  });

  it('rejects a key that is not exactly 32 bytes', () => {
    expect(() => encryptCredentialPayload('value', 'tooshort')).toThrow(/32 bytes/);
  });
});
