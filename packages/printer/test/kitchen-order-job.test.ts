import { describe, expect, it } from 'vitest';

import { createKitchenOrderPrintJob, type ReceiptPrinterProfile } from '../src/index.js';

const profile: ReceiptPrinterProfile = {
  connectionType: 'TCP',
  name: 'Kitchen Printer',
  paperWidth: '58mm',
  port: 9100,
  target: '192.168.1.60'
};

describe('createKitchenOrderPrintJob', () => {
  it('builds a kitchen order ticket with item modifiers and notes', () => {
    const job = createKitchenOrderPrintJob({
      businessName: 'Smart POS Foods',
      cashierName: 'Asha',
      footerLines: ['Rush order'],
      items: [
        {
          modifiers: ['No onion', 'Extra chutney'],
          name: 'Veg Burger',
          note: 'Serve first',
          quantity: 2
        }
      ],
      orderType: 'DINE_IN',
      printedAt: new Date('2026-08-29T12:35:00.000Z'),
      profile,
      tableLabel: 'T-07',
      ticketNumber: 'KOT-125'
    });

    expect(job.driver).toBe('ESC_POS');
    expect(job.commands).toContainEqual({
      alignment: 'CENTER',
      bold: true,
      type: 'TEXT',
      value: 'KITCHEN ORDER'
    });
    expect(job.commands).toContainEqual({
      alignment: 'LEFT',
      bold: true,
      type: 'TEXT',
      value: '2 x Veg Burger'
    });
    expect(job.commands).toContainEqual({
      alignment: 'LEFT',
      bold: false,
      type: 'TEXT',
      value: '- Extra chutney'
    });
    expect(job.commands).toContainEqual({
      alignment: 'LEFT',
      bold: false,
      type: 'TEXT',
      value: 'Note: Serve first'
    });
  });

  it('rejects empty kitchen orders', () => {
    expect(() =>
      createKitchenOrderPrintJob({
        items: [],
        profile,
        ticketNumber: 'KOT-EMPTY'
      })
    ).toThrow('Kitchen order print job requires at least one line item');
  });
});
