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

export type KitchenOrderLineItem = {
  modifiers?: string[];
  name: string;
  note?: string;
  quantity: number;
};

export type KitchenOrderPrintJobInput = {
  businessName?: string;
  cashierName?: string;
  customerName?: string;
  footerLines?: string[];
  items: KitchenOrderLineItem[];
  orderType?: string;
  printedAt?: Date;
  profile: ReceiptPrinterProfile;
  tableLabel?: string;
  ticketNumber: string;
  title?: string;
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

export const createKitchenOrderPrintJob = (input: KitchenOrderPrintJobInput): EscPosPrintJob => {
  if (input.items.length === 0) {
    throw new Error('Kitchen order print job requires at least one line item');
  }

  const width = getPrinterColumns(input.profile);
  const commands: EscPosCommand[] = [{ type: 'INITIALIZE' }];

  if (input.businessName) {
    commands.push(createTextCommand(input.businessName, 'CENTER', true));
  }

  commands.push(
    createTextCommand(input.title ?? 'KITCHEN ORDER', 'CENTER', true),
    createTextCommand(`Ticket: ${input.ticketNumber}`, 'CENTER', true),
    createFeedCommand()
  );

  const metadata = [
    input.orderType ? `Order Type: ${input.orderType}` : undefined,
    input.tableLabel ? `Table: ${input.tableLabel}` : undefined,
    input.cashierName ? `Cashier: ${input.cashierName}` : undefined,
    input.customerName ? `Customer: ${input.customerName}` : undefined,
    `Printed: ${(input.printedAt ?? new Date()).toISOString()}`
  ].filter((value): value is string => value !== undefined);

  appendLines(commands, metadata);
  appendLines(commands, [createDividerLine(input.profile)]);

  for (const item of input.items) {
    appendLines(commands, wrapText(`${formatQuantity(item.quantity)} x ${item.name}`, width), 'LEFT', true);

    for (const modifier of item.modifiers ?? []) {
      appendLines(commands, wrapText(`- ${modifier}`, width));
    }

    if (item.note) {
      appendLines(commands, wrapText(`Note: ${item.note}`, width));
    }

    commands.push(createFeedCommand());
  }

  if (input.footerLines && input.footerLines.length > 0) {
    appendLines(commands, [createDividerLine(input.profile)]);

    for (const footerLine of input.footerLines) {
      appendLines(commands, wrapText(footerLine, width), 'CENTER');
    }
  }

  commands.push(createFeedCommand(), createCutCommand());
  return createEscPosJob(commands);
};
