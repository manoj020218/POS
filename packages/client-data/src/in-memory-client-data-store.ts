import { formatLocalInvoiceNumber } from './checkout-calculator.js';
import type { ClientDataStore } from './client-data-store.js';
import type { ClientCustomerRecord } from './customer-repository.js';
import {
  clone,
  readStockBalance,
  searchCustomers,
  searchProducts,
  stockKey
} from './in-memory-store-helpers.js';
import type { ClientProductRecord } from './product-repository.js';
import type { ClientSaleDetail } from './sale-repository.js';
import type { ClientBusinessSettings } from './settings-repository.js';
import type { ClientStockBalanceRecord } from './stock-repository.js';
import type { ClientSyncEventRecord } from './sync-repository.js';

export const createInMemoryClientDataStore = (now: () => Date = () => new Date()): ClientDataStore => {
  const products = new Map<string, ClientProductRecord>();
  const customers = new Map<string, ClientCustomerRecord>();
  const sales = new Map<string, ClientSaleDetail>();
  const syncEventToSaleId = new Map<string, string>();
  const settings = new Map<string, ClientBusinessSettings>();
  const stockBalances = new Map<string, ClientStockBalanceRecord>();
  const syncEvents = new Map<string, ClientSyncEventRecord>();
  const invoiceSequences = new Map<string, number>();
  let pullCursor: string | null = null;

  return {
    customers: {
      findById: async (customerId) => {
        const customer = customers.get(customerId);
        return customer ? clone(customer) : null;
      },
      search: async (input) => searchCustomers(customers.values(), input),
      upsertCustomers: async (records) => {
        records.forEach((record) => customers.set(record.id, clone(record)));
      }
    },
    products: {
      findById: async (productId) => {
        const product = products.get(productId);
        return product ? clone(product) : null;
      },
      listByIds: async (productIds) =>
        productIds.flatMap((productId) => {
          const product = products.get(productId);
          return product ? [clone(product)] : [];
        }),
      search: async (input) => searchProducts(products.values(), input),
      upsertProducts: async (records) => {
        records.forEach((record) => products.set(record.id, clone(record)));
      }
    },
    sales: {
      allocateInvoiceNumber: async (input) => {
        const key = `${input.branchCode}:${input.terminalCode}`.toUpperCase();
        const nextSequence = (invoiceSequences.get(key) ?? 0) + 1;
        invoiceSequences.set(key, nextSequence);

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
        const sale = sales.get(saleId);
        return sale ? clone(sale) : null;
      },
      findSaleBySyncEventId: async (syncEventId) => {
        const saleId = syncEventToSaleId.get(syncEventId);
        const sale = saleId ? sales.get(saleId) : null;
        return sale ? clone(sale) : null;
      },
      markSaleSyncStateByEventId: async (syncEventId, state, lastSyncError) => {
        const saleId = syncEventToSaleId.get(syncEventId);
        const sale = saleId ? sales.get(saleId) : null;
        if (!sale) {
          return;
        }

        sales.set(saleId!, {
          items: clone(sale.items),
          sale: {
            ...clone(sale.sale),
            lastSyncError: lastSyncError ?? undefined,
            syncState: state
          }
        });
      },
      saveSale: async (detail) => {
        const stored = clone(detail);
        sales.set(stored.sale.id, stored);
        syncEventToSaleId.set(stored.sale.syncEventId, stored.sale.id);
        return clone(stored);
      }
    },
    settings: {
      findBusinessSettings: async (businessId) => {
        const businessSettings = settings.get(businessId);
        return businessSettings ? clone(businessSettings) : null;
      },
      saveBusinessSettings: async (businessSettings) => {
        settings.set(businessSettings.businessId, clone(businessSettings));
      }
    },
    stock: {
      applyDeltas: async (deltas) => {
        deltas.forEach((delta) => {
          const existing =
            readStockBalance(stockBalances, products, delta.businessId, delta.productId) ??
            {
              businessId: delta.businessId,
              productId: delta.productId,
              quantityOnHand: 0,
              updatedAt: delta.occurredAt
            };

          stockBalances.set(stockKey(delta.businessId, delta.productId), {
            ...existing,
            quantityOnHand: existing.quantityOnHand + delta.quantityDelta,
            updatedAt: delta.occurredAt
          });
        });
      },
      getBalances: async (businessId, productIds) =>
        productIds.flatMap((productId) => {
          const balance = readStockBalance(stockBalances, products, businessId, productId);
          return balance ? [balance] : [];
        }),
      upsertBalances: async (balances) => {
        balances.forEach((balance) =>
          stockBalances.set(stockKey(balance.businessId, balance.productId), clone(balance))
        );
      }
    },
    sync: {
      enqueueEvent: async (event) => {
        const record = {
          ...clone(event),
          failure: null,
          state: 'PENDING' as const,
          updatedAt: now()
        };

        syncEvents.set(record.eventId, record);
        return clone(record);
      },
      findEventById: async (eventId) => {
        const event = syncEvents.get(eventId);
        return event ? clone(event) : null;
      },
      getPullCursor: async () => pullCursor,
      listPushableEvents: async (limit) =>
        [...syncEvents.values()]
          .filter((event) => event.state !== 'APPLIED')
          .sort(
            (left, right) =>
              left.createdAt.getTime() - right.createdAt.getTime() ||
              left.eventId.localeCompare(right.eventId)
          )
          .slice(0, limit)
          .map(clone),
      markEventApplied: async (eventId, receivedAt, updatedAt = now()) => {
        const event = syncEvents.get(eventId);
        if (!event) {
          return;
        }

        syncEvents.set(eventId, {
          ...clone(event),
          failure: null,
          receivedAt,
          state: 'APPLIED',
          updatedAt
        });
      },
      markEventFailed: async (eventId, failure, updatedAt = now()) => {
        const event = syncEvents.get(eventId);
        if (!event) {
          return;
        }

        syncEvents.set(eventId, {
          ...clone(event),
          failure: clone(failure),
          state: 'FAILED',
          updatedAt
        });
      },
      savePullCursor: async (cursor) => {
        pullCursor = cursor;
      }
    }
  };
};
