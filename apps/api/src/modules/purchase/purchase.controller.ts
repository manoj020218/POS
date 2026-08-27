import type { RequestHandler, Response } from 'express';

import { asyncHandler } from '../../http/middleware/async-handler.js';
import { parseSchema } from '../../lib/parse-schema.js';
import { getAccessContext } from '../tenant-core/access-context.js';
import { createPurchaseSchema, purchaseQuerySchema } from './purchase.schemas.js';
import type { PurchaseService } from './purchase.routes.js';

export const createPurchaseController = (service: PurchaseService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const purchase = await service.createPurchase(
      getAccessContext(request),
      parseSchema(createPurchaseSchema, request.body)
    );

    response.status(201).json({ data: purchase });
  });

export const listPurchasesController = (service: PurchaseService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const purchases = await service.listPurchases(
      getAccessContext(request),
      parseSchema(purchaseQuerySchema, request.query)
    );

    response.status(200).json({ data: purchases });
  });
