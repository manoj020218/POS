export const dbName = 'smart-pos-client-data';
export const dbVersion = 1;

export const storeNames = {
  customers: 'customers',
  meta: 'meta',
  products: 'products',
  sales: 'sales',
  settings: 'settings',
  stock: 'stock',
  syncEvents: 'syncEvents'
} as const;

export const openClientDatabase = (indexedDbFactory: IDBFactory = indexedDB): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDbFactory.open(dbName, dbVersion);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(storeNames.products)) {
        db.createObjectStore(storeNames.products, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(storeNames.customers)) {
        db.createObjectStore(storeNames.customers, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(storeNames.sales)) {
        const salesStore = db.createObjectStore(storeNames.sales, { keyPath: 'sale.id' });
        salesStore.createIndex('bySyncEventId', 'sale.syncEventId', { unique: true });
      }
      if (!db.objectStoreNames.contains(storeNames.settings)) {
        db.createObjectStore(storeNames.settings, { keyPath: 'businessId' });
      }
      if (!db.objectStoreNames.contains(storeNames.stock)) {
        db.createObjectStore(storeNames.stock, { keyPath: ['businessId', 'productId'] });
      }
      if (!db.objectStoreNames.contains(storeNames.syncEvents)) {
        db.createObjectStore(storeNames.syncEvents, { keyPath: 'eventId' });
      }
      if (!db.objectStoreNames.contains(storeNames.meta)) {
        db.createObjectStore(storeNames.meta, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
