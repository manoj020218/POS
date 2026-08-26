import { randomUUID } from 'node:crypto';

import { formatInvoiceNumber } from './sale-domain.js';
import type { SaleRepository } from './sale.repository.js';
import type { CreateSaleInput, SaleDetailRecord, SaleItemRecord, SaleRecord } from './sale.types.js';

export class InMemorySaleRepository implements SaleRepository {
  private readonly invoiceSequences = new Map<string, number>();
  private readonly items = new Map<string, SaleItemRecord[]>();
  private readonly sales = new Map<string, SaleRecord>();

  async createSale(input: CreateSaleInput): Promise<SaleDetailRecord> {
    const saleId = randomUUID();
    const invoiceSequence = (this.invoiceSequences.get(input.sale.terminalId) ?? 0) + 1;
    this.invoiceSequences.set(input.sale.terminalId, invoiceSequence);
    const sale: SaleRecord = {
      ...input.sale,
      createdAt: new Date(),
      id: saleId,
      invoiceNumber: formatInvoiceNumber(
        input.sale.branchCode,
        input.sale.terminalCode,
        invoiceSequence
      ),
      invoiceSequence
    };
    const items = input.items.map((item) => ({
      ...item,
      createdAt: new Date(),
      id: randomUUID(),
      saleId
    }));

    this.sales.set(saleId, sale);
    this.items.set(saleId, items);

    return { items, sale };
  }
}
