import { and, asc, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { inventoryMovements, saleItems, sales } from '../../db/schema/index.js';
import type { InventoryMovementType } from '../inventory/inventory.types.js';
import type {
  SalesReportLookupInput,
  SalesReturnSummaryRecord,
  StockMovementSummaryRecord,
  TaxSummaryRecord
} from '../reporting/reporting.types.js';
import {
  buildSalesReportWhere,
  hasSalesReportScope,
  normalizeSalesSummaryRecord,
  salesSummarySelect
} from './drizzle-sale-reporting-shared.js';

export const listDrizzleTaxSummary = async (
  db: AppDatabase,
  input: SalesReportLookupInput
): Promise<TaxSummaryRecord[]> => {
  if (!hasSalesReportScope(input)) {
    return [];
  }

  const where = buildSalesReportWhere(input);
  const [saleRows, quantityRows] = await Promise.all([
    db
      .select({
        businessId: sales.businessId,
        ...salesSummarySelect
      })
      .from(sales)
      .where(where)
      .groupBy(sales.businessId)
      .orderBy(desc(sql`sum(${sales.taxAmount})`), asc(sales.businessId)),
    db
      .select({
        businessId: sales.businessId,
        totalQuantity: sql<number>`coalesce(sum(${saleItems.quantity}), 0)`
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(where)
      .groupBy(sales.businessId)
  ]);
  const quantitiesByBusinessId = new Map(
    quantityRows.map((row) => [row.businessId, Number(row.totalQuantity)] as const)
  );

  return saleRows.map((row) => ({
    ...normalizeSalesSummaryRecord({
      ...row,
      totalQuantity: quantitiesByBusinessId.get(row.businessId)
    }),
    businessId: row.businessId
  }));
};

export const listDrizzleStockMovements = async (
  db: AppDatabase,
  input: SalesReportLookupInput
): Promise<StockMovementSummaryRecord[]> => {
  if (!hasSalesReportScope(input)) {
    return [];
  }

  return db
    .select({
      branchId: inventoryMovements.branchId,
      businessId: inventoryMovements.businessId,
      lastMovementAt: sql<Date>`max(${inventoryMovements.occurredAt})`,
      movementCount: sql<number>`count(*)`,
      movementType: inventoryMovements.movementType,
      productId: inventoryMovements.productId,
      quantityDelta: sql<number>`coalesce(sum(${inventoryMovements.quantityDelta}), 0)`
    })
    .from(inventoryMovements)
    .where(buildInventoryMovementReportWhere(input))
    .groupBy(
      inventoryMovements.branchId,
      inventoryMovements.businessId,
      inventoryMovements.movementType,
      inventoryMovements.productId
    )
    .orderBy(
      desc(sql`abs(sum(${inventoryMovements.quantityDelta}))`),
      desc(sql`max(${inventoryMovements.occurredAt})`),
      asc(inventoryMovements.branchId),
      asc(inventoryMovements.productId),
      asc(inventoryMovements.movementType)
    )
    .then((rows) =>
      rows.map((row) => ({
        branchId: row.branchId,
        businessId: row.businessId,
        lastMovementAt: new Date(row.lastMovementAt),
        movementCount: Number(row.movementCount),
        movementType: row.movementType as InventoryMovementType,
        productId: row.productId,
        quantityDelta: Number(row.quantityDelta)
      }))
    );
};

export const listDrizzleSalesReturns = async (
  db: AppDatabase,
  input: SalesReportLookupInput
): Promise<SalesReturnSummaryRecord[]> => {
  if (!hasSalesReportScope(input)) {
    return [];
  }

  return db
    .select({
      branchId: inventoryMovements.branchId,
      businessId: inventoryMovements.businessId,
      lastReturnedAt: sql<Date>`max(${inventoryMovements.occurredAt})`,
      productId: inventoryMovements.productId,
      productName: sql<string>`max(${saleItems.productName})`,
      productSku: sql<string>`max(${saleItems.productSku})`,
      returnCount: sql<number>`count(*)`,
      returnedQuantity: sql<number>`coalesce(sum(${inventoryMovements.quantityDelta}), 0)`
    })
    .from(inventoryMovements)
    .innerJoin(
      saleItems,
      and(
        eq(saleItems.saleId, inventoryMovements.referenceId),
        eq(saleItems.productId, inventoryMovements.productId),
        eq(saleItems.tenantId, inventoryMovements.tenantId)
      )
    )
    .where(and(buildInventoryMovementReportWhere(input), eq(inventoryMovements.movementType, 'SALE_RETURN')))
    .groupBy(
      inventoryMovements.branchId,
      inventoryMovements.businessId,
      inventoryMovements.productId
    )
    .orderBy(
      desc(sql`sum(${inventoryMovements.quantityDelta})`),
      desc(sql`max(${inventoryMovements.occurredAt})`),
      asc(sql`max(${saleItems.productName})`)
    )
    .then((rows) =>
      rows.map((row) => ({
        branchId: row.branchId,
        businessId: row.businessId,
        lastReturnedAt: new Date(row.lastReturnedAt),
        productId: row.productId,
        productName: row.productName,
        productSku: row.productSku,
        returnCount: Number(row.returnCount),
        returnedQuantity: Number(row.returnedQuantity)
      }))
    );
};

const buildInventoryMovementReportWhere = (input: SalesReportLookupInput) =>
  and(
    eq(inventoryMovements.tenantId, input.tenantId),
    inArray(inventoryMovements.businessId, input.businessIds),
    inArray(inventoryMovements.branchId, input.branchIds),
    gte(inventoryMovements.occurredAt, input.occurredAtFrom),
    lt(inventoryMovements.occurredAt, input.occurredAtTo)
  );
