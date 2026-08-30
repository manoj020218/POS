import { describe, expect, it } from 'vitest';

import {
  createClientSyncService,
  createInMemoryClientDataStore,
  type ClientRemoteApi
} from '../src/index.js';
import { createCustomer, createRemoteCustomerSnapshot, createRemoteProductSnapshot, terminalContext } from './fixtures.js';

describe('createClientSyncService', () => {
  it('pushes outbox events first, then hydrates local product and customer changes from pull', async () => {
    const store = createInMemoryClientDataStore(() => new Date('2026-08-29T15:00:00.000Z'));

    await store.sales.saveSale({
      items: [],
      sale: {
        branchCode: terminalContext.branchCode,
        branchId: terminalContext.branchId,
        businessId: terminalContext.businessId,
        cashierUserId: terminalContext.cashierUserId,
        changeAmount: 0,
        createdAt: new Date('2026-08-29T14:55:00.000Z'),
        discountAmount: 0,
        id: 'sale-1',
        invoiceNumber: 'INV-MAIN-POS1-000001',
        localSequence: 1,
        occurredAt: new Date('2026-08-29T14:55:00.000Z'),
        paymentMethod: 'CASH',
        subtotalAmount: 10000,
        syncEventId: 'sale-created-0001',
        syncState: 'PENDING',
        taxAmount: 0,
        tenderedAmount: 10000,
        terminalCode: terminalContext.terminalCode,
        terminalId: terminalContext.terminalId,
        totalAmount: 10000
      }
    });
    await store.sync.enqueueEvent({
      branchId: terminalContext.branchId,
      createdAt: new Date('2026-08-29T14:55:00.000Z'),
      deviceId: terminalContext.deviceId,
      entityId: 'sale-1',
      eventId: 'sale-created-0001',
      payload: { terminalId: terminalContext.terminalId },
      type: 'SALE_CREATED'
    });

    const remoteApi: ClientRemoteApi = {
      getBusinessSettings: async () => {
        throw new Error('unused');
      },
      listBranches: async () => [],
      listTerminals: async () => [],
      pullChanges: async () => ({
        changes: [
          {
            businessId: terminalContext.businessId,
            changeId: 'product-change',
            changeType: 'PRODUCT_UPSERTED',
            record: createRemoteProductSnapshot(),
            source: 'SERVER',
            updatedAt: '2026-08-29T15:01:00.000Z'
          },
          {
            businessId: terminalContext.businessId,
            changeId: 'customer-change',
            changeType: 'CUSTOMER_UPSERTED',
            record: createRemoteCustomerSnapshot({ id: createCustomer().id }),
            source: 'SERVER',
            updatedAt: '2026-08-29T15:02:00.000Z'
          },
          {
            businessId: terminalContext.businessId,
            changeId: 'category-change',
            changeType: 'CATEGORY_UPSERTED',
            record: { id: 'cat-1', name: 'General' },
            source: 'SERVER',
            updatedAt: '2026-08-29T15:03:00.000Z'
          },
          {
            branchId: terminalContext.branchId,
            changeId: 'applied-event',
            changeType: 'SYNC_EVENT_APPLIED',
            record: {
              createdAt: '2026-08-29T14:55:00.000Z',
              deviceId: terminalContext.deviceId,
              entityId: 'sale-1',
              eventId: 'sale-created-0001',
              payload: { terminalId: terminalContext.terminalId },
              type: 'SALE_CREATED'
            },
            source: 'CLIENT',
            updatedAt: '2026-08-29T15:04:00.000Z'
          }
        ],
        nextCursor: 'cursor-01',
        serverTime: '2026-08-29T15:05:00.000Z'
      }),
      pushEvents: async (input) => {
        expect(input.events).toHaveLength(1);
        expect(input.events[0]?.eventId).toBe('sale-created-0001');

        return {
          acceptedCount: 1,
          duplicateCount: 0,
          events: [
            {
              branchId: terminalContext.branchId,
              entityId: 'sale-1',
              eventId: 'sale-created-0001',
              receivedAt: '2026-08-29T15:00:30.000Z',
              result: 'accepted',
              state: 'APPLIED',
              type: 'SALE_CREATED'
            }
          ]
        };
      }
    };

    const service = createClientSyncService({ remoteApi, store });
    const result = await service.syncNow({ branchId: terminalContext.branchId, limit: 25 });
    const syncedSale = await store.sales.findSaleById('sale-1');
    const syncedEvent = await store.sync.findEventById('sale-created-0001');
    const product = await store.products.findById(createRemoteProductSnapshot().id);
    const customer = await store.customers.findById(createRemoteCustomerSnapshot().id);

    expect(result.push).toEqual({
      appliedCount: 1,
      failedCount: 0,
      pendingCount: 0,
      pushedCount: 1
    });
    expect(result.pull).toMatchObject({
      acknowledgementCount: 1,
      customerCount: 1,
      ignoredChanges: { CATEGORY_UPSERTED: 1 },
      nextCursor: 'cursor-01',
      productCount: 1
    });
    expect(syncedSale?.sale.syncState).toBe('SYNCED');
    expect(syncedEvent?.state).toBe('APPLIED');
    expect(product?.name).toBe('Masala Dosa');
    expect(customer?.name).toBe('Walk-in Customer');
    await expect(store.sync.getPullCursor()).resolves.toBe('cursor-01');
  });
});
