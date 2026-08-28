import { createHttpError } from '../../lib/http-error.js';
import { resolveSalesSummaryRange } from './reporting-range.js';
import type {
  SalesAggregateView,
  SalesReportMeta,
  SalesSummaryRecord
} from './reporting.types.js';

export const toSalesAggregateView = (summary: SalesSummaryRecord): SalesAggregateView => ({
  ...summary,
  averageSaleAmount: summary.saleCount ? Math.round(summary.totalAmount / summary.saleCount) : 0
});

export const toSalesReportMeta = (
  businessCount: number,
  businessId: string | undefined,
  range: ReturnType<typeof resolveSalesSummaryRange>
): SalesReportMeta => ({
  businessCount,
  businessId,
  dateFrom: range.dateFrom,
  dateTo: range.dateTo,
  reportType: range.reportType
});

export const requireReportRecord = <T>(record: T | undefined, code: string, message: string) => {
  if (record) {
    return record;
  }

  throw createHttpError(404, code, message);
};
