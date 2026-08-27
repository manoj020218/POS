import type {
  CreatePurchaseInput,
  PurchaseDetailRecord,
  PurchaseRecord
} from './purchase.types.js';

export interface PurchaseRepository {
  createPurchase(input: CreatePurchaseInput): Promise<PurchaseDetailRecord>;
  listPurchases(
    tenantId: string,
    branchIds: string[],
    supplierId?: string
  ): Promise<PurchaseRecord[]>;
}
