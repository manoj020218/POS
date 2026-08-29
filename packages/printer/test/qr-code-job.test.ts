import { describe, expect, it } from 'vitest';

import { createQrCodePrintJob, type ReceiptPrinterProfile } from '../src/index.js';

const profile: ReceiptPrinterProfile = {
  connectionType: 'TCP',
  name: 'Counter Printer',
  paperWidth: '58mm',
  port: 9100,
  target: '192.168.1.55'
};

describe('createQrCodePrintJob', () => {
  it('builds a QR label and normalizes the requested size', () => {
    const job = createQrCodePrintJob({
      captionLines: ['Scan to pay'],
      footerLines: ['upi://pay?pa=merchant@upi'],
      profile,
      size: 11,
      title: 'UPI PAYMENT',
      value: 'upi://pay?pa=merchant@upi&pn=Smart%20POS'
    });

    expect(job.driver).toBe('ESC_POS');
    expect(job.commands).toContainEqual({
      alignment: 'CENTER',
      bold: true,
      type: 'TEXT',
      value: 'UPI PAYMENT'
    });
    expect(job.commands).toContainEqual({
      size: 8,
      type: 'QRCODE',
      value: 'upi://pay?pa=merchant@upi&pn=Smart%20POS'
    });
    expect(job.commands).toContainEqual({
      alignment: 'CENTER',
      bold: false,
      type: 'TEXT',
      value: 'Scan to pay'
    });
  });

  it('rejects blank QR payloads', () => {
    expect(() =>
      createQrCodePrintJob({
        profile,
        value: '  '
      })
    ).toThrow('QR print job requires a non-empty value');
  });
});
