import { randomUUID } from 'node:crypto';

import type { InventoryRepository } from '../inventory/inventory.repository.js';
import type { InventoryBalanceLookupInput } from '../inventory/inventory.repository.js';
import type {
  InventoryMovementBalanceRecord,
  InventoryMovementRecord
} from '../inventory/inventory.types.js';
import { formatInvoiceNumber } from './sale-domain.js';
import type { SaleRepository } from './sale.repository.js';
import type {
  CreateSaleInput,
  CreateSaleReturnInput,
  SaleDetailRecord,
  SaleItemRecord,
  SaleRecord,
  SaleReturnQuantityRecord
} from './sale.types.js';

export class InMemorySaleRepository implements SaleRepository, InventoryRepository {
  private readonly invoiceSequences = new Map<string, number>();
  private readonly inventoryMovements = new Map<string, InventoryMovementRecord>();
  private readonly items = new Map<string, SaleItemRecord[]>();
  private readonly sales = new Map<string, SaleRecord>();

  async createSale(input: CreateSaleInput): Promise<SaleDetailRecord> {
    const saleId = randomUUID();
    const invoiceSequence = (this.invoiceSequences.get(input.sale.terminalId) ?? 0) + 1;
    this.invoiceSequences.set(input.sale.terminalId, invoiceSequence);
    const sale: SaleRecord = {
      ...input.sale,
      createdAt: new Date(),
      id: saleId,
      invoiceNumber: formatInvoiceNumber(
        input.sale.branchCode,
        input.sale.terminalCode,
        invoiceSequence
      ),
      invoiceSequence
    };
    const items = input.items.map((item) => ({
      ...item,
      createdAt: new Date(),
      id: randomUUID(),
      saleId
    }));
    input.inventoryMovements.forEach((movement) => {
      const record: InventoryMovementRecord = {
        ...movement,
        createdAt: new Date(),
        id: randomUUID(),
        referenceId: saleId
      };
      this.inventoryMovements.set(record.id, record);
    });

    this.sales.set(saleId, sale);
    this.items.set(saleId, items);

    return { items, sale };
  }

  async createSaleReturn(input: CreateSaleReturnInput): Promise<void> {
    input.inventoryMovements.forEach((movement) => {
      const record: InventoryMovementRecord = {
        ...movement,
        createdAt: new Date(),
        id: randomUUID(),
        referenceId: input.saleId
      };
      this.inventoryMovements.set(record.id, record);
    });
  }

  async findSaleDetailById(saleId: string, tenantId: string): Promise<SaleDetailRecord | null> {
    const sale = this.sales.get(saleId);
    if (!sale || sale.tenantId !== tenantId) {
      return null;
    }

    return {
      items: this.items.get(saleId) ?? [],
      sale
    };
  }

  async listSaleMovementQuantities(
    saleId: string,
    tenantId: string,
    movementType: 'SALE' | 'SALE_RETURN'
  ): Promise<SaleReturnQuantityRecord[]> {
    const quantities = new Map<string, number>();

    [...this.inventoryMovements.values()]
      .filter((movement) => {
        return (
          movement.referenceId === saleId &&
          movement.tenantId === tenantId &&
          movement.movementType === movementType
        );
      })
      .forEach((movement) => {
        quantities.set(
          movement.productId,
          (quantities.get(movement.productId) ?? 0) + Math.abs(movement.quantityDelta)
        );
      });

    return [...quantities.entries()].map(([productId, quantity]) => ({
      productId,
      quantity
    }));
  }

  async listInventoryBalances(
    input: InventoryBalanceLookupInput
  ): Promise<InventoryMovementBalanceRecord[]> {
    const allowedBusinessIds = new Set(input.businessIds);
    const balances = new Map<string, InventoryMovementBalanceRecord>();

    [...this.inventoryMovements.values()]
      .filter((movement) => {
        return (
          movement.tenantId === input.tenantId &&
          allowedBusinessIds.has(movement.businessId) &&
          (!input.productId || movement.productId === input.productId)
        );
      })
      .forEach((movement) => {
        const key = `${movement.businessId}:${movement.productId}`;
        const existing = balances.get(key);
        if (!existing) {
          balances.set(key, {
            businessId: movement.businessId,
            lastMovementAt: movement.occurredAt,
            netMovementQuantity: movement.quantityDelta,
            productId: movement.productId,
            tenantId: movement.tenantId
          });
          return;
        }

        balances.set(key, {
          ...existing,
          lastMovementAt:
            !existing.lastMovementAt || existing.lastMovementAt < movement.occurredAt
              ? movement.occurredAt
              : existing.lastMovementAt,
          netMovementQuantity: existing.netMovementQuantity + movement.quantityDelta
        });
      });

    return [...balances.values()].sort(
      (left, right) =>
        left.businessId.localeCompare(right.businessId) ||
        left.productId.localeCompare(right.productId)
    );
  }
}
