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

const encodeBarcodeValue = (command: Extract<EscPosCommand, { type: 'BARCODE' }>) => {
  if (command.symbology === 'CODE128') {
    return createTextChunk(`{B${command.value}`);
  }

  return createTextChunk(command.value);
};

const encodeCommand = (command: EscPosCommand): number[] => {
  switch (command.type) {
    case 'INITIALIZE':
      return [ESC, 0x40];
    case 'TEXT':
      return [
        ESC,
        0x61,
        alignmentCodes[command.alignment ?? 'LEFT'],
        ESC,
        0x45,
        command.bold ? 1 : 0,
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
