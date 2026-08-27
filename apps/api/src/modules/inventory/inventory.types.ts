export const inventoryMovementTypes = [
  'OPENING_STOCK',
  'PURCHASE',
  'SALE',
  'SALE_RETURN',
  'PURCHASE_RETURN',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'DAMAGE',
  'TRANSFER_IN',
  'TRANSFER_OUT'
] as const;

export type InventoryMovementType = (typeof inventoryMovementTypes)[number];

export type InventoryMovementRecord = {
  branchId: string;
  businessId: string;
  createdAt: Date;
  id: string;
  movementType: InventoryMovementType;
  occurredAt: Date;
  productId: string;
  quantityDelta: number;
  referenceId: string;
  tenantId: string;
};

export type CreateInventoryMovementInput = Pick<
  InventoryMovementRecord,
  'branchId' | 'businessId' | 'movementType' | 'occurredAt' | 'productId' | 'quantityDelta' | 'tenantId'
>;

export type CreateSaleInventoryMovementInput = CreateInventoryMovementInput & {
  movementType: 'SALE';
};

export type InventoryMovementBalanceRecord = {
  businessId: string;
  lastMovementAt?: Date;
  netMovementQuantity: number;
  productId: string;
  tenantId: string;
};

export type InventoryBalanceQuery = {
  businessId?: string;
  productId?: string;
};

export type InventoryBalanceView = {
  businessCode: string;
  businessId: string;
  businessName: string;
  currentQuantity: number;
  isLowStock: boolean;
  lastMovementAt?: Date;
  lowStockLevel: number;
  netMovementQuantity: number;
  openingStock: number;
  productId: string;
  productName: string;
  productSku: string;
  trackInventory: boolean;
};
