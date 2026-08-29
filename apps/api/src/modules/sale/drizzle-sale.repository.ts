import { randomUUID } from 'node:crypto';

import { and, eq, inArray, sql } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { inventoryMovements, saleItems, saleSequences, sales } from '../../db/schema/index.js';
import type { InventoryRepository } from '../inventory/inventory.repository.js';
import type { InventoryBalanceLookupInput } from '../inventory/inventory.repository.js';
import type { ReportingRepository } from '../reporting/reporting.repository.js';
import type { SalesReportLookupInput, TopProductsLookupInput } from '../reporting/reporting.types.js';
import {
  listDrizzleBranchSales,
  listDrizzleCashierSales,
  listDrizzlePaymentMethodSales,
  listDrizzleTerminalSales
} from './drizzle-sale-breakdowns.js';
import {
  listDrizzleSalesReturns,
  listDrizzleStockMovements,
  listDrizzleTaxSummary
} from './drizzle-sale-operational-reporting.js';
import { defaultBusinessSettings } from '../settings/settings-defaults.js';
import { formatInvoiceNumber } from './sale-domain.js';
import { listDrizzleTopProducts, summarizeDrizzleSales } from './drizzle-sale-reporting.js';
import type { SaleRepository } from './sale.repository.js';
import {
  normalizeInventoryBalance,
  normalizeSale,
  requireSale,
  requireSequence
} from './sale-repository-helpers.js';
import type {
  CreateSaleReturnInput,
  CreateSaleInput,
  SaleDetailRecord,
  SaleReturnQuantityRecord
} from './sale.types.js';

export class DrizzleSaleRepository
  implements SaleRepository, InventoryRepository, ReportingRepository
{
  constructor(private readonly db: AppDatabase) {}

  async createSale(input: CreateSaleInput): Promise<SaleDetailRecord> {
    return this.db.transaction(async (tx) => {
      const saleId = randomUUID();
      const invoiceSequence = requireSequence(
        (
          await tx
            .insert(saleSequences)
            .values({
              lastValue: 1,
              tenantId: input.sale.tenantId,
              terminalId: input.sale.terminalId,
              updatedAt: new Date()
            })
            .onConflictDoUpdate({
              set: {
                lastValue: sql`${saleSequences.lastValue} + 1`,
                tenantId: input.sale.tenantId,
                updatedAt: new Date()
              },
              target: saleSequences.terminalId
            })
            .returning({ lastValue: saleSequences.lastValue })
        )[0]
      );
      const invoiceNumber = formatInvoiceNumber(
        input.invoicePrefix ?? defaultBusinessSettings.invoicePrefix,
        input.sale.branchCode,
        input.sale.terminalCode,
        invoiceSequence
      );
      const [saleRow] = await tx
        .insert(sales)
        .values({
          id: saleId,
          invoiceNumber,
          invoiceSequence,
          ...input.sale
        })
        .returning();
      const itemRows = await tx
        .insert(saleItems)
        .values(
          input.items.map((item) => ({
            ...item,
            id: randomUUID(),
            saleId
          }))
        )
        .returning();
      if (input.inventoryMovements.length > 0) {
        await tx.insert(inventoryMovements).values(
          input.inventoryMovements.map((movement) => ({
            ...movement,
            id: randomUUID(),
            referenceId: saleId
          }))
        );
      }

      return {
        items: itemRows.map((item) => item),
        sale: normalizeSale(requireSale(saleRow))
      };
    });
  }

  async listInventoryBalances(
    input: InventoryBalanceLookupInput
  ) {
    if (input.businessIds.length === 0) {
      return [];
    }

    const filters = [
      eq(inventoryMovements.tenantId, input.tenantId),
      inArray(inventoryMovements.businessId, input.businessIds),
      input.productId ? eq(inventoryMovements.productId, input.productId) : null
    ].filter(Boolean);
    const rows = await this.db
      .select({
        businessId: inventoryMovements.businessId,
        lastMovementAt: sql<Date | null>`max(${inventoryMovements.occurredAt})`,
        netMovementQuantity: sql<number>`coalesce(sum(${inventoryMovements.quantityDelta}), 0)`,
        productId: inventoryMovements.productId,
        tenantId: inventoryMovements.tenantId
      })
      .from(inventoryMovements)
      .where(and(filters[0]!, filters[1]!, ...(filters.slice(2) as [])))
      .groupBy(
        inventoryMovements.businessId,
        inventoryMovements.productId,
        inventoryMovements.tenantId
      );

    return rows.map(normalizeInventoryBalance);
  }

  async summarizeSales(input: SalesReportLookupInput) {
    return summarizeDrizzleSales(this.db, input);
  }

  async listSalesByBranch(input: SalesReportLookupInput) {
    return listDrizzleBranchSales(this.db, input);
  }

  async listSalesByTerminal(input: SalesReportLookupInput) {
    return listDrizzleTerminalSales(this.db, input);
  }

  async listSalesByCashier(input: SalesReportLookupInput) {
    return listDrizzleCashierSales(this.db, input);
  }

  async listSalesByPaymentMethod(input: SalesReportLookupInput) {
    return listDrizzlePaymentMethodSales(this.db, input);
  }

  async listTaxSummary(input: SalesReportLookupInput) {
    return listDrizzleTaxSummary(this.db, input);
  }

  async listTopProducts(input: TopProductsLookupInput) {
    return listDrizzleTopProducts(this.db, input);
  }

  async listStockMovements(input: SalesReportLookupInput) {
    return listDrizzleStockMovements(this.db, input);
  }

  async listSalesReturns(input: SalesReportLookupInput) {
    return listDrizzleSalesReturns(this.db, input);
  }

  async createSaleReturn(input: CreateSaleReturnInput): Promise<void> {
    if (input.inventoryMovements.length === 0) {
      return;
    }

    await this.db.insert(inventoryMovements).values(
      input.inventoryMovements.map((movement) => ({
        ...movement,
        id: randomUUID(),
        referenceId: input.saleId
      }))
    );
  }

  async findSaleDetailById(saleId: string, tenantId: string): Promise<SaleDetailRecord | null> {
    const [saleRow] = await this.db
      .select()
      .from(sales)
      .where(and(eq(sales.id, saleId), eq(sales.tenantId, tenantId)))
      .limit(1);
    if (!saleRow) {
      return null;
    }

    const itemRows = await this.db
      .select()
      .from(saleItems)
      .where(and(eq(saleItems.saleId, saleId), eq(saleItems.tenantId, tenantId)));

    return {
      items: itemRows.map((item) => item),
      sale: normalizeSale(saleRow)
    };
  }

  async listSaleMovementQuantities(
    saleId: string,
    tenantId: string,
    movementType: 'SALE' | 'SALE_RETURN'
  ): Promise<SaleReturnQuantityRecord[]> {
    const rows = await this.db
      .select({
        productId: inventoryMovements.productId,
        quantity: sql<number>`coalesce(sum(abs(${inventoryMovements.quantityDelta})), 0)`
      })
      .from(inventoryMovements)
      .where(
        and(
          eq(inventoryMovements.referenceId, saleId),
          eq(inventoryMovements.tenantId, tenantId),
          eq(inventoryMovements.movementType, movementType)
        )
      )
      .groupBy(inventoryMovements.productId);

    return rows.map((row) => ({
      productId: row.productId,
      quantity: Number(row.quantity)
    }));
  }
}
