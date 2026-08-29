import type { AuthRepository } from '../auth/auth.repository.js';
import type { CatalogRepository } from '../catalog/catalog.repository.js';
import type { InventoryRepository } from '../inventory/inventory.repository.js';
import type { SettingsRepository } from '../settings/settings.repository.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { createReportingOperationalHandlers } from './reporting-operational.service.js';
import type { ReportingRepository } from './reporting.repository.js';
import { createReportingSalesHandlers } from './reporting-sales.service.js';

export const createReportingService = (
  repository: ReportingRepository & InventoryRepository,
  authRepository: AuthRepository,
  catalogRepository: CatalogRepository,
  settingsRepository: SettingsRepository,
  tenantCoreRepository: TenantCoreRepository
) => ({
  ...createReportingSalesHandlers(
    repository,
    authRepository,
    settingsRepository,
    tenantCoreRepository
  ),
  ...createReportingOperationalHandlers(
    repository,
    catalogRepository,
    settingsRepository,
    tenantCoreRepository
  )
});
