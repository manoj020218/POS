import type { Request } from 'express';

import { createHttpError } from '../../lib/http-error.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { AuthRepository } from './auth.repository.js';
import { accessTokenPayloadSchema } from './auth.schemas.js';
import { hasTenantWideBranchAccess, resolveGrantedPermissions } from './authorization.js';
import { verifyToken } from './token.js';

const bearerPattern = /^Bearer\s+(.+)$/i;

export const createAccessTokenAccessContextResolver =
  (jwtSecret: string, authRepository: AuthRepository) =>
  async (request: Request): Promise<AccessContext | null> => {
    const authorization = request.header('authorization')?.trim();

    if (!authorization) {
      return null;
    }

    const matched = bearerPattern.exec(authorization);
    if (!matched) {
      throw createHttpError(
        401,
        'INVALID_AUTHORIZATION_HEADER',
        'Invalid authorization header'
      );
    }

    const token = matched[1];
    if (!token) {
      throw createHttpError(
        401,
        'INVALID_AUTHORIZATION_HEADER',
        'Invalid authorization header'
      );
    }

    const now = new Date();
    const payload = verifyToken(token, jwtSecret, accessTokenPayloadSchema, now);
    const [user, session] = await Promise.all([
      authRepository.findUserById(payload.sub),
      authRepository.findSessionById(payload.sessionId)
    ]);

    if (!user || user.tenantId !== payload.tenantId) {
      throw createHttpError(401, 'INVALID_ACCESS_TOKEN', 'Invalid access token');
    }

    if (!user.isActive) {
      throw createHttpError(403, 'USER_DISABLED', 'User is disabled');
    }

    if (!session || session.userId !== payload.sub || session.tenantId !== payload.tenantId) {
      throw createHttpError(401, 'INVALID_ACCESS_TOKEN', 'Invalid access token');
    }

    if (session.revokedAt) {
      throw createHttpError(401, 'AUTH_SESSION_REVOKED', 'Session revoked');
    }

    if (session.expiresAt <= now) {
      throw createHttpError(401, 'AUTH_SESSION_EXPIRED', 'Session expired');
    }

    const assigned = await authRepository.listBranchAccessForUser(user.id, user.tenantId);

    return {
      assignedBranchIds: assigned.map((record) => record.branchId),
      hasAllBranchAccess: hasTenantWideBranchAccess(user.role),
      permissions: resolveGrantedPermissions(user),
      role: user.role,
      sessionId: session.id,
      tenantId: user.tenantId,
      userId: user.id
    };
  };
