import type { PrinterService, PrinterExecutionResult, PrinterJobRequest, PrinterOperation } from './printer-service.js';

export type RecordedPrinterOperation = {
  job: PrinterJobRequest['job'];
  operation: PrinterOperation;
  profile: PrinterJobRequest['profile'];
  result: PrinterExecutionResult;
};

export type RecordingPrinterService = PrinterService & {
  history: RecordedPrinterOperation[];
};

export const createRecordingPrinterService = (
  now: () => Date = () => new Date()
): RecordingPrinterService => {
  const history: RecordedPrinterOperation[] = [];
  const record = async (
    operation: PrinterOperation,
    input: PrinterJobRequest
  ): Promise<PrinterExecutionResult> => {
    const result: PrinterExecutionResult = {
      acceptedAt: now(),
      commandCount: input.job.commands.length,
      connectionType: input.profile.connectionType,
      operation,
      profileName: input.profile.name,
      target: input.profile.target
    };

    history.push({ job: input.job, operation, profile: input.profile, result });
    return result;
  };

  return {
    cutPaper: (input) => record('CUT_PAPER', input),
    history,
    openCashDrawer: (input) => record('OPEN_CASH_DRAWER', input),
    printBarcode: (input) => record('PRINT_BARCODE', input),
    printKitchenOrder: (input) => record('PRINT_KITCHEN_ORDER', input),
    printQrCode: (input) => record('PRINT_QR_CODE', input),
    printReceipt: (input) => record('PRINT_RECEIPT', input),
    printTestPage: (input) => record('PRINT_TEST_PAGE', input)
  };
};
