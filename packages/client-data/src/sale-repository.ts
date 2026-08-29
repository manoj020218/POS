import type { PaymentMethod } from './client-context.js';

export const clientSaleSyncStates = ['PENDING', 'SYNCED', 'FAILED'] as const;

export type ClientSaleSyncState = (typeof clientSaleSyncStates)[number];

export type ClientSaleItemRecord = {
  discountAmount: number;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  trackInventory: boolean;
  unitPrice: number;
};

export type ClientSaleRecord = {
  branchCode: string;
  branchId: string;
  businessId: string;
  cashierUserId: string;
  changeAmount: number;
  createdAt: Date;
  customerId?: string;
  customerName?: string;
  discountAmount: number;
  id: string;
  invoiceNumber: string;
  localSequence: number;
  occurredAt: Date;
  paymentMethod: PaymentMethod;
  subtotalAmount: number;
  syncEventId: string;
  syncState: ClientSaleSyncState;
  taxAmount: number;
  tenderedAmount: number;
  terminalCode: string;
  terminalId: string;
  totalAmount: number;
  lastSyncError?: string;
};

export type ClientSaleDetail = {
  items: ClientSaleItemRecord[];
  sale: ClientSaleRecord;
};

export type AllocateInvoiceNumberInput = {
  branchCode: string;
  invoicePrefix: string;
  terminalCode: string;
};

export type AllocateInvoiceNumberResult = {
  invoiceNumber: string;
  localSequence: number;
};

export interface SaleRepository {
  allocateInvoiceNumber(input: AllocateInvoiceNumberInput): Promise<AllocateInvoiceNumberResult>;
  findSaleById(saleId: string): Promise<ClientSaleDetail | null>;
  findSaleBySyncEventId(syncEventId: string): Promise<ClientSaleDetail | null>;
  markSaleSyncStateByEventId(
    syncEventId: string,
    state: ClientSaleSyncState,
    lastSyncError?: string | null
  ): Promise<void>;
  saveSale(detail: ClientSaleDetail): Promise<ClientSaleDetail>;
}
