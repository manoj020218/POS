import type { EscPosPrintJob } from './escpos.js';
import type { PrinterConnectionType, ReceiptPrinterProfile } from './printer-profile.js';

export const printerOperations = [
  'CUT_PAPER',
  'OPEN_CASH_DRAWER',
  'PRINT_BARCODE',
  'PRINT_KITCHEN_ORDER',
  'PRINT_QR_CODE',
  'PRINT_RECEIPT',
  'PRINT_TEST_PAGE'
] as const;

export type PrinterOperation = (typeof printerOperations)[number];

export type PrinterJobRequest = {
  job: EscPosPrintJob;
  profile: ReceiptPrinterProfile;
};

export type PrinterExecutionResult = {
  acceptedAt: Date;
  commandCount: number;
  connectionType: PrinterConnectionType;
  operation: PrinterOperation;
  profileName: string;
  target?: string;
};

export interface PrinterService {
  cutPaper(input: PrinterJobRequest): Promise<PrinterExecutionResult>;
  openCashDrawer(input: PrinterJobRequest): Promise<PrinterExecutionResult>;
  printBarcode(input: PrinterJobRequest): Promise<PrinterExecutionResult>;
  printKitchenOrder(input: PrinterJobRequest): Promise<PrinterExecutionResult>;
  printQrCode(input: PrinterJobRequest): Promise<PrinterExecutionResult>;
  printReceipt(input: PrinterJobRequest): Promise<PrinterExecutionResult>;
  printTestPage(input: PrinterJobRequest): Promise<PrinterExecutionResult>;
}
