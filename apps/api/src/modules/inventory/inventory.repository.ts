import type { InventoryMovementBalanceRecord } from './inventory.types.js';

export type InventoryBalanceLookupInput = {
  businessIds: string[];
  productId?: string;
  tenantId: string;
};

export interface InventoryRepository {
  listInventoryBalances(input: InventoryBalanceLookupInput): Promise<InventoryMovementBalanceRecord[]>;
}
