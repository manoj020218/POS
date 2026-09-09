import { createTokenPrintJob } from '@smart-pos/printer';
import type { ClientBusinessSettings, ClientKioskOrderView } from '@smart-pos/client-data';

import { createPosPrinterService } from './printer/create-printer-service.js';

export type PrintKioskTokenOutcome =
  | { status: 'SKIPPED' }
  | { status: 'PRINTED' }
  | { message: string; status: 'FAILED' };

/**
 * Prints the physical token that carries the whole self-service-kiosk
 * handover — unlike a receipt, this isn't optional/"auto print"; if a
 * printer is paired for the branch, the token must come out, so this only
 * skips when no printer is configured at all.
 */
export const printKioskToken = async (input: {
  branchId: string;
  order: ClientKioskOrderView;
  paidReference?: string;
  printDualTokens: boolean;
  settings: ClientBusinessSettings;
}): Promise<PrintKioskTokenOutcome> => {
  const branch = input.settings.branches.find((candidate) => candidate.branchId === input.branchId);
  const profile = branch?.receiptPrinterProfile;

  if (!profile) {
    return { status: 'SKIPPED' };
  }

  const job = createTokenPrintJob({
    branchName: branch?.branchName,
    businessName: input.settings.businessName,
    currencySymbol: input.settings.currencyCode,
    footerLines: input.settings.receiptFooter ? [input.settings.receiptFooter] : undefined,
    items: input.order.items.map((item) => ({
      lineTotal: item.lineTotal,
      name: item.productName,
      quantity: item.quantity
    })),
    paidReference: input.paidReference,
    profile,
    tokenNumber: input.order.tokenNumber,
    totalAmount: input.order.totalAmount
  });

  try {
    const printerService = createPosPrinterService();
    await printerService.printReceipt({ job, profile });
    if (input.printDualTokens) {
      await printerService.printReceipt({ job, profile });
    }
    return { status: 'PRINTED' };
  } catch (error) {
    return { message: error instanceof Error ? error.message : 'Unknown printer error', status: 'FAILED' };
  }
};
