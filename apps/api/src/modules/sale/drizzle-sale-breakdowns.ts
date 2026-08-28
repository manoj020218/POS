import { asc, desc, eq, sql } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { saleItems, sales } from '../../db/schema/index.js';
import type {
  BranchSalesSummaryRecord,
  CashierSalesSummaryRecord,
  PaymentMethodSummaryRecord,
  SalesReportLookupInput,
  TerminalSalesSummaryRecord
} from '../reporting/reporting.types.js';
import {
  buildSalesReportWhere,
  hasSalesReportScope,
  normalizeSalesSummaryRecord,
  salesSummarySelect
} from './drizzle-sale-reporting-shared.js';

export const listDrizzleBranchSales = async (
  db: AppDatabase,
  input: SalesReportLookupInput
): Promise<BranchSalesSummaryRecord[]> => {
  if (!hasSalesReportScope(input)) {
    return [];
  }

  const where = buildSalesReportWhere(input);
  const [saleRows, quantityRows] = await Promise.all([
    db
      .select({
        branchCode: sales.branchCode,
        branchId: sales.branchId,
        businessId: sales.businessId,
        ...salesSummarySelect
      })
      .from(sales)
      .where(where)
      .groupBy(sales.branchCode, sales.branchId, sales.businessId)
      .orderBy(desc(sql`sum(${sales.totalAmount})`), asc(sales.branchCode)),
    db
      .select({
        branchId: sales.branchId,
        totalQuantity: sql<number>`coalesce(sum(${saleItems.quantity}), 0)`
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(where)
      .groupBy(sales.branchId)
  ]);
  const quantitiesByBranchId = new Map(
    quantityRows.map((row) => [row.branchId, Number(row.totalQuantity)] as const)
  );

  return saleRows.map((row) => ({
    ...normalizeSalesSummaryRecord({
      ...row,
      totalQuantity: quantitiesByBranchId.get(row.branchId)
    }),
    branchCode: row.branchCode,
    branchId: row.branchId,
    businessId: row.businessId
  }));
};

export const listDrizzleTerminalSales = async (
  db: AppDatabase,
  input: SalesReportLookupInput
): Promise<TerminalSalesSummaryRecord[]> => {
  if (!hasSalesReportScope(input)) {
    return [];
  }

  const where = buildSalesReportWhere(input);
  const [saleRows, quantityRows] = await Promise.all([
    db
      .select({
        branchId: sales.branchId,
        businessId: sales.businessId,
        terminalCode: sales.terminalCode,
        terminalId: sales.terminalId,
        ...salesSummarySelect
      })
      .from(sales)
      .where(where)
      .groupBy(sales.branchId, sales.businessId, sales.terminalCode, sales.terminalId)
      .orderBy(desc(sql`sum(${sales.totalAmount})`), asc(sales.terminalCode)),
    db
      .select({
        terminalId: sales.terminalId,
        totalQuantity: sql<number>`coalesce(sum(${saleItems.quantity}), 0)`
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(where)
      .groupBy(sales.terminalId)
  ]);
  const quantitiesByTerminalId = new Map(
    quantityRows.map((row) => [row.terminalId, Number(row.totalQuantity)] as const)
  );

  return saleRows.map((row) => ({
    ...normalizeSalesSummaryRecord({
      ...row,
      totalQuantity: quantitiesByTerminalId.get(row.terminalId)
    }),
    branchId: row.branchId,
    businessId: row.businessId,
    terminalCode: row.terminalCode,
    terminalId: row.terminalId
  }));
};

export const listDrizzleCashierSales = async (
  db: AppDatabase,
  input: SalesReportLookupInput
): Promise<CashierSalesSummaryRecord[]> => {
  if (!hasSalesReportScope(input)) {
    return [];
  }

  const where = buildSalesReportWhere(input);
  const [saleRows, quantityRows] = await Promise.all([
    db
      .select({
        cashierUserId: sales.cashierUserId,
        ...salesSummarySelect
      })
      .from(sales)
      .where(where)
      .groupBy(sales.cashierUserId)
      .orderBy(desc(sql`sum(${sales.totalAmount})`), asc(sales.cashierUserId)),
    db
      .select({
        cashierUserId: sales.cashierUserId,
        totalQuantity: sql<number>`coalesce(sum(${saleItems.quantity}), 0)`
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(where)
      .groupBy(sales.cashierUserId)
  ]);
  const quantitiesByCashierId = new Map(
    quantityRows.map((row) => [row.cashierUserId, Number(row.totalQuantity)] as const)
  );

  return saleRows.map((row) => ({
    ...normalizeSalesSummaryRecord({
      ...row,
      totalQuantity: quantitiesByCashierId.get(row.cashierUserId)
    }),
    cashierUserId: row.cashierUserId
  }));
};

export const listDrizzlePaymentMethodSales = async (
  db: AppDatabase,
  input: SalesReportLookupInput
): Promise<PaymentMethodSummaryRecord[]> => {
  if (!hasSalesReportScope(input)) {
    return [];
  }

  const where = buildSalesReportWhere(input);
  const [saleRows, quantityRows] = await Promise.all([
    db
      .select({
        paymentMethod: sales.paymentMethod,
        ...salesSummarySelect
      })
      .from(sales)
      .where(where)
      .groupBy(sales.paymentMethod)
      .orderBy(desc(sql`sum(${sales.totalAmount})`), asc(sales.paymentMethod)),
    db
      .select({
        paymentMethod: sales.paymentMethod,
        totalQuantity: sql<number>`coalesce(sum(${saleItems.quantity}), 0)`
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(where)
      .groupBy(sales.paymentMethod)
  ]);
  const quantitiesByPaymentMethod = new Map(
    quantityRows.map((row) => [row.paymentMethod, Number(row.totalQuantity)] as const)
  );

  return saleRows.map((row) => ({
    ...normalizeSalesSummaryRecord({
      ...row,
      totalQuantity: quantitiesByPaymentMethod.get(row.paymentMethod)
    }),
    paymentMethod: row.paymentMethod as PaymentMethodSummaryRecord['paymentMethod']
  }));
};
