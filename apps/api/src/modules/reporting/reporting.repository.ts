import type {
  BranchSalesSummaryRecord,
  CashierSalesSummaryRecord,
  PaymentMethodSummaryRecord,
  SalesReturnSummaryRecord,
  SalesReportLookupInput,
  SalesSummaryRecord,
  StockMovementSummaryRecord,
  TaxSummaryRecord,
  TerminalSalesSummaryRecord,
  TopProductSummaryRecord,
  TopProductsLookupInput
} from './reporting.types.js';

export interface ReportingRepository {
  listSalesByBranch(input: SalesReportLookupInput): Promise<BranchSalesSummaryRecord[]>;
  listSalesByCashier(input: SalesReportLookupInput): Promise<CashierSalesSummaryRecord[]>;
  listSalesByPaymentMethod(input: SalesReportLookupInput): Promise<PaymentMethodSummaryRecord[]>;
  listSalesReturns(input: SalesReportLookupInput): Promise<SalesReturnSummaryRecord[]>;
  listSalesByTerminal(input: SalesReportLookupInput): Promise<TerminalSalesSummaryRecord[]>;
  listStockMovements(input: SalesReportLookupInput): Promise<StockMovementSummaryRecord[]>;
  listTaxSummary(input: SalesReportLookupInput): Promise<TaxSummaryRecord[]>;
  listTopProducts(input: TopProductsLookupInput): Promise<TopProductSummaryRecord[]>;
  summarizeSales(input: SalesReportLookupInput): Promise<SalesSummaryRecord>;
}
