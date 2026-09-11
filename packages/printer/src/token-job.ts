import {
  createCutCommand,
  createEscPosJob,
  createFeedCommand,
  createQrCodeCommand,
  createTextCommand,
  type EscPosCommand,
  type EscPosPrintJob
} from './escpos.js';
import { createDividerLine, formatColumns, getPrinterColumns, wrapText } from './layout.js';
import type { ReceiptPrinterProfile } from './printer-profile.js';

export type TokenLineItem = {
  lineTotal: number;
  name: string;
  quantity: number;
};

export type TokenPrintJobInput = {
  branchName?: string;
  businessName?: string;
  currencySymbol?: string;
  footerLines?: string[];
  items: TokenLineItem[];
  paidReference?: string;
  printedAt?: Date;
  profile: ReceiptPrinterProfile;
  tokenNumber: string;
  totalAmount: number;
};

// Same whole-currency-unit convention as receipt-job.ts — not paise/cents.
const formatMoney = (amount: number, currencySymbol: string) =>
  `${currencySymbol} ${Math.abs(amount).toFixed(2)}`;

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

export const createTokenPrintJob = (input: TokenPrintJobInput): EscPosPrintJob => {
  if (input.items.length === 0) {
    throw new Error('Token print job requires at least one line item');
  }

  const width = getPrinterColumns(input.profile);
  const currencySymbol = input.currencySymbol ?? 'Rs';
  const printedAt = (input.printedAt ?? new Date()).toISOString();
  const commands: EscPosCommand[] = [{ type: 'INITIALIZE' }];

  if (input.businessName) {
    commands.push(createTextCommand(input.businessName, 'CENTER', true));
  }
  if (input.branchName) {
    commands.push(createTextCommand(input.branchName, 'CENTER'));
  }

  commands.push(
    createTextCommand('TOKEN', 'CENTER'),
    createTextCommand(input.tokenNumber, 'CENTER', true, 2),
    createFeedCommand()
  );

  // Lets a counter cashier scan the token at checkout instead of typing it.
  // QR rather than CODE128: QR has no code-set-switching bytes for firmware
  // to mishandle, and one clone printer in the field truncated CODE128's
  // last character regardless of encoding variant tried (see git history).
  commands.push(createQrCodeCommand(input.tokenNumber));

  appendLines(commands, [createDividerLine(input.profile)]);

  for (const item of input.items) {
    appendLines(
      commands,
      formatColumns(`${formatQuantity(item.quantity)} x ${item.name}`, formatMoney(item.lineTotal, currencySymbol), width)
    );
  }

  appendLines(commands, [createDividerLine(input.profile)]);
  appendLines(commands, formatColumns('TOTAL', formatMoney(input.totalAmount, currencySymbol), width), 'LEFT', true);
  appendLines(commands, [createDividerLine(input.profile)]);

  if (input.paidReference) {
    commands.push(createTextCommand('PAID', 'CENTER', true, 2));
    appendLines(commands, wrapText(`UPI ref ${input.paidReference}`, width), 'CENTER');
  } else {
    appendLines(commands, wrapText('Pay at counter to collect', width), 'CENTER');
  }

  appendLines(commands, [`Printed: ${printedAt}`], 'CENTER');

  if (input.footerLines && input.footerLines.length > 0) {
    appendLines(commands, [createDividerLine(input.profile)]);

    for (const footerLine of input.footerLines) {
      appendLines(commands, wrapText(footerLine, width), 'CENTER');
    }
  }

  commands.push(createFeedCommand(3), createCutCommand());
  return createEscPosJob(commands);
};
