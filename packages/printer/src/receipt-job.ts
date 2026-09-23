import {
  createCutCommand,
  createEscPosJob,
  createFeedCommand,
  createTextCommand,
  type EscPosCommand,
  type EscPosPrintJob
} from './escpos.js';
import { createDividerLine, getPrinterColumns, wrapText } from './layout.js';
import type { ReceiptPrinterProfile } from './printer-profile.js';

export type ReceiptLineItem = {
  name: string;
  note?: string;
  quantity: number;
  totalAmount: number;
  unitPriceAmount?: number;
};

export type ReceiptPaymentLine = {
  amount: number;
  label: string;
};

export type ReceiptPrintJobInput = {
  branchAddress?: string;
  branchName?: string;
  businessName: string;
  cashierName?: string;
  currencySymbol?: string;
  customerName?: string;
  discountAmount?: number;
  // Overrides the "SALES RECEIPT" header label -- e.g. "PAYMENT DUE" for a
  // pre-payment demand bill printed before the customer pays, vs. the
  // default for the final invoice printed after payment is confirmed.
  documentLabel?: string;
  footerLines?: string[];
  gstin?: string;
  invoiceNumber: string;
  items: ReceiptLineItem[];
  note?: string;
  payments?: ReceiptPaymentLine[];
  printedAt?: Date;
  profile: ReceiptPrinterProfile;
  // When true, taxAmount is split evenly into CGST + SGST lines instead of a
  // single "Tax" line -- how India GST is conventionally itemized on a
  // retail receipt (CGST and SGST each collect half the total GST rate).
  showGstSplit?: boolean;
  subtotalAmount?: number;
  taxAmount?: number;
  terminalName?: string;
  totalAmount: number;
};

// Amounts throughout this package are whole currency units (e.g. rupees),
// matching the convention used everywhere upstream (sale totals, product
// prices, apps/pos's own currency formatter) — not the smallest subunit
// (paise/cents).
const formatMoney = (amount: number, currencySymbol: string) => {
  const prefix = amount < 0 ? '-' : '';
  return `${prefix}${currencySymbol} ${Math.abs(amount).toFixed(2)}`;
};

// Per-item lines skip the currency label -- it was printed once for the
// unit price AND once for the line total on the same row (e.g.
// "2 x INR 60.00 ... INR 120.00"), which on a 32/48-column receipt eats
// most of the line width for two redundant labels. The currency only
// needs to appear once, at Subtotal/Tax/Total/Payments.
const formatAmount = (amount: number) => {
  const prefix = amount < 0 ? '-' : '';
  return `${prefix}${Math.abs(amount).toFixed(2)}`;
};

const formatQuantity = (quantity: number) =>
  Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(3).replace(/\.?0+$/, '');

const appendLines = (
  commands: EscPosCommand[],
  values: string[],
  alignment: 'LEFT' | 'CENTER' | 'RIGHT' = 'LEFT',
  bold = false
) => {
  for (const value of values) {
    commands.push(createTextCommand(value, alignment, bold));
  }
};

export const createReceiptPrintJob = (input: ReceiptPrintJobInput): EscPosPrintJob => {
  if (input.items.length === 0) {
    throw new Error('Receipt print job requires at least one line item');
  }

  const width = getPrinterColumns(input.profile);
  const currencySymbol = input.currencySymbol ?? 'Rs';
  const printedAt = (input.printedAt ?? new Date()).toISOString();
  const commands: EscPosCommand[] = [
    { type: 'INITIALIZE' },
    createTextCommand(input.businessName, 'CENTER', true)
  ];

  if (input.branchAddress) {
    appendLines(commands, wrapText(input.branchAddress, width), 'CENTER');
  }

  if (input.gstin) {
    commands.push(createTextCommand(`GSTIN: ${input.gstin}`, 'CENTER'));
  }

  commands.push(
    createTextCommand(input.documentLabel ?? 'SALES RECEIPT', 'CENTER', true),
    createFeedCommand(),
    createTextCommand(`Invoice: ${input.invoiceNumber}`),
    createTextCommand(`Printed: ${printedAt}`)
  );

  if (input.branchName) {
    commands.push(createTextCommand(`Branch: ${input.branchName}`));
  }

  if (input.terminalName) {
    commands.push(createTextCommand(`Terminal: ${input.terminalName}`));
  }

  if (input.cashierName) {
    commands.push(createTextCommand(`Cashier: ${input.cashierName}`));
  }

  if (input.customerName) {
    commands.push(createTextCommand(`Customer: ${input.customerName}`));
  }

  appendLines(commands, [createDividerLine(input.profile)]);

  for (const item of input.items) {
    appendLines(commands, wrapText(item.name, width), 'LEFT', true);

    const itemLine = item.unitPriceAmount === undefined
      ? `Qty: ${formatQuantity(item.quantity)} = ${formatAmount(item.totalAmount)}`
      : `${formatQuantity(item.quantity)} x ${formatAmount(item.unitPriceAmount)} = ${formatAmount(item.totalAmount)}`;

    appendLines(commands, wrapText(itemLine, width));

    if (item.note) {
      appendLines(commands, wrapText(`Note: ${item.note}`, width));
    }
  }

  appendLines(commands, [createDividerLine(input.profile)]);

  if (input.subtotalAmount !== undefined) {
    appendLines(commands, wrapText(`Subtotal = ${formatMoney(input.subtotalAmount, currencySymbol)}`, width));
  }

  if ((input.discountAmount ?? 0) > 0) {
    appendLines(commands, wrapText(`Discount = ${formatMoney(-input.discountAmount!, currencySymbol)}`, width));
  }

  if ((input.taxAmount ?? 0) > 0) {
    if (input.showGstSplit) {
      const cgstAmount = Math.round((input.taxAmount! / 2) * 100) / 100;
      const sgstAmount = Math.round((input.taxAmount! - cgstAmount) * 100) / 100;
      appendLines(commands, wrapText(`CGST = ${formatMoney(cgstAmount, currencySymbol)}`, width));
      appendLines(commands, wrapText(`SGST = ${formatMoney(sgstAmount, currencySymbol)}`, width));
    } else {
      appendLines(commands, wrapText(`Tax = ${formatMoney(input.taxAmount!, currencySymbol)}`, width));
    }
  }

  appendLines(
    commands,
    wrapText(`Total = ${formatMoney(input.totalAmount, currencySymbol)}`, width),
    'LEFT',
    true
  );

  if (input.payments && input.payments.length > 0) {
    appendLines(commands, [createDividerLine(input.profile)]);

    for (const payment of input.payments) {
      appendLines(commands, wrapText(`${payment.label} = ${formatMoney(payment.amount, currencySymbol)}`, width));
    }
  }

  if (input.note) {
    appendLines(commands, [createDividerLine(input.profile)]);
    appendLines(commands, wrapText(`Note: ${input.note}`, width));
  }

  if (input.footerLines && input.footerLines.length > 0) {
    appendLines(commands, [createDividerLine(input.profile)]);

    for (const footerLine of input.footerLines) {
      appendLines(commands, wrapText(footerLine, width), 'CENTER');
    }
  }

  commands.push(createFeedCommand(3), createCutCommand());
  return createEscPosJob(commands);
};
