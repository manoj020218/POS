import { describe, expect, it } from 'vitest';

import { parseCsv } from '../../src/lib/csv.js';
import { buildSalesReportCsv } from '../../src/lib/sales-report-csv.js';

describe('buildSalesReportCsv', () => {
  it('formats amounts as whole currency units and lists payment and product breakdowns', () => {
    const csv = buildSalesReportCsv({
      businessName: 'Ramesh Dhaba',
      generatedAt: new Date('2026-09-22T10:00:00.000Z'),
      paymentBreakdown: {
        businessCount: 1,
        dateFrom: '2026-09-22',
        dateTo: '2026-09-22',
        reportType: 'TODAY',
        rows: [
          {
            averageSaleAmount: 150,
            discountAmount: 0,
            paymentMethod: 'CASH',
            saleCount: 2,
            subtotalAmount: 280,
            taxAmount: 20,
            totalAmount: 300,
            totalQuantity: 4
          }
        ],
        timezone: 'Asia/Kolkata'
      },
      summary: {
        averageSaleAmount: 150,
        businessCount: 1,
        dateFrom: '2026-09-22',
        dateTo: '2026-09-22',
        discountAmount: 0,
        reportType: 'TODAY',
        saleCount: 2,
        subtotalAmount: 280,
        taxAmount: 20,
        timezone: 'Asia/Kolkata',
        totalAmount: 300,
        totalQuantity: 4
      },
      topProducts: {
        businessCount: 1,
        dateFrom: '2026-09-22',
        dateTo: '2026-09-22',
        limit: 10,
        reportType: 'TODAY',
        rows: [
          {
            averageUnitPrice: 75,
            discountAmount: 0,
            productId: 'p1',
            productName: 'Masala Dosa',
            productSku: 'DOSA-1',
            rank: 1,
            saleCount: 2,
            subtotalAmount: 280,
            taxAmount: 20,
            totalAmount: 300,
            totalQuantity: 4
          }
        ],
        timezone: 'Asia/Kolkata'
      }
    });

    const rows = parseCsv(csv);

    expect(rows).toContainEqual(['Business', 'Ramesh Dhaba']);
    expect(rows).toContainEqual(['Total sales', '300.00']);
    expect(rows).toContainEqual(['CASH', '2', '300.00']);
    expect(rows).toContainEqual(['Masala Dosa (DOSA-1)', '4', '300.00']);
  });
});
