import type { RequestHandler, Response } from 'express';

import { asyncHandler } from '../../http/middleware/async-handler.js';
import { parseSchema } from '../../lib/parse-schema.js';
import { getAccessContext } from '../tenant-core/access-context.js';
import type { InventoryService } from './inventory.routes.js';
import { inventoryBalanceQuerySchema } from './inventory.schemas.js';

export const listInventoryBalancesController = (service: InventoryService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const balances = await service.listInventoryBalances(
      getAccessContext(request),
      parseSchema(inventoryBalanceQuerySchema, request.query)
    );
    response.status(200).json({ data: balances });
  });
