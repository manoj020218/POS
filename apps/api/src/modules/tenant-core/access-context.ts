import type { Request } from 'express';

import { createHttpError } from '../../lib/http-error.js';

export type AccessContext = {
  tenantId: string;
  userId: string;
};

export const resolveDevelopmentAccessContext = (request: Request): AccessContext | null => {
  const tenantId = request.header('x-dev-tenant-id');
  const userId = request.header('x-dev-user-id');

  if (!tenantId || !userId) {
    return null;
  }

  return {
    tenantId,
    userId
  };
};

export const getAccessContext = (request: Request): AccessContext => {
  if (!request.accessContext) {
    throw createHttpError(401, 'ACCESS_CONTEXT_REQUIRED', 'Access context required');
  }

  return request.accessContext;
};
