import type { ReportingRepository } from './reporting.repository.js';
import { resolveReportLookup } from './reporting-lookup.js';
import type {
  SalesReportQuery,
  SalesSummaryView,
  TaxSummaryRow,
  TaxSummaryView,
  TopProductsQuery,
  TopProductsView
} from './reporting.types.js';
import { requireReportRecord, toSalesAggregateView } from './reporting-view.js';
import type { SettingsRepository } from '../settings/settings.repository.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';

export const createReportingAggregateHandlers = (
  repository: ReportingRepository,
  settingsRepository: SettingsRepository,
  tenantCoreRepository: TenantCoreRepository
) => ({
  getSalesSummary: async (
    context: AccessContext,
    query: SalesReportQuery
  ): Promise<SalesSummaryView> => {
    const report = await resolveReportLookup(
      context,
      query,
      settingsRepository,
      tenantCoreRepository
    );
    return {
      ...report.meta,
      ...toSalesAggregateView(await repository.summarizeSales(report.lookup))
    };
  },
  listTaxSummary: async (
    context: AccessContext,
    query: SalesReportQuery
  ): Promise<TaxSummaryView> => {
    const report = await resolveReportLookup(
      context,
      query,
      settingsRepository,
      tenantCoreRepository
    );
    const businessesById = new Map(
      report.scope.businesses.map((business) => [business.id, business] as const)
    );

    return {
      ...report.meta,
      rows: (await repository.listTaxSummary(report.lookup)).map((row) => {
        const business = requireReportRecord(
          businessesById.get(row.businessId),
          'BUSINESS_NOT_FOUND',
          'Business not found'
        );

        return {
          ...toSalesAggregateView(row),
          businessCode: business.code,
          businessId: business.id,
          businessName: business.name,
          effectiveTaxRateBasisPoints: row.subtotalAmount
            ? Math.round((row.taxAmount / row.subtotalAmount) * 10_000)
            : 0
        } satisfies TaxSummaryRow;
      })
    };
  },
  listTopProducts: async (
    context: AccessContext,
    query: TopProductsQuery
  ): Promise<TopProductsView> => {
    const report = await resolveReportLookup(
      context,
      query,
      settingsRepository,
      tenantCoreRepository
    );
    const rows = await repository.listTopProducts({ ...report.lookup, limit: query.limit });

    return {
      ...report.meta,
      limit: query.limit,
      rows: rows.map((row, index) => ({
        ...row,
        averageUnitPrice: row.totalQuantity ? Math.round(row.subtotalAmount / row.totalQuantity) : 0,
        rank: index + 1
      }))
    };
  }
});
