import {
  emptySalesSummaryRecord,
  type BranchSalesSummaryRecord,
  type CashierSalesSummaryRecord,
  type PaymentMethodSummaryRecord,
  type SalesReportLookupInput,
  type SalesSummaryRecord,
  type TerminalSalesSummaryRecord,
  type TopProductSummaryRecord,
  type TopProductsLookupInput
} from '../reporting/reporting.types.js';
import type { SaleItemRecord, SaleRecord } from './sale.types.js';

type SaleMap = Map<string, SaleRecord>;
type SaleItemsMap = Map<string, SaleItemRecord[]>;

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
