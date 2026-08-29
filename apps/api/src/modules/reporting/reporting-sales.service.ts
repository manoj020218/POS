import type { AuthRepository } from '../auth/auth.repository.js';
import type { SettingsRepository } from '../settings/settings.repository.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { createReportingAggregateHandlers } from './reporting-aggregate.service.js';
import { createReportingBreakdownHandlers } from './reporting-breakdown.service.js';
import type { ReportingRepository } from './reporting.repository.js';

export const createReportingSalesHandlers = (
  repository: ReportingRepository,
  authRepository: AuthRepository,
  settingsRepository: SettingsRepository,
  tenantCoreRepository: TenantCoreRepository
) => ({
  ...createReportingAggregateHandlers(
    repository,
    settingsRepository,
    tenantCoreRepository
  ),
  ...createReportingBreakdownHandlers(
    repository,
    authRepository,
    settingsRepository,
    tenantCoreRepository
  )
});
