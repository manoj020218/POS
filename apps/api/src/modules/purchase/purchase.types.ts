import type { CreateInventoryMovementInput } from '../inventory/inventory.types.js';

export type PurchaseRecord = {
  branchCode: string;
  branchId: string;
  businessId: string;
  createdAt: Date;
  createdByUserId: string;
  id: string;
  itemCount: number;
  notes?: string;
  occurredAt: Date;
  referenceNumber?: string;
  supplierId?: string;
  supplierName?: string;
  tenantId: string;
  totalAmount: number;
  totalQuantity: number;
};

export type PurchaseItemRecord = {
  createdAt: Date;
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  purchaseId: string;
  quantity: number;
  tenantId: string;
  totalCost: number;
  unitCost: number;
};

export type CreatePurchaseRecordInput = Omit<PurchaseRecord, 'createdAt' | 'id'>;
export type CreatePurchaseItemRecordInput = Omit<PurchaseItemRecord, 'createdAt' | 'id'>;

export type CreatePurchaseInput = {
  inventoryMovements: Array<CreateInventoryMovementInput & { movementType: 'PURCHASE' }>;
  items: CreatePurchaseItemRecordInput[];
  purchase: CreatePurchaseRecordInput;
};

export type PurchaseDetailRecord = {
  items: PurchaseItemRecord[];
  purchase: PurchaseRecord;
};

export type CreatePurchaseRequest = {
  branchId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitCost?: number;
  }>;
  notes?: string;
  occurredAt?: Date;
  referenceNumber?: string;
  supplierId?: string;
};

export type PurchaseQuery = {
  branchId?: string;
  supplierId?: string;
};

export type PurchaseItemView = {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  totalCost: number;
  unitCost: number;
};

export type PurchaseSummaryView = {
  branchCode: string;
  branchId: string;
  branchName: string;
  businessCode: string;
  businessId: string;
  businessName: string;
  createdByUserId: string;
  id: string;
  itemCount: number;
  notes?: string;
  occurredAt: Date;
  referenceNumber?: string;
  supplierId?: string;
  supplierName?: string;
  totalAmount: number;
  totalQuantity: number;
};

export type PurchaseView = PurchaseSummaryView & {
  items: PurchaseItemView[];
};
