import type { PaymentMethod } from '../sale/sale.types.js';

export type SalesReportQuery = {
  businessId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type TopProductsQuery = SalesReportQuery & {
  limit: number;
};

export type SalesSummaryRange = {
  dateFrom: string;
  dateTo: string;
  rangeEndExclusive: Date;
  rangeStart: Date;
  reportType: 'DATE_RANGE' | 'TODAY';
};

export type SalesReportLookupInput = {
  branchIds: string[];
  businessIds: string[];
  occurredAtFrom: Date;
  occurredAtTo: Date;
  tenantId: string;
};

export type TopProductsLookupInput = SalesReportLookupInput & {
  limit: number;
};

export type SalesSummaryRecord = {
  discountAmount: number;
  saleCount: number;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  totalQuantity: number;
};

export type BranchSalesSummaryRecord = SalesSummaryRecord & {
  branchCode: string;
  branchId: string;
  businessId: string;
};

export type TerminalSalesSummaryRecord = SalesSummaryRecord & {
  branchId: string;
  businessId: string;
  terminalCode: string;
  terminalId: string;
};

export type CashierSalesSummaryRecord = SalesSummaryRecord & {
  cashierUserId: string;
};

export type PaymentMethodSummaryRecord = SalesSummaryRecord & {
  paymentMethod: PaymentMethod;
};

export type TopProductSummaryRecord = {
  discountAmount: number;
  productId: string;
  productName: string;
  productSku: string;
  saleCount: number;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  totalQuantity: number;
};

export type SalesReportMeta = {
  businessCount: number;
  businessId?: string;
  dateFrom: string;
  dateTo: string;
  reportType: SalesSummaryRange['reportType'];
};

export type SalesAggregateView = SalesSummaryRecord & {
  averageSaleAmount: number;
};

export type SalesSummaryView = SalesAggregateView & SalesReportMeta;

export type BranchSalesSummaryRow = SalesAggregateView & {
  branchCode: string;
  branchId: string;
  branchName: string;
  businessCode: string;
  businessId: string;
  businessName: string;
};

export type TerminalSalesSummaryRow = SalesAggregateView & {
  branchCode: string;
  branchId: string;
  branchName: string;
  businessCode: string;
  businessId: string;
  businessName: string;
  terminalCode: string;
  terminalId: string;
  terminalName: string;
};

export type CashierSalesSummaryRow = SalesAggregateView & {
  cashierDisplayName: string;
  cashierEmail: string;
  cashierUserId: string;
};

export type PaymentMethodSummaryRow = SalesAggregateView & {
  paymentMethod: PaymentMethod;
};

export type TopProductSummaryRow = TopProductSummaryRecord & {
  averageUnitPrice: number;
  rank: number;
};

export type SalesBreakdownView<TRow> = SalesReportMeta & {
  rows: TRow[];
};

export type TopProductsView = SalesReportMeta & {
  limit: number;
  rows: TopProductSummaryRow[];
};

export const emptySalesSummaryRecord = (): SalesSummaryRecord => ({
  discountAmount: 0,
  saleCount: 0,
  subtotalAmount: 0,
  taxAmount: 0,
  totalAmount: 0,
  totalQuantity: 0
});
