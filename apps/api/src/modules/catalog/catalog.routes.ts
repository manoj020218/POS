import { Router, type Router as ExpressRouter } from 'express';

import { requirePermissions } from '../../http/middleware/require-permissions.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { createCategoryController, listCategoriesController, updateCategoryController } from './category.controller.js';
import { createCatalogService } from './catalog.service.js';
import {
  createProductController,
  listProductsController,
  searchProductsController,
  updateProductController
} from './product.controller.js';
import { createTaxProfileController, listTaxProfilesController, updateTaxProfileController } from './tax-profile.controller.js';
import type { CatalogRepository } from './catalog.repository.js';
import { createUnitController, listUnitsController, updateUnitController } from './unit.controller.js';

export const createCatalogRouter = (
  repository: CatalogRepository,
  tenantCoreRepository: TenantCoreRepository
): ExpressRouter => {
  const router = Router();
  const service = createCatalogService(repository, tenantCoreRepository);

  router.get('/categories', requirePermissions(['product:view']), listCategoriesController(service));
  router.post('/categories', requirePermissions(['product:create']), createCategoryController(service));
  router.patch('/categories/:categoryId', requirePermissions(['product:update']), updateCategoryController(service));

  router.get('/units', requirePermissions(['product:view']), listUnitsController(service));
  router.post('/units', requirePermissions(['product:create']), createUnitController(service));
  router.patch('/units/:unitId', requirePermissions(['product:update']), updateUnitController(service));

  router.get('/tax-profiles', requirePermissions(['product:view']), listTaxProfilesController(service));
  router.post('/tax-profiles', requirePermissions(['product:create']), createTaxProfileController(service));
  router.patch('/tax-profiles/:taxProfileId', requirePermissions(['product:update']), updateTaxProfileController(service));

  router.get('/products/search', requirePermissions(['product:view']), searchProductsController(service));
  router.get('/products', requirePermissions(['product:view']), listProductsController(service));
  router.post('/products', requirePermissions(['product:create']), createProductController(service));
  router.patch('/products/:productId', requirePermissions(['product:update']), updateProductController(service));

  return router;
};
