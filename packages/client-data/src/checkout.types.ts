import type { PrinterExecutionResult } from '@smart-pos/printer';

import type { ClientTerminalContext, PaymentMethod } from './client-context.js';
import type { ClientSyncEventRecord } from './sync-repository.js';

export type CreateLocalSaleItemInput = {
  discountAmount?: number;
  productId: string;
  quantity: number;
  taxAmount?: number;
  unitPrice?: number;
};

export type CreateLocalSaleRequest = {
  context: ClientTerminalContext;
  customerId?: string;
  items: CreateLocalSaleItemInput[];
  occurredAt?: Date;
  payment: { method: PaymentMethod; tenderedAmount?: number };
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
