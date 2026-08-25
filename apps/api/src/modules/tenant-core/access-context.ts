import type { Request } from 'express';

import type { AppPermission, AppRole } from '../auth/authorization.js';
import { createHttpError } from '../../lib/http-error.js';

export type AccessContext = {
  assignedBranchIds: string[];
  hasAllBranchAccess: boolean;
  permissions?: AppPermission[];
  role?: AppRole;
  sessionId?: string;
  tenantId: string;
  userId: string;
};

export const getAccessContext = (request: Request): AccessContext => {
  if (!request.accessContext) {
    throw createHttpError(401, 'ACCESS_CONTEXT_REQUIRED', 'Access context required');
  }

  return request.accessContext;
};
