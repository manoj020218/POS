import { createHttpError } from '../../lib/http-error.js';
import type { SalesReportQuery, SalesSummaryRange } from './reporting.types.js';

// Until Phase 10 business settings land, "today" uses the server local calendar day.
export const resolveSalesSummaryRange = (
  query: Pick<SalesReportQuery, 'dateFrom' | 'dateTo'>,
  now = new Date()
): SalesSummaryRange => {
  if (!query.dateFrom && !query.dateTo) {
    const today = formatLocalDate(now);
    return buildRange(today, today, 'TODAY');
  }

  if (!query.dateFrom || !query.dateTo) {
    throw createHttpError(
      400,
      'REPORT_DATE_RANGE_INCOMPLETE',
      'dateFrom and dateTo must be provided together'
    );
  }

  return buildRange(query.dateFrom, query.dateTo, 'DATE_RANGE');
};

const buildRange = (
  dateFrom: string,
  dateTo: string,
  reportType: SalesSummaryRange['reportType']
): SalesSummaryRange => {
  const rangeStart = parseLocalDate(dateFrom);
  const rangeEnd = parseLocalDate(dateTo);

  if (rangeStart.getTime() > rangeEnd.getTime()) {
    throw createHttpError(
      400,
      'REPORT_DATE_RANGE_INVALID',
      'dateFrom must be earlier than or equal to dateTo'
    );
  }

  return {
    dateFrom,
    dateTo,
    rangeEndExclusive: new Date(
      rangeEnd.getFullYear(),
      rangeEnd.getMonth(),
      rangeEnd.getDate() + 1
    ),
    rangeStart,
    reportType
  };
};

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year!, month! - 1, day!, 0, 0, 0, 0);

  if (formatLocalDate(parsed) !== value) {
    throw createHttpError(400, 'REPORT_DATE_INVALID', 'Date must be valid');
  }

  return parsed;
};

const formatLocalDate = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};
