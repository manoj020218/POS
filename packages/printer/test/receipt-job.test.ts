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
        { name: 'Masala Dosa', quantity: 2, totalAmount: 240, unitPriceAmount: 120 },
        { name: 'Filter Coffee', note: 'Less sugar', quantity: 1, totalAmount: 45, unitPriceAmount: 45 }
      ],
      payments: [{ amount: 285, label: 'CASH' }],
      printedAt: new Date('2026-08-29T12:20:00.000Z'),
      profile,
      subtotalAmount: 285,
      totalAmount: 285
    });

    expect(job.driver).toBe('ESC_POS');
    expect(job.commands).toContainEqual({
      alignment: 'CENTER',
      bold: true,
      type: 'TEXT',
      value: 'SALES RECEIPT'
    });
    // Item lines are "qty x rate = total" in plain numbers -- the currency
    // label appears once, at Subtotal/Tax/Total/Payments, not per item.
    expect(job.commands).toContainEqual({
      alignment: 'LEFT',
      bold: false,
      type: 'TEXT',
      value: '2 x 120.00 = 240.00'
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
      value: 'Total = INR 285.00'
    });
    expect(job.commands[job.commands.length - 1]).toEqual({ mode: 'FULL', type: 'CUT' });
  });

  it('splits tax into CGST/SGST lines when showGstSplit is set', () => {
    const job = createReceiptPrintJob({
      businessName: 'Smart POS Foods',
      currencySymbol: 'INR',
      invoiceNumber: 'INV-MAIN-01-000126',
      items: [{ name: 'Masala Dosa', quantity: 1, totalAmount: 236, unitPriceAmount: 236 }],
      profile,
      showGstSplit: true,
      subtotalAmount: 200,
      taxAmount: 36,
      totalAmount: 236
    });

    const textValues = job.commands.filter((command) => command.type === 'TEXT').map((command) => command.value);

    expect(textValues).not.toContain('Tax = INR 36.00');
    expect(textValues).toContain('CGST = INR 18.00');
    expect(textValues).toContain('SGST = INR 18.00');
  });

  it('prints a single Tax line when showGstSplit is not set', () => {
    const job = createReceiptPrintJob({
      businessName: 'Smart POS Foods',
      currencySymbol: 'INR',
      invoiceNumber: 'INV-MAIN-01-000127',
      items: [{ name: 'Masala Dosa', quantity: 1, totalAmount: 236, unitPriceAmount: 236 }],
      profile,
      subtotalAmount: 200,
      taxAmount: 36,
      totalAmount: 236
    });

    const textValues = job.commands.filter((command) => command.type === 'TEXT').map((command) => command.value);

    expect(textValues).toContain('Tax = INR 36.00');
    expect(textValues.some((value) => value.startsWith('CGST'))).toBe(false);
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
