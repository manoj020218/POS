export const promisifyRequest = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const promisifyTransaction = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

export const getAll = <T>(db: IDBDatabase, storeName: string): Promise<T[]> =>
  promisifyRequest(db.transaction(storeName, 'readonly').objectStore(storeName).getAll());

export const getOne = <T>(db: IDBDatabase, storeName: string, key: IDBValidKey): Promise<T | undefined> =>
  promisifyRequest(db.transaction(storeName, 'readonly').objectStore(storeName).get(key));

export const putAll = async (db: IDBDatabase, storeName: string, records: unknown[]): Promise<void> => {
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  records.forEach((record) => store.put(record));
  await promisifyTransaction(tx);
};

export const putOne = async (db: IDBDatabase, storeName: string, record: unknown): Promise<void> => {
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).put(record);
  await promisifyTransaction(tx);
};
