export const printerConnectionTypes = ['BLUETOOTH', 'SYSTEM', 'TCP', 'USB'] as const;

export type PrinterConnectionType = (typeof printerConnectionTypes)[number];

export const printerPaperWidths = ['58mm', '80mm'] as const;

export type PrinterPaperWidth = (typeof printerPaperWidths)[number];

export type ReceiptPrinterProfile = {
  autoPrintReceipt?: boolean;
  connectionType: PrinterConnectionType;
  name: string;
  paperWidth: PrinterPaperWidth;
  port?: number;
  target?: string;
};

export const describePrinterTarget = (profile: ReceiptPrinterProfile) => {
  if (profile.connectionType === 'TCP') {
    return profile.port ? `${profile.target ?? 'UNKNOWN'}:${profile.port}` : profile.target ?? 'UNKNOWN';
  }

  return profile.target ?? 'SYSTEM_DEFAULT';
};
