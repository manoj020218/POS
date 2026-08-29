import {
  createCutCommand,
  createEscPosJob,
  createFeedCommand,
  createTextCommand,
  type EscPosPrintJob
} from './escpos.js';
import { describePrinterTarget, type ReceiptPrinterProfile } from './printer-profile.js';

export const createPrinterTestPageJob = (
  profile: ReceiptPrinterProfile,
  now = new Date()
): EscPosPrintJob =>
  createEscPosJob([
    { type: 'INITIALIZE' },
    createTextCommand('Smart POS', 'CENTER', true),
    createTextCommand('Printer Test Page', 'CENTER', true),
    createFeedCommand(),
    createTextCommand(`Profile: ${profile.name}`),
    createTextCommand(`Connection: ${profile.connectionType}`),
    createTextCommand(`Target: ${describePrinterTarget(profile)}`),
    createTextCommand(`Paper: ${profile.paperWidth}`),
    createTextCommand(`Generated: ${now.toISOString()}`),
    createFeedCommand(3),
    createCutCommand()
  ]);
