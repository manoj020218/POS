import { Router, type Router as ExpressRouter } from 'express';

import { requirePermissions } from '../../http/middleware/require-permissions.js';
import type { AuthRepository } from '../auth/auth.repository.js';
import type { CatalogRepository } from '../catalog/catalog.repository.js';
import type { InventoryRepository } from '../inventory/inventory.repository.js';
import type { SettingsRepository } from '../settings/settings.repository.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import {
  getSalesSummaryController,
  listCurrentStockController,
  listLowStockController,
  listSalesByBranchController,
  listSalesByCashierController,
  listSalesByPaymentMethodController,
  listSalesReturnsController,
  listSalesByTerminalController,
  listStockMovementsController,
  listTaxSummaryController,
  listTopProductsController
} from './reporting.controller.js';
import type { ReportingRepository } from './reporting.repository.js';
import { createReportingService } from './reporting.service.js';

export type ReportingService = ReturnType<typeof createReportingService>;

export const createReportingRouter = (
  repository: ReportingRepository & InventoryRepository,
  authRepository: AuthRepository,
  catalogRepository: CatalogRepository,
  settingsRepository: SettingsRepository,
  tenantCoreRepository: TenantCoreRepository
): ExpressRouter => {
  const router = Router();
  const service = createReportingService(
    repository,
    authRepository,
    catalogRepository,
    settingsRepository,
    tenantCoreRepository
  );

  router.get(
    '/reports/sales/summary',
    requirePermissions(['report:view']),
    getSalesSummaryController(service)
  );
  router.get(
    '/reports/sales/tax-summary',
    requirePermissions(['report:view']),
    listTaxSummaryController(service)
  );
  router.get(
    '/reports/sales/by-branch',
    requirePermissions(['report:view']),
    listSalesByBranchController(service)
  );
  router.get(
    '/reports/sales/by-terminal',
    requirePermissions(['report:view']),
    listSalesByTerminalController(service)
  );
  router.get(
    '/reports/sales/by-cashier',
    requirePermissions(['report:view']),
    listSalesByCashierController(service)
  );
  router.get(
    '/reports/sales/by-payment-method',
    requirePermissions(['report:view']),
    listSalesByPaymentMethodController(service)
  );
  router.get(
    '/reports/sales/top-products',
    requirePermissions(['report:view']),
    listTopProductsController(service)
  );
  router.get(
    '/reports/sales/returns',
    requirePermissions(['report:view']),
    listSalesReturnsController(service)
  );
  router.get(
    '/reports/inventory/current-stock',
    requirePermissions(['report:view']),
    listCurrentStockController(service)
  );
  router.get(
    '/reports/inventory/low-stock',
    requirePermissions(['report:view']),
    listLowStockController(service)
  );
  router.get(
    '/reports/inventory/stock-movement',
    requirePermissions(['report:view']),
    listStockMovementsController(service)
  );

  return router;
};
