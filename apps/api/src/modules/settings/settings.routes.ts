import { Router, type Router as ExpressRouter } from 'express';

import { requirePermissions } from '../../http/middleware/require-permissions.js';
import type { CatalogRepository } from '../catalog/catalog.repository.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import {
  getBusinessSettingsController,
  updateBusinessSettingsController
} from './settings.controller.js';
import type { SettingsRepository } from './settings.repository.js';
import { createSettingsService } from './settings.service.js';

export type SettingsService = ReturnType<typeof createSettingsService>;

export const createSettingsRouter = (
  repository: SettingsRepository,
  catalogRepository: CatalogRepository,
  tenantCoreRepository: TenantCoreRepository
): ExpressRouter => {
  const router = Router();
  const service = createSettingsService(repository, catalogRepository, tenantCoreRepository);

  router.get(
    '/business-settings',
    requirePermissions(['terminal:view']),
    getBusinessSettingsController(service)
  );
  router.patch(
    '/business-settings',
    requirePermissions(['settings:manage']),
    updateBusinessSettingsController(service)
  );

  return router;
};
