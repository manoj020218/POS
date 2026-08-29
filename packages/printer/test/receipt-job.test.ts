import { describe, expect, it } from 'vitest';

import { createReceiptPrintJob, type ReceiptPrinterProfile } from '../src/index.js';

const profile: ReceiptPrinterProfile = {
  autoPrintReceipt: true,
  connectionType: 'TCP',
  name: 'Billing Printer',
  paperWidth: '58mm',
  port: 9100,
  target: '192.168.1.55'
};

describe('createReceiptPrintJob', () => {
  it('builds a formatted sales receipt with totals and payment lines', () => {
    const job = createReceiptPrintJob({
      branchName: 'Main Branch',
      businessName: 'Smart POS Foods',
      cashierName: 'Asha',
      currencySymbol: 'INR',
      customerName: 'Walk-in Customer',
      footerLines: ['Thank you for shopping'],
      invoiceNumber: 'INV-MAIN-01-000125',
      items: [
        { name: 'Masala Dosa', quantity: 2, totalAmount: 24000, unitPriceAmount: 12000 },
        { name: 'Filter Coffee', note: 'Less sugar', quantity: 1, totalAmount: 4500, unitPriceAmount: 4500 }
      ],
      payments: [{ amount: 28500, label: 'CASH' }],
      printedAt: new Date('2026-08-29T12:20:00.000Z'),
      profile,
      subtotalAmount: 28500,
      totalAmount: 28500
    });

    expect(job.driver).toBe('ESC_POS');
    expect(job.commands).toContainEqual({
      alignment: 'CENTER',
      bold: true,
      type: 'TEXT',
      value: 'SALES RECEIPT'
    });
    expect(job.commands).toContainEqual({
      alignment: 'LEFT',
      bold: false,
      type: 'TEXT',
      value: '2 x INR 120.00        INR 240.00'
    });
    expect(job.commands).toContainEqual({
      alignment: 'LEFT',
      bold: false,
      type: 'TEXT',
      value: 'Note: Less sugar'
    });
    expect(job.commands).toContainEqual({
      alignment: 'LEFT',
      bold: true,
      type: 'TEXT',
      value: 'Total                 INR 285.00'
    });
    expect(job.commands[job.commands.length - 1]).toEqual({ mode: 'FULL', type: 'CUT' });
  });

  it('rejects empty receipts', () => {
    expect(() =>
      createReceiptPrintJob({
        businessName: 'Smart POS Foods',
        invoiceNumber: 'INV-EMPTY',
        items: [],
        profile,
        totalAmount: 0
      })
    ).toThrow('Receipt print job requires at least one line item');
  });
});
