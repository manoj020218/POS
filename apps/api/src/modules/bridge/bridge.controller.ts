import type { RequestHandler, Response } from 'express';

import { asyncHandler } from '../../http/middleware/async-handler.js';
import { parseSchema } from '../../lib/parse-schema.js';
import type { BridgeProvisionService } from './bridge-provision.service.js';
import { provisionRequestSchema } from './bridge.schemas.js';

export const provisionController = (service: BridgeProvisionService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const input = parseSchema(provisionRequestSchema, request.body);
    const result = await service.provision(input);
    response.status(201).json({ data: result });
  });
