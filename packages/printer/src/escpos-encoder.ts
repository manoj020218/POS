import type { EscPosCommand, EscPosPrintJob, EscPosTextAlignment } from './escpos.js';

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const textEncoder = new TextEncoder();

const alignmentCodes: Record<EscPosTextAlignment, number> = {
  CENTER: 1,
  LEFT: 0,
  RIGHT: 2
};

const barcodeCodes = {
  CODE128: 73,
  EAN13: 67,
  EAN8: 68,
  UPCA: 65,
  UPCE: 66
} as const;

const createTextChunk = (value: string) => Array.from(textEncoder.encode(value));

const createQrDataLengthBytes = (payloadLength: number): [number, number] => {
  const commandLength = payloadLength + 3;
  return [commandLength % 256, Math.floor(commandLength / 256)];
};

// CODE128 (GS k m=73) technically wants a leading "{A"/"{B"/"{C" code-set
// selector per Epson's spec, but the printer this was tested against doesn't
// honor that convention — it doesn't strip the selector, so scanners read
// the prefix as literal data (e.g. token "K-003" decodes back as "BK-00...").
// Sending the raw value lets its firmware default to Code Set B on its own,
// which round-trips correctly on that hardware.
const encodeBarcodeValue = (command: Extract<EscPosCommand, { type: 'BARCODE' }>) => createTextChunk(command.value);

// ESC 7 n1 n2 n3 -- "print heating" (dots / time / interval). Not part of
// the official ESC/POS spec, but nearly every generic 58/80mm thermal
// printer clone (the kind sold for POS use in India) honors it, and
// printers that don't just ignore the unrecognized command. Raising the
// heating time (n2) is the standard way to print darker on this class of
// hardware -- there's no separate "density" API exposed anywhere else.
// Trade-off: more heating time means each line is slower (the head stays
// hot longer per dot) and more heating dots draws more current at once,
// which matters more on battery-powered Bluetooth printers than USB/AC
// ones. These values are pushed toward the dark end but still within the
// range this class of printer is commonly run at.
const PRINT_DENSITY = { heatingDots: 9, heatingInterval: 2, heatingTime: 200 };

const encodeCommand = (command: EscPosCommand): number[] => {
  switch (command.type) {
    case 'INITIALIZE':
      return [
        ESC,
        0x40,
        ESC,
        0x37,
        PRINT_DENSITY.heatingDots,
        PRINT_DENSITY.heatingTime,
        PRINT_DENSITY.heatingInterval
      ];
    case 'TEXT':
      return [
        ESC,
        0x61,
        alignmentCodes[command.alignment ?? 'LEFT'],
        ESC,
        0x45,
        command.bold ? 1 : 0,
        GS,
        0x21,
        command.size === 2 ? 0x11 : 0x00,
        ...createTextChunk(command.value),
        LF
      ];
    case 'FEED':
      return [ESC, 0x64, Math.max(1, Math.min(255, command.lines))];
    case 'CUT':
      return [GS, 0x56, command.mode === 'FULL' ? 0 : 1];
    case 'OPEN_CASH_DRAWER':
      return [ESC, 0x70, 0, 50, 250];
    case 'BARCODE': {
      const valueBytes = encodeBarcodeValue(command);
      return [
        GS,
        0x48,
        2,
        GS,
        0x77,
        2,
        GS,
        0x68,
        80,
        GS,
        0x6b,
        barcodeCodes[command.symbology],
        valueBytes.length,
        ...valueBytes
      ];
    }
    case 'QRCODE': {
      const valueBytes = createTextChunk(command.value);
      const [low, high] = createQrDataLengthBytes(valueBytes.length);
      return [
        GS,
        0x28,
        0x6b,
        4,
        0,
        49,
        65,
        50,
        0,
        GS,
        0x28,
        0x6b,
        3,
        0,
        49,
        67,
        Math.max(1, Math.min(16, command.size)),
        GS,
        0x28,
        0x6b,
        3,
        0,
        49,
        69,
        48,
        GS,
        0x28,
        0x6b,
        low,
        high,
        49,
        80,
        48,
        ...valueBytes,
        GS,
        0x28,
        0x6b,
        3,
        0,
        49,
        81,
        48
      ];
    }
  }
};

export const encodeEscPosJob = (job: EscPosPrintJob) =>
  Uint8Array.from(job.commands.flatMap((command) => encodeCommand(command)));
