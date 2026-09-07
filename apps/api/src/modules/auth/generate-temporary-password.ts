import { randomBytes } from 'node:crypto';

// Excludes visually ambiguous characters (0/O, 1/l/I) since this is typed by hand into a
// tablet on first login, not pasted.
const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export const generateTemporaryPassword = (length = 12): string => {
  const bytes = randomBytes(length);
  let password = '';

  for (let index = 0; index < length; index += 1) {
    password += alphabet[bytes[index]! % alphabet.length];
  }

  return password;
};
