import type {
  CreateSaleInput,
  CreateSaleReturnInput,
  SaleDetailRecord,
  SaleReturnQuantityRecord
} from './sale.types.js';

export interface SaleRepository {
  createSale(input: CreateSaleInput): Promise<SaleDetailRecord>;
  createSaleReturn(input: CreateSaleReturnInput): Promise<void>;
  findSaleDetailById(saleId: string, tenantId: string): Promise<SaleDetailRecord | null>;
  listSaleMovementQuantities(
    saleId: string,
    tenantId: string,
    movementType: 'SALE' | 'SALE_RETURN'
  ): Promise<SaleReturnQuantityRecord[]>;
}
