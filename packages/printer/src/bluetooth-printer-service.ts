import { createTransportPrinterService, type EncodedPrinterJob } from './transport-printer-service.js';

export interface BluetoothPrinterTransport {
  write(input: EncodedPrinterJob): Promise<void>;
}

const validateBluetoothProfile = (profile: EncodedPrinterJob['profile']) => {
  if (!profile.target?.trim()) {
    throw new Error('Bluetooth printer profile requires a target device identifier');
  }
};

export const createBluetoothPrinterService = (
  transport: BluetoothPrinterTransport,
  now?: () => Date
) =>
  createTransportPrinterService({
    connectionType: 'BLUETOOTH',
    execute: (input) => transport.write(input),
    now,
    validateProfile: validateBluetoothProfile
  });
