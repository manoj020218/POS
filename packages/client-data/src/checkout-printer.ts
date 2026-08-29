import { createReceiptPrintJob, type PrinterService } from '@smart-pos/printer';

import type { CalculatedCheckoutSale } from './checkout-calculator.js';
import type { ClientTerminalContext } from './client-context.js';
import type { ClientCustomerRecord } from './customer-repository.js';
import type { ClientBusinessSettings } from './settings-repository.js';
import type { CheckoutPrintOutcome } from './checkout.types.js';

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown printer error';

export const printCheckoutReceipt = async (input: {
  calculated: CalculatedCheckoutSale & { invoiceNumber: string };
  context: ClientTerminalContext;
  customer?: ClientCustomerRecord | null;
  now: () => Date;
  paymentMethod: string;
  printerService?: PrinterService;
  settings: ClientBusinessSettings;
}): Promise<CheckoutPrintOutcome> => {
  const profile = input.settings.branches.find(
    (branch) => branch.branchId === input.context.branchId
  )?.receiptPrinterProfile;

  if (!profile?.autoPrintReceipt || !input.printerService) {
    return { status: 'SKIPPED' };
  }

  try {
    const result = await input.printerService.printReceipt({
      job: createReceiptPrintJob({
        branchName: input.context.branchName,
        businessName: input.settings.businessName,
        cashierName: input.context.cashierName,
        currencySymbol: input.settings.currencyCode,
        customerName: input.customer?.name,
        footerLines: input.settings.receiptFooter ? [input.settings.receiptFooter] : undefined,
        invoiceNumber: input.calculated.invoiceNumber,
        items: input.calculated.items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          totalAmount: item.totalAmount,
          unitPriceAmount: item.unitPrice
        })),
        payments: [{ amount: input.calculated.tenderedAmount, label: input.paymentMethod }],
        printedAt: input.now(),
        profile,
        subtotalAmount: input.calculated.subtotalAmount,
        taxAmount: input.calculated.taxAmount,
        terminalName: input.context.terminalName,
        totalAmount: input.calculated.totalAmount
      }),
      profile
    });

    return { result, status: 'PRINTED' };
  } catch (error) {
    return { message: toErrorMessage(error), status: 'FAILED' };
  }
};
