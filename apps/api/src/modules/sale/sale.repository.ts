import type { CreateSaleInput, SaleDetailRecord } from './sale.types.js';

export interface SaleRepository {
  createSale(input: CreateSaleInput): Promise<SaleDetailRecord>;
}
