import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

const parseKey = (encryptionKeyHex: string): Buffer => {
  const key = Buffer.from(encryptionKeyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('Credential encryption key must be 32 bytes (64 hex characters)');
  }
  return key;
};

/**
 * Encrypts a tenant-owned payment-gateway secret (Razorpay key/secret, etc.)
 * before it's stored in Postgres. AES-256-GCM with a random IV per call —
 * the IV and auth tag travel alongside the ciphertext in the returned
 * base64 blob, so only the server-side encryption key is a secret.
 */
export const encryptCredentialPayload = (plaintext: string, encryptionKeyHex: string): string => {
  const key = parseKey(encryptionKeyHex);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
};

export const decryptCredentialPayload = (payload: string, encryptionKeyHex: string): string => {
  const key = parseKey(encryptionKeyHex);
  const raw = Buffer.from(payload, 'base64');
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};
