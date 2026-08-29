import type { CatalogRepository } from '../catalog/catalog.repository.js';
import { resolveInventoryBalanceReport } from '../inventory/inventory-balance-report.js';
import type { InventoryRepository } from '../inventory/inventory.repository.js';
import type { SettingsRepository } from '../settings/settings.repository.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { resolveReportLookup } from './reporting-lookup.js';
import type { ReportingRepository } from './reporting.repository.js';
import type {
  CurrentStockView,
  InventoryReportQuery,
  LowStockView,
  SalesReportQuery,
  SalesReturnsView,
  StockMovementSummaryRow,
  StockMovementView
} from './reporting.types.js';
import { requireReportRecord } from './reporting-view.js';

export const createReportingOperationalHandlers = (
  repository: ReportingRepository & InventoryRepository,
  catalogRepository: CatalogRepository,
  settingsRepository: SettingsRepository,
  tenantCoreRepository: TenantCoreRepository
) => ({
  listCurrentStock: async (
    context: AccessContext,
    query: InventoryReportQuery
  ): Promise<CurrentStockView> => {
    const report = await resolveInventoryBalanceReport(
      repository,
      catalogRepository,
      tenantCoreRepository,
      context,
      query
    );

    return {
      asOf: new Date(),
      businessCount: report.businessCount,
      businessId: report.businessId,
      rows: report.rows
    };
  },
  listLowStock: async (
    context: AccessContext,
    query: InventoryReportQuery
  ): Promise<LowStockView> => {
    const report = await resolveInventoryBalanceReport(
      repository,
      catalogRepository,
      tenantCoreRepository,
      context,
      query
    );

    return {
      asOf: new Date(),
      businessCount: report.businessCount,
      businessId: report.businessId,
      rows: report.rows
        .filter((row) => row.isLowStock)
        .sort(
          (left, right) =>
            left.currentQuantity -
              left.lowStockLevel -
              (right.currentQuantity - right.lowStockLevel) ||
            left.currentQuantity - right.currentQuantity ||
            left.productName.localeCompare(right.productName) ||
            left.productSku.localeCompare(right.productSku)
        )
    };
  },
  listStockMovements: async (
    context: AccessContext,
    query: SalesReportQuery
  ): Promise<StockMovementView> => {
    const report = await resolveReportLookup(
      context,
      query,
      settingsRepository,
      tenantCoreRepository
    );
    const rows = await repository.listStockMovements(report.lookup);
    const branchesById = new Map(report.scope.branches.map((branch) => [branch.id, branch] as const));
    const businessesById = new Map(
      report.scope.businesses.map((business) => [business.id, business] as const)
    );
    const productsById = await listProductsById(catalogRepository, rows.map((row) => row.productId));

    return {
      ...report.meta,
      rows: rows.map((row) => {
        const branch = requireReportRecord(
          branchesById.get(row.branchId),
          'BRANCH_NOT_FOUND',
          'Branch not found'
        );
        const business = requireReportRecord(
          businessesById.get(row.businessId),
          'BUSINESS_NOT_FOUND',
          'Business not found'
        );
        const product = requireReportRecord(
          productsById.get(row.productId),
          'PRODUCT_NOT_FOUND',
          'Product not found'
        );

        return {
          branchCode: branch.code,
          branchId: branch.id,
          branchName: branch.name,
          businessCode: business.code,
          businessId: business.id,
          businessName: business.name,
          lastMovementAt: row.lastMovementAt,
          movementCount: row.movementCount,
          movementType: row.movementType,
          productId: row.productId,
          productName: product.name,
          productSku: product.sku,
          quantityDelta: row.quantityDelta
        } satisfies StockMovementSummaryRow;
      })
    };
  },
  listSalesReturns: async (
    context: AccessContext,
    query: SalesReportQuery
  ): Promise<SalesReturnsView> => {
    const report = await resolveReportLookup(
      context,
      query,
      settingsRepository,
      tenantCoreRepository
    );
    const branchesById = new Map(report.scope.branches.map((branch) => [branch.id, branch] as const));
    const businessesById = new Map(
      report.scope.businesses.map((business) => [business.id, business] as const)
    );

    return {
      ...report.meta,
      rows: (await repository.listSalesReturns(report.lookup)).map((row) => {
        const branch = requireReportRecord(
          branchesById.get(row.branchId),
          'BRANCH_NOT_FOUND',
          'Branch not found'
        );
        const business = requireReportRecord(
          businessesById.get(row.businessId),
          'BUSINESS_NOT_FOUND',
          'Business not found'
        );

        return {
          branchCode: branch.code,
          branchId: branch.id,
          branchName: branch.name,
          businessCode: business.code,
          businessId: business.id,
          businessName: business.name,
          lastReturnedAt: row.lastReturnedAt,
          productId: row.productId,
          productName: row.productName,
          productSku: row.productSku,
          returnCount: row.returnCount,
          returnedQuantity: row.returnedQuantity
        };
      })
    };
  }
});

const listProductsById = async (catalogRepository: CatalogRepository, productIds: string[]) => {
  const uniqueProductIds = [...new Set(productIds)];
  const products = await Promise.all(
    uniqueProductIds.map((productId) => catalogRepository.findProductById(productId))
  );

  return new Map(
    products.flatMap((product, index) =>
      product ? ([[uniqueProductIds[index]!, product]] as const) : []
    )
  );
};
