import type { PrinterConnectionType, ReceiptPrinterProfile } from './printer-profile.js';
import type {
  PrinterExecutionResult,
  PrinterJobRequest,
  PrinterOperation,
  PrinterService
} from './printer-service.js';
import { encodeEscPosJob } from './escpos-encoder.js';

export type EncodedPrinterJob = {
  bytes: Uint8Array;
  job: PrinterJobRequest['job'];
  operation: PrinterOperation;
  profile: ReceiptPrinterProfile;
};

export type TransportPrinterServiceOptions = {
  connectionType: PrinterConnectionType;
  execute: (input: EncodedPrinterJob) => Promise<void>;
  now?: () => Date;
  validateProfile?: (profile: ReceiptPrinterProfile) => void;
};

const assertConnectionType = (
  profile: ReceiptPrinterProfile,
  connectionType: PrinterConnectionType
) => {
  if (profile.connectionType !== connectionType) {
    throw new Error(
      `Expected ${connectionType} printer profile, received ${profile.connectionType}`
    );
  }
};

const createResult = (
  operation: PrinterOperation,
  input: PrinterJobRequest,
  now: () => Date
): PrinterExecutionResult => ({
  acceptedAt: now(),
  commandCount: input.job.commands.length,
  connectionType: input.profile.connectionType,
  operation,
  profileName: input.profile.name,
  target: input.profile.target
});

export const createTransportPrinterService = (
  options: TransportPrinterServiceOptions
): PrinterService => {
  const now = options.now ?? (() => new Date());
  const executeOperation =
    (operation: PrinterOperation) =>
    async (input: PrinterJobRequest): Promise<PrinterExecutionResult> => {
      assertConnectionType(input.profile, options.connectionType);
      options.validateProfile?.(input.profile);

      await options.execute({
        bytes: encodeEscPosJob(input.job),
        job: input.job,
        operation,
        profile: input.profile
      });

      return createResult(operation, input, now);
    };

  return {
    cutPaper: executeOperation('CUT_PAPER'),
    openCashDrawer: executeOperation('OPEN_CASH_DRAWER'),
    printBarcode: executeOperation('PRINT_BARCODE'),
    printKitchenOrder: executeOperation('PRINT_KITCHEN_ORDER'),
    printQrCode: executeOperation('PRINT_QR_CODE'),
    printReceipt: executeOperation('PRINT_RECEIPT'),
    printTestPage: executeOperation('PRINT_TEST_PAGE')
  };
};
