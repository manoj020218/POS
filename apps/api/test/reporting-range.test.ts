import { describe, expect, it } from 'vitest';

import { resolveSalesSummaryRange } from '../src/modules/reporting/reporting-range.js';

describe('resolveSalesSummaryRange', () => {
  it('keeps UTC day boundaries on the requested day', () => {
    const range = resolveSalesSummaryRange(
      { dateFrom: '2026-08-29', dateTo: '2026-08-29' },
      'UTC'
    );

    expect(range.rangeStart.toISOString()).toBe('2026-08-29T00:00:00.000Z');
    expect(range.rangeEndExclusive.toISOString()).toBe('2026-08-30T00:00:00.000Z');
  });

  it('keeps timezone-shifted day boundaries on the requested local day', () => {
    const range = resolveSalesSummaryRange(
      { dateFrom: '2026-08-27', dateTo: '2026-08-27' },
      'America/New_York'
    );

    expect(range.rangeStart.toISOString()).toBe('2026-08-27T04:00:00.000Z');
    expect(range.rangeEndExclusive.toISOString()).toBe('2026-08-28T04:00:00.000Z');
  });
});
