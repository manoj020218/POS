import type { AuthRepository } from '../auth/auth.repository.js';
import type { CatalogRepository } from '../catalog/catalog.repository.js';
import { resolveInventoryBalanceReport } from '../inventory/inventory-balance-report.js';
import type { InventoryRepository } from '../inventory/inventory.repository.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import type { ReportingRepository } from './reporting.repository.js';
import { resolveSalesSummaryRange } from './reporting-range.js';
import { resolveReportingScope } from './reporting-scope.js';
import type {
  BranchSalesSummaryRow,
  CashierSalesSummaryRow,
  CurrentStockView,
  InventoryReportQuery,
  LowStockView,
  PaymentMethodSummaryRow,
  SalesReturnsView,
  SalesBreakdownView,
  SalesReportQuery,
  SalesReturnSummaryRow,
  SalesSummaryView,
  StockMovementSummaryRow,
  StockMovementView,
  TaxSummaryRow,
  TaxSummaryView,
  TerminalSalesSummaryRow,
  TopProductsQuery,
  TopProductsView
} from './reporting.types.js';
import { requireReportRecord, toSalesAggregateView, toSalesReportMeta } from './reporting-view.js';

export const createReportingService = (
  repository: ReportingRepository & InventoryRepository,
  authRepository: AuthRepository,
  catalogRepository: CatalogRepository,
  tenantCoreRepository: TenantCoreRepository
) => ({
  getSalesSummary: async (
    context: AccessContext,
    query: SalesReportQuery
  ): Promise<SalesSummaryView> => {
    const report = await resolveReportLookup(context, query, tenantCoreRepository);
    return {
      ...report.meta,
      ...toSalesAggregateView(await repository.summarizeSales(report.lookup))
    };
  },
  listTaxSummary: async (
    context: AccessContext,
    query: SalesReportQuery
  ): Promise<TaxSummaryView> => {
    const report = await resolveReportLookup(context, query, tenantCoreRepository);
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
  listSalesByBranch: async (
    context: AccessContext,
    query: SalesReportQuery
  ): Promise<SalesBreakdownView<BranchSalesSummaryRow>> => {
    const report = await resolveReportLookup(context, query, tenantCoreRepository);
    const branchesById = new Map(report.scope.branches.map((branch) => [branch.id, branch] as const));
    const businessesById = new Map(
      report.scope.businesses.map((business) => [business.id, business] as const)
    );

    return {
      ...report.meta,
      rows: (await repository.listSalesByBranch(report.lookup)).map((row) => {
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
          ...toSalesAggregateView(row),
          branchCode: row.branchCode,
          branchId: row.branchId,
          branchName: branch.name,
          businessCode: business.code,
          businessId: business.id,
          businessName: business.name
        };
      })
    };
  },
  listSalesByTerminal: async (
    context: AccessContext,
    query: SalesReportQuery
  ): Promise<SalesBreakdownView<TerminalSalesSummaryRow>> => {
    const report = await resolveReportLookup(context, query, tenantCoreRepository);
    const branchesById = new Map(report.scope.branches.map((branch) => [branch.id, branch] as const));
    const businessesById = new Map(
      report.scope.businesses.map((business) => [business.id, business] as const)
    );
    const terminals = await tenantCoreRepository.listTerminals(context.tenantId);
    const terminalsById = new Map(
      terminals
        .filter((terminal) => report.scope.branchIds.includes(terminal.branchId))
        .map((terminal) => [terminal.id, terminal] as const)
    );

    return {
      ...report.meta,
      rows: (await repository.listSalesByTerminal(report.lookup)).map((row) => {
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
        const terminal = requireReportRecord(
          terminalsById.get(row.terminalId),
          'TERMINAL_NOT_FOUND',
          'Terminal not found'
        );

        return {
          ...toSalesAggregateView(row),
          branchCode: branch.code,
          branchId: branch.id,
          branchName: branch.name,
          businessCode: business.code,
          businessId: business.id,
          businessName: business.name,
          terminalCode: row.terminalCode,
          terminalId: row.terminalId,
          terminalName: terminal.name
        };
      })
    };
  },
  listSalesByCashier: async (
    context: AccessContext,
    query: SalesReportQuery
  ): Promise<SalesBreakdownView<CashierSalesSummaryRow>> => {
    const report = await resolveReportLookup(context, query, tenantCoreRepository);
    const usersById = new Map(
      (await authRepository.listUsersForTenant(context.tenantId)).map((user) => [user.id, user] as const)
    );

    return {
      ...report.meta,
      rows: (await repository.listSalesByCashier(report.lookup)).map((row) => {
        const user = requireReportRecord(
          usersById.get(row.cashierUserId),
          'AUTH_USER_NOT_FOUND',
          'Auth user not found'
        );

        return {
          ...toSalesAggregateView(row),
          cashierDisplayName: user.displayName,
          cashierEmail: user.email,
          cashierUserId: row.cashierUserId
        };
      })
    };
  },
  listSalesByPaymentMethod: async (
    context: AccessContext,
    query: SalesReportQuery
  ): Promise<SalesBreakdownView<PaymentMethodSummaryRow>> => {
    const report = await resolveReportLookup(context, query, tenantCoreRepository);

    return {
      ...report.meta,
      rows: (await repository.listSalesByPaymentMethod(report.lookup)).map((row) => ({
        ...toSalesAggregateView(row),
        paymentMethod: row.paymentMethod
      }))
    };
  },
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
    const report = await resolveReportLookup(context, query, tenantCoreRepository);
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
    const report = await resolveReportLookup(context, query, tenantCoreRepository);
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
        } satisfies SalesReturnSummaryRow;
      })
    };
  },
  listTopProducts: async (
    context: AccessContext,
    query: TopProductsQuery
  ): Promise<TopProductsView> => {
    const report = await resolveReportLookup(context, query, tenantCoreRepository);
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

const resolveReportLookup = async (
  context: AccessContext,
  query: SalesReportQuery,
  tenantCoreRepository: TenantCoreRepository
) => {
  const [scope, range] = await Promise.all([
    resolveReportingScope(context, tenantCoreRepository, query.businessId),
    Promise.resolve(resolveSalesSummaryRange(query))
  ]);

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
