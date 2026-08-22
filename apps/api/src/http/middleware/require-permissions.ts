import type { NextFunction, Request, Response } from 'express';

import { createHttpError } from '../../lib/http-error.js';
import {
  hasAllPermissions,
  resolveGrantedPermissions,
  type AppPermission
} from '../../modules/auth/authorization.js';
import { getAccessContext } from '../../modules/tenant-core/access-context.js';

export const requirePermissions =
  (permissions: readonly AppPermission[]) =>
  (request: Request, _response: Response, next: NextFunction) => {
    try {
      const accessContext = getAccessContext(request);
      const grantedPermissions = resolveGrantedPermissions(accessContext);

      if (!hasAllPermissions(grantedPermissions, permissions)) {
        throw createHttpError(403, 'FORBIDDEN', 'Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
