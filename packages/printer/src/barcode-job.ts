import {
  createBarcodeCommand,
  createCutCommand,
  createEscPosJob,
  createFeedCommand,
  createTextCommand,
  type EscPosBarcodeSymbology,
  type EscPosCommand,
  type EscPosPrintJob
} from './escpos.js';
import { getPrinterColumns, wrapText } from './layout.js';
import type { ReceiptPrinterProfile } from './printer-profile.js';

export type BarcodePrintJobInput = {
  captionLines?: string[];
  profile: ReceiptPrinterProfile;
  symbology?: EscPosBarcodeSymbology;
  title?: string;
  value: string;
};

export const createBarcodePrintJob = (input: BarcodePrintJobInput): EscPosPrintJob => {
  const value = input.value.trim();

  if (value.length === 0) {
    throw new Error('Barcode print job requires a non-empty value');
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
    createBarcodeCommand(value, input.symbology),
    createTextCommand(value, 'CENTER'),
    createFeedCommand(2),
    createCutCommand()
  );

  return createEscPosJob(commands);
};
