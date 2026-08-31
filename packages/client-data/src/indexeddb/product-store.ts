import { clone, searchProducts } from '../in-memory-store-helpers.js';
import type { ClientProductRecord, ProductRepository } from '../product-repository.js';
import { storeNames } from './db-connection.js';
import { getAll, getOne, putAll } from './idb-helpers.js';

export const createIndexedDbProductStore = (db: IDBDatabase): ProductRepository => ({
  findById: async (productId) => {
    const product = await getOne<ClientProductRecord>(db, storeNames.products, productId);
    return product ? clone(product) : null;
  },
  listByIds: async (productIds) => {
    const all = await getAll<ClientProductRecord>(db, storeNames.products);
    const wanted = new Set(productIds);
    return all.filter((product) => wanted.has(product.id)).map(clone);
  },
  search: async (input) => {
    const all = await getAll<ClientProductRecord>(db, storeNames.products);
    return searchProducts(all, input);
  },
  upsertProducts: async (products) => {
    await putAll(db, storeNames.products, products);
  }
});
