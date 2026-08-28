import {
  emptySalesSummaryRecord,
  type BranchSalesSummaryRecord,
  type CashierSalesSummaryRecord,
  type PaymentMethodSummaryRecord,
  type SalesReturnSummaryRecord,
  type SalesReportLookupInput,
  type SalesSummaryRecord,
  type StockMovementSummaryRecord,
  type TerminalSalesSummaryRecord,
  type TaxSummaryRecord,
  type TopProductSummaryRecord,
  type TopProductsLookupInput
} from '../reporting/reporting.types.js';
import type { InventoryMovementRecord } from '../inventory/inventory.types.js';
import type { SaleItemRecord, SaleRecord } from './sale.types.js';

type SaleMap = Map<string, SaleRecord>;
type SaleItemsMap = Map<string, SaleItemRecord[]>;
type InventoryMovementsMap = Map<string, InventoryMovementRecord>;

export const summarizeInMemorySales = (
  sales: SaleMap,
  items: SaleItemsMap,
  input: SalesReportLookupInput
) => {
  return listScopedSales(sales, input).reduce(
    (summary, sale) => addSaleSummary(summary, sale, getSaleQuantity(items, sale.id)),
    emptySalesSummaryRecord()
  );
};

export const listInMemoryBranchSales = (
  sales: SaleMap,
  items: SaleItemsMap,
  input: SalesReportLookupInput
): BranchSalesSummaryRecord[] => {
  const groups = new Map<string, BranchSalesSummaryRecord>();

  listScopedSales(sales, input).forEach((sale) => {
    groups.set(
      sale.branchId,
      addSaleSummary(
        groups.get(sale.branchId) ?? {
          ...emptySalesSummaryRecord(),
          branchCode: sale.branchCode,
          branchId: sale.branchId,
          businessId: sale.businessId
        },
        sale,
        getSaleQuantity(items, sale.id)
      )
    );
  });

  return [...groups.values()].sort(sortByTotalAmountThen((row) => row.branchCode));
};

export const listInMemoryTerminalSales = (
  sales: SaleMap,
  items: SaleItemsMap,
  input: SalesReportLookupInput
): TerminalSalesSummaryRecord[] => {
  const groups = new Map<string, TerminalSalesSummaryRecord>();

  listScopedSales(sales, input).forEach((sale) => {
    groups.set(
      sale.terminalId,
      addSaleSummary(
        groups.get(sale.terminalId) ?? {
          ...emptySalesSummaryRecord(),
          branchId: sale.branchId,
          businessId: sale.businessId,
          terminalCode: sale.terminalCode,
          terminalId: sale.terminalId
        },
        sale,
        getSaleQuantity(items, sale.id)
      )
    );
  });

  return [...groups.values()].sort(sortByTotalAmountThen((row) => row.terminalCode));
};

export const listInMemoryCashierSales = (
  sales: SaleMap,
  items: SaleItemsMap,
  input: SalesReportLookupInput
): CashierSalesSummaryRecord[] => {
  const groups = new Map<string, CashierSalesSummaryRecord>();

  listScopedSales(sales, input).forEach((sale) => {
    groups.set(
      sale.cashierUserId,
      addSaleSummary(
        groups.get(sale.cashierUserId) ?? {
          ...emptySalesSummaryRecord(),
          cashierUserId: sale.cashierUserId
        },
        sale,
        getSaleQuantity(items, sale.id)
      )
    );
  });

  return [...groups.values()].sort(sortByTotalAmountThen((row) => row.cashierUserId));
};

export const listInMemoryPaymentMethodSales = (
  sales: SaleMap,
  items: SaleItemsMap,
  input: SalesReportLookupInput
): PaymentMethodSummaryRecord[] => {
  const groups = new Map<string, PaymentMethodSummaryRecord>();

  listScopedSales(sales, input).forEach((sale) => {
    groups.set(
      sale.paymentMethod,
      addSaleSummary(
        groups.get(sale.paymentMethod) ?? {
          ...emptySalesSummaryRecord(),
          paymentMethod: sale.paymentMethod
        },
        sale,
        getSaleQuantity(items, sale.id)
      )
    );
  });

  return [...groups.values()].sort(sortByTotalAmountThen((row) => row.paymentMethod));
};

