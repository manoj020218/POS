import type { PrinterService } from '@smart-pos/printer';

import type { ClientDataStore } from './client-data-store.js';
import { calculateCheckoutSaleTotals } from './checkout-calculator.js';
import { printCheckoutReceipt } from './checkout-printer.js';
import { buildCheckoutSyncPayload } from './checkout-sync-payload.js';
import { resolveClientBusinessSettings } from './settings-repository.js';
import type { CreateLocalSaleRequest, LocalCheckoutResult } from './checkout.types.js';

const ensureUniqueProducts = (productIds: string[]) => {
  if (new Set(productIds).size !== productIds.length) {
    throw new Error('Each product may appear only once in a sale payload');
  }
};

export const createLocalCheckoutService = (dependencies: {
  createId?: () => string;
  now?: () => Date;
  printerService?: PrinterService;
  store: ClientDataStore;
}) => {
  const createId = dependencies.createId ?? (() => globalThis.crypto.randomUUID());
  const now = dependencies.now ?? (() => new Date());

  return {
    completeSale: async (input: CreateLocalSaleRequest): Promise<LocalCheckoutResult> => {
      if (input.items.length === 0) {
        throw new Error('Local checkout requires at least one line item');
      }

      ensureUniqueProducts(input.items.map((item) => item.productId));

      const settings = resolveClientBusinessSettings(
        await dependencies.store.settings.findBusinessSettings(input.context.businessId),
        {
          businessId: input.context.businessId,
          businessName: input.context.businessName
        }
      );
      const products = await dependencies.store.products.listByIds(
        input.items.map((item) => item.productId)
      );
      const productMap = new Map(products.map((product) => [product.id, product]));
      const customer = input.customerId
        ? await dependencies.store.customers.findById(input.customerId)
        : null;
      const occurredAt = input.occurredAt ?? now();
      const calculated = calculateCheckoutSaleTotals({
        items: input.items.map((item) => {
          const product = productMap.get(item.productId);
          if (!product || product.businessId !== input.context.businessId) {
            throw new Error(`Product ${item.productId} is not available in the local store`);
          }
          if (!product.isActive) {
            throw new Error(`Product ${product.name} is inactive`);
          }

          return {
            discountAmount: item.discountAmount ?? 0,
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            quantity: item.quantity,
            taxAmount: item.taxAmount,
            taxRateBasisPoints: product.taxRateBasisPoints,
            trackInventory: product.trackInventory,
            unitPrice: item.unitPrice ?? product.sellingPrice
          };
        }),
        payment: input.payment
      });

      if (input.customerId) {
        if (!customer || customer.businessId !== input.context.businessId) {
          throw new Error('Customer is not available in the local store');
        }
        if (!customer.isActive) {
          throw new Error('Customer is inactive');
        }
      }

      const trackedProducts = calculated.items.filter((item) => item.trackInventory);
      const balances = new Map(
        (
          await dependencies.store.stock.getBalances(
            input.context.businessId,
            trackedProducts.map((item) => item.productId)
          )
        ).map((balance) => [balance.productId, balance.quantityOnHand])
      );

      trackedProducts.forEach((item) => {
        const available = balances.get(item.productId) ?? 0;
        if (available < item.quantity) {
          throw new Error(`Insufficient local stock for product ${item.productName}`);
        }
      });

      const saleId = createId();
      const syncEventId = createId();
      const invoice = await dependencies.store.sales.allocateInvoiceNumber({
        branchCode: input.context.branchCode,
        invoicePrefix: settings.invoicePrefix,
        terminalCode: input.context.terminalCode
      });

      await dependencies.store.sales.saveSale({
        items: calculated.items.map((item) => ({
          discountAmount: item.discountAmount,
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          quantity: item.quantity,
          subtotalAmount: item.subtotalAmount,
          taxAmount: item.taxAmount,
          totalAmount: item.totalAmount,
          trackInventory: item.trackInventory,
          unitPrice: item.unitPrice
        })),
        sale: {
          branchCode: input.context.branchCode,
          branchId: input.context.branchId,
          businessId: input.context.businessId,
          cashierUserId: input.context.cashierUserId,
          changeAmount: calculated.changeAmount,
          createdAt: now(),
          customerId: customer?.id,
          customerName: customer?.name,
          discountAmount: calculated.discountAmount,
          id: saleId,
          invoiceNumber: invoice.invoiceNumber,
          localSequence: invoice.localSequence,
          occurredAt,
          paymentMethod: input.payment.method,
          subtotalAmount: calculated.subtotalAmount,
          syncEventId,
          syncState: 'PENDING',
          taxAmount: calculated.taxAmount,
          tenderedAmount: calculated.tenderedAmount,
          terminalCode: input.context.terminalCode,
          terminalId: input.context.terminalId,
          totalAmount: calculated.totalAmount
        }
      });

      await dependencies.store.stock.applyDeltas(
        trackedProducts.map((item) => ({
          businessId: input.context.businessId,
          occurredAt,
          productId: item.productId,
          quantityDelta: item.quantity * -1,
          reason: 'SALE' as const,
          sourceBranchId: input.context.branchId
        }))
      );

      const syncEvent = await dependencies.store.sync.enqueueEvent({
        branchId: input.context.branchId,
        createdAt: occurredAt,
        deviceId: input.context.deviceId,
        entityId: saleId,
        eventId: syncEventId,
        payload: buildCheckoutSyncPayload(input, calculated),
        type: 'SALE_CREATED'
      });

      return {
        printOutcome: await printCheckoutReceipt({
          calculated: { ...calculated, invoiceNumber: invoice.invoiceNumber },
          context: input.context,
          customer,
          now,
          paymentMethod: input.payment.method,
          printerService: dependencies.printerService,
          settings
        }),
        saleId,
        syncEvent
      };
    }
  };
};
