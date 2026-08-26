import type { CreateSaleInventoryMovementInput } from '../inventory/inventory.types.js';

export const paymentMethods = ['CASH', 'CARD', 'UPI', 'OTHER'] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export type SaleRecord = {
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
  invoiceSequence: number;
  occurredAt: Date;
  paymentMethod: PaymentMethod;
  subtotalAmount: number;
  taxAmount: number;
  tenderedAmount: number;
  tenantId: string;
  terminalCode: string;
  terminalId: string;
  totalAmount: number;
};

export type SaleItemRecord = {
  createdAt: Date;
  discountAmount: number;
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  saleId: string;
  subtotalAmount: number;
  taxAmount: number;
  tenantId: string;
  totalAmount: number;
  unitPrice: number;
};

export type CreateSaleRecordInput = Omit<
  SaleRecord,
  'createdAt' | 'id' | 'invoiceNumber' | 'invoiceSequence'
>;

export type CreateSaleItemRecordInput = Omit<SaleItemRecord, 'createdAt' | 'id'>;

export type CreateSaleInput = {
  items: CreateSaleItemRecordInput[];
  inventoryMovements: CreateSaleInventoryMovementInput[];
  sale: CreateSaleRecordInput;
};

export type SaleDetailRecord = {
  items: SaleItemRecord[];
  sale: SaleRecord;
};

export type SaleReturnQuantityRecord = {
  productId: string;
  quantity: number;
};

export type CreateSaleRequest = {
  branchId: string;
  customerId?: string;
  items: Array<{
    discountAmount: number;
    productId: string;
    quantity: number;
    taxAmount: number;
    unitPrice?: number;
  }>;
  occurredAt?: Date;
  payment: {
    method: PaymentMethod;
    tenderedAmount?: number;
  };
  terminalId: string;
};

export type CreateSaleReturnRequest = {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  occurredAt?: Date;
};

export type CreateSaleReturnInput = {
  inventoryMovements: Array<
    Omit<CreateSaleInventoryMovementInput, 'movementType'> & {
      movementType: 'SALE_RETURN';
    }
  >;
  saleId: string;
  tenantId: string;
};

export type SaleItemView = {
  discountAmount: number;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  unitPrice: number;
};

export type SaleView = {
  branchCode: string;
  branchId: string;
  businessId: string;
  cashierUserId: string;
  changeAmount: number;
  customerId?: string;
  customerName?: string;
  discountAmount: number;
  id: string;
  invoiceNumber: string;
  invoiceSequence: number;
  items: SaleItemView[];
  occurredAt: Date;
  paymentMethod: PaymentMethod;
  subtotalAmount: number;
  taxAmount: number;
  tenderedAmount: number;
  terminalCode: string;
  terminalId: string;
  totalAmount: number;
};

export type SaleReturnView = {
  branchId: string;
  businessId: string;
  items: Array<{
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    remainingQuantity: number;
    returnedQuantityTotal: number;
  }>;
  occurredAt: Date;
  saleId: string;
};
