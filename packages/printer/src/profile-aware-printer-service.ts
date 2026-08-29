import type { PrinterConnectionType, ReceiptPrinterProfile } from './printer-profile.js';
import type { PrinterJobRequest, PrinterService } from './printer-service.js';

export type PrinterServiceRegistry = Partial<Record<PrinterConnectionType, PrinterService>>;

const getPrinterService = (
  services: PrinterServiceRegistry,
  profile: ReceiptPrinterProfile
): PrinterService => {
  const service = services[profile.connectionType];

  if (!service) {
    throw new Error(`No printer service configured for ${profile.connectionType}`);
  }

  return service;
};

export const createProfileAwarePrinterService = (
  services: PrinterServiceRegistry
): PrinterService => ({
  cutPaper: (input: PrinterJobRequest) => getPrinterService(services, input.profile).cutPaper(input),
  openCashDrawer: (input: PrinterJobRequest) =>
    getPrinterService(services, input.profile).openCashDrawer(input),
  printBarcode: (input: PrinterJobRequest) =>
    getPrinterService(services, input.profile).printBarcode(input),
  printKitchenOrder: (input: PrinterJobRequest) =>
    getPrinterService(services, input.profile).printKitchenOrder(input),
  printQrCode: (input: PrinterJobRequest) =>
    getPrinterService(services, input.profile).printQrCode(input),
  printReceipt: (input: PrinterJobRequest) =>
    getPrinterService(services, input.profile).printReceipt(input),
  printTestPage: (input: PrinterJobRequest) =>
    getPrinterService(services, input.profile).printTestPage(input)
});