export const listInMemoryTaxSummary = (
  sales: SaleMap,
  items: SaleItemsMap,
  input: SalesReportLookupInput
): TaxSummaryRecord[] => {
  const groups = new Map<string, TaxSummaryRecord>();

  listScopedSales(sales, input).forEach((sale) => {
    groups.set(
      sale.businessId,
      addSaleSummary(
        groups.get(sale.businessId) ?? {
          ...emptySalesSummaryRecord(),
          businessId: sale.businessId
        },
        sale,
        getSaleQuantity(items, sale.id)
      )
    );
  });

  return [...groups.values()].sort(sortByTaxAmountThen((row) => row.businessId));
};

export const listInMemoryTopProducts = (
  sales: SaleMap,
  items: SaleItemsMap,
  input: TopProductsLookupInput
): TopProductSummaryRecord[] => {
  const products = new Map<string, TopProductSummaryRecord>();

  listScopedSales(sales, input).forEach((sale) => {
    const seenProductIds = new Set<string>();

    (items.get(sale.id) ?? []).forEach((item) => {
      const existing = products.get(item.productId);
      products.set(item.productId, {
        discountAmount: (existing?.discountAmount ?? 0) + item.discountAmount,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        saleCount: (existing?.saleCount ?? 0) + (seenProductIds.has(item.productId) ? 0 : 1),
        subtotalAmount: (existing?.subtotalAmount ?? 0) + item.subtotalAmount,
        taxAmount: (existing?.taxAmount ?? 0) + item.taxAmount,
        totalAmount: (existing?.totalAmount ?? 0) + item.totalAmount,
        totalQuantity: (existing?.totalQuantity ?? 0) + item.quantity
      });
      seenProductIds.add(item.productId);
    });
  });

  return [...products.values()]
    .sort(
      (left, right) =>
        right.totalQuantity - left.totalQuantity ||
        right.totalAmount - left.totalAmount ||
        left.productName.localeCompare(right.productName)
    )
    .slice(0, input.limit);
};

export const listInMemoryStockMovements = (
  inventoryMovements: InventoryMovementsMap,
  input: SalesReportLookupInput
): StockMovementSummaryRecord[] => {
  const groups = new Map<string, StockMovementSummaryRecord>();

  listScopedInventoryMovements(inventoryMovements, input).forEach((movement) => {
    const key = `${movement.businessId}:${movement.branchId}:${movement.productId}:${movement.movementType}`;
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        branchId: movement.branchId,
        businessId: movement.businessId,
        lastMovementAt: movement.occurredAt,
        movementCount: 1,
        movementType: movement.movementType,
        productId: movement.productId,
        quantityDelta: movement.quantityDelta
      });
      return;
    }

    groups.set(key, {
      ...existing,
      lastMovementAt:
        existing.lastMovementAt < movement.occurredAt
          ? movement.occurredAt
          : existing.lastMovementAt,
      movementCount: existing.movementCount + 1,
      quantityDelta: existing.quantityDelta + movement.quantityDelta
    });
  });

  return [...groups.values()].sort(
    sortByMovementMagnitudeThen(
      (row) => `${row.branchId}:${row.productId}:${row.movementType}`
    )
  );
};

