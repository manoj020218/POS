import type { PrinterService } from '@smart-pos/printer';

import type { ClientDataStore } from './client-data-store.js';
import { calculateCheckoutSaleTotals } from './checkout-calculator.js';
import { printCheckoutReceipt, printDemandBillReceipt } from './checkout-printer.js';
import { buildCheckoutSyncPayload } from './checkout-sync-payload.js';
import { resolveClientBusinessSettings } from './settings-repository.js';
import type {
  CreateLocalSaleItemInput,
  CreateLocalSaleRequest,
  LocalCheckoutResult,
  PrintDemandBillRequest
} from './checkout.types.js';
import type { ClientProductRecord } from './product-repository.js';
import type { PaymentMethod } from './client-context.js';
import type { CheckoutPrintOutcome } from './checkout.types.js';

const ensureUniqueProducts = (productIds: string[]) => {
  if (new Set(productIds).size !== productIds.length) {
    throw new Error('Each product may appear only once in a sale payload');
  }
};

const resolveCalculatedItems = (
  items: CreateLocalSaleItemInput[],
  productMap: Map<string, ClientProductRecord>,
  businessId: string,
  payment: { method: PaymentMethod; tenderedAmount?: number }
) =>
  calculateCheckoutSaleTotals({
    items: items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product || product.businessId !== businessId) {
        throw new Error(`Product ${item.productId} is not available in the local store`);
      }
      if (!product.isActive) {
        throw new Error(`Product ${product.name} is inactive`);
      }

      let variantName: string | undefined;
      let resolvedUnitPrice = item.unitPrice ?? product.sellingPrice;
      if (item.variantId) {
        const variant = product.variants?.find((candidate) => candidate.id === item.variantId);
        if (!variant) {
          throw new Error(`Variant ${item.variantId} is not available for product ${product.name}`);
        }
        variantName = variant.name;
        resolvedUnitPrice = item.unitPrice ?? variant.sellingPrice;
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
        unitPrice: resolvedUnitPrice,
        variantId: item.variantId,
        variantName
      };
    }),
    payment
  });

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

      // A product can legitimately appear more than once now (e.g. a Half
      // portion and a Full portion of the same Daal) -- uniqueness is keyed
      // on product+variant, not product alone.
      ensureUniqueProducts(input.items.map((item) => `${item.productId}::${item.variantId ?? ''}`));

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
      const calculated = resolveCalculatedItems(
        input.items,
        productMap,
        input.context.businessId,
        input.payment
      );

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
          const shortBy = item.quantity - available;
          throw new Error(
            `Insufficient local stock for product ${item.productName}: only ${available} available, ` +
              `${item.quantity} requested (short by ${shortBy})`
          );
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
          unitPrice: item.unitPrice,
          variantId: item.variantId,
          variantName: item.variantName
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
    },

    printDemandBill: async (input: PrintDemandBillRequest): Promise<CheckoutPrintOutcome> => {
      if (input.items.length === 0) {
        throw new Error('Local checkout requires at least one line item');
      }

      ensureUniqueProducts(input.items.map((item) => `${item.productId}::${item.variantId ?? ''}`));

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

      if (input.customerId && (!customer || customer.businessId !== input.context.businessId)) {
        throw new Error('Customer is not available in the local store');
      }

      const calculated = resolveCalculatedItems(input.items, productMap, input.context.businessId, {
        method: 'OTHER'
      });

      return printDemandBillReceipt({
        calculated,
        context: input.context,
        customer,
        now,
        printerService: dependencies.printerService,
        settings
      });
    }
  };
};
