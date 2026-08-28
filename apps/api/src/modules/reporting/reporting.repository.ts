import type { SalesSummaryLookupInput, SalesSummaryRecord } from './reporting.types.js';

export interface ReportingRepository {
  summarizeSales(input: SalesSummaryLookupInput): Promise<SalesSummaryRecord>;
}
