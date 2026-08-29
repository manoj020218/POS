import { describe, expect, it } from 'vitest';

import { createBarcodePrintJob, type ReceiptPrinterProfile } from '../src/index.js';

const profile: ReceiptPrinterProfile = {
  connectionType: 'TCP',
  name: 'Label Printer',
  paperWidth: '58mm',
  port: 9100,
  target: '192.168.1.70'
};

describe('createBarcodePrintJob', () => {
  it('builds a barcode label with title and caption lines', () => {
    const job = createBarcodePrintJob({
      captionLines: ['Masala Dosa'],
      profile,
      symbology: 'EAN13',
      title: 'PRODUCT LABEL',
      value: '1234567890123'
    });

    expect(job.driver).toBe('ESC_POS');
    expect(job.commands).toContainEqual({
      alignment: 'CENTER',
      bold: true,
      type: 'TEXT',
      value: 'PRODUCT LABEL'
    });
    expect(job.commands).toContainEqual({
      symbology: 'EAN13',
      type: 'BARCODE',
      value: '1234567890123'
    });
    expect(job.commands).toContainEqual({
      alignment: 'CENTER',
      bold: false,
      type: 'TEXT',
      value: '1234567890123'
    });
  });

  it('rejects blank barcode values', () => {
    expect(() =>
      createBarcodePrintJob({
        profile,
        value: '   '
      })
    ).toThrow('Barcode print job requires a non-empty value');
  });
});
