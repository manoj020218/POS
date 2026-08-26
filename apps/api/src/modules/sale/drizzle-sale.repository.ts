import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { saleItems, saleSequences, sales } from '../../db/schema/index.js';
import { formatInvoiceNumber } from './sale-domain.js';
import type { SaleRepository } from './sale.repository.js';
import type {
  CreateSaleInput,
  PaymentMethod,
  SaleDetailRecord,
  SaleRecord
} from './sale.types.js';

type SaleRow = Omit<SaleRecord, 'customerId' | 'customerName' | 'paymentMethod'> & {
  customerId: string | null;
  customerName: string | null;
  paymentMethod: string;
};

export class DrizzleSaleRepository implements SaleRepository {
  constructor(private readonly db: AppDatabase) {}

  async createSale(input: CreateSaleInput): Promise<SaleDetailRecord> {
    return this.db.transaction(async (tx) => {
      const saleId = randomUUID();
      const invoiceSequence = requireSequence(
        (
          await tx
            .insert(saleSequences)
            .values({
              lastValue: 1,
              tenantId: input.sale.tenantId,
              terminalId: input.sale.terminalId,
              updatedAt: new Date()
            })
            .onConflictDoUpdate({
              set: {
                lastValue: sql`${saleSequences.lastValue} + 1`,
                tenantId: input.sale.tenantId,
                updatedAt: new Date()
              },
              target: saleSequences.terminalId
            })
            .returning({ lastValue: saleSequences.lastValue })
        )[0]
      );
      const invoiceNumber = formatInvoiceNumber(
        input.sale.branchCode,
        input.sale.terminalCode,
        invoiceSequence
      );
      const [saleRow] = await tx
        .insert(sales)
        .values({
          id: saleId,
          invoiceNumber,
          invoiceSequence,
          ...input.sale
        })
        .returning();
      const itemRows = await tx
        .insert(saleItems)
        .values(
          input.items.map((item) => ({
            ...item,
            id: randomUUID(),
            saleId
          }))
        )
        .returning();

      return {
        items: itemRows.map((item) => item),
        sale: normalizeSale(requireSale(saleRow))
      };
    });
  }
}

const requireSale = (sale: SaleRow | undefined) => {
  if (!sale) {
    throw new Error('Sale row missing after insert');
  }

  return sale;
};

const requireSequence = (sequence: { lastValue: number } | undefined) => {
  if (!sequence) {
    throw new Error('Sale invoice sequence missing after reservation');
  }

  return sequence.lastValue;
};

const normalizeSale = (sale: SaleRow): SaleRecord => ({
  ...sale,
  customerId: sale.customerId ?? undefined,
  customerName: sale.customerName ?? undefined,
  paymentMethod: sale.paymentMethod as PaymentMethod
});
