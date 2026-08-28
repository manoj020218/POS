import { createHttpError } from '../../lib/http-error.js';
import { listAccessibleBusinesses } from '../catalog/catalog-business-scope.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import type { ReportingRepository } from './reporting.repository.js';
import { resolveSalesSummaryRange } from './reporting-range.js';
import type { SalesSummaryQuery, SalesSummaryView } from './reporting.types.js';

export const createReportingService = (
  repository: ReportingRepository,
  tenantCoreRepository: TenantCoreRepository
) => ({
  getSalesSummary: async (
    context: AccessContext,
    query: SalesSummaryQuery
  ): Promise<SalesSummaryView> => {
    const accessibleBusinesses = await listAccessibleBusinesses(context, tenantCoreRepository);
    const businessIds = resolveBusinessIds(accessibleBusinesses, query.businessId);
    const range = resolveSalesSummaryRange(query);
    const summary = await repository.summarizeSales({
      businessIds,
      occurredAtFrom: range.rangeStart,
      occurredAtTo: range.rangeEndExclusive,
      tenantId: context.tenantId
    });

    return {
      ...summary,
      averageSaleAmount: summary.saleCount ? Math.round(summary.totalAmount / summary.saleCount) : 0,
      businessCount: businessIds.length,
      businessId: query.businessId,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      reportType: range.reportType
    };
  }
});

const resolveBusinessIds = (
  businesses: Array<{ id: string }>,
  requestedBusinessId?: string
) => {
  if (!requestedBusinessId) {
    return businesses.map((business) => business.id);
  }

  if (!businesses.some((business) => business.id === requestedBusinessId)) {
    throw createHttpError(403, 'BRANCH_ACCESS_DENIED', 'Branch access denied');
  }

  return [requestedBusinessId];
};
