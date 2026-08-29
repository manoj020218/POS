export const escPosTextAlignments = ['LEFT', 'CENTER', 'RIGHT'] as const;

export type EscPosTextAlignment = (typeof escPosTextAlignments)[number];

export const escPosCutModes = ['FULL', 'PARTIAL'] as const;

export type EscPosCutMode = (typeof escPosCutModes)[number];

export const escPosBarcodeSymbologies = ['CODE128', 'EAN13', 'EAN8', 'UPCA', 'UPCE'] as const;

export type EscPosBarcodeSymbology = (typeof escPosBarcodeSymbologies)[number];

export type EscPosCommand =
  | { type: 'INITIALIZE' }
  | {
      alignment?: EscPosTextAlignment;
      bold?: boolean;
      type: 'TEXT';
      value: string;
    }
  | { lines: number; type: 'FEED' }
  | { mode: EscPosCutMode; type: 'CUT' }
  | { type: 'OPEN_CASH_DRAWER' }
  | { symbology: EscPosBarcodeSymbology; type: 'BARCODE'; value: string }
  | { size: number; type: 'QRCODE'; value: string };

export type EscPosPrintJob = {
  commands: EscPosCommand[];
  driver: 'ESC_POS';
};

export const createEscPosJob = (commands: EscPosCommand[]): EscPosPrintJob => ({
  commands,
  driver: 'ESC_POS'
});

export const createFeedCommand = (lines = 1): EscPosCommand => ({ lines, type: 'FEED' });

export const createCutCommand = (mode: EscPosCutMode = 'FULL'): EscPosCommand => ({
  mode,
  type: 'CUT'
});

export const createTextCommand = (
  value: string,
  alignment: EscPosTextAlignment = 'LEFT',
  bold = false
): EscPosCommand => ({
  alignment,
  bold,
  type: 'TEXT',
  value
});

export const createOpenCashDrawerCommand = (): EscPosCommand => ({ type: 'OPEN_CASH_DRAWER' });

export const createBarcodeCommand = (
  value: string,
  symbology: EscPosBarcodeSymbology = 'CODE128'
): EscPosCommand => ({
  symbology,
  type: 'BARCODE',
  value
});

export const createQrCodeCommand = (value: string, size = 6): EscPosCommand => ({
  size,
  type: 'QRCODE',
  value
});
