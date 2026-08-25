import type { RequestHandler, Response } from 'express';

import { asyncHandler } from '../../http/middleware/async-handler.js';
import { parseSchema } from '../../lib/parse-schema.js';
import { getAccessContext } from '../tenant-core/access-context.js';
import {
  catalogQuerySchema,
  categoryIdSchema,
  createCategorySchema,
  updateCategorySchema
} from './catalog.schemas.js';
import type { CatalogService } from './catalog.service.js';

export const createCategoryController = (service: CatalogService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const category = await service.createCategory(
      getAccessContext(request),
      parseSchema(createCategorySchema, request.body)
    );
    response.status(201).json({ data: category });
  });

export const listCategoriesController = (service: CatalogService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const categories = await service.listCategories(
      getAccessContext(request),
      parseSchema(catalogQuerySchema, request.query)
    );
    response.status(200).json({ data: categories });
  });

export const updateCategoryController = (service: CatalogService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const { categoryId } = parseSchema(categoryIdSchema, request.params);
    const category = await service.updateCategory(
      getAccessContext(request),
      categoryId,
      parseSchema(updateCategorySchema, request.body)
    );
    response.status(200).json({ data: category });
  });
