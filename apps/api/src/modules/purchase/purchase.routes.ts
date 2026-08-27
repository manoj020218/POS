import { Router, type Router as ExpressRouter } from 'express';

import { requirePermissions } from '../../http/middleware/require-permissions.js';
import type { CatalogRepository } from '../catalog/catalog.repository.js';
import type { SupplierRepository } from '../supplier/supplier.repository.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import {
  createPurchaseController,
  listPurchasesController
} from './purchase.controller.js';
import type { PurchaseRepository } from './purchase.repository.js';
import { createPurchaseService } from './purchase.service.js';

export type PurchaseService = ReturnType<typeof createPurchaseService>;

export const createPurchaseRouter = (
  repository: PurchaseRepository,
  supplierRepository: SupplierRepository,
  catalogRepository: CatalogRepository,
  tenantCoreRepository: TenantCoreRepository
): ExpressRouter => {
  const router = Router();
  const service = createPurchaseService(
    repository,
    supplierRepository,
    catalogRepository,
    tenantCoreRepository
  );

  router.get('/purchases', requirePermissions(['purchase:view']), listPurchasesController(service));
  router.post('/purchases', requirePermissions(['purchase:create']), createPurchaseController(service));

  return router;
};
