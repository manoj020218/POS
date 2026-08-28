import type { InventoryMovementBalanceRecord } from '../inventory/inventory.types.js';
import type { PaymentMethod, SaleRecord } from './sale.types.js';

type SaleRow = Omit<SaleRecord, 'customerId' | 'customerName' | 'paymentMethod'> & {
  customerId: string | null;
  customerName: string | null;
  paymentMethod: string;
};

type InventoryBalanceRow = Omit<InventoryMovementBalanceRecord, 'lastMovementAt' | 'netMovementQuantity'> & {
  lastMovementAt: Date | null;
  netMovementQuantity: number;
};

export const requireSale = (sale: SaleRow | undefined) => {
  if (!sale) {
    throw new Error('Sale row missing after insert');
  }

  return sale;
};

export const requireSequence = (sequence: { lastValue: number } | undefined) => {
  if (!sequence) {
    throw new Error('Sale invoice sequence missing after reservation');
  }

  return sequence.lastValue;
};

export const normalizeInventoryBalance = (
  row: InventoryBalanceRow
): InventoryMovementBalanceRecord => ({
  businessId: row.businessId,
  lastMovementAt: row.lastMovementAt ?? undefined,
  netMovementQuantity: Number(row.netMovementQuantity),
  productId: row.productId,
  tenantId: row.tenantId
});

export const normalizeSale = (sale: SaleRow): SaleRecord => ({
  ...sale,
  customerId: sale.customerId ?? undefined,
  customerName: sale.customerName ?? undefined,
  paymentMethod: sale.paymentMethod as PaymentMethod
});
