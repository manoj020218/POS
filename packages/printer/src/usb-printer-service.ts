import { createTransportPrinterService, type EncodedPrinterJob } from './transport-printer-service.js';

export interface UsbPrinterTransport {
  write(input: EncodedPrinterJob): Promise<void>;
}

const validateUsbProfile = (profile: EncodedPrinterJob['profile']) => {
  if (!profile.target?.trim()) {
    throw new Error('USB printer profile requires a target device identifier');
  }
};

export const createUsbPrinterService = (transport: UsbPrinterTransport, now?: () => Date) =>
  createTransportPrinterService({
    connectionType: 'USB',
    execute: (input) => transport.write(input),
    now,
    validateProfile: validateUsbProfile
  });
