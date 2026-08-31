import type { ClientCustomerRecord, CustomerRepository } from '../customer-repository.js';
import { clone, searchCustomers } from '../in-memory-store-helpers.js';
import { storeNames } from './db-connection.js';
import { getAll, getOne, putAll } from './idb-helpers.js';

export const createIndexedDbCustomerStore = (db: IDBDatabase): CustomerRepository => ({
  findById: async (customerId) => {
    const customer = await getOne<ClientCustomerRecord>(db, storeNames.customers, customerId);
    return customer ? clone(customer) : null;
  },
  search: async (input) => {
    const all = await getAll<ClientCustomerRecord>(db, storeNames.customers);
    return searchCustomers(all, input);
  },
  upsertCustomers: async (customers) => {
    await putAll(db, storeNames.customers, customers);
  }
});
