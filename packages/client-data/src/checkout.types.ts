import type { PrinterExecutionResult } from '@smart-pos/printer';

import type { ClientTerminalContext, PaymentMethod } from './client-context.js';
import type { ClientSyncEventRecord } from './sync-repository.js';

export type CreateLocalSaleItemInput = {
  discountAmount?: number;
  productId: string;
  quantity: number;
  taxAmount?: number;
  unitPrice?: number;
  variantId?: string;
};

export type CreateLocalSaleRequest = {
  context: ClientTerminalContext;
  customerId?: string;
  items: CreateLocalSaleItemInput[];
  occurredAt?: Date;
  payment: { method: PaymentMethod; tenderedAmount?: number };
};

// A Dhaba-style pre-payment bill: printed so the customer can see what
// they owe before paying, then handed back and paid for -- at which point
// a normal completeSale() records the real sale and prints the invoice.
// No sale, sync event, or stock movement is created by this call.
export type PrintDemandBillRequest = {
  context: ClientTerminalContext;
  customerId?: string;
  items: CreateLocalSaleItemInput[];
};

export type CheckoutPrintOutcome =
  | { result: PrinterExecutionResult; status: 'PRINTED' }
  | { message: string; status: 'FAILED' }
  | { status: 'SKIPPED' };

export type LocalCheckoutResult = {
  printOutcome: CheckoutPrintOutcome;
  saleId: string;
  syncEvent: ClientSyncEventRecord;
};
