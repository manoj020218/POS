export type SalesSummaryQuery = {
  businessId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type SalesSummaryRange = {
  dateFrom: string;
  dateTo: string;
  rangeEndExclusive: Date;
  rangeStart: Date;
  reportType: 'DATE_RANGE' | 'TODAY';
};

export type SalesSummaryLookupInput = {
  businessIds: string[];
  occurredAtFrom: Date;
  occurredAtTo: Date;
  tenantId: string;
};

export type SalesSummaryRecord = {
  discountAmount: number;
  saleCount: number;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  totalQuantity: number;
};

export type SalesSummaryView = SalesSummaryRecord & {
  averageSaleAmount: number;
  businessCount: number;
  businessId?: string;
  dateFrom: string;
  dateTo: string;
  reportType: SalesSummaryRange['reportType'];
};

export const emptySalesSummaryRecord = (): SalesSummaryRecord => ({
  discountAmount: 0,
  saleCount: 0,
  subtotalAmount: 0,
  taxAmount: 0,
  totalAmount: 0,
  totalQuantity: 0
});
