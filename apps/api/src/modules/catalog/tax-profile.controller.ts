import type { RequestHandler, Response } from 'express';

import { asyncHandler } from '../../http/middleware/async-handler.js';
import { parseSchema } from '../../lib/parse-schema.js';
import { getAccessContext } from '../tenant-core/access-context.js';
import {
  catalogQuerySchema,
  createTaxProfileSchema,
  taxProfileIdSchema,
  updateTaxProfileSchema
} from './catalog.schemas.js';
import type { CatalogService } from './catalog.service.js';

export const createTaxProfileController = (service: CatalogService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const taxProfile = await service.createTaxProfile(
      getAccessContext(request),
      parseSchema(createTaxProfileSchema, request.body)
    );
    response.status(201).json({ data: taxProfile });
  });

export const listTaxProfilesController = (service: CatalogService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const taxProfiles = await service.listTaxProfiles(
      getAccessContext(request),
      parseSchema(catalogQuerySchema, request.query)
    );
    response.status(200).json({ data: taxProfiles });
  });

export const updateTaxProfileController = (service: CatalogService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const { taxProfileId } = parseSchema(taxProfileIdSchema, request.params);
    const taxProfile = await service.updateTaxProfile(
      getAccessContext(request),
      taxProfileId,
      parseSchema(updateTaxProfileSchema, request.body)
    );
    response.status(200).json({ data: taxProfile });
  });
