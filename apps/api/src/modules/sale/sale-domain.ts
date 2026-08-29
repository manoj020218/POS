import { createHttpError } from '../../lib/http-error.js';
import type { PaymentMethod } from './sale.types.js';

type SaleDraftItem = {
  discountAmount: number;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  taxAmount: number;
  unitPrice: number;
};

export type CalculatedSale = {
  changeAmount: number;
  discountAmount: number;
  items: Array<
    SaleDraftItem & {
      subtotalAmount: number;
      totalAmount: number;
    }
  >;
  subtotalAmount: number;
  taxAmount: number;
  tenderedAmount: number;
  totalAmount: number;
};

export const calculateSaleTotals = (input: {
  items: SaleDraftItem[];
  payment: { method: PaymentMethod; tenderedAmount?: number };
}): CalculatedSale => {
  const items = input.items.map((item) => {
    const subtotalAmount = item.quantity * item.unitPrice;
    if (item.discountAmount > subtotalAmount) {
      throw createHttpError(
        400,
        'LINE_DISCOUNT_EXCEEDS_SUBTOTAL',
        'Line discount exceeds subtotal'
      );
    }

    return {
      ...item,
      subtotalAmount,
      totalAmount: subtotalAmount - item.discountAmount + item.taxAmount
    };
  });
  const subtotalAmount = items.reduce((sum, item) => sum + item.subtotalAmount, 0);
  const discountAmount = items.reduce((sum, item) => sum + item.discountAmount, 0);
  const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);
  const tenderedAmount = input.payment.tenderedAmount ?? totalAmount;

  if (input.payment.method === 'CASH') {
    if (tenderedAmount < totalAmount) {
      throw createHttpError(
        400,
        'INSUFFICIENT_CASH_TENDERED',
        'Tendered cash is less than the sale total'
      );
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
    throw createHttpError(
      400,
      'PAYMENT_AMOUNT_MISMATCH',
      'Non-cash payments must match the sale total'
    );
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

export const formatInvoiceNumber = (
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
