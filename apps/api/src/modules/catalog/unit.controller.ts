import type { RequestHandler, Response } from 'express';

import { asyncHandler } from '../../http/middleware/async-handler.js';
import { parseSchema } from '../../lib/parse-schema.js';
import { getAccessContext } from '../tenant-core/access-context.js';
import {
  catalogQuerySchema,
  createUnitSchema,
  unitIdSchema,
  updateUnitSchema
} from './catalog.schemas.js';
import type { CatalogService } from './catalog.service.js';

export const createUnitController = (service: CatalogService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const unit = await service.createUnit(
      getAccessContext(request),
      parseSchema(createUnitSchema, request.body)
    );
    response.status(201).json({ data: unit });
  });

export const listUnitsController = (service: CatalogService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const units = await service.listUnits(
      getAccessContext(request),
      parseSchema(catalogQuerySchema, request.query)
    );
    response.status(200).json({ data: units });
  });

export const updateUnitController = (service: CatalogService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const { unitId } = parseSchema(unitIdSchema, request.params);
    const unit = await service.updateUnit(
      getAccessContext(request),
      unitId,
      parseSchema(updateUnitSchema, request.body)
    );
    response.status(200).json({ data: unit });
  });
