import { createHttpError } from '../../lib/http-error.js';
import {
  defaultBusinessSettings,
  resolveEffectiveBusinessSettings
} from '../settings/settings-defaults.js';
import type { SettingsRepository } from '../settings/settings.repository.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { resolveSalesSummaryRange } from './reporting-range.js';
import { resolveReportingScope } from './reporting-scope.js';
import type { SalesReportQuery } from './reporting.types.js';
import { toSalesReportMeta } from './reporting-view.js';

export const resolveReportLookup = async (
  context: AccessContext,
  query: SalesReportQuery,
  settingsRepository: SettingsRepository,
  tenantCoreRepository: TenantCoreRepository
) => {
  const scope = await resolveReportingScope(context, tenantCoreRepository, query.businessId);
  const timezone = await resolveReportTimezone(
    settingsRepository,
    context.tenantId,
    scope.businessIds
  );
  const range = resolveSalesSummaryRange(query, timezone);

  return {
    lookup: {
      branchIds: scope.branchIds,
      businessIds: scope.businessIds,
      occurredAtFrom: range.rangeStart,
      occurredAtTo: range.rangeEndExclusive,
      tenantId: context.tenantId
    },
    meta: toSalesReportMeta(scope.businessIds.length, query.businessId, range),
    scope
  };
};

const resolveReportTimezone = async (
  settingsRepository: SettingsRepository,
  tenantId: string,
  businessIds: string[]
) => {
  if (businessIds.length === 0) {
    return defaultBusinessSettings.timezone;
  }

  const settings = await settingsRepository.listBusinessSettings(tenantId, businessIds);
  const settingsMap = new Map(settings.map((record) => [record.businessId, record] as const));
  const timezones = new Set(
    businessIds.map(
      (businessId) =>
        resolveEffectiveBusinessSettings(settingsMap.get(businessId)).timezone
    )
  );

  if (timezones.size > 1) {
    throw createHttpError(
      400,
      'REPORT_TIMEZONE_MISMATCH',
      'Report scope spans businesses with different configured timezones'
    );
  }

  return timezones.values().next().value ?? defaultBusinessSettings.timezone;
};
