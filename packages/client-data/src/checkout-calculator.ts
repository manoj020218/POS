import type { PaymentMethod } from './client-context.js';

type CheckoutCalculatorItemInput = {
  discountAmount: number;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  taxAmount?: number;
  taxRateBasisPoints: number;
  trackInventory: boolean;
  unitPrice: number;
};

export type CalculatedCheckoutSale = {
  changeAmount: number;
  discountAmount: number;
  items: Array<
    CheckoutCalculatorItemInput & {
      subtotalAmount: number;
      taxAmount: number;
      totalAmount: number;
    }
  >;
  subtotalAmount: number;
  taxAmount: number;
  tenderedAmount: number;
  totalAmount: number;
};

export const calculateCheckoutSaleTotals = (input: {
  items: CheckoutCalculatorItemInput[];
  payment: { method: PaymentMethod; tenderedAmount?: number };
}): CalculatedCheckoutSale => {
  const items = input.items.map((item) => {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new Error('Checkout item quantity must be a positive integer');
    }

    const subtotalAmount = item.quantity * item.unitPrice;
    if (item.discountAmount > subtotalAmount) {
      throw new Error('Line discount exceeds subtotal');
    }

    const taxableAmount = subtotalAmount - item.discountAmount;
    const taxAmount =
      item.taxAmount ?? Math.round((taxableAmount * item.taxRateBasisPoints) / 10_000);

    return {
      ...item,
      subtotalAmount,
      taxAmount,
      totalAmount: taxableAmount + taxAmount
    };
  });

  const subtotalAmount = items.reduce((sum, item) => sum + item.subtotalAmount, 0);
  const discountAmount = items.reduce((sum, item) => sum + item.discountAmount, 0);
  const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);
  const tenderedAmount = input.payment.tenderedAmount ?? totalAmount;

  if (input.payment.method === 'CASH') {
    if (tenderedAmount < totalAmount) {
      throw new Error('Tendered cash is less than the sale total');
    }

    return {
      changeAmount: tenderedAmount - totalAmount,
      discountAmount,
      items,
      subtotalAmount,
      taxAmount,
      tenderedAmount,
      totalAmount
    };
  }

  if (tenderedAmount !== totalAmount) {
    throw new Error('Non-cash payments must match the sale total');
  }

  return {
    changeAmount: 0,
    discountAmount,
    items,
    subtotalAmount,
    taxAmount,
    tenderedAmount,
    totalAmount
  };
};

export const formatLocalInvoiceNumber = (
  invoicePrefix: string,
  branchCode: string,
  terminalCode: string,
  sequence: number
) => {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error('Invoice sequence must be a positive integer');
  }

  return `${normalizeInvoiceCode(invoicePrefix)}-${normalizeInvoiceCode(branchCode)}-${normalizeInvoiceCode(
    terminalCode
  )}-${String(sequence).padStart(6, '0')}`;
};

const normalizeInvoiceCode = (value: string) => {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized.length > 0 ? normalized : 'NA';
};
