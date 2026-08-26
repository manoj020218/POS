import { randomUUID } from 'node:crypto';

import { and, eq, inArray, sql } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { inventoryMovements, saleItems, saleSequences, sales } from '../../db/schema/index.js';
import type { InventoryRepository } from '../inventory/inventory.repository.js';
import type { InventoryBalanceLookupInput } from '../inventory/inventory.repository.js';
import type { InventoryMovementBalanceRecord } from '../inventory/inventory.types.js';
import { formatInvoiceNumber } from './sale-domain.js';
import type { SaleRepository } from './sale.repository.js';
import type {
  CreateSaleReturnInput,
  CreateSaleInput,
  PaymentMethod,
  SaleDetailRecord,
  SaleRecord,
  SaleReturnQuantityRecord
} from './sale.types.js';

type SaleRow = Omit<SaleRecord, 'customerId' | 'customerName' | 'paymentMethod'> & {
  customerId: string | null;
  customerName: string | null;
  paymentMethod: string;
};

type InventoryBalanceRow = Omit<InventoryMovementBalanceRecord, 'lastMovementAt' | 'netMovementQuantity'> & {
  lastMovementAt: Date | null;
  netMovementQuantity: number;
};

export class DrizzleSaleRepository implements SaleRepository, InventoryRepository {
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
  ): Promise<InventoryMovementBalanceRecord[]> {
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

const requireSale = (sale: SaleRow | undefined) => {
  if (!sale) {
    throw new Error('Sale row missing after insert');
  }

  return sale;
};

const requireSequence = (sequence: { lastValue: number } | undefined) => {
  if (!sequence) {
    throw new Error('Sale invoice sequence missing after reservation');
  }

  return sequence.lastValue;
};

const normalizeInventoryBalance = (row: InventoryBalanceRow): InventoryMovementBalanceRecord => ({
  businessId: row.businessId,
  lastMovementAt: row.lastMovementAt ?? undefined,
  netMovementQuantity: Number(row.netMovementQuantity),
  productId: row.productId,
  tenantId: row.tenantId
});

const normalizeSale = (sale: SaleRow): SaleRecord => ({
  ...sale,
  customerId: sale.customerId ?? undefined,
  customerName: sale.customerName ?? undefined,
  paymentMethod: sale.paymentMethod as PaymentMethod
});
