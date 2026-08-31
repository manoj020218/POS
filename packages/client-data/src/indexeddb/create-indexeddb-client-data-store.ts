import type { ClientDataStore } from '../client-data-store.js';
import { createIndexedDbCustomerStore } from './customer-store.js';
import { openClientDatabase } from './db-connection.js';
import { createIndexedDbProductStore } from './product-store.js';
import { createIndexedDbSaleStore } from './sale-store.js';
import { createIndexedDbSettingsStore } from './settings-store.js';
import { createIndexedDbStockStore } from './stock-store.js';
import { createIndexedDbSyncStore } from './sync-store.js';

export const createIndexedDbClientDataStore = async (
  now: () => Date = () => new Date(),
  indexedDbFactory?: IDBFactory
): Promise<ClientDataStore> => {
  const db = await openClientDatabase(indexedDbFactory);

  return {
    customers: createIndexedDbCustomerStore(db),
    products: createIndexedDbProductStore(db),
    sales: createIndexedDbSaleStore(db),
    settings: createIndexedDbSettingsStore(db),
    stock: createIndexedDbStockStore(db),
    sync: createIndexedDbSyncStore(db, now)
  };
};
