import { describe, expect, it } from 'vitest';

import {
  createBarcodeCommand,
  createCutCommand,
  createEscPosJob,
  createFeedCommand,
  createOpenCashDrawerCommand,
  createQrCodeCommand,
  createTextCommand,
  encodeEscPosJob
} from '../src/index.js';

describe('encodeEscPosJob', () => {
  it('encodes aligned text and cut commands into ESC/POS bytes', () => {
    const bytes = Array.from(
      encodeEscPosJob(
        createEscPosJob([
          { type: 'INITIALIZE' },
          createTextCommand('Smart POS', 'CENTER', true),
          createFeedCommand(2),
          createCutCommand('PARTIAL')
        ])
      )
    );

    expect(bytes.slice(0, 2)).toEqual([0x1b, 0x40]);
    expect(bytes).toEqual(
      expect.arrayContaining([0x1b, 0x61, 0x01, 0x1b, 0x45, 0x01, 0x53, 0x6d, 0x61, 0x72])
    );
    expect(bytes.slice(-3)).toEqual([0x1d, 0x56, 0x01]);
  });

  it('encodes drawer, barcode, and QR commands with ESC/POS control sequences', () => {
    const bytes = Array.from(
      encodeEscPosJob(
        createEscPosJob([
          { type: 'INITIALIZE' },
          createOpenCashDrawerCommand(),
          createBarcodeCommand('1234567890123', 'EAN13'),
          createQrCodeCommand('upi://pay?pa=merchant@upi', 6)
        ])
      )
    );

    expect(bytes).toEqual(expect.arrayContaining([0x1b, 0x70, 0x00, 50, 250]));
    expect(bytes).toEqual(expect.arrayContaining([0x1d, 0x6b, 67, 13]));
    expect(bytes).toEqual(expect.arrayContaining([0x1d, 0x28, 0x6b, 3, 0, 49, 81, 48]));
  });
});
