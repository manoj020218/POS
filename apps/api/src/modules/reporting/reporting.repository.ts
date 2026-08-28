import type {
  BranchSalesSummaryRecord,
  CashierSalesSummaryRecord,
  PaymentMethodSummaryRecord,
  SalesReportLookupInput,
  SalesSummaryRecord,
  TerminalSalesSummaryRecord,
  TopProductSummaryRecord,
  TopProductsLookupInput
} from './reporting.types.js';

export interface ReportingRepository {
  listSalesByBranch(input: SalesReportLookupInput): Promise<BranchSalesSummaryRecord[]>;
  listSalesByCashier(input: SalesReportLookupInput): Promise<CashierSalesSummaryRecord[]>;
  listSalesByPaymentMethod(input: SalesReportLookupInput): Promise<PaymentMethodSummaryRecord[]>;
  listSalesByTerminal(input: SalesReportLookupInput): Promise<TerminalSalesSummaryRecord[]>;
  listTopProducts(input: TopProductsLookupInput): Promise<TopProductSummaryRecord[]>;
  summarizeSales(input: SalesReportLookupInput): Promise<SalesSummaryRecord>;
}
