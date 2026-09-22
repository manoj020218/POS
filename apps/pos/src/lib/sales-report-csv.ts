import type {
  ClientPaymentMethodSummaryRow,
  ClientSalesBreakdownView,
  ClientSalesSummaryView,
  ClientTopProductsView
} from '@smart-pos/client-data';

import { toCsv } from './csv.js';

// Amounts are already whole currency units (e.g. rupees) throughout this
// app -- not paise/cents -- matching every other formatter (formatMoney,
// the receipt printer job, etc.). No /100 here.
const money = (amount: number) => amount.toFixed(2);

export const buildSalesReportCsv = (input: {
  businessName: string;
  generatedAt: Date;
  paymentBreakdown: ClientSalesBreakdownView<ClientPaymentMethodSummaryRow>;
  summary: ClientSalesSummaryView;
  topProducts: ClientTopProductsView;
}): string => {
  const rows: string[][] = [
    ['Sales report'],
    ['Business', input.businessName],
    ['Range', `${input.summary.dateFrom} to ${input.summary.dateTo}`],
    ['Generated', input.generatedAt.toISOString()],
    [],
    ['Summary'],
    ['Metric', 'Value'],
    ['Total sales', money(input.summary.totalAmount)],
    ['Sale count', String(input.summary.saleCount)],
    ['Subtotal', money(input.summary.subtotalAmount)],
    ['Discount', money(input.summary.discountAmount)],
    ['Tax', money(input.summary.taxAmount)],
    ['Average sale', money(input.summary.averageSaleAmount)],
    [],
    ['Payment method', 'Sale count', 'Total amount'],
    ...input.paymentBreakdown.rows.map((row) => [
      row.paymentMethod,
      String(row.saleCount),
      money(row.totalAmount)
    ]),
    [],
    ['Top products', 'Qty sold', 'Total amount'],
    ...input.topProducts.rows.map((row) => [
      `${row.productName} (${row.productSku})`,
      String(row.totalQuantity),
      money(row.totalAmount)
    ])
  ];

  return toCsv(rows);
};
