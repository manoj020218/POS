import { formatLocalInvoiceNumber } from '../checkout-calculator.js';
import { clone } from '../in-memory-store-helpers.js';
import type { ClientSaleDetail, SaleRepository } from '../sale-repository.js';
import { storeNames } from './db-connection.js';
import { getOne, promisifyRequest, putOne } from './idb-helpers.js';

type SequenceRecord = { key: string; sequence: number };

const sequenceKey = (branchCode: string, terminalCode: string) =>
  `invoice-seq:${branchCode.toUpperCase()}:${terminalCode.toUpperCase()}`;

const findBySyncEventId = async (db: IDBDatabase, syncEventId: string) => {
  const index = db.transaction(storeNames.sales, 'readonly').objectStore(storeNames.sales).index('bySyncEventId');
  return promisifyRequest(index.get(syncEventId) as IDBRequest<ClientSaleDetail | undefined>);
};

export const createIndexedDbSaleStore = (db: IDBDatabase): SaleRepository => ({
  allocateInvoiceNumber: async (input) => {
    const key = sequenceKey(input.branchCode, input.terminalCode);
    const existing = await getOne<SequenceRecord>(db, storeNames.meta, key);
    const nextSequence = (existing?.sequence ?? 0) + 1;

    await putOne(db, storeNames.meta, { key, sequence: nextSequence });

    return {
      invoiceNumber: formatLocalInvoiceNumber(
        input.invoicePrefix,
        input.branchCode,
        input.terminalCode,
        nextSequence
      ),
      localSequence: nextSequence
    };
  },
  findSaleById: async (saleId) => {
    const sale = await getOne<ClientSaleDetail>(db, storeNames.sales, saleId);
    return sale ? clone(sale) : null;
  },
  findSaleBySyncEventId: async (syncEventId) => {
    const sale = await findBySyncEventId(db, syncEventId);
    return sale ? clone(sale) : null;
  },
  markSaleSyncStateByEventId: async (syncEventId, state, lastSyncError) => {
    const sale = await findBySyncEventId(db, syncEventId);
    if (!sale) {
      return;
    }

    await putOne(db, storeNames.sales, {
      items: sale.items,
      sale: { ...sale.sale, lastSyncError: lastSyncError ?? undefined, syncState: state }
    });
  },
  saveSale: async (detail) => {
    const stored = clone(detail);
    await putOne(db, storeNames.sales, stored);
    return clone(stored);
  }
});
