import type { RequestHandler, Response } from 'express';
import type { z } from 'zod';

import { asyncHandler } from '../../http/middleware/async-handler.js';
import { parseSchema } from '../../lib/parse-schema.js';
import { getAccessContext } from '../tenant-core/access-context.js';
import {
  inventoryReportQuerySchema,
  salesReportQuerySchema,
  topProductsQuerySchema
} from './reporting.schemas.js';
import type { ReportingService } from './reporting.routes.js';

const createReportingController = <TQuery, TData>(
  service: (accessContext: ReturnType<typeof getAccessContext>, query: TQuery) => Promise<TData>,
  schema: z.ZodType<TQuery>,
): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const data = await service(getAccessContext(request), parseSchema(schema, request.query));
    response.status(200).json({ data });
  });

export const getSalesSummaryController = (service: ReportingService): RequestHandler =>
  createReportingController(service.getSalesSummary, salesReportQuerySchema);

export const listTaxSummaryController = (service: ReportingService): RequestHandler =>
  createReportingController(service.listTaxSummary, salesReportQuerySchema);

export const listSalesByBranchController = (service: ReportingService): RequestHandler =>
  createReportingController(service.listSalesByBranch, salesReportQuerySchema);

export const listSalesByTerminalController = (service: ReportingService): RequestHandler =>
  createReportingController(service.listSalesByTerminal, salesReportQuerySchema);

export const listSalesByCashierController = (service: ReportingService): RequestHandler =>
  createReportingController(service.listSalesByCashier, salesReportQuerySchema);

export const listSalesByPaymentMethodController = (service: ReportingService): RequestHandler =>
  createReportingController(service.listSalesByPaymentMethod, salesReportQuerySchema);

export const listTopProductsController = (service: ReportingService): RequestHandler =>
  createReportingController(service.listTopProducts, topProductsQuerySchema);

export const listCurrentStockController = (service: ReportingService): RequestHandler =>
  createReportingController(service.listCurrentStock, inventoryReportQuerySchema);

export const listLowStockController = (service: ReportingService): RequestHandler =>
  createReportingController(service.listLowStock, inventoryReportQuerySchema);

export const listStockMovementsController = (service: ReportingService): RequestHandler =>
  createReportingController(service.listStockMovements, salesReportQuerySchema);

export const listSalesReturnsController = (service: ReportingService): RequestHandler =>
  createReportingController(service.listSalesReturns, salesReportQuerySchema);
