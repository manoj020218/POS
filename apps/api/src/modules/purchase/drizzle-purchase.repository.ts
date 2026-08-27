import { randomUUID } from 'node:crypto';

import { and, desc, eq, inArray } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import {
  inventoryMovements,
  purchaseItems,
  purchases
} from '../../db/schema/index.js';
import type { PurchaseRepository } from './purchase.repository.js';
import type {
  CreatePurchaseInput,
  PurchaseDetailRecord,
  PurchaseRecord
} from './purchase.types.js';

type PurchaseRow = Omit<PurchaseRecord, 'notes' | 'referenceNumber' | 'supplierId' | 'supplierName'> & {
  notes: string | null;
  referenceNumber: string | null;
  supplierId: string | null;
  supplierName: string | null;
};

export class DrizzlePurchaseRepository implements PurchaseRepository {
  constructor(private readonly db: AppDatabase) {}

  async createPurchase(input: CreatePurchaseInput): Promise<PurchaseDetailRecord> {
    return this.db.transaction(async (tx) => {
      const purchaseId = randomUUID();
      const [purchaseRow] = await tx
        .insert(purchases)
        .values({
          id: purchaseId,
          ...input.purchase
        })
        .returning();
      const itemRows = await tx
        .insert(purchaseItems)
        .values(
          input.items.map((item) => ({
            ...item,
            id: randomUUID(),
            purchaseId
          }))
        )
        .returning();

      if (input.inventoryMovements.length > 0) {
        await tx.insert(inventoryMovements).values(
          input.inventoryMovements.map((movement) => ({
            ...movement,
            id: randomUUID(),
            referenceId: purchaseId
          }))
        );
      }

      return {
        items: itemRows.map((item) => item),
        purchase: normalizePurchase(requirePurchase(purchaseRow))
      };
    });
  }

  async listPurchases(tenantId: string, branchIds: string[], supplierId?: string): Promise<PurchaseRecord[]> {
    if (branchIds.length === 0) {
      return [];
    }

    const whereClause = [
      eq(purchases.tenantId, tenantId),
      inArray(purchases.branchId, branchIds),
      supplierId ? eq(purchases.supplierId, supplierId) : null
    ].filter(Boolean);
    const records = await this.db
      .select()
      .from(purchases)
      .where(and(whereClause[0]!, whereClause[1]!, ...(whereClause.slice(2) as [])))
      .orderBy(desc(purchases.occurredAt), desc(purchases.createdAt), desc(purchases.id));

    return records.map(normalizePurchase);
  }
}

const requirePurchase = (record: PurchaseRow | undefined) => {
  if (!record) {
    throw new Error('Purchase row missing after insert');
  }

  return record;
};

const normalizePurchase = (record: PurchaseRow): PurchaseRecord => ({
  ...record,
  notes: record.notes ?? undefined,
  referenceNumber: record.referenceNumber ?? undefined,
  supplierId: record.supplierId ?? undefined,
  supplierName: record.supplierName ?? undefined
});
