import type {
  InventoryBalanceView,
  InventoryMovementType
} from '../inventory/inventory.types.js';
import type { PaymentMethod } from '../sale/sale.types.js';

export type SalesReportQuery = {
  businessId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type InventoryReportQuery = {
  businessId?: string;
  productId?: string;
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

export type TaxSummaryRecord = SalesSummaryRecord & {
  businessId: string;
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

export type StockMovementSummaryRecord = {
  branchId: string;
  businessId: string;
  lastMovementAt: Date;
  movementCount: number;
  movementType: InventoryMovementType;
  productId: string;
  quantityDelta: number;
};

export type SalesReturnSummaryRecord = {
  branchId: string;
  businessId: string;
  lastReturnedAt: Date;
  productId: string;
  productName: string;
  productSku: string;
  returnCount: number;
  returnedQuantity: number;
};

export type SalesReportMeta = {
  businessCount: number;
  businessId?: string;
  dateFrom: string;
  dateTo: string;
  reportType: SalesSummaryRange['reportType'];
};

export type InventoryReportMeta = {
  asOf: Date;
  businessCount: number;
  businessId?: string;
};

export type SalesAggregateView = SalesSummaryRecord & {
  averageSaleAmount: number;
};

export type SalesSummaryView = SalesAggregateView & SalesReportMeta;

export type TaxSummaryRow = SalesAggregateView & {
  businessCode: string;
  businessId: string;
  businessName: string;
  effectiveTaxRateBasisPoints: number;
};

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

export type StockMovementSummaryRow = {
  branchCode: string;
  branchId: string;
  branchName: string;
  businessCode: string;
  businessId: string;
  businessName: string;
  lastMovementAt: Date;
  movementCount: number;
  movementType: InventoryMovementType;
  productId: string;
  productName: string;
  productSku: string;
  quantityDelta: number;
};

export type SalesReturnSummaryRow = {
  branchCode: string;
  branchId: string;
  branchName: string;
  businessCode: string;
  businessId: string;
  businessName: string;
  lastReturnedAt: Date;
  productId: string;
  productName: string;
  productSku: string;
  returnCount: number;
  returnedQuantity: number;
};

export type SalesBreakdownView<TRow> = SalesReportMeta & {
  rows: TRow[];
};

export type InventoryBreakdownView<TRow> = InventoryReportMeta & {
  rows: TRow[];
};

export type TopProductsView = SalesReportMeta & {
  limit: number;
  rows: TopProductSummaryRow[];
};

export type TaxSummaryView = SalesBreakdownView<TaxSummaryRow>;

export type CurrentStockView = InventoryBreakdownView<InventoryBalanceView>;

export type LowStockView = InventoryBreakdownView<InventoryBalanceView>;

export type StockMovementView = SalesBreakdownView<StockMovementSummaryRow>;

export type SalesReturnsView = SalesBreakdownView<SalesReturnSummaryRow>;

export const emptySalesSummaryRecord = (): SalesSummaryRecord => ({
  discountAmount: 0,
  saleCount: 0,
  subtotalAmount: 0,
  taxAmount: 0,
  totalAmount: 0,
  totalQuantity: 0
});
