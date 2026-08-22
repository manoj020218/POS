import type { NextFunction, Request, Response } from 'express';

import type { AccessContextResolver } from '../../modules/tenant-core/tenant-core.routes.js';

export const attachAccessContext =
  (resolver: AccessContextResolver) =>
  async (request: Request, _response: Response, next: NextFunction) => {
    try {
      request.accessContext = (await resolver(request)) ?? undefined;
      next();
    } catch (error) {
      next(error);
    }
  };
