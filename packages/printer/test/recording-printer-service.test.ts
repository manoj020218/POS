import { describe, expect, it } from 'vitest';

import {
  createEscPosJob,
  createOpenCashDrawerCommand,
  createRecordingPrinterService,
  createTextCommand,
  type ReceiptPrinterProfile
} from '../src/index.js';

const profile: ReceiptPrinterProfile = {
  autoPrintReceipt: true,
  connectionType: 'TCP',
  name: 'Billing Printer',
  paperWidth: '80mm',
  port: 9100,
  target: '192.168.1.55'
};

describe('createRecordingPrinterService', () => {
  it('records accepted printer operations without picking a concrete transport', async () => {
    const service = createRecordingPrinterService(() => new Date('2026-08-29T12:00:00.000Z'));
    const receiptJob = createEscPosJob([createTextCommand('Receipt')]);
    const drawerJob = createEscPosJob([createOpenCashDrawerCommand()]);

    const receipt = await service.printReceipt({ job: receiptJob, profile });
    const drawer = await service.openCashDrawer({ job: drawerJob, profile });

    expect(receipt).toMatchObject({
      commandCount: 1,
      connectionType: 'TCP',
      operation: 'PRINT_RECEIPT',
      profileName: 'Billing Printer',
      target: '192.168.1.55'
    });
    expect(drawer.operation).toBe('OPEN_CASH_DRAWER');
    expect(service.history).toHaveLength(2);
    expect(service.history.map((entry) => entry.operation)).toEqual([
      'PRINT_RECEIPT',
      'OPEN_CASH_DRAWER'
    ]);
  });
});
