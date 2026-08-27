import { Router, type Router as ExpressRouter } from 'express';

import { requirePermissions } from '../../http/middleware/require-permissions.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import {
  createSupplierController,
  listSuppliersController,
  updateSupplierController
} from './supplier.controller.js';
import type { SupplierRepository } from './supplier.repository.js';
import { createSupplierService } from './supplier.service.js';

export type SupplierService = ReturnType<typeof createSupplierService>;

export const createSupplierRouter = (
  repository: SupplierRepository,
  tenantCoreRepository: TenantCoreRepository
): ExpressRouter => {
  const router = Router();
  const service = createSupplierService(repository, tenantCoreRepository);

  router.get('/suppliers', requirePermissions(['supplier:view']), listSuppliersController(service));
  router.post('/suppliers', requirePermissions(['supplier:create']), createSupplierController(service));
  router.patch(
    '/suppliers/:supplierId',
    requirePermissions(['supplier:update']),
    updateSupplierController(service)
  );

  return router;
};
