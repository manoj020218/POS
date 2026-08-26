import { Router, type Router as ExpressRouter } from 'express';

import { requirePermissions } from '../../http/middleware/require-permissions.js';
import type { CatalogRepository } from '../catalog/catalog.repository.js';
import type { CustomerRepository } from '../customer/customer.repository.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { createSaleController, createSaleReturnController } from './sale.controller.js';
import type { SaleRepository } from './sale.repository.js';
import { createSaleService } from './sale.service.js';

export type SaleService = ReturnType<typeof createSaleService>;

export const createSaleRouter = (
  repository: SaleRepository,
  catalogRepository: CatalogRepository,
  customerRepository: CustomerRepository,
  tenantCoreRepository: TenantCoreRepository
): ExpressRouter => {
  const router = Router();
  const service = createSaleService(
    repository,
    catalogRepository,
    customerRepository,
    tenantCoreRepository
  );

  router.post('/sales', requirePermissions(['sale:create']), createSaleController(service));
  router.post(
    '/sales/:saleId/returns',
    requirePermissions(['sale:refund']),
    createSaleReturnController(service)
  );

  return router;
};
