import { describe, expect, it } from 'vitest';

import { createPrinterTestPageJob, type ReceiptPrinterProfile } from '../src/index.js';

describe('createPrinterTestPageJob', () => {
  it('builds an ESC/POS test page using the stored printer profile', () => {
    const profile: ReceiptPrinterProfile = {
      connectionType: 'TCP',
      name: 'Billing Printer',
      paperWidth: '80mm',
      port: 9100,
      target: '192.168.1.55'
    };

    const job = createPrinterTestPageJob(profile, new Date('2026-08-29T10:15:00.000Z'));

    expect(job.driver).toBe('ESC_POS');
    expect(job.commands[0]).toEqual({ type: 'INITIALIZE' });
    expect(job.commands).toContainEqual({
      alignment: 'CENTER',
      bold: true,
      type: 'TEXT',
      value: 'Printer Test Page'
    });
    expect(job.commands).toContainEqual({
      alignment: 'LEFT',
      bold: false,
      type: 'TEXT',
      value: 'Target: 192.168.1.55:9100'
    });
    expect(job.commands[job.commands.length - 1]).toEqual({ mode: 'FULL', type: 'CUT' });
  });
});
