import type { PrinterExecutionResult, PrinterService } from '@smart-pos/printer';
import { createRecordingPrinterService } from '@smart-pos/printer';
import { describe, expect, it } from 'vitest';

import {
  createInMemoryClientDataStore,
  createLocalCheckoutService
} from '../src/index.js';
import { createCustomer, createProduct, createSettings, terminalContext } from './fixtures.js';

const createIdFactory = (...values: string[]) => {
  let index = 0;
  return () => values[index++] ?? `generated-${index}`;
};

const createResult = (): PrinterExecutionResult => ({
  acceptedAt: new Date('2026-08-29T12:45:00.000Z'),
  commandCount: 0,
  connectionType: 'SYSTEM',
  operation: 'PRINT_RECEIPT',
  profileName: 'Counter Queue'
});

const createFailingPrinterService = (): PrinterService => ({
  cutPaper: async () => createResult(),
  openCashDrawer: async () => createResult(),
  printBarcode: async () => createResult(),
  printKitchenOrder: async () => createResult(),
  printQrCode: async () => createResult(),
  printReceipt: async () => {
    throw new Error('Printer offline');
  },
  printTestPage: async () => createResult()
});

describe('createLocalCheckoutService', () => {
  it('creates a local sale, queues a sync event, updates stock, and prints a receipt', async () => {
    const store = createInMemoryClientDataStore(() => new Date('2026-08-29T12:00:00.000Z'));
    const printer = createRecordingPrinterService(() => new Date('2026-08-29T12:31:00.000Z'));
    const product = createProduct();
    const customer = createCustomer();

    await store.settings.saveBusinessSettings(createSettings(true));
    await store.products.upsertProducts([product]);
    await store.customers.upsertCustomers([customer]);

    const service = createLocalCheckoutService({
      createId: createIdFactory(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'sale-created-0001'
      ),
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
    const event = await store.sync.findEventById(result.syncEvent.eventId);
    const stock = await store.stock.getBalances(terminalContext.businessId, [product.id]);

    expect(result.printOutcome.status).toBe('PRINTED');
    expect(sale?.sale).toMatchObject({
      changeAmount: 4800,
      customerId: customer.id,
      invoiceNumber: 'INV-MAIN-POS1-000001',
      syncState: 'PENDING',
      totalAmount: 25200
    });
    expect(sale?.items).toEqual([
      expect.objectContaining({
        productId: product.id,
        quantity: 2,
        subtotalAmount: 24000,
        taxAmount: 1200,
        totalAmount: 25200
      })
    ]);
    expect(event).toMatchObject({
      entityId: result.saleId,
      eventId: 'sale-created-0001',
      state: 'PENDING',
      type: 'SALE_CREATED'
    });
    expect(stock[0]?.quantityOnHand).toBe(8);
    expect(printer.history).toHaveLength(1);
    expect(printer.history[0]?.operation).toBe('PRINT_RECEIPT');
    // Regression: the receipt used to print the full cash tendered with no
    // corresponding "change given" line at all.
    expect(JSON.stringify(printer.history[0]?.job.commands)).toContain('Change');
  });

  it('prints the discount line when a sale has a discount applied', async () => {
    const store = createInMemoryClientDataStore(() => new Date('2026-08-29T12:00:00.000Z'));
    const printer = createRecordingPrinterService(() => new Date('2026-08-29T12:31:00.000Z'));
    const product = createProduct();

    await store.settings.saveBusinessSettings(createSettings(true));
    await store.products.upsertProducts([product]);

    const service = createLocalCheckoutService({
      createId: createIdFactory('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'sale-created-0003'),
      now: () => new Date('2026-08-29T12:30:00.000Z'),
      printerService: printer,
      store
    });

    // Regression: discountAmount was calculated correctly but never actually
    // passed into the printed receipt job at all, so a discounted sale's
    // printed receipt never showed the discount that was actually applied.
    await service.completeSale({
      context: terminalContext,
      items: [{ discountAmount: 1000, productId: product.id, quantity: 2 }],
      occurredAt: new Date('2026-08-29T12:29:00.000Z'),
      payment: { method: 'CASH', tenderedAmount: 30000 }
    });

    expect(printer.history).toHaveLength(1);
    expect(JSON.stringify(printer.history[0]?.job.commands)).toContain('Discount');
  });

  it('keeps the local sale and outbox event when receipt printing fails', async () => {
    const store = createInMemoryClientDataStore(() => new Date('2026-08-29T12:00:00.000Z'));
    const product = createProduct({ openingStock: 5 });

    await store.settings.saveBusinessSettings(createSettings(true));
    await store.products.upsertProducts([product]);

    const service = createLocalCheckoutService({
      createId: createIdFactory(
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        'sale-created-0002'
      ),
      now: () => new Date('2026-08-29T12:40:00.000Z'),
      printerService: createFailingPrinterService(),
      store
    });

    const result = await service.completeSale({
      context: terminalContext,
      items: [{ productId: product.id, quantity: 1 }],
      payment: { method: 'CARD', tenderedAmount: 12600 }
    });
    const sale = await store.sales.findSaleById(result.saleId);
    const event = await store.sync.findEventById(result.syncEvent.eventId);

    expect(result.printOutcome).toEqual({ message: 'Printer offline', status: 'FAILED' });
    expect(sale?.sale.syncState).toBe('PENDING');
    expect(event?.state).toBe('PENDING');
  });

  it('resolves a variant to its own price and name, and snapshots them on the sale, sync payload, and receipt', async () => {
    const store = createInMemoryClientDataStore(() => new Date('2026-08-29T12:00:00.000Z'));
    const printer = createRecordingPrinterService(() => new Date('2026-08-29T12:31:00.000Z'));
    const product = createProduct({
      openingStock: 0,
      sellingPrice: 25000,
      trackInventory: false,
      variants: [
        { id: 'variant-half', name: 'Half', sellingPrice: 25000 },
        { id: 'variant-full', name: 'Full', sellingPrice: 30000 }
      ]
    });

    await store.settings.saveBusinessSettings(createSettings(true));
    await store.products.upsertProducts([product]);

    const service = createLocalCheckoutService({
      createId: createIdFactory('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'sale-created-0004'),
      now: () => new Date('2026-08-29T12:30:00.000Z'),
      printerService: printer,
      store
    });

    const result = await service.completeSale({
      context: terminalContext,
      items: [
        { productId: product.id, quantity: 1, variantId: 'variant-half' },
        { productId: product.id, quantity: 1, variantId: 'variant-full' }
      ],
      payment: { method: 'CASH', tenderedAmount: 60000 }
    });
    const sale = await store.sales.findSaleById(result.saleId);
    const event = await store.sync.findEventById(result.syncEvent.eventId);

    expect(sale?.items).toEqual([
      expect.objectContaining({ unitPrice: 25000, variantId: 'variant-half', variantName: 'Half' }),
      expect.objectContaining({ unitPrice: 30000, variantId: 'variant-full', variantName: 'Full' })
    ]);
    expect((event?.payload as { items: { variantId?: string }[] }).items).toEqual([
      expect.objectContaining({ variantId: 'variant-half' }),
      expect.objectContaining({ variantId: 'variant-full' })
    ]);
    const receiptCommands = JSON.stringify(printer.history[0]?.job.commands);
    expect(receiptCommands).toContain('Masala Dosa (Half)');
    expect(receiptCommands).toContain('Masala Dosa (Full)');
  });

  it('prints a payment-due demand bill without recording a sale, even when auto-print is off', async () => {
    const store = createInMemoryClientDataStore(() => new Date('2026-08-29T12:00:00.000Z'));
    const printer = createRecordingPrinterService(() => new Date('2026-08-29T12:31:00.000Z'));
    const product = createProduct({ openingStock: 5 });

    // autoPrintReceipt is OFF -- a demand bill is an explicit cashier action,
    // not an auto-print after a sale, so it must print regardless.
    await store.settings.saveBusinessSettings(createSettings(false));
    await store.products.upsertProducts([product]);

    const service = createLocalCheckoutService({ printerService: printer, store });

    const outcome = await service.printDemandBill({
      context: terminalContext,
      items: [{ productId: product.id, quantity: 2 }]
    });

    expect(outcome.status).toBe('PRINTED');
    const receiptCommands = JSON.stringify(printer.history[0]?.job.commands);
    expect(receiptCommands).toContain('PAYMENT DUE');

    const stock = await store.stock.getBalances(terminalContext.businessId, [product.id]);
    expect(stock[0]?.quantityOnHand).toBe(5);
  });

  it('rejects checkout when tracked inventory is insufficient', async () => {
    const store = createInMemoryClientDataStore();
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
