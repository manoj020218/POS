import { and, eq, gte, inArray, lt, sql } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { saleItems, sales } from '../../db/schema/index.js';
import {
  emptySalesSummaryRecord,
  type SalesSummaryLookupInput,
  type SalesSummaryRecord
} from '../reporting/reporting.types.js';

export const summarizeDrizzleSales = async (
  db: AppDatabase,
  input: SalesSummaryLookupInput
): Promise<SalesSummaryRecord> => {
  if (input.businessIds.length === 0) {
    return emptySalesSummaryRecord();
  }

  const saleFilters = and(
    eq(sales.tenantId, input.tenantId),
    inArray(sales.businessId, input.businessIds),
    gte(sales.occurredAt, input.occurredAtFrom),
    lt(sales.occurredAt, input.occurredAtTo)
  );
  const [saleTotals, quantityTotals] = await Promise.all([
    db
      .select({
        discountAmount: sql<number>`coalesce(sum(${sales.discountAmount}), 0)`,
        saleCount: sql<number>`count(*)`,
        subtotalAmount: sql<number>`coalesce(sum(${sales.subtotalAmount}), 0)`,
        taxAmount: sql<number>`coalesce(sum(${sales.taxAmount}), 0)`,
        totalAmount: sql<number>`coalesce(sum(${sales.totalAmount}), 0)`
      })
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

  return {
    discountAmount: Number(saleTotals?.discountAmount ?? 0),
    saleCount: Number(saleTotals?.saleCount ?? 0),
    subtotalAmount: Number(saleTotals?.subtotalAmount ?? 0),
    taxAmount: Number(saleTotals?.taxAmount ?? 0),
    totalAmount: Number(saleTotals?.totalAmount ?? 0),
    totalQuantity: Number(quantityTotals?.totalQuantity ?? 0)
  };
};
