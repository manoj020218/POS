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

  it('sends a darker print-heating command right after reset on INITIALIZE', () => {
    const bytes = Array.from(encodeEscPosJob(createEscPosJob([{ type: 'INITIALIZE' }])));

    // ESC @ (reset) followed by ESC 7 n1 n2 n3 (print heating/density) --
    // widely honored by generic thermal printer clones, harmlessly ignored
    // by printers that don't support it.
    expect(bytes).toEqual([0x1b, 0x40, 0x1b, 0x37, 9, 200, 2]);
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

  it('encodes a double-width/height size command for large text, and normal size by default', () => {
    const bytes = Array.from(
      encodeEscPosJob(
        createEscPosJob([
          createTextCommand('K-014', 'CENTER', true, 2),
          createTextCommand('normal')
        ])
      )
    );

    // GS ! 0x11 (double width + double height) precedes the large text.
    expect(bytes.slice(0, 12)).toEqual([
      0x1b, 0x61, 0x01, 0x1b, 0x45, 0x01, 0x1d, 0x21, 0x11, 0x4b, 0x2d, 0x30
    ]);
    // GS ! 0x00 (normal size) precedes the default-size text.
    const secondCommandStart = bytes.indexOf(0x0a) + 1;
    expect(bytes.slice(secondCommandStart, secondCommandStart + 9)).toEqual([
      0x1b, 0x61, 0x00, 0x1b, 0x45, 0x00, 0x1d, 0x21, 0x00
    ]);
  });
});
