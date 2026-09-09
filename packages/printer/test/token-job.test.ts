import { describe, expect, it } from 'vitest';

import { createTokenPrintJob, type ReceiptPrinterProfile } from '../src/index.js';

const profile: ReceiptPrinterProfile = {
  autoPrintReceipt: true,
  connectionType: 'TCP',
  name: 'Kiosk Printer',
  paperWidth: '58mm',
  port: 9100,
  target: '192.168.1.55'
};

describe('createTokenPrintJob', () => {
  it('builds an unpaid token with a large token number and a pay-at-counter note', () => {
    const job = createTokenPrintJob({
      businessName: 'Ganpati Chaat Corner',
      currencySymbol: 'Rs',
      items: [
        { lineTotal: 160, name: 'Pani Puri', quantity: 2 },
        { lineTotal: 60, name: 'Dahi Puri', quantity: 1 }
      ],
      printedAt: new Date('2026-09-09T08:12:00.000Z'),
      profile,
      tokenNumber: 'K-014',
      totalAmount: 220
    });

    expect(job.driver).toBe('ESC_POS');
    expect(job.commands).toContainEqual({
      alignment: 'CENTER',
      bold: true,
      size: 2,
      type: 'TEXT',
      value: 'K-014'
    });
    expect(job.commands).toContainEqual({
      alignment: 'LEFT',
      bold: false,
      type: 'TEXT',
      value: '2 x Pani Puri          Rs 160.00'
    });
    expect(job.commands).toContainEqual({
      alignment: 'LEFT',
      bold: true,
      type: 'TEXT',
      value: 'TOTAL                  Rs 220.00'
    });
    expect(job.commands).toContainEqual(
      expect.objectContaining({ alignment: 'CENTER', type: 'TEXT', value: 'Pay at counter to collect' })
    );
    expect(job.commands[job.commands.length - 1]).toEqual({ mode: 'FULL', type: 'CUT' });
  });

  it('stamps a PAID token with the gateway reference when paidReference is set', () => {
    const job = createTokenPrintJob({
      businessName: 'Ganpati Chaat Corner',
      items: [{ lineTotal: 60, name: 'Vada Pav', quantity: 1 }],
      paidReference: 'pay_QwErTy123',
      profile,
      tokenNumber: 'K-015',
      totalAmount: 60
    });

    expect(job.commands).toContainEqual({ alignment: 'CENTER', bold: true, size: 2, type: 'TEXT', value: 'PAID' });
    expect(job.commands).toContainEqual(
      expect.objectContaining({ value: 'UPI ref pay_QwErTy123' })
    );
  });

  it('rejects an empty token order', () => {
    expect(() =>
      createTokenPrintJob({ items: [], profile, tokenNumber: 'K-001', totalAmount: 0 })
    ).toThrow('Token print job requires at least one line item');
  });
});
