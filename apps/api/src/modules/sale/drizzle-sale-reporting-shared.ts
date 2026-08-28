import { and, eq, gte, inArray, lt, sql } from 'drizzle-orm';

import { sales } from '../../db/schema/index.js';
import {
  emptySalesSummaryRecord,
  type SalesReportLookupInput,
  type SalesSummaryRecord
} from '../reporting/reporting.types.js';

type NumericSalesSummaryRow = {
  discountAmount?: number;
  saleCount?: number;
  subtotalAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  totalQuantity?: number;
};

export const hasSalesReportScope = (input: SalesReportLookupInput) => {
  return input.businessIds.length > 0 && input.branchIds.length > 0;
};

export const buildSalesReportWhere = (input: SalesReportLookupInput) =>
  and(
    eq(sales.tenantId, input.tenantId),
    inArray(sales.businessId, input.businessIds),
    inArray(sales.branchId, input.branchIds),
    gte(sales.occurredAt, input.occurredAtFrom),
    lt(sales.occurredAt, input.occurredAtTo)
  );

export const salesSummarySelect = {
  discountAmount: sql<number>`coalesce(sum(${sales.discountAmount}), 0)`,
  saleCount: sql<number>`count(*)`,
  subtotalAmount: sql<number>`coalesce(sum(${sales.subtotalAmount}), 0)`,
  taxAmount: sql<number>`coalesce(sum(${sales.taxAmount}), 0)`,
  totalAmount: sql<number>`coalesce(sum(${sales.totalAmount}), 0)`
};

export const normalizeSalesSummaryRecord = (
  row: NumericSalesSummaryRow | undefined
): SalesSummaryRecord => ({
  ...emptySalesSummaryRecord(),
  discountAmount: Number(row?.discountAmount ?? 0),
  saleCount: Number(row?.saleCount ?? 0),
  subtotalAmount: Number(row?.subtotalAmount ?? 0),
  taxAmount: Number(row?.taxAmount ?? 0),
  totalAmount: Number(row?.totalAmount ?? 0),
  totalQuantity: Number(row?.totalQuantity ?? 0)
});
