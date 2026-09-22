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
        branchAddress: input.settings.branches.find(
          (branch) => branch.branchId === input.context.branchId
        )?.address,
        branchName: input.context.branchName,
        businessName: input.settings.businessName,
        cashierName: input.context.cashierName,
        currencySymbol: input.settings.currencyCode,
        customerName: input.customer?.name,
        discountAmount: input.calculated.discountAmount,
        footerLines: input.settings.receiptFooter ? [input.settings.receiptFooter] : undefined,
        gstin: input.settings.gstin,
        invoiceNumber: input.calculated.invoiceNumber,
        items: input.calculated.items.map((item) => ({
          name: item.variantName ? `${item.productName} (${item.variantName})` : item.productName,
          quantity: item.quantity,
          totalAmount: item.totalAmount,
          unitPriceAmount: item.unitPrice
        })),
        payments: [
          { amount: input.calculated.tenderedAmount, label: input.paymentMethod },
          ...(input.calculated.changeAmount > 0
            ? [{ amount: input.calculated.changeAmount, label: 'Change' }]
            : [])
        ],
        printedAt: input.now(),
        profile,
        showGstSplit: (input.settings.defaultTaxProfile?.rateBasisPoints ?? 0) > 0,
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

// Explicit, cashier-triggered print of the pre-payment "PAYMENT DUE" bill --
// unlike printCheckoutReceipt this ignores the autoPrintReceipt toggle
// (that toggle governs printing after a sale is recorded, not this
// on-demand action) and only needs a configured printer.
export const printDemandBillReceipt = async (input: {
  calculated: CalculatedCheckoutSale;
  context: ClientTerminalContext;
  customer?: ClientCustomerRecord | null;
  now: () => Date;
  printerService?: PrinterService;
  settings: ClientBusinessSettings;
}): Promise<CheckoutPrintOutcome> => {
  const profile = input.settings.branches.find(
    (branch) => branch.branchId === input.context.branchId
  )?.receiptPrinterProfile;

  if (!profile || !input.printerService) {
    return { status: 'SKIPPED' };
  }

  try {
    const result = await input.printerService.printReceipt({
      job: createReceiptPrintJob({
        branchAddress: input.settings.branches.find(
          (branch) => branch.branchId === input.context.branchId
        )?.address,
        branchName: input.context.branchName,
        businessName: input.settings.businessName,
        cashierName: input.context.cashierName,
        currencySymbol: input.settings.currencyCode,
        customerName: input.customer?.name,
        discountAmount: input.calculated.discountAmount,
        documentLabel: 'PAYMENT DUE',
        gstin: input.settings.gstin,
        invoiceNumber: 'PENDING',
        items: input.calculated.items.map((item) => ({
          name: item.variantName ? `${item.productName} (${item.variantName})` : item.productName,
          quantity: item.quantity,
          totalAmount: item.totalAmount,
          unitPriceAmount: item.unitPrice
        })),
        note: 'Not a tax invoice -- pay at the counter to receive your invoice.',
        printedAt: input.now(),
        profile,
        showGstSplit: (input.settings.defaultTaxProfile?.rateBasisPoints ?? 0) > 0,
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
