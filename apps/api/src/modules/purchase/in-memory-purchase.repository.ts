import { randomUUID } from 'node:crypto';

import type { InventoryMovementRecord } from '../inventory/inventory.types.js';
import type { PurchaseRepository } from './purchase.repository.js';
import type {
  CreatePurchaseInput,
  PurchaseDetailRecord,
  PurchaseItemRecord,
  PurchaseRecord
} from './purchase.types.js';

export class InMemoryPurchaseRepository implements PurchaseRepository {
  private readonly items = new Map<string, PurchaseItemRecord[]>();
  private readonly purchases = new Map<string, PurchaseRecord>();

  constructor(
    private readonly inventoryMovements: Map<string, InventoryMovementRecord> = new Map()
  ) {}

  async createPurchase(input: CreatePurchaseInput): Promise<PurchaseDetailRecord> {
    const purchaseId = randomUUID();
    const purchase: PurchaseRecord = {
      ...input.purchase,
      createdAt: new Date(),
      id: purchaseId
    };
    const items = input.items.map((item) => ({
      ...item,
      createdAt: new Date(),
      id: randomUUID(),
      purchaseId
    }));

    input.inventoryMovements.forEach((movement) => {
      const record: InventoryMovementRecord = {
        ...movement,
        createdAt: new Date(),
        id: randomUUID(),
        referenceId: purchaseId
      };
      this.inventoryMovements.set(record.id, record);
    });

    this.purchases.set(purchaseId, purchase);
    this.items.set(purchaseId, items);

    return { items, purchase };
  }

  async listPurchases(tenantId: string, branchIds: string[], supplierId?: string) {
    const allowedBranchIds = new Set(branchIds);

    return [...this.purchases.values()]
      .filter((purchase) => {
        if (purchase.tenantId !== tenantId) return false;
        if (!allowedBranchIds.has(purchase.branchId)) return false;
        if (supplierId && purchase.supplierId !== supplierId) return false;
        return true;
      })
      .sort(
        (left, right) =>
          right.occurredAt.getTime() - left.occurredAt.getTime() ||
          right.createdAt.getTime() - left.createdAt.getTime() ||
          right.id.localeCompare(left.id)
      );
  }
}
