import { createTransportPrinterService, type EncodedPrinterJob } from './transport-printer-service.js';

export interface SystemPrinterTransport {
  write(input: EncodedPrinterJob): Promise<void>;
}

export const createSystemPrinterService = (
  transport: SystemPrinterTransport,
  now?: () => Date
) =>
  createTransportPrinterService({
    connectionType: 'SYSTEM',
    execute: (input) => transport.write(input),
    now
  });
