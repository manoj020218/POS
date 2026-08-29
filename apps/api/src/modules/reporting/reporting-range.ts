import { createHttpError } from '../../lib/http-error.js';
import type { SalesReportQuery, SalesSummaryRange } from './reporting.types.js';

export const resolveSalesSummaryRange = (
  query: Pick<SalesReportQuery, 'dateFrom' | 'dateTo'>,
  timezone: string,
  now = new Date()
): SalesSummaryRange => {
  if (!query.dateFrom && !query.dateTo) {
    const today = formatDateInTimeZone(now, timezone);
    return buildRange(today, today, 'TODAY', timezone);
  }

  if (!query.dateFrom || !query.dateTo) {
    throw createHttpError(
      400,
      'REPORT_DATE_RANGE_INCOMPLETE',
      'dateFrom and dateTo must be provided together'
    );
  }

  return buildRange(query.dateFrom, query.dateTo, 'DATE_RANGE', timezone);
};

const buildRange = (
  dateFrom: string,
  dateTo: string,
  reportType: SalesSummaryRange['reportType'],
  timezone: string
): SalesSummaryRange => {
  const fromParts = parseDateParts(dateFrom);
  const toParts = parseDateParts(dateTo);

  if (toUtcDayKey(fromParts) > toUtcDayKey(toParts)) {
    throw createHttpError(
      400,
      'REPORT_DATE_RANGE_INVALID',
      'dateFrom must be earlier than or equal to dateTo'
    );
  }

  return {
    dateFrom,
    dateTo,
    rangeEndExclusive: toTimeZoneStartOfDayUtc(addDays(toParts, 1), timezone),
    rangeStart: toTimeZoneStartOfDayUtc(fromParts, timezone),
    reportType,
    timezone
  };
};

type DateParts = { day: number; month: number; year: number };

const parseDateParts = (value: string): DateParts => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw createHttpError(400, 'REPORT_DATE_INVALID', 'Date must be valid');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw createHttpError(400, 'REPORT_DATE_INVALID', 'Date must be valid');
  }

  return { day, month, year };
};

const addDays = (parts: DateParts, days: number): DateParts => {
  const value = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    day: value.getUTCDate(),
    month: value.getUTCMonth() + 1,
    year: value.getUTCFullYear()
  };
};

const toUtcDayKey = (parts: DateParts) => Date.UTC(parts.year, parts.month - 1, parts.day);

const toTimeZoneStartOfDayUtc = (parts: DateParts, timezone: string) => {
  let candidate = toUtcDayKey(parts);

  for (let index = 0; index < 4; index += 1) {
    const offsetMilliseconds = getTimeZoneOffsetMilliseconds(new Date(candidate), timezone);
    const nextCandidate = toUtcDayKey(parts) - offsetMilliseconds;
    if (nextCandidate === candidate) {
      break;
    }

    candidate = nextCandidate;
  }

  return new Date(candidate);
};

const getTimeZoneOffsetMilliseconds = (value: Date, timezone: string) => {
  const parts = getDateTimeFormatter(timezone).formatToParts(value);
  const lookup = new Map(parts.map((part) => [part.type, part.value] as const));
  const hour = normalizeMidnightHour(Number(lookup.get('hour')));
  const zonedTime = Date.UTC(
    Number(lookup.get('year')),
    Number(lookup.get('month')) - 1,
    Number(lookup.get('day')),
    hour,
    Number(lookup.get('minute')),
    Number(lookup.get('second'))
  );

  return zonedTime - value.getTime();
};

const normalizeMidnightHour = (hour: number) => (hour === 24 ? 0 : hour);

const formatDateInTimeZone = (value: Date, timezone: string) => {
  const parts = getDateFormatter(timezone).formatToParts(value);
  const lookup = new Map(parts.map((part) => [part.type, part.value] as const));

  return `${lookup.get('year')}-${lookup.get('month')}-${lookup.get('day')}`;
};

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const dateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();

const getDateFormatter = (timezone: string) => {
  const existing = dateFormatterCache.get(timezone);
  if (existing) return existing;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: timezone,
    year: 'numeric'
  });
  dateFormatterCache.set(timezone, formatter);
  return formatter;
};

const getDateTimeFormatter = (timezone: string) => {
  const existing = dateTimeFormatterCache.get(timezone);
  if (existing) return existing;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone: timezone,
    year: 'numeric'
  });
  dateTimeFormatterCache.set(timezone, formatter);
  return formatter;
};
