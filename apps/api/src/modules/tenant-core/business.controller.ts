import type { RequestHandler, Response } from 'express';

import { asyncHandler } from '../../http/middleware/async-handler.js';
import { getAccessContext } from './access-context.js';
import { parseSchema } from './tenant-core.parsers.js';
import {
  businessIdSchema,
  createBusinessSchema,
  updateBusinessSchema
} from './tenant-core.schemas.js';
import type { TenantCoreService } from './tenant-core.service.js';

export const createBusinessController = (service: TenantCoreService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const business = await service.createBusiness(
      getAccessContext(request),
      parseSchema(createBusinessSchema, request.body)
    );

    response.status(201).json({ data: business });
  });

export const listBusinessesController = (service: TenantCoreService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const businesses = await service.listBusinesses(getAccessContext(request));
    response.status(200).json({ data: businesses });
  });

export const updateBusinessController = (service: TenantCoreService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const { businessId } = parseSchema(businessIdSchema, request.params);
    const business = await service.updateBusiness(
      getAccessContext(request),
      businessId,
      parseSchema(updateBusinessSchema, request.body)
    );

    response.status(200).json({ data: business });
  });
