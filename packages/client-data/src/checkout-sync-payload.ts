import type { ClientTerminalContext, PaymentMethod } from './client-context.js';
import type { CalculatedCheckoutSale } from './checkout-calculator.js';

export const buildCheckoutSyncPayload = (
  input: {
    customerId?: string;
    payment: { method: PaymentMethod };
    context: Pick<ClientTerminalContext, 'terminalId'>;
  },
  calculated: CalculatedCheckoutSale
) => ({
  customerId: input.customerId,
  items: calculated.items.map((item) => ({
    discountAmount: item.discountAmount,
    productId: item.productId,
    quantity: item.quantity,
    taxAmount: item.taxAmount,
    unitPrice: item.unitPrice
  })),
  payment: {
    method: input.payment.method,
    tenderedAmount: calculated.tenderedAmount
  },
  terminalId: input.context.terminalId
});
