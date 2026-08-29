import {
  createCutCommand,
  createEscPosJob,
  createFeedCommand,
  createQrCodeCommand,
  createTextCommand,
  type EscPosCommand,
  type EscPosPrintJob
} from './escpos.js';
import { getPrinterColumns, wrapText } from './layout.js';
import type { ReceiptPrinterProfile } from './printer-profile.js';

export type QrCodePrintJobInput = {
  captionLines?: string[];
  footerLines?: string[];
  profile: ReceiptPrinterProfile;
  size?: number;
  title?: string;
  value: string;
};

const normalizeQrSize = (size?: number) => {
  if (size === undefined) {
    return 6;
  }

  return Math.max(3, Math.min(8, Math.round(size)));
};

export const createQrCodePrintJob = (input: QrCodePrintJobInput): EscPosPrintJob => {
  const value = input.value.trim();

  if (value.length === 0) {
    throw new Error('QR print job requires a non-empty value');
  }

  const width = getPrinterColumns(input.profile);
  const commands: EscPosCommand[] = [{ type: 'INITIALIZE' }];

  if (input.title) {
    for (const line of wrapText(input.title, width)) {
      commands.push(createTextCommand(line, 'CENTER', true));
    }
  }

  for (const captionLine of input.captionLines ?? []) {
    for (const line of wrapText(captionLine, width)) {
      commands.push(createTextCommand(line, 'CENTER'));
    }
  }

  commands.push(
    createFeedCommand(),
    createQrCodeCommand(value, normalizeQrSize(input.size)),
    createTextCommand(value, 'CENTER')
  );

  for (const footerLine of input.footerLines ?? []) {
    for (const line of wrapText(footerLine, width)) {
      commands.push(createTextCommand(line, 'CENTER'));
    }
  }

  commands.push(createFeedCommand(2), createCutCommand());
  return createEscPosJob(commands);
};
