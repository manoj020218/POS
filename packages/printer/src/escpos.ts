export const escPosTextAlignments = ['LEFT', 'CENTER', 'RIGHT'] as const;

export type EscPosTextAlignment = (typeof escPosTextAlignments)[number];

export type EscPosCommand =
  | { type: 'INITIALIZE' }
  | {
      alignment?: EscPosTextAlignment;
      bold?: boolean;
      type: 'TEXT';
      value: string;
    }
  | { lines: number; type: 'FEED' }
  | { mode: 'FULL' | 'PARTIAL'; type: 'CUT' }
  | { type: 'OPEN_CASH_DRAWER' }
  | { symbology: 'CODE128' | 'EAN13' | 'EAN8' | 'UPCA' | 'UPCE'; type: 'BARCODE'; value: string }
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

export const createCutCommand = (mode: 'FULL' | 'PARTIAL' = 'FULL'): EscPosCommand => ({
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
  symbology: 'CODE128' | 'EAN13' | 'EAN8' | 'UPCA' | 'UPCE' = 'CODE128'
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
