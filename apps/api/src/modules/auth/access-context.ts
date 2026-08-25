import type { Request } from 'express';

import { createHttpError } from '../../lib/http-error.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { AuthRepository } from './auth.repository.js';
import { accessTokenPayloadSchema } from './auth.schemas.js';
import { hasTenantWideBranchAccess } from './authorization.js';
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

    const payload = verifyToken(token, jwtSecret, accessTokenPayloadSchema);
    const assigned = await authRepository.listBranchAccessForUser(payload.sub, payload.tenantId);

    return {
      assignedBranchIds: assigned.map((record) => record.branchId),
      hasAllBranchAccess: hasTenantWideBranchAccess(payload.role),
      permissions: payload.permissions,
      role: payload.role,
      sessionId: payload.sessionId,
      tenantId: payload.tenantId,
      userId: payload.sub
    };
  };
