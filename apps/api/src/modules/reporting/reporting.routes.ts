import { Router, type Router as ExpressRouter } from 'express';

import { requirePermissions } from '../../http/middleware/require-permissions.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { getSalesSummaryController } from './reporting.controller.js';
import type { ReportingRepository } from './reporting.repository.js';
import { createReportingService } from './reporting.service.js';

export type ReportingService = ReturnType<typeof createReportingService>;

export const createReportingRouter = (
  repository: ReportingRepository,
  tenantCoreRepository: TenantCoreRepository
): ExpressRouter => {
  const router = Router();
  const service = createReportingService(repository, tenantCoreRepository);

  router.get(
    '/reports/sales/summary',
    requirePermissions(['report:view']),
    getSalesSummaryController(service)
  );

  return router;
};
