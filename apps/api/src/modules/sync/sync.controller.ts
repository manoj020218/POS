import type { RequestHandler, Response } from 'express';

import { asyncHandler } from '../../http/middleware/async-handler.js';
import { parseSchema } from '../../lib/parse-schema.js';
import { getAccessContext } from '../tenant-core/access-context.js';
import { syncPullQuerySchema, syncPushSchema } from './sync.schemas.js';
import type { SyncService } from './sync.routes.js';

export const pullSyncEventsController = (service: SyncService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const result = await service.pullEvents(
      getAccessContext(request),
      parseSchema(syncPullQuerySchema, request.query)
    );

    response.status(200).json({ data: result });
  });

export const pushSyncEventsController = (service: SyncService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const result = await service.pushEvents(
      getAccessContext(request),
      parseSchema(syncPushSchema, request.body)
    );

    response.status(200).json({ data: result });
  });
