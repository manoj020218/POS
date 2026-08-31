import { clone } from '../in-memory-store-helpers.js';
import type { ClientProductRecord } from '../product-repository.js';
import type { ClientStockBalanceRecord, StockRepository } from '../stock-repository.js';
import { storeNames } from './db-connection.js';
import { getOne, putAll, putOne } from './idb-helpers.js';

const stockKey = (businessId: string, productId: string) => [businessId, productId];

export const createIndexedDbStockStore = (db: IDBDatabase): StockRepository => ({
  applyDeltas: async (deltas) => {
    for (const delta of deltas) {
      const existing = await getOne<ClientStockBalanceRecord>(
        db,
        storeNames.stock,
        stockKey(delta.businessId, delta.productId)
      );
      const baseQuantity =
        existing?.quantityOnHand ??
        (await getOne<ClientProductRecord>(db, storeNames.products, delta.productId))?.openingStock ??
        0;

      await putOne(db, storeNames.stock, {
        businessId: delta.businessId,
        productId: delta.productId,
        quantityOnHand: baseQuantity + delta.quantityDelta,
        updatedAt: delta.occurredAt
      });
    }
  },
  getBalances: async (businessId, productIds) => {
    const results: ClientStockBalanceRecord[] = [];

    for (const productId of productIds) {
      const existing = await getOne<ClientStockBalanceRecord>(db, storeNames.stock, stockKey(businessId, productId));
      if (existing) {
        results.push(clone(existing));
        continue;
      }

      const product = await getOne<ClientProductRecord>(db, storeNames.products, productId);
      if (product && product.businessId === businessId) {
        results.push({
          businessId,
          productId,
          quantityOnHand: product.openingStock,
          updatedAt: product.updatedAt
        });
      }
    }

    return results;
  },
  upsertBalances: async (balances) => {
    await putAll(db, storeNames.stock, balances);
  }
});
