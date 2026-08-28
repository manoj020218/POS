import { Router, type Router as ExpressRouter } from 'express';

import { requirePermissions } from '../../http/middleware/require-permissions.js';
import type { AuthRepository } from '../auth/auth.repository.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import {
  getSalesSummaryController,
  listSalesByBranchController,
  listSalesByCashierController,
  listSalesByPaymentMethodController,
  listSalesByTerminalController,
  listTopProductsController
} from './reporting.controller.js';
import type { ReportingRepository } from './reporting.repository.js';
import { createReportingService } from './reporting.service.js';

export type ReportingService = ReturnType<typeof createReportingService>;

export const createReportingRouter = (
  repository: ReportingRepository,
  authRepository: AuthRepository,
  tenantCoreRepository: TenantCoreRepository
): ExpressRouter => {
  const router = Router();
  const service = createReportingService(repository, authRepository, tenantCoreRepository);

  router.get(
    '/reports/sales/summary',
    requirePermissions(['report:view']),
    getSalesSummaryController(service)
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

  return router;
};
