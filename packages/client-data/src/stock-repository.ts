export const stockDeltaReasons = ['SALE', 'PURCHASE', 'SALE_RETURN', 'SYNC_RECONCILE'] as const;

export type StockDeltaReason = (typeof stockDeltaReasons)[number];

export type ClientStockBalanceRecord = {
  businessId: string;
  productId: string;
  quantityOnHand: number;
  updatedAt: Date;
};

export type ApplyStockDeltaInput = {
  businessId: string;
  occurredAt: Date;
  productId: string;
  quantityDelta: number;
  reason: StockDeltaReason;
  sourceBranchId?: string;
};

export interface StockRepository {
  applyDeltas(deltas: ApplyStockDeltaInput[]): Promise<void>;
  getBalances(businessId: string, productIds: string[]): Promise<ClientStockBalanceRecord[]>;
  upsertBalances(balances: ClientStockBalanceRecord[]): Promise<void>;
}
