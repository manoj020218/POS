import { IDBFactory } from 'fake-indexeddb';
import { createRecordingPrinterService } from '@smart-pos/printer';
import { describe, expect, it } from 'vitest';

import { createIndexedDbClientDataStore, createLocalCheckoutService } from '../src/index.js';
import { createCustomer, createProduct, createSettings, terminalContext } from './fixtures.js';

const createIdFactory = (...values: string[]) => {
  let index = 0;
  return () => values[index++] ?? `generated-${index}`;
};

describe('createIndexedDbClientDataStore', () => {
  it('persists products, customers, and settings, and supports a full local checkout', async () => {
    const store = await createIndexedDbClientDataStore(() => new Date('2026-08-29T12:00:00.000Z'), new IDBFactory());
    const printer = createRecordingPrinterService(() => new Date('2026-08-29T12:31:00.000Z'));
    const product = createProduct();
    const customer = createCustomer();

    await store.settings.saveBusinessSettings(createSettings(true));
    await store.products.upsertProducts([product]);
    await store.customers.upsertCustomers([customer]);

    const foundProduct = await store.products.findById(product.id);
    const foundCustomer = await store.customers.findById(customer.id);
    const foundSettings = await store.settings.findBusinessSettings(terminalContext.businessId);

    expect(foundProduct).toEqual(product);
    expect(foundCustomer).toEqual(customer);
    expect(foundSettings?.businessId).toBe(terminalContext.businessId);

    const service = createLocalCheckoutService({
      createId: createIdFactory('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sale-created-0001'),
      now: () => new Date('2026-08-29T12:30:00.000Z'),
      printerService: printer,
      store
    });

    const result = await service.completeSale({
      context: terminalContext,
      customerId: customer.id,
      items: [{ productId: product.id, quantity: 2 }],
      occurredAt: new Date('2026-08-29T12:29:00.000Z'),
      payment: { method: 'CASH', tenderedAmount: 30000 }
    });

    const sale = await store.sales.findSaleById(result.saleId);
    const saleByEvent = await store.sales.findSaleBySyncEventId(result.syncEvent.eventId);
    const event = await store.sync.findEventById(result.syncEvent.eventId);
    const stock = await store.stock.getBalances(terminalContext.businessId, [product.id]);
    const pushable = await store.sync.listPushableEvents(10);

    expect(result.printOutcome.status).toBe('PRINTED');
    expect(sale?.sale).toMatchObject({
      changeAmount: 4800,
      customerId: customer.id,
      invoiceNumber: 'INV-MAIN-POS1-000001',
      syncState: 'PENDING',
      totalAmount: 25200
    });
    expect(saleByEvent?.sale.id).toBe(result.saleId);
    expect(event).toMatchObject({ entityId: result.saleId, state: 'PENDING', type: 'SALE_CREATED' });
    expect(stock[0]?.quantityOnHand).toBe(8);
    expect(pushable).toHaveLength(1);

    await store.sync.markEventApplied(result.syncEvent.eventId, new Date('2026-08-29T12:32:00.000Z'));
    expect(await store.sync.listPushableEvents(10)).toHaveLength(0);
  });

  it('rejects checkout when tracked inventory is insufficient', async () => {
    const store = await createIndexedDbClientDataStore(() => new Date(), new IDBFactory());
    const product = createProduct({ openingStock: 1 });

    await store.settings.saveBusinessSettings(createSettings(false));
    await store.products.upsertProducts([product]);

    const service = createLocalCheckoutService({ store });

    await expect(
      service.completeSale({
        context: terminalContext,
        items: [{ productId: product.id, quantity: 2 }],
        payment: { method: 'CASH', tenderedAmount: 30000 }
      })
    ).rejects.toThrow('Insufficient local stock for product Masala Dosa');
  });
});
