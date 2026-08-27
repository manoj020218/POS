import type { RequestHandler, Response } from 'express';

import { asyncHandler } from '../../http/middleware/async-handler.js';
import { parseSchema } from '../../lib/parse-schema.js';
import { getAccessContext } from '../tenant-core/access-context.js';
import {
  createSupplierSchema,
  supplierIdSchema,
  supplierQuerySchema,
  updateSupplierSchema
} from './supplier.schemas.js';
import type { SupplierService } from './supplier.routes.js';

export const createSupplierController = (service: SupplierService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const supplier = await service.createSupplier(
      getAccessContext(request),
      parseSchema(createSupplierSchema, request.body)
    );

    response.status(201).json({ data: supplier });
  });

export const listSuppliersController = (service: SupplierService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const suppliers = await service.listSuppliers(
      getAccessContext(request),
      parseSchema(supplierQuerySchema, request.query)
    );

    response.status(200).json({ data: suppliers });
  });

export const updateSupplierController = (service: SupplierService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const { supplierId } = parseSchema(supplierIdSchema, request.params);
    const supplier = await service.updateSupplier(
      getAccessContext(request),
      supplierId,
      parseSchema(updateSupplierSchema, request.body)
    );

    response.status(200).json({ data: supplier });
  });
