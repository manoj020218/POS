import type { RequestHandler, Response } from 'express';

import { asyncHandler } from '../../http/middleware/async-handler.js';
import { parseSchema } from '../../lib/parse-schema.js';
import { getAccessContext } from '../tenant-core/access-context.js';
import {
  catalogQuerySchema,
  createProductSchema,
  productIdSchema,
  productSearchQuerySchema,
  updateProductSchema
} from './catalog.schemas.js';
import type { CatalogService } from './catalog.service.js';

export const createProductController = (service: CatalogService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const product = await service.createProduct(
      getAccessContext(request),
      parseSchema(createProductSchema, request.body)
    );
    response.status(201).json({ data: product });
  });

export const listProductsController = (service: CatalogService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const products = await service.listProducts(
      getAccessContext(request),
      parseSchema(catalogQuerySchema, request.query)
    );
    response.status(200).json({ data: products });
  });

export const searchProductsController = (service: CatalogService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const products = await service.searchProducts(
      getAccessContext(request),
      parseSchema(productSearchQuerySchema, request.query)
    );
    response.status(200).json({ data: products });
  });

export const updateProductController = (service: CatalogService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const { productId } = parseSchema(productIdSchema, request.params);
    const product = await service.updateProduct(
      getAccessContext(request),
      productId,
      parseSchema(updateProductSchema, request.body)
    );
    response.status(200).json({ data: product });
  });
