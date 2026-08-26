import { Router, type Router as ExpressRouter } from 'express';

import { requirePermissions } from '../../http/middleware/require-permissions.js';
import type { CatalogRepository } from '../catalog/catalog.repository.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { listInventoryBalancesController } from './inventory.controller.js';
import type { InventoryRepository } from './inventory.repository.js';
import { createInventoryService } from './inventory.service.js';

export type InventoryService = ReturnType<typeof createInventoryService>;

export const createInventoryRouter = (
  repository: InventoryRepository,
  catalogRepository: CatalogRepository,
  tenantCoreRepository: TenantCoreRepository
): ExpressRouter => {
  const router = Router();
  const service = createInventoryService(repository, catalogRepository, tenantCoreRepository);

  router.get(
    '/inventory/balances',
    requirePermissions(['inventory:view']),
    listInventoryBalancesController(service)
  );

  return router;
};
