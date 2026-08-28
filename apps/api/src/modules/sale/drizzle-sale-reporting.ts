import { asc, desc, eq, sql } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { saleItems, sales } from '../../db/schema/index.js';
import {
  type SalesReportLookupInput,
  type SalesSummaryRecord,
  type TopProductSummaryRecord,
  type TopProductsLookupInput
} from '../reporting/reporting.types.js';
import {
  buildSalesReportWhere,
  hasSalesReportScope,
  normalizeSalesSummaryRecord,
  salesSummarySelect
} from './drizzle-sale-reporting-shared.js';

export const summarizeDrizzleSales = async (
  db: AppDatabase,
  input: SalesReportLookupInput
): Promise<SalesSummaryRecord> => {
  if (!hasSalesReportScope(input)) {
    return normalizeSalesSummaryRecord(undefined);
  }

  const saleFilters = buildSalesReportWhere(input);
  const [saleTotals, quantityTotals] = await Promise.all([
    db
      .select(salesSummarySelect)
      .from(sales)
      .where(saleFilters)
      .then((rows) => rows[0]),
    db
      .select({
        totalQuantity: sql<number>`coalesce(sum(${saleItems.quantity}), 0)`
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(saleFilters)
      .then((rows) => rows[0])
  ]);

  return normalizeSalesSummaryRecord({
    ...saleTotals,
    totalQuantity: quantityTotals?.totalQuantity
  });
};

export const listDrizzleTopProducts = async (
  db: AppDatabase,
  input: TopProductsLookupInput
): Promise<TopProductSummaryRecord[]> => {
  if (!hasSalesReportScope(input)) {
    return [];
  }

  return db
    .select({
      discountAmount: sql<number>`coalesce(sum(${saleItems.discountAmount}), 0)`,
      productId: saleItems.productId,
      productName: sql<string>`max(${saleItems.productName})`,
      productSku: sql<string>`max(${saleItems.productSku})`,
      saleCount: sql<number>`count(distinct ${saleItems.saleId})`,
      subtotalAmount: sql<number>`coalesce(sum(${saleItems.subtotalAmount}), 0)`,
      taxAmount: sql<number>`coalesce(sum(${saleItems.taxAmount}), 0)`,
      totalAmount: sql<number>`coalesce(sum(${saleItems.totalAmount}), 0)`,
      totalQuantity: sql<number>`coalesce(sum(${saleItems.quantity}), 0)`
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(buildSalesReportWhere(input))
    .groupBy(saleItems.productId)
    .orderBy(desc(sql`sum(${saleItems.quantity})`), desc(sql`sum(${saleItems.totalAmount})`), asc(sql`max(${saleItems.productName})`))
    .limit(input.limit)
    .then((rows) =>
      rows.map((row) => ({
        discountAmount: Number(row.discountAmount),
        productId: row.productId,
        productName: row.productName,
        productSku: row.productSku,
        saleCount: Number(row.saleCount),
        subtotalAmount: Number(row.subtotalAmount),
        taxAmount: Number(row.taxAmount),
        totalAmount: Number(row.totalAmount),
        totalQuantity: Number(row.totalQuantity)
      }))
    );
};
