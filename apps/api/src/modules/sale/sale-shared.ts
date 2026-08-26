import { createHttpError } from '../../lib/http-error.js';

import type { SaleDetailRecord, SaleView } from './sale.types.js';

export const ensureUniqueProducts = (
  productIds: string[],
  code = 'DUPLICATE_SALE_PRODUCT'
) => {
  if (new Set(productIds).size !== productIds.length) {
    throw createHttpError(
      400,
      code,
      'Each product may appear only once in a sale payload'
    );
  }
};

export const toSaleView = (detail: SaleDetailRecord): SaleView => ({
  branchCode: detail.sale.branchCode,
  branchId: detail.sale.branchId,
  businessId: detail.sale.businessId,
  cashierUserId: detail.sale.cashierUserId,
  changeAmount: detail.sale.changeAmount,
  customerId: detail.sale.customerId,
  customerName: detail.sale.customerName,
  discountAmount: detail.sale.discountAmount,
  id: detail.sale.id,
  invoiceNumber: detail.sale.invoiceNumber,
  invoiceSequence: detail.sale.invoiceSequence,
  items: detail.items.map((item) => ({
    discountAmount: item.discountAmount,
    productId: item.productId,
    productName: item.productName,
    productSku: item.productSku,
    quantity: item.quantity,
    subtotalAmount: item.subtotalAmount,
    taxAmount: item.taxAmount,
    totalAmount: item.totalAmount,
    unitPrice: item.unitPrice
  })),
  occurredAt: detail.sale.occurredAt,
  paymentMethod: detail.sale.paymentMethod,
  subtotalAmount: detail.sale.subtotalAmount,
  taxAmount: detail.sale.taxAmount,
  tenderedAmount: detail.sale.tenderedAmount,
  terminalCode: detail.sale.terminalCode,
  terminalId: detail.sale.terminalId,
  totalAmount: detail.sale.totalAmount
});
