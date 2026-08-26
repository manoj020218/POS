import type { RequestHandler, Response } from 'express';

import { asyncHandler } from '../../http/middleware/async-handler.js';
import { parseSchema } from '../../lib/parse-schema.js';
import { getAccessContext } from '../tenant-core/access-context.js';
import { createSaleReturnSchema, createSaleSchema, saleIdSchema } from './sale.schemas.js';
import type { SaleService } from './sale.routes.js';

export const createSaleController = (service: SaleService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const sale = await service.createSale(
      getAccessContext(request),
      parseSchema(createSaleSchema, request.body)
    );

    response.status(201).json({ data: sale });
  });

export const createSaleReturnController = (service: SaleService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const { saleId } = parseSchema(saleIdSchema, request.params);
    const saleReturn = await service.createSaleReturn(
      getAccessContext(request),
      saleId,
      parseSchema(createSaleReturnSchema, request.body)
    );

    response.status(201).json({ data: saleReturn });
  });
