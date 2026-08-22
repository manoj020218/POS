import { createHash } from 'node:crypto';

export const hashOpaqueToken = (token: string) =>
  createHash('sha256').update(token).digest('base64url');
