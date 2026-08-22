import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const keyLength = 64;
const saltLength = 16;
const scheme = 'scrypt';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(saltLength);
  const derivedKey = scryptSync(password, salt, keyLength);

  return [scheme, salt.toString('base64url'), derivedKey.toString('base64url')].join('$');
};

export const verifyPassword = async (password: string, storedHash: string): Promise<boolean> => {
  const [hashScheme, encodedSalt, encodedHash] = storedHash.split('$');

  if (hashScheme !== scheme || !encodedSalt || !encodedHash) {
    return false;
  }

  const salt = Buffer.from(encodedSalt, 'base64url');
  const expected = Buffer.from(encodedHash, 'base64url');
  const derivedKey = scryptSync(password, salt, expected.length);

  return timingSafeEqual(derivedKey, expected);
};
