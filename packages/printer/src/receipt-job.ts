import {
  createCutCommand,
  createEscPosJob,
  createFeedCommand,
  createTextCommand,
  type EscPosCommand,
  type EscPosPrintJob
} from './escpos.js';
import { createDividerLine, formatColumns, getPrinterColumns, wrapText } from './layout.js';
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
  branchName?: string;
  businessName: string;
  cashierName?: string;
  currencySymbol?: string;
  customerName?: string;
  discountAmount?: number;
  footerLines?: string[];
  invoiceNumber: string;
  items: ReceiptLineItem[];
  note?: string;
  payments?: ReceiptPaymentLine[];
  printedAt?: Date;
  profile: ReceiptPrinterProfile;
  subtotalAmount?: number;
  taxAmount?: number;
  terminalName?: string;
  totalAmount: number;
};

const formatMoney = (amount: number, currencySymbol: string) => {
  const prefix = amount < 0 ? '-' : '';
  return `${prefix}${currencySymbol} ${Math.abs(amount / 100).toFixed(2)}`;
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
    createTextCommand(input.businessName, 'CENTER', true),
    createTextCommand('SALES RECEIPT', 'CENTER', true),
    createFeedCommand(),
    createTextCommand(`Invoice: ${input.invoiceNumber}`),
    createTextCommand(`Printed: ${printedAt}`)
  ];

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

    const itemAmount = formatMoney(item.totalAmount, currencySymbol);
    const itemDetail = item.unitPriceAmount === undefined
      ? `Qty: ${formatQuantity(item.quantity)}`
      : `${formatQuantity(item.quantity)} x ${formatMoney(item.unitPriceAmount, currencySymbol)}`;

    appendLines(commands, formatColumns(itemDetail, itemAmount, width));

    if (item.note) {
      appendLines(commands, wrapText(`Note: ${item.note}`, width));
    }
  }

  appendLines(commands, [createDividerLine(input.profile)]);

  if (input.subtotalAmount !== undefined) {
    appendLines(
      commands,
      formatColumns('Subtotal', formatMoney(input.subtotalAmount, currencySymbol), width)
    );
  }

  if ((input.discountAmount ?? 0) > 0) {
    appendLines(
      commands,
      formatColumns('Discount', formatMoney(-input.discountAmount!, currencySymbol), width)
    );
  }

  if ((input.taxAmount ?? 0) > 0) {
    appendLines(commands, formatColumns('Tax', formatMoney(input.taxAmount!, currencySymbol), width));
  }

  appendLines(
    commands,
    formatColumns('Total', formatMoney(input.totalAmount, currencySymbol), width),
    'LEFT',
    true
  );

  if (input.payments && input.payments.length > 0) {
    appendLines(commands, [createDividerLine(input.profile)]);

    for (const payment of input.payments) {
      appendLines(
        commands,
        formatColumns(payment.label, formatMoney(payment.amount, currencySymbol), width)
      );
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