export const listInMemorySalesReturns = (
  inventoryMovements: InventoryMovementsMap,
  items: SaleItemsMap,
  input: SalesReportLookupInput
): SalesReturnSummaryRecord[] => {
  const groups = new Map<string, SalesReturnSummaryRecord>();

  listScopedInventoryMovements(inventoryMovements, input)
    .filter((movement) => movement.movementType === 'SALE_RETURN')
    .forEach((movement) => {
      const item = (items.get(movement.referenceId) ?? []).find(
        (candidate) => candidate.productId === movement.productId
      )!;
      const key = `${movement.businessId}:${movement.branchId}:${movement.productId}`;
      const existing = groups.get(key);

      if (!existing) {
        groups.set(key, {
          branchId: movement.branchId,
          businessId: movement.businessId,
          lastReturnedAt: movement.occurredAt,
          productId: movement.productId,
          productName: item.productName,
          productSku: item.productSku,
          returnCount: 1,
          returnedQuantity: movement.quantityDelta
        });
        return;
      }

      groups.set(key, {
        ...existing,
        lastReturnedAt:
          existing.lastReturnedAt < movement.occurredAt
            ? movement.occurredAt
            : existing.lastReturnedAt,
        returnCount: existing.returnCount + 1,
        returnedQuantity: existing.returnedQuantity + movement.quantityDelta
      });
    });

  return [...groups.values()].sort(
    (left, right) =>
      right.returnedQuantity - left.returnedQuantity ||
      right.lastReturnedAt.getTime() - left.lastReturnedAt.getTime() ||
      left.productName.localeCompare(right.productName) ||
      left.productSku.localeCompare(right.productSku)
  );
};

const listScopedSales = (sales: SaleMap, input: SalesReportLookupInput) => {
  if (input.businessIds.length === 0 || input.branchIds.length === 0) {
    return [];
  }

  const allowedBusinessIds = new Set(input.businessIds);
  const allowedBranchIds = new Set(input.branchIds);

  return [...sales.values()].filter((sale) => {
    return (
      sale.tenantId === input.tenantId &&
      allowedBusinessIds.has(sale.businessId) &&
      allowedBranchIds.has(sale.branchId) &&
      sale.occurredAt >= input.occurredAtFrom &&
      sale.occurredAt < input.occurredAtTo
    );
  });
};

const listScopedInventoryMovements = (
  inventoryMovements: InventoryMovementsMap,
  input: SalesReportLookupInput
) => {
  if (input.businessIds.length === 0 || input.branchIds.length === 0) {
    return [];
  }

  const allowedBusinessIds = new Set(input.businessIds);
  const allowedBranchIds = new Set(input.branchIds);

  return [...inventoryMovements.values()].filter((movement) => {
    return (
      movement.tenantId === input.tenantId &&
      allowedBusinessIds.has(movement.businessId) &&
      allowedBranchIds.has(movement.branchId) &&
      movement.occurredAt >= input.occurredAtFrom &&
      movement.occurredAt < input.occurredAtTo
    );
  });
};

const getSaleQuantity = (items: SaleItemsMap, saleId: string) => {
  return (items.get(saleId) ?? []).reduce((quantity, item) => quantity + item.quantity, 0);
};

const addSaleSummary = <TSummary extends SalesSummaryRecord>(
  summary: TSummary,
  sale: SaleRecord,
  totalQuantity: number
): TSummary => ({
  ...summary,
  discountAmount: summary.discountAmount + sale.discountAmount,
  saleCount: summary.saleCount + 1,
  subtotalAmount: summary.subtotalAmount + sale.subtotalAmount,
  taxAmount: summary.taxAmount + sale.taxAmount,
  totalAmount: summary.totalAmount + sale.totalAmount,
  totalQuantity: summary.totalQuantity + totalQuantity
});

const sortByTotalAmountThen =
  <TRow>(getTiebreaker: (row: TRow) => string) =>
  (left: TRow & { totalAmount: number }, right: TRow & { totalAmount: number }) =>
    right.totalAmount - left.totalAmount || getTiebreaker(left).localeCompare(getTiebreaker(right));

const sortByTaxAmountThen =
  <TRow>(getTiebreaker: (row: TRow) => string) =>
  (left: TRow & { taxAmount: number }, right: TRow & { taxAmount: number }) =>
    right.taxAmount - left.taxAmount || getTiebreaker(left).localeCompare(getTiebreaker(right));

const sortByMovementMagnitudeThen =
  <TRow extends { lastMovementAt: Date; quantityDelta: number }>(getTiebreaker: (row: TRow) => string) =>
  (left: TRow, right: TRow) =>
    Math.abs(right.quantityDelta) - Math.abs(left.quantityDelta) ||
    right.lastMovementAt.getTime() - left.lastMovementAt.getTime() ||
    getTiebreaker(left).localeCompare(getTiebreaker(right));
