import { Router, type Router as ExpressRouter } from 'express';

import { requirePermissions } from '../../http/middleware/require-permissions.js';
import type { CatalogRepository } from '../catalog/catalog.repository.js';
import type { CustomerRepository } from '../customer/customer.repository.js';
import type { PurchaseRepository } from '../purchase/purchase.repository.js';
import { createPurchaseService } from '../purchase/purchase.service.js';
import type { SaleRepository } from '../sale/sale.repository.js';
import { createSaleService } from '../sale/sale.service.js';
import type { SettingsRepository } from '../settings/settings.repository.js';
import type { SupplierRepository } from '../supplier/supplier.repository.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { pullSyncEventsController, pushSyncEventsController } from './sync.controller.js';
import type { SyncRepository } from './sync.repository.js';
import { createSyncReplayHandler } from './sync-replay.js';
import { createSyncService } from './sync.service.js';

export type SyncService = ReturnType<typeof createSyncService>;

export const createSyncRouter = (
  repository: SyncRepository,
  saleRepository: SaleRepository,
  purchaseRepository: PurchaseRepository,
  supplierRepository: SupplierRepository,
  catalogRepository: CatalogRepository,
  customerRepository: CustomerRepository,
  settingsRepository: SettingsRepository,
  tenantCoreRepository: TenantCoreRepository
): ExpressRouter => {
  const router = Router();
  const saleService = createSaleService(
    saleRepository,
    catalogRepository,
    customerRepository,
    settingsRepository,
    tenantCoreRepository
  );
  const purchaseService = createPurchaseService(
    purchaseRepository,
    supplierRepository,
    catalogRepository,
    tenantCoreRepository
  );
  const service = createSyncService(
    repository,
    catalogRepository,
    customerRepository,
    tenantCoreRepository,
    createSyncReplayHandler({
      createPurchase: purchaseService.createPurchase,
      createSale: saleService.createSale
    })
  );

  router.get('/sync/pull', requirePermissions(['sync:pull']), pullSyncEventsController(service));
  router.post('/sync/push', requirePermissions(['sync:push']), pushSyncEventsController(service));

  return router;
};
