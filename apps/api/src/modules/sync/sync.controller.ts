import type { RequestHandler, Response } from 'express';

import { asyncHandler } from '../../http/middleware/async-handler.js';
import { parseSchema } from '../../lib/parse-schema.js';
import { getAccessContext } from '../tenant-core/access-context.js';
import { syncPushSchema } from './sync.schemas.js';
import type { SyncService } from './sync.routes.js';

export const pushSyncEventsController = (service: SyncService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const result = await service.pushEvents(
      getAccessContext(request),
      parseSchema(syncPushSchema, request.body)
    );

    response.status(200).json({ data: result });
  });
