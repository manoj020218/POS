import { createHmac, timingSafeEqual } from 'node:crypto';

import type { ZodSchema } from 'zod';

import { createHttpError } from '../../lib/http-error.js';

type JwtHeader = {
  alg: 'HS256';
  typ: 'JWT';
};

type JwtPayload = {
  exp: number;
  iat: number;
};

const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };

const toBase64Url = (value: string) => Buffer.from(value, 'utf8').toString('base64url');
const fromBase64Url = (value: string) => Buffer.from(value, 'base64url').toString('utf8');

const sign = (value: string, secret: string) =>
  createHmac('sha256', secret).update(value).digest('base64url');

export const signToken = <T extends object>(
  payload: T,
  secret: string,
  expiresInSeconds: number,
  now = new Date()
) => {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const expiresAt = issuedAt + expiresInSeconds;
  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify({ ...payload, exp: expiresAt, iat: issuedAt }));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  return {
    expiresAt: new Date(expiresAt * 1000),
    token: `${unsignedToken}.${sign(unsignedToken, secret)}`
  };
};

export const verifyToken = <T extends JwtPayload>(
  token: string,
  secret: string,
  schema: ZodSchema<T>,
  now = new Date()
): T => {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw createHttpError(401, 'INVALID_TOKEN', 'Invalid token');
  }

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const expected = Buffer.from(sign(unsignedToken, secret), 'utf8');
  const actual = Buffer.from(encodedSignature, 'utf8');

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw createHttpError(401, 'INVALID_TOKEN', 'Invalid token');
  }

  const parsed = schema.safeParse(JSON.parse(fromBase64Url(encodedPayload)));

  if (!parsed.success) {
    throw createHttpError(401, 'INVALID_TOKEN', 'Invalid token');
  }

  if (parsed.data.exp <= Math.floor(now.getTime() / 1000)) {
    throw createHttpError(401, 'TOKEN_EXPIRED', 'Token expired');
  }

  return parsed.data;
};
